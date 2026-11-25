import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import type { Collection, DocRecord, LoadDocsParams, NewCollectionInput, NewDocumentInput, RemovedCollection } from '../core/models';
import { CollectionsStore, errorMessage } from './collections.store';
import { DocumentsStore } from './documents.store';

const makeCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'col-1', name: 'Test Collection', icon: 'folder', color: '#FFB224', description: '', schema: [],
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', docCount: 0, ...overrides,
});

const makeDoc = (overrides: Partial<DocRecord> = {}): DocRecord => ({
  id: 'doc-1', collectionId: 'col-1', title: 'Test Document',
  values: { name: 'Test' }, tags: ['test'], starred: false,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', ...overrides,
});

const makeParams = (overrides: Partial<LoadDocsParams> = {}): LoadDocsParams => ({
  collectionId: 'col-1', q: '', sort: 'updated_desc', filter: 'all', tag: null, ...overrides,
});

const makeRemoved = (c: Partial<Collection> = {}): RemovedCollection => ({
  collection: makeCollection(c), documents: [],
});

describe('CollectionsStore', () => {
  let store: InstanceType<typeof CollectionsStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [CollectionsStore, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    store = TestBed.inject(CollectionsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); vi.useRealTimers(); });

  describe('initial state', () => {
    it('starts empty', () => {
      expect(store.entities()).toEqual([]);
      expect(store.loaded()).toBe(false);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
      expect(store.totalDocs()).toBe(0);
    });
  });

  describe('load', () => {
    it('loads collections from API', () => {
      const cols = [makeCollection({ id: '1' }), makeCollection({ id: '2', docCount: 3 })];
      store.load();
      vi.advanceTimersByTime(10);
      expect(store.loading()).toBe(true);
      httpMock.expectOne('/api/collections').flush(cols);
      vi.advanceTimersByTime(10);
      expect(store.entities()).toEqual(cols);
      expect(store.loaded()).toBe(true);
      expect(store.loading()).toBe(false);
      expect(store.totalDocs()).toBe(3);
    });

    it('sets error on load failure', () => {
      store.load();
      vi.advanceTimersByTime(10);
      httpMock.expectOne('/api/collections').error(new ProgressEvent('error'));
      vi.advanceTimersByTime(10);
      expect(store.loading()).toBe(false);
      expect(store.error()).toContain('offline');
    });
  });

  describe('create', () => {
    it('creates a collection and adds it to state', async () => {
      const created = makeCollection({ id: 'new-1', name: 'New Collection' });
      const promise = store.create({ name: 'New Collection' });
      httpMock.expectOne('/api/collections').flush(created);
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toEqual(created);
      expect(store.entityMap()['new-1']).toEqual(created);
    });

    it('returns null on failure', async () => {
      const promise = store.create({ name: 'Fail' });
      httpMock.expectOne('/api/collections').error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('optimistically updates then confirms', async () => {
      store.load(); vi.advanceTimersByTime(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1' })]);
      vi.advanceTimersByTime(10);
      const promise = store.update('col-1', { name: 'Updated' });
      httpMock.expectOne('/api/collections/col-1').flush(makeCollection({ id: 'col-1', name: 'Updated' }));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBe(true);
      expect(store.entityMap()['col-1']?.name).toBe('Updated');
    });

    it('rolls back on failure', async () => {
      store.load(); vi.advanceTimersByTime(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1', name: 'Original' })]);
      vi.advanceTimersByTime(10);
      const promise = store.update('col-1', { name: 'Changed' });
      httpMock.expectOne('/api/collections/col-1').error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBe(false);
      expect(store.entityMap()['col-1']?.name).toBe('Original');
    });

    it('returns false if collection does not exist', async () => {
      await expect(store.update('nonexistent', { name: 'Test' })).resolves.toBe(false);
    });
  });

  describe('remove', () => {
    it('removes optimistically', async () => {
      store.load(); vi.advanceTimersByTime(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1', name: 'Delete Me' })]);
      vi.advanceTimersByTime(10);
      const promise = store.remove('col-1');
      httpMock.expectOne('/api/collections/col-1').flush(makeRemoved({ id: 'col-1', name: 'Delete Me' }));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBe(true);
      expect(store.entityMap()['col-1']).toBeUndefined();
    });

    it('rolls back on failure', async () => {
      store.load(); vi.advanceTimersByTime(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1' })]);
      vi.advanceTimersByTime(10);
      const promise = store.remove('col-1');
      httpMock.expectOne('/api/collections/col-1').error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBe(false);
      expect(store.entityMap()['col-1']).toBeTruthy();
    });

    it('returns false if collection does not exist', async () => {
      await expect(store.remove('nonexistent')).resolves.toBe(false);
    });
  });

  describe('adjustCount', () => {
    beforeEach(() => {
      store.load(); vi.advanceTimersByTime(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1', docCount: 5 })]);
      vi.advanceTimersByTime(10);
    });
    it('increases docCount', () => { store.adjustCount('col-1', 1); expect(store.entityMap()['col-1']?.docCount).toBe(6); });
    it('decreases docCount', () => { store.adjustCount('col-1', -2); expect(store.entityMap()['col-1']?.docCount).toBe(3); });
    it('does not go below 0', () => { store.adjustCount('col-1', -10); expect(store.entityMap()['col-1']?.docCount).toBe(0); });
  });

  describe('resetDemo', () => {
    it('resets demo data', async () => {
      const promise = store.resetDemo();
      httpMock.expectOne('/api/reset').flush({ ok: true });
      await expect(promise).resolves.toBe(true);
    });

    it('returns false on failure', async () => {
      const promise = store.resetDemo();
      httpMock.expectOne('/api/reset').error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBe(false);
    });
  });
});

describe('DocumentsStore', () => {
  let docsStore: InstanceType<typeof DocumentsStore>;
  let httpMock: HttpTestingController;
  const matchDocsUrl = (collectionId: string) => (r: { url: string }) => r.url.includes(`/api/collections/${collectionId}/documents`);

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [DocumentsStore, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    docsStore = TestBed.inject(DocumentsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); vi.useRealTimers(); });

  describe('initial state', () => {
    it('starts with default state', () => {
      expect(docsStore.entities()).toEqual([]);
      expect(docsStore.collectionId()).toBeNull();
      expect(docsStore.loading()).toBe(false);
      expect(docsStore.q()).toBe('');
      expect(docsStore.sort()).toBe('updated_desc');
      expect(docsStore.selectedIds()).toEqual([]);
    });
    it('computes count as 0', () => { expect(docsStore.count()).toBe(0); });
    it('computes selectedCount as 0', () => { expect(docsStore.selectedCount()).toBe(0); });
    it('computes allSelected as false', () => { expect(docsStore.allSelected()).toBe(false); });
    it('computes topTags as empty', () => { expect(docsStore.topTags()).toEqual([]); });
  });

  describe('load', () => {
    it('loads documents from API', () => {
      docsStore.load(makeParams());
      vi.advanceTimersByTime(10);
      expect(docsStore.loading()).toBe(true);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: '1' }), makeDoc({ id: '2' })]);
      vi.advanceTimersByTime(10);
      expect(docsStore.entities().length).toBe(2);
      expect(docsStore.loading()).toBe(false);
    });

    it('sets error on failure', () => {
      docsStore.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).error(new ProgressEvent('error'));
      vi.advanceTimersByTime(10);
      expect(docsStore.loading()).toBe(false);
      expect(docsStore.error()).toBeTruthy();
    });
  });

  describe('selection', () => {
    it('toggles select', () => {
      docsStore.toggleSelect('doc-1');
      expect(docsStore.selectedIds()).toContain('doc-1');
      docsStore.toggleSelect('doc-1');
      expect(docsStore.selectedIds()).not.toContain('doc-1');
    });
    it('selects all visible', () => {
      docsStore.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: '1' }), makeDoc({ id: '2' })]);
      vi.advanceTimersByTime(10);
      docsStore.selectAllVisible();
      expect(docsStore.selectedIds().length).toBe(2);
    });
    it('clears selection', () => {
      docsStore.toggleSelect('doc-1');
      docsStore.clearSelection();
      expect(docsStore.selectedIds()).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates optimistically', async () => {
      const saved = makeDoc({ id: 'saved-1', title: 'New Doc' });
      const promise = docsStore.create({ collectionId: 'col-1', title: 'New Doc', values: {}, tags: [], starred: false });
      vi.advanceTimersByTime(10);
      expect(docsStore.entities().some((d: DocRecord) => d.id.startsWith('temp-'))).toBe(true);
      httpMock.expectOne('/api/collections/col-1/documents').flush(saved);
      await vi.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toEqual(saved);
    });
  });

  describe('toggleStar', () => {
    it('toggles starred optimistically', async () => {
      docsStore.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: 'doc-1', starred: false })]);
      vi.advanceTimersByTime(10);
      const promise = docsStore.toggleStar(makeDoc({ id: 'doc-1', starred: false }));
      httpMock.expectOne('/api/documents/doc-1').flush({});
      await vi.advanceTimersByTimeAsync(10);
      expect(docsStore.entityMap()['doc-1']?.starred).toBe(true);
    });

    it('rolls back on failure', async () => {
      docsStore.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: 'doc-1', starred: false })]);
      vi.advanceTimersByTime(10);
      const promise = docsStore.toggleStar(makeDoc({ id: 'doc-1', starred: false }));
      httpMock.expectOne('/api/documents/doc-1').error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(10);
      expect(docsStore.entityMap()['doc-1']?.starred).toBe(false);
    });
  });

  describe('computed properties', () => {
    it('computes allSelected correctly', () => {
      docsStore.load(makeParams());
      vi.advanceTimersByTime(10);
      httpMock.expectOne(matchDocsUrl('col-1')).flush([makeDoc({ id: '1' }), makeDoc({ id: '2' })]);
      vi.advanceTimersByTime(10);
      expect(docsStore.allSelected()).toBe(false);
      docsStore.selectAllVisible();
      expect(docsStore.allSelected()).toBe(true);
      docsStore.toggleSelect('1');
      expect(docsStore.allSelected()).toBe(false);
    });
  });
});

describe('errorMessage', () => {
  it('returns offline message for status 0', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('offline');
  });

  it('returns server error message', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 400, error: { message: 'Bad request' } }))).toBe('Bad request');
  });

  it('returns message containing status for HttpErrorResponse', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' }))).toContain('500');
  });

  it('returns generic message for non-HttpErrorResponse', () => {
    expect(errorMessage(new Error('fail'))).toBe('Something unexpected happened.');
    expect(errorMessage(null)).toBe('Something unexpected happened.');
  });
});
