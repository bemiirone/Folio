import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntities, addEntity, removeEntities, removeEntity, setAllEntities, updateEntity, withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { debounceTime, distinctUntilChanged, pipe, switchMap, tap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { DocFilter, DocRecord, LoadDocsParams, NewDocumentInput, SortKey } from '../core/models';
import { uid } from '../core/format';
import { CollectionsStore, errorMessage } from './collections.store';

export const DocumentsStore = signalStore(
  { providedIn: 'root' },
  withEntities<DocRecord>(),
  withState({
    collectionId: null as string | null,
    loading: false,
    error: null as string | null,
    q: '',
    sort: 'updated_desc' as SortKey,
    filter: 'all' as DocFilter,
    tag: null as string | null,
    selectedIds: [] as string[],
  }),
  withComputed(({ entities, selectedIds }) => ({
    count: computed(() => entities().length),
    selectedCount: computed(() => selectedIds().length),
    allSelected: computed(() => entities().length > 0 && selectedIds().length === entities().length),
    topTags: computed(() => {
      const counts = new Map<string, number>();
      for (const d of entities()) for (const t of d.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag, n]) => ({ tag, n }));
    }),
  })),
  withMethods((store, api = inject(ApiService), toasts = inject(ToastService), collections = inject(CollectionsStore)) => {

    /* ----- streamed loads (debounced, coalesced, cancellable) ----- */

    const load = rxMethod<LoadDocsParams>(pipe(
      debounceTime(0),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      tap((p) => {
        const fresh = store.collectionId() !== p.collectionId;
        patchState(store, {
          loading: true, error: null, collectionId: p.collectionId, selectedIds: [],
          ...(fresh ? { q: p.q, sort: p.sort, filter: p.filter, tag: p.tag } : {}),
        });
      }),
      switchMap((p) => api.listDocuments(p).pipe(tapResponse({
        next: (docs) => patchState(store, setAllEntities(docs), { loading: false }),
        error: (e) => patchState(store, { loading: false, error: errorMessage(e) }),
      }))),
    ));

    const setQuery = rxMethod<string>(pipe(
      debounceTime(220),
      tap((q) => patchState(store, { q })),
    ));

    const setSort = (sort: SortKey) => patchState(store, { sort });
    const setFilters = (patch: { filter?: DocFilter; tag?: string | null }) => patchState(store, patch);

    /* ----- selection ----- */

    const toggleSelect = (id: string) => patchState(store, {
      selectedIds: store.selectedIds().includes(id)
        ? store.selectedIds().filter((x) => x !== id)
        : [...store.selectedIds(), id],
    });
    const selectAllVisible = () => patchState(store, { selectedIds: store.entities().map((d) => d.id) });
    const clearSelection = () => patchState(store, { selectedIds: [] });

    /* ----- restore helper shared by every undo ----- */

    const restoreDocs = async (docs: DocRecord[]) => {
      try {
        const { documents } = await api.restoreDocuments(docs);
        const missing = documents.filter((d) => !store.entityMap()[d.id]);
        if (missing.length) {
          patchState(store, addEntities(missing));
          collections.adjustCount(missing[0].collectionId, missing.length);
        }
        toasts.success(missing.length === 1 ? 'Document restored.' : `${missing.length} documents restored.`);
      } catch (e) {
        toasts.error(errorMessage(e));
      }
    };

    /* ----- optimistic mutations ----- */

    const create = async (input: NewDocumentInput): Promise<DocRecord | null> => {
      const stamp = new Date().toISOString();
      const temp: DocRecord = { ...input, id: `temp-${uid()}`, createdAt: stamp, updatedAt: stamp };
      patchState(store, addEntity(temp));
      collections.adjustCount(input.collectionId, 1);
      try {
        const saved = await api.createDocument(input);
        patchState(store, removeEntity(temp.id), addEntity(saved));
        return saved;
      } catch (e) {
        patchState(store, removeEntity(temp.id));
        collections.adjustCount(input.collectionId, -1);
        toasts.error(errorMessage(e));
        return null;
      }
    };

    const update = async (id: string, changes: Partial<DocRecord>): Promise<boolean> => {
      const prev = store.entityMap()[id];
      if (prev) patchState(store, updateEntity({ id, changes: { ...changes, updatedAt: new Date().toISOString() } }));
      try {
        const saved = await api.patchDocument(id, changes);
        patchState(store, updateEntity({ id, changes: saved }));
        return true;
      } catch (e) {
        if (prev) patchState(store, updateEntity({ id, changes: prev }));
        toasts.error(errorMessage(e));
        return false;
      }
    };

    const remove = async (doc: DocRecord): Promise<void> => {
      patchState(store, removeEntity(doc.id), { selectedIds: store.selectedIds().filter((x) => x !== doc.id) });
      collections.adjustCount(doc.collectionId, -1);
      try {
        const removed = await api.deleteDocument(doc.id);
        toasts.info(`“${doc.title}” deleted.`, { label: 'Undo', run: () => restoreDocs([removed]) });
      } catch (e) {
        if (!store.entityMap()[doc.id]) {
          patchState(store, addEntity(doc));
          collections.adjustCount(doc.collectionId, 1);
        }
        toasts.error(errorMessage(e));
      }
    };

    const bulkRemove = async (ids: string[]): Promise<void> => {
      const snapshots = ids.map((id) => store.entityMap()[id]).filter((d): d is DocRecord => !!d);
      if (!snapshots.length) return;
      patchState(store, removeEntities(ids), { selectedIds: [] });
      collections.adjustCount(snapshots[0].collectionId, -snapshots.length);
      try {
        const { documents } = await api.bulkDelete(ids);
        toasts.info(`${snapshots.length} documents deleted.`, { label: 'Undo', run: () => restoreDocs(documents) });
      } catch (e) {
        patchState(store, addEntities(snapshots));
        collections.adjustCount(snapshots[0].collectionId, snapshots.length);
        toasts.error(errorMessage(e));
      }
    };

    const toggleStar = async (doc: DocRecord): Promise<void> => {
      patchState(store, updateEntity({ id: doc.id, changes: { starred: !doc.starred } }));
      try {
        await api.patchDocument(doc.id, { starred: !doc.starred });
      } catch (e) {
        patchState(store, updateEntity({ id: doc.id, changes: { starred: doc.starred } }));
        toasts.error(errorMessage(e));
      }
    };

    const duplicate = async (doc: DocRecord): Promise<void> => {
      const saved = await create({
        collectionId: doc.collectionId,
        title: `${doc.title} (copy)`,
        values: { ...doc.values },
        tags: [...doc.tags],
        starred: false,
      });
      if (saved) toasts.success('Duplicated — the copy is on the desk.');
    };

    return {
      load, setQuery, setSort, setFilters,
      toggleSelect, selectAllVisible, clearSelection,
      create, update, remove, bulkRemove, toggleStar, duplicate,
    };
  }),
);