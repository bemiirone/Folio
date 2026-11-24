import {
  ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { HealthService } from '../../../core/health.service';
import { ToastService } from '../../../core/toast.service';
import { Collection, DocRecord, loadViewPrefs } from '../../../core/models';
import { timeAgo, tint } from '../../../core/format';
import { CollectionsStore } from '../../../state/collections.store';
import { DocumentsStore } from '../../../state/documents.store';
import { Icon } from '../../../shared/icon/icon';
import { CollectionsRail } from '../collections-rail/collections-rail';
import { DocumentsPanel } from '../documents-panel/documents-panel';
import { EditorDrawer } from '../editor-drawer/editor-drawer';
import { SchemaStudio } from '../schema-studio/schema-studio';
import { CollectionDialog } from '../collection-dialog/collection-dialog';

type EditorState = { doc: DocRecord | null; collection: Collection } | null;
type DialogState = { collection: Collection | null } | null;

@Component({
  selector: 'app-workspace-page',
  imports: [Icon, CollectionsRail, DocumentsPanel, EditorDrawer, SchemaStudio, CollectionDialog],
  templateUrl: './workspace-page.html',
  styleUrl: './workspace-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class WorkspacePage {
  /** Bound from the route by withComponentInputBinding(). */
  id = input<string>();
  open = input<string>();

  protected collections = inject(CollectionsStore);
  protected docs = inject(DocumentsStore);
  protected health = inject(HealthService);
  private api = inject(ApiService);
  private toasts = inject(ToastService);
  private router = inject(Router);

  protected tab = signal<'documents' | 'schema'>('documents');
  protected editor = signal<EditorState>(null);
  protected dialog = signal<DialogState>(null);
  protected timeAgo = timeAgo;
  protected tint = tint;

  private prevTabColId = '';
  private opening = false;

  protected activeCollection = () => {
    const id = this.id();
    return id ? this.collections.entityMap()[id] ?? null : null;
  };

  constructor() {
    // Load collections once.
    effect(() => {
      if (!this.collections.loaded() && !this.collections.loading() && !this.collections.error()) {
        this.collections.load();
      }
    });

    // Route + view params → documents load; invalid route → first collection.
    effect(() => {
      const id = this.id();
      const loaded = this.collections.loaded();
      const map = this.collections.entityMap();
      if (!loaded) return;
      const cols = this.collections.entities();
      if (!id || !map[id]) {
        if (cols.length) this.router.navigate(['/collections', cols[0].id], { replaceUrl: true });
        else if (id) this.router.navigate(['/collections'], { replaceUrl: true });
        return;
      }
      const fresh = this.docs.collectionId() !== id;
      const prefs = fresh ? loadViewPrefs(id) : null;
      this.docs.load(fresh
        ? { collectionId: id, q: '', sort: prefs!.sort, filter: prefs!.filter, tag: prefs!.tag }
        : { collectionId: id, q: this.docs.q(), sort: this.docs.sort(), filter: this.docs.filter(), tag: this.docs.tag() });
    });

    // New empty collections land in the schema studio; established ones on documents.
    effect(() => {
      const col = this.activeCollection();
      if (col && col.id !== this.prevTabColId) {
        this.prevTabColId = col.id;
        this.tab.set(col.schema.length ? 'documents' : 'schema');
      }
    });

    // ?open=<docId> from the global typeahead → open the editor drawer.
    effect(() => {
      const openId = this.open();
      const loaded = this.collections.loaded();
      if (!openId || !loaded || this.opening) return;
      this.opening = true;
      untracked(async () => {
        let doc: DocRecord | null = this.docs.entityMap()[openId] ?? null;
        if (!doc) {
          try { doc = await this.api.getDocument(openId); } catch { doc = null; }
        }
        if (doc) {
          const col = this.collections.entityMap()[doc.collectionId];
          if (col) {
            if (this.id() !== col.id) await this.router.navigate(['/collections', col.id]);
            this.editor.set({ doc, collection: col });
          }
        } else {
          this.toasts.error('That document no longer exists.');
        }
        const target = doc?.collectionId ?? this.id();
        await this.router.navigate(target ? ['/collections', target] : ['/collections'], {
          queryParams: {}, replaceUrl: true,
        });
        this.opening = false;
      });
    });
  }

  protected go(id: string) { this.router.navigate(['/collections', id]); }

  protected openNew() {
    const col = this.activeCollection();
    if (col) this.editor.set({ doc: null, collection: col });
  }

  protected openDoc(doc: DocRecord) {
    const col = this.collections.entityMap()[doc.collectionId] ?? this.activeCollection();
    if (col) this.editor.set({ doc, collection: col });
  }

  protected async onReset() {
    this.editor.set(null);
    this.dialog.set(null);
    const ok = await this.collections.resetDemo();
    if (ok) this.health.ping();
  }

  protected retryAll() {
    this.health.ping();
    if (!this.collections.loaded()) this.collections.load();
    const col = this.activeCollection();
    if (col) {
      this.docs.load({
        collectionId: col.id, q: this.docs.q(), sort: this.docs.sort(),
        filter: this.docs.filter(), tag: this.docs.tag(), refresh: Date.now(),
      });
    }
  }

  protected onShortcut(event: KeyboardEvent) {
    if (event.key !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (this.editor() || this.dialog()) return;
    if (this.activeCollection()) {
      event.preventDefault();
      this.openNew();
    }
  }
}
