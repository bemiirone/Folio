import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi, HttpTestingController } from '@angular/common/http';
import { DocRecord, LoadDocsParams, NewDocumentInput } from '../core/models';
import { DocumentsStore } from './documents.store';

// Helper to create mock DocRecord
const makeDoc = (overrides: Partial<DocRecord> = {}): DocRecord => ({
  id: 'doc-1',
  collectionId: 'col-1',
  title: 'Test Document',
  values: { name: 'Test' },
  tags: ['test'],
  starred: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const makeLoadParams = (overrides: Partial<LoadDocsParams> = {}): LoadDocsParams => ({
  collectionId: 'col-1',
  q: '',
  sort: 'updated_desc',
  filter: 'all',
  tag: null,
  ...overrides,
});

describe('DocumentsStore', () => {
  let store: DocumentsStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
      ],
    });
    store = TestBed.inject(DocumentsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('initial state', () => {
    it('starts with default state', () => {
      expect(store.entities()).toEqual([]);
      expect(store.collectionId()).toBeNull();
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
      expect(store.q()).toBe('');
      expect(store.sort()).toBe('updated_desc');
      expect(store.filter()).toBe('all');
      expect(store.tag()).toBeNull();
      expect(store.selectedIds()).toEqual([]);
    });

    it('computes count from entities', () => {
      expect(store.count()).toBe(0);
    });

    it('computes selectedCount from selectedIds', () => {
      expect(store.selectedCount()).toBe(0);
    });

    it('computes allSelected as false when no entities', () => {
      expect(store.allSelected()).toBe(false);
    });

    it('computes topTags as empty array', () => {
      expect(store.topTags()).toEqual([]);
    });
  });

  describe('load', () => {
    it('loads documents from API', fakeAsync(() => {
      const params = makeLoadParams();
      const mockDocs = [makeDoc({ id: '1' }), makeDoc({ id: '2' })];

      store.load(params);
      tick(10);
      expect(store.loading()).toBe(true);

      const req = httpMock.expectOne('/api/collections/col-1/documents');
      expect(req.request.method).toBe('GET');
      req.flush(mockDocs);
      tick(10);

      expect(store.entities().length).toBe(2);
      expect(store.loading()).toBe(false);
      expect(store.collectionId()).toBe('col-1');
      flush();
    }));

    it('clears selection when loading new collection', fakeAsync(() => {
      store.load(makeLoadParams({ collectionId: 'old' }));
      tick(10);
      httpMock.expectOne(r => r.url.includes('old')).flush([]);
      tick(10);

      // Now load a different collection
      store.load(makeLoadParams({ collectionId: 'new' }));
      tick(10);
      httpMock.expectOne(r => r.url.includes('new')).flush([]);
      tick(10);

      expect(store.selectedIds()).toEqual([]);
      flush();
    }));

    it('sets error on load failure', fakeAsync(() => {
      store.load(makeLoadParams());
      tick(10);
      const req = httpMock.expectOne('/api/collections/col-1/documents');
      req.error(new ProgressEvent('error'));
      tick(10);

      expect(store.loading()).toBe(false);
      expect(store.error()).toBeTruthy();
      flush();
    }));
  });

  describe('setSort', () => {
    it('updates sort value', () => {
      store.setSort('title_asc');
      expect(store.sort()).toBe('title_asc');
    });
  });

  describe('setFilters', () => {
    it('updates filter and tag', () => {
      store.setFilters({ filter: 'starred', tag: 'urgent' });
      expect(store.filter()).toBe('starred');
      expect(store.tag()).toBe('urgent');
    });
  });

  describe('toggleSelect', () => {
    it('adds id to selection if not present', () => {
      store.toggleSelect('doc-1');
      expect(store.selectedIds()).toContain('doc-1');
    });

    it('removes id from selection if present', () => {
      store.toggleSelect('doc-1');
      expect(store.selectedIds()).toContain('doc-1');
      store.toggleSelect('doc-1');
      expect(store.selectedIds()).not.toContain('doc-1');
    });
  });

  describe('selectAllVisible', () => {
    it('selects all entities', fakeAsync(() => {
      store.load(makeLoadParams());
      tick(10);
      const mockDocs = [makeDoc({ id: '1' }), makeDoc({ id: '2' })];
      httpMock.expectOne('/api/collections/col-1/documents').flush(mockDocs);
      tick(10);

      store.selectAllVisible();
      expect(store.selectedIds().length).toBe(2);
      expect(store.selectedIds()).toContain('1');
      expect(store.selectedIds()).toContain('2');
      flush();
    }));
  });

  describe('clearSelection', () => {
    it('clears all selected ids', () => {
      store.toggleSelect('doc-1');
      store.toggleSelect('doc-2');
      expect(store.selectedIds().length).toBe(2);

      store.clearSelection();
      expect(store.selectedIds()).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates a document optimistically', fakeAsync(async () => {
      const input: NewDocumentInput = {
        collectionId: 'col-1',
        title: 'New Doc',
        values: { name: 'Test' },
        tags: [],
        starred: false,
      };
      const savedDoc = makeDoc({ id: 'saved-1', title: 'New Doc' });

      const promise = store.create(input);
      tick(10);

      // Should have a temp entity
      const tempId = store.entities().find(d => d.id.startsWith('temp-'))?.id;
      expect(tempId).toBeTruthy();

      const req = httpMock.expectOne('/api/collections/col-1/documents');
      expect(req.request.method).toBe('POST');
      req.flush(savedDoc);
      tick(10);

      await expect(promise).resolves.toEqual(savedDoc);
      expect(store.entityMap()['saved-1']).toEqual(savedDoc);
      expect(store.entities().find(d => d.id.startsWith('temp-'))).toBeUndefined();
      flush();
    }));

    it('removes temp entity on failure', fakeAsync(async () => {
      const input: NewDocumentInput = {
        collectionId: 'col-1',
        title: 'New Doc',
        values: {},
        tags: [],
        starred: false,
      };

      const promise = store.create(input);
      tick(10);

      const tempId = store.entities().find(d => d.id.startsWith('temp-'))?.id;
      expect(tempId).toBeTruthy();

      const req = httpMock.expectOne('/api/collections/col-1/documents');
      req.error(new ProgressEvent('error'));
      tick(10);

      await expect(promise).resolves.toBeNull();
      expect(store.entities().find(d => d.id.startsWith('temp-'))).toBeUndefined();
      flush();
    }));
  });

  describe('update', () => {
    it('updates document optimistically', fakeAsync(async () => {
      // First load a document
      store.load(makeLoadParams());
      tick(10);
      httpMock.expectOne('/api/collections/col-1/documents').flush([makeDoc({ id: 'doc-1' })]);
      tick(10);

      const changes = { title: 'Updated Title' };
      const saved = makeDoc({ id: 'doc-1', title: 'Updated Title' });

      const promise = store.update('doc-1', changes);
      const req = httpMock.expectOne('/api/documents/doc-1');
      expect(req.request.method).toBe('PATCH');
      req.flush(saved);
      tick(10);

      await expect(promise).resolves.toBe(true);
      expect(store.entityMap()['doc-1']?.title).toBe('Updated Title');
      flush();
    }));

    it('rolls back on failure', fakeAsync(async () => {
      store.load(makeLoadParams());
      tick(10);
      httpMock.expectOne('/api/collections/col-1/documents').flush([makeDoc({ id: 'doc-1', title: 'Original' })]);
      tick(10);

      const promise = store.update('doc-1', { title: 'Changed' });
      const req = httpMock.expectOne('/api/documents/doc-1');
      req.error(new ProgressEvent('error'));
      tick(10);

      await expect(promise).resolves.toBe(false);
      expect(store.entityMap()['doc-1']?.title).toBe('Original');
      flush();
    }));

    it('returns false if document does not exist', async () => {
      const result = await store.update('nonexistent', { title: 'Test' });
      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes document optimistically', fakeAsync(async () => {
      store.load(makeLoadParams());
      tick(10);
      httpMock.expectOne('/api/collections/col-1/documents').flush([makeDoc({ id: 'doc-1', title: 'To Delete' })]);
      tick(10);

      const doc = makeDoc({ id: 'doc-1', title: 'To Delete' });
      const removedDoc = makeDoc({ id: 'doc-1', title: 'To Delete' });

      const promise = store.remove(doc);
      const req = httpMock.expectOne('/api/documents/doc-1');
      req.flush(removedDoc);
      tick(10);

      expect(store.entityMap()['doc-1']).toBeUndefined();
      flush();
    }));

    it('rolls back on failure', fakeAsync(async () => {
      store.load(makeLoadParams());
      tick(10);
      httpMock.expectOne('/api/collections/col-1/documents').flush([makeDoc({ id: 'doc-1' })]);
      tick(10);

      const doc = makeDoc({ id: 'doc-1' });
      const promise = store.remove(doc);
      const req = httpMock.expectOne('/api/documents/doc-1');
      req.error(new ProgressEvent('error'));
      tick(10);

      expect(store.entityMap()['doc-1']).toBeTruthy();
      flush();
    }));
  });

  describe('toggleStar', () => {
    it('toggles starred status optimistically', fakeAsync(async () => {
      store.load(makeLoadParams());
      tick(10);
      httpMock.expectOne('/api/collections/col-1/documents').flush([makeDoc({ id: 'doc-1', starred: false })]);
      tick(10);

      const doc = makeDoc({ id: 'doc-1', starred: false });
      const promise = store.toggleStar(doc);
      const req = httpMock.expectOne('/api/documents/doc-1');
      req.flush({});
      tick(10);

      expect(store.entityMap()['doc-1']?.starred).toBe(true);
      flush();
    }));

    it('rolls back on failure', fakeAsync(async () => {
      store.load(makeLoadParams());
      tick(10);
      httpMock.expectOne('/api/collections/col-1/documents').flush([makeDoc({ id: 'doc-1', starred: false })]);
      tick(10);

      const doc = makeDoc({ id: 'doc-1', starred: false });
      const promise = store.toggleStar(doc);
      const req = httpMock.expectOne('/api/documents/doc-1');
      req.error(new ProgressEvent('error'));
      tick(10);

      expect(store.entityMap()['doc-1']?.starred).toBe(false);
      flush();
    }));
  });

  describe('computed properties', () => {
    it('computes allSelected correctly', fakeAsync(() => {
      store.load(makeLoadParams());
      tick(10);
      httpMock.expectOne('/api/collections/col-1/documents').flush([makeDoc({ id: '1' }), makeDoc({ id: '2' })]);
      tick(10);

      expect(store.allSelected()).toBe(false);

      store.selectAllVisible();
      expect(store.allSelected()).toBe(true);

      store.toggleSelect('1');
      expect(store.allSelected()).toBe(false);
      flush();
    }));

    it('computes topTags from entity tags', fakeAsync(() => {
      store.load(makeLoadParams());
      tick(10);
      httpMock.expectOne('/api/collections/col-1/documents').flush([
        makeDoc({ id: '1', tags: ['urgent', 'work'] }),
        makeDoc({ id: '2', tags: ['urgent', 'personal'] }),
        makeDoc({ id: '3', tags: ['work'] }),
      ]);
      tick(10);

      const topTags = store.topTags();
      expect(topTags[0].tag).toBe('urgent'); // appears 2 times
      expect(topTags[0].n).toBe(2);
      expect(topTags[1].tag).toBe('work'); // appears 2 times
      expect(topTags[1].n).toBe(2);
      flush();
    }));
  });
});
