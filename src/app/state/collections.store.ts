import { computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntity, removeEntity, setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { withDevtools, withGlitchTracking } from '@ngrx-toolkit/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { debounceTime, pipe, switchMap, tap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { Collection, NewCollectionInput } from '../core/models';

export const errorMessage = (e: unknown): string => {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'The local API is offline. Run npm run start (or npm run api).';
    return (e.error as { message?: string } | null)?.message ?? e.message;
  }
  return 'Something unexpected happened.';
};

export const CollectionsStore = signalStore(
  { providedIn: 'root' },
  withDevtools('collections', withGlitchTracking()),
  withEntities<Collection>(),
  withState({ loaded: false, loading: false, error: null as string | null }),
  withComputed(({ entities }) => ({
    totalDocs: computed(() => entities().reduce((n, c) => n + (c.docCount ?? 0), 0)),
  })),
  withMethods((store, api = inject(ApiService), toasts = inject(ToastService)) => {
    
    const load = rxMethod<void>(pipe(
      debounceTime(0),
      tap(() => patchState(store, { loading: true, error: null })),
      switchMap(() => api.listCollections().pipe(tapResponse({
        next: (cols) => patchState(store, setAllEntities(cols), { loaded: true, loading: false }),
        error: (e) => patchState(store, { loading: false, error: errorMessage(e) }),
      }))),
    ));

    const create = async (input: NewCollectionInput): Promise<Collection | null> => {
      try {
        const col = await api.createCollection(input);
        patchState(store, addEntity(col));
        return col;
      } catch (e) {
        toasts.error(errorMessage(e));
        return null;
      }
    };

    const update = async (id: string, changes: Partial<Collection>): Promise<boolean> => {
      const prev = store.entityMap()[id];
      if (!prev) return false;
      patchState(store, updateEntity({ id, changes }));
      try {
        const saved = await api.patchCollection(id, changes);
        patchState(store, updateEntity({ id, changes: saved }));
        return true;
      } catch (e) {
        patchState(store, updateEntity({ id, changes: prev }));
        toasts.error(errorMessage(e));
        return false;
      }
    };

    const remove = async (id: string): Promise<boolean> => {
      const prev = store.entityMap()[id];
      if (!prev) return false;
      patchState(store, removeEntity(id));
      try {
        const removed = await api.deleteCollection(id);
        toasts.info(`“${prev.name}” and its documents were deleted.`, {
          label: 'Undo',
          run: async () => {
            try {
              const restored = await api.restoreCollection(removed);
              patchState(store, addEntity(restored.collection));
              toasts.success('Collection restored, documents and all.');
            } catch (e) {
              toasts.error(errorMessage(e));
            }
          },
        });
        return true;
      } catch (e) {
        patchState(store, addEntity(prev));
        toasts.error(errorMessage(e));
        return false;
      }
    };

    const adjustCount = (id: string, delta: number) => {
      const c = store.entityMap()[id];
      if (!c) return;
      patchState(store, updateEntity({ id, changes: { docCount: Math.max(0, (c.docCount ?? 0) + delta) } }));
    };

    const resetDemo = async (): Promise<boolean> => {
      try {
        await api.reset();
        patchState(store, { loaded: false });
        load();
        toasts.success('Demo data reseeded — a fresh desk.');
        return true;
      } catch (e) {
        toasts.error(errorMessage(e));
        return false;
      }
    };

    return { load, create, update, remove, adjustCount, resetDemo };
  }),
);
