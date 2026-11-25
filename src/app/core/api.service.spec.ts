import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi, HttpTestingController, HTTP_INTERCEPTORS, HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Collection, DocRecord, Health, NewCollectionInput, NewDocumentInput, SearchHit, RemovedCollection } from './models';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const base = '/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
      ],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('health', () => {
    it('should GET /api/health', () => {
      const mockHealth: Health = { ok: true, name: 'Folio', version: '1.0.0', collections: 3, docs: 42, uptime: 100, storage: 'json' };

      service.health().subscribe(health => {
        expect(health).toEqual(mockHealth);
      });

      const req = httpMock.expectOne(`${base}/health`);
      expect(req.request.method).toBe('GET');
      req.flush(mockHealth);
    });
  });

  describe('reset', () => {
    it('should POST /api/reset', async () => {
      const promise = service.reset();
      const req = httpMock.expectOne(`${base}/reset`);
      expect(req.request.method).toBe('POST');
      req.flush({ ok: true });
      await expect(promise).resolves.toEqual({ ok: true });
    });
  });

  describe('collections', () => {
    it('listCollections should GET /api/collections', () => {
      const mockCollections: Collection[] = [
        { id: '1', name: 'Books', icon: 'book-open', color: '#FFB224', description: '', schema: [], createdAt: '', updatedAt: '' },
        { id: '2', name: 'Movies', icon: 'film', color: '#F04A32', description: '', schema: [], createdAt: '', updatedAt: '' },
      ];

      service.listCollections().subscribe(collections => {
        expect(collections.length).toBe(2);
        expect(collections[0].name).toBe('Books');
      });

      const req = httpMock.expectOne(`${base}/collections`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCollections);
    });

    it('createCollection should POST /api/collections', async () => {
      const input: NewCollectionInput = { name: 'Recipes', icon: 'cake', color: '#23C48E' };
      const mockCollection: Collection = { ...input, id: 'new-1', description: '', schema: [], createdAt: 'now', updatedAt: 'now' };

      const promise = service.createCollection(input);
      const req = httpMock.expectOne(`${base}/collections`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      req.flush(mockCollection);
      await expect(promise).resolves.toEqual(mockCollection);
    });

    it('patchCollection should PATCH /api/collections/:id', async () => {
      const changes = { name: 'Updated Name' };
      const mockCollection: Collection = { id: 'col-1', name: 'Updated Name', icon: 'folder', color: '#FFB224', description: '', schema: [], createdAt: '', updatedAt: '' };

      const promise = service.patchCollection('col-1', changes);
      const req = httpMock.expectOne(`${base}/collections/col-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(changes);
      req.flush(mockCollection);
      await expect(promise).resolves.toEqual(mockCollection);
    });

    it('deleteCollection should DELETE /api/collections/:id', async () => {
      const mockRemoved: RemovedCollection = {
        collection: { id: 'col-1', name: 'Deleted', icon: 'folder', color: '#FFB224', description: '', schema: [], createdAt: '', updatedAt: '' },
        documents: [],
      };

      const promise = service.deleteCollection('col-1');
      const req = httpMock.expectOne(`${base}/collections/col-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockRemoved);
      await expect(promise).resolves.toEqual(mockRemoved);
    });

    it('restoreCollection should POST /api/collections/restore', async () => {
      const payload: RemovedCollection = {
        collection: { id: 'col-1', name: 'Restored', icon: 'folder', color: '#FFB224', description: '', schema: [], createdAt: '', updatedAt: '' },
        documents: [],
      };

      const promise = service.restoreCollection(payload);
      const req = httpMock.expectOne(`${base}/collections/restore`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(payload);
      await expect(promise).resolves.toEqual(payload);
    });
  });

  describe('documents', () => {
    it('listDocuments should GET /api/collections/:id/documents with params', () => {
      const mockDocs: DocRecord[] = [
        { id: 'doc-1', collectionId: 'col-1', title: 'Doc 1', values: {}, tags: [], starred: false, createdAt: '', updatedAt: '' },
        { id: 'doc-2', collectionId: 'col-1', title: 'Doc 2', values: {}, tags: ['tag1'], starred: true, createdAt: '', updatedAt: '' },
      ];

      service.listDocuments({ collectionId: 'col-1', q: '', sort: 'updated_desc', filter: 'all', tag: null }).subscribe(docs => {
        expect(docs.length).toBe(2);
      });

      const req = httpMock.expectOne(r => r.url === `${base}/collections/col-1/documents`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('sort')).toBe('updated_desc');
      req.flush(mockDocs);
    });

    it('listDocuments includes q param when query is provided', () => {
      service.listDocuments({ collectionId: 'col-1', q: 'search term', sort: 'title_asc', filter: 'all', tag: null }).subscribe();
      const req = httpMock.expectOne(r => r.url === `${base}/collections/col-1/documents`);
      expect(req.request.params.get('q')).toBe('search term');
      req.flush([]);
    });

    it('listDocuments includes starred param when filter is starred', () => {
      service.listDocuments({ collectionId: 'col-1', q: '', sort: 'updated_desc', filter: 'starred', tag: null }).subscribe();
      const req = httpMock.expectOne(r => r.url === `${base}/collections/col-1/documents`);
      expect(req.request.params.get('starred')).toBe('1');
      req.flush([]);
    });

    it('listDocuments includes tag param when tag is provided', () => {
      service.listDocuments({ collectionId: 'col-1', q: '', sort: 'updated_desc', filter: 'all', tag: 'urgent' }).subscribe();
      const req = httpMock.expectOne(r => r.url === `${base}/collections/col-1/documents`);
      expect(req.request.params.get('tag')).toBe('urgent');
      req.flush([]);
    });

    it('getDocument should GET /api/documents/:id', async () => {
      const mockDoc: DocRecord = { id: 'doc-1', collectionId: 'col-1', title: 'My Doc', values: {}, tags: [], starred: false, createdAt: '', updatedAt: '' };

      const promise = service.getDocument('doc-1');
      const req = httpMock.expectOne(`${base}/documents/doc-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDoc);
      await expect(promise).resolves.toEqual(mockDoc);
    });

    it('createDocument should POST /api/collections/:id/documents', async () => {
      const input: NewDocumentInput = {
        collectionId: 'col-1',
        title: 'New Doc',
        values: { name: 'Test' },
        tags: ['test'],
        starred: false,
      };
      const mockDoc: DocRecord = { ...input, id: 'new-doc', createdAt: 'now', updatedAt: 'now' };

      const promise = service.createDocument(input);
      const req = httpMock.expectOne(`${base}/collections/col-1/documents`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      req.flush(mockDoc);
      await expect(promise).resolves.toEqual(mockDoc);
    });

    it('patchDocument should PATCH /api/documents/:id', async () => {
      const changes = { title: 'Updated Title', starred: true };
      const mockDoc: DocRecord = { id: 'doc-1', collectionId: 'col-1', title: 'Updated Title', values: {}, tags: [], starred: true, createdAt: '', updatedAt: '' };

      const promise = service.patchDocument('doc-1', changes);
      const req = httpMock.expectOne(`${base}/documents/doc-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(changes);
      req.flush(mockDoc);
      await expect(promise).resolves.toEqual(mockDoc);
    });

    it('deleteDocument should DELETE /api/documents/:id', async () => {
      const mockDoc: DocRecord = { id: 'doc-1', collectionId: 'col-1', title: 'Deleted', values: {}, tags: [], starred: false, createdAt: '', updatedAt: '' };

      const promise = service.deleteDocument('doc-1');
      const req = httpMock.expectOne(`${base}/documents/doc-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockDoc);
      await expect(promise).resolves.toEqual(mockDoc);
    });

    it('bulkDelete should POST /api/documents/bulk-delete', async () => {
      const ids = ['doc-1', 'doc-2'];
      const response = { documents: [] as DocRecord[] };

      const promise = service.bulkDelete(ids);
      const req = httpMock.expectOne(`${base}/documents/bulk-delete`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids });
      req.flush(response);
      await expect(promise).resolves.toEqual(response);
    });

    it('restoreDocuments should POST /api/documents/restore', async () => {
      const docs: DocRecord[] = [
        { id: 'doc-1', collectionId: 'col-1', title: 'Restored', values: {}, tags: [], starred: false, createdAt: '', updatedAt: '' },
      ];
      const response = { documents: docs };

      const promise = service.restoreDocuments(docs);
      const req = httpMock.expectOne(`${base}/documents/restore`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ documents: docs });
      req.flush(response);
      await expect(promise).resolves.toEqual(response);
    });
  });

  describe('search', () => {
    it('should GET /api/search with q and limit params', () => {
      const mockHits: SearchHit[] = [
        {
          doc: { id: 'doc-1', collectionId: 'col-1', title: 'Result', values: {}, tags: [], starred: false, createdAt: '', updatedAt: '' },
          collectionId: 'col-1',
          collectionName: 'Books',
          icon: 'book-open',
          color: '#FFB224',
          snippet: 'Result snippet',
          matchField: 'title',
        },
      ];

      service.search('test').subscribe(hits => {
        expect(hits.length).toBe(1);
        expect(hits[0].doc.title).toBe('Result');
      });

      const req = httpMock.expectOne(r => r.url === `${base}/search`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('q')).toBe('test');
      expect(req.request.params.get('limit')).toBe('8');
      req.flush(mockHits);
    });

    it('should use custom limit when provided', () => {
      service.search('test', 20).subscribe();
      const req = httpMock.expectOne(r => r.url === `${base}/search`);
      expect(req.request.params.get('limit')).toBe('20');
      req.flush([]);
    });
  });
});
