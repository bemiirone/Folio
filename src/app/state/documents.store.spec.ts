import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { DocRecord, LoadDocsParams, NewDocumentInput } from '../core/models';
import { DocumentsStore } from './documents.store';

const makeDoc = (overrides: Partial<DocRecord> = {}): DocRecord => ({
  id: 'doc-1', collectionId: 'col-1', title: 'Test Document',
  values: { name: 'Test' }, tags: ['test'], starred: false,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', ...overrides,
});

const makeParams = (overrides: Partial<LoadDocsParams> = {}): LoadDocsParams => ({
  collectionId: 'col-1', q: '', sort: 'updated_desc', filter: 'all', tag: null, ...overrides,
});

describe('DocumentsStore', () => {
  let store: InstanceType<typeof DocumentsStore>;
  let httpMock: HttpTestingController;
  const matchDocsUrl = (collectionId: string) => (r: { url: string }) => r.url.includes(`/api/collections/${collectionId}/documents`);

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [DocumentsStore, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    store = TestBed.inject(DocumentsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); vi.useRealTimers(); });

  describe('initial state', () => {
    it('starts with default state', () => {
      expect(store.entities()).toEqual([]);
      expect(store.collectionId()).toBeNull();
      expect(store.loading()).toBe(false);
      expect(store.q()).toBe('');
      expect(store.sort()).toBe('updated_desc');
      expect(store.filter()).toBe('all');
      expect(store.tag()).toBeNull();
      expect(store.selectedIds()).toEqual([]);
    });
    it('computes count as 0', () => { expect(store.count()).toBe(0); });
    it('computes selectedCount as 0', () => { expect(store.selectedCount()).toBe(0); });
    it('computes allSelected as false', () => { expect(store.allSelected()).toBe(false); });
    it('computes topTags as empty', () => { expect(store.topTags()).toEqual([]); });
  });

  describe('load', () => {
    it('loads documents from API', () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      expect(store.loading()).toBe(true);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: '1' }), makeDoc({ id: '2' })]);
      vi.advanceTimersByTime(10);
      expect(store.entities().length).toBe(2);
      expect(store.loading()).toBe(false);
      expect(store.collectionId()).toBe('col-1');
    });

    it('sets error on failure', () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).error(new ProgressEvent('error'));
      vi.advanceTimersByTime(10);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeTruthy();
    });
  });

  describe('setSort', () => { it('updates sort', () => { store.setSort('title_asc'); expect(store.sort()).toBe('title_asc'); }); });
  describe('setFilters', () => {
    it('updates filter and tag', () => {
      store.setFilters({ filter: 'starred', tag: 'urgent' });
      expect(store.filter()).toBe('starred');
      expect(store.tag()).toBe('urgent');
    });
  });

  describe('selection', () => {
    it('toggles select', () => {
      store.toggleSelect('doc-1');
      expect(store.selectedIds()).toContain('doc-1');
      store.toggleSelect('doc-1');
      expect(store.selectedIds()).not.toContain('doc-1');
    });
    it('selects all visible', () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: '1' }), makeDoc({ id: '2' })]);
      vi.advanceTimersByTime(10);
      store.selectAllVisible();
      expect(store.selectedIds().length).toBe(2);
    });
    it('clears selection', () => {
      store.toggleSelect('doc-1');
      store.toggleSelect('doc-2');
      store.clearSelection();
      expect(store.selectedIds()).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates optimistically', async () => {
      const saved = makeDoc({ id: 'saved-1', title: 'New Doc' });
      const promise = store.create({ collectionId: 'col-1', title: 'New Doc', values: {}, tags: [], starred: false });
      vi.advanceTimersByTime(10);
      expect(store.entities().some((d: DocRecord) => d.id.startsWith('temp-'))).toBe(true);
      httpMock.expectOne('/api/collections/col-1/documents').flush(saved);
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toEqual(saved);
      expect(store.entityMap()['saved-1']).toBeTruthy();
    });
    it('removes temp entity on failure', async () => {
      const promise = store.create({ collectionId: 'col-1', title: 'New Doc', values: {}, tags: [], starred: false });
      vi.advanceTimersByTime(10);
      httpMock.expectOne('/api/collections/col-1/documents').error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBeNull();
      expect(store.entities().some((d: DocRecord) => d.id.startsWith('temp-'))).toBe(false);
    });
  });

  describe('update', () => {
    it('updates optimistically', async () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: 'doc-1' })]);
      vi.advanceTimersByTime(10);
      const promise = store.update('doc-1', { title: 'Updated' });
      httpMock.expectOne('/api/documents/doc-1').flush(makeDoc({ id: 'doc-1', title: 'Updated' }));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBe(true);
      expect(store.entityMap()['doc-1']?.title).toBe('Updated');
    });
    it('rolls back on failure', async () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: 'doc-1', title: 'Original' })]);
      vi.advanceTimersByTime(10);
      const promise = store.update('doc-1', { title: 'Changed' });
      httpMock.expectOne('/api/documents/doc-1').error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBe(false);
      expect(store.entityMap()['doc-1']?.title).toBe('Original');
    });
  });

  describe('remove', () => {
    it('removes optimistically', async () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: 'doc-1', title: 'To Delete' })]);
      vi.advanceTimersByTime(10);
      const doc = makeDoc({ id: 'doc-1', title: 'To Delete' });
      const promise = store.remove(doc);
      httpMock.expectOne('/api/documents/doc-1').flush(doc);
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBeUndefined();
      expect(store.entityMap()['doc-1']).toBeUndefined();
    });
    it('rolls back on failure', async () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: 'doc-1' })]);
      vi.advanceTimersByTime(10);
      const doc = makeDoc({ id: 'doc-1' });
      const promise = store.remove(doc);
      httpMock.expectOne('/api/documents/doc-1').error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBeUndefined();
      expect(store.entityMap()['doc-1']).toBeTruthy();
    });
  });

  describe('toggleStar', () => {
    it('toggles starred optimistically', async () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: 'doc-1', starred: false })]);
      vi.advanceTimersByTime(10);
      const doc = makeDoc({ id: 'doc-1', starred: false });
      const promise = store.toggleStar(doc);
      httpMock.expectOne('/api/documents/doc-1').flush({});
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBeUndefined();
      expect(store.entityMap()['doc-1']?.starred).toBe(true);
    });
    it('rolls back on failure', async () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: 'doc-1', starred: false })]);
      vi.advanceTimersByTime(10);
      const doc = makeDoc({ id: 'doc-1', starred: false });
      const promise = store.toggleStar(doc);
      httpMock.expectOne('/api/documents/doc-1').error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBeUndefined();
      expect(store.entityMap()['doc-1']?.starred).toBe(false);
    });
  });

  describe('computed properties', () => {
    it('computes allSelected correctly', () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: '1' }), makeDoc({ id: '2' })]);
      vi.advanceTimersByTime(10);
      expect(store.allSelected()).toBe(false);
      store.selectAllVisible();
      expect(store.allSelected()).toBe(true);
      store.toggleSelect('1');
      expect(store.allSelected()).toBe(false);
    });
    it('computes topTags', () => {
      store.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([
        makeDoc({ id: '1', tags: ['urgent', 'work'] }),
        makeDoc({ id: '2', tags: ['urgent', 'personal'] }),
        makeDoc({ id: '3', tags: ['work'] }),
      ]);
      vi.advanceTimersByTime(10);
      const topTags = store.topTags();
      expect(topTags[0].tag).toBe('urgent');
      expect(topTags[0].n).toBe(2);
    });
  });
});
