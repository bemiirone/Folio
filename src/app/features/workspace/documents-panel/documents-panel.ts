import {
  ChangeDetectionStrategy, Component, effect, inject, input, output, signal,
} from '@angular/core';
import { Collection, DocRecord, SortKey, saveViewPrefs } from '../../../core/models';
import { DocumentsStore } from '../../../state/documents.store';
import { HealthService } from '../../../core/health.service';
import { Icon } from '../../../shared/icon/icon';
import { DocumentCard } from '../document-card/document-card';

@Component({
  selector: 'app-documents-panel',
  imports: [Icon, DocumentCard],
  templateUrl: './documents-panel.html',
  styleUrl: './documents-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsPanel {
  collection = input.required<Collection>();
  newDoc = output<void>();
  openDoc = output<DocRecord>();

  protected store = inject(DocumentsStore);
  protected health = inject(HealthService);
  protected qInput = signal('');
  private prevId = '';

  constructor() {
    // Reset the quick-filter box when switching collections.
    effect(() => {
      const id = this.collection().id;
      if (id !== this.prevId) {
        this.prevId = id;
        this.qInput.set('');
      }
    });
    // Persist the view (sort / filter / tag) per collection — a saved view.
    effect(() => {
      const id = this.collection().id;
      if (this.store.collectionId() !== id) return;
      saveViewPrefs(id, { sort: this.store.sort(), filter: this.store.filter(), tag: this.store.tag() });
    });
  }

  protected isSelected(id: string): boolean {
    return this.store.selectedIds().includes(id);
  }

  protected onQuery(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.qInput.set(value);
    this.store.setQuery(value);
  }

  protected clearQuery() {
    this.qInput.set('');
    this.store.setQuery('');
  }

  protected clearAllFilters() {
    this.clearQuery();
    this.store.setFilters({ filter: 'all', tag: null });
  }

  protected onSort(event: Event) {
    this.store.setSort((event.target as HTMLSelectElement).value as SortKey);
  }

  protected retry() {
    this.store.load({
      collectionId: this.collection().id,
      q: this.store.q(), sort: this.store.sort(), filter: this.store.filter(), tag: this.store.tag(),
      refresh: Date.now(),
    });
  }
}
