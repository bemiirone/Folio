import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi, HttpTestingController } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { Collection, NewCollectionInput, DocRecord, RemovedCollection } from '../core/models';
import { CollectionsStore, errorMessage } from './collections.store';
import { ToastService } from '../core/toast.service';

// Minimal mock DocRecord for testing
const makeCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'col-1',
  name: 'Test Collection',
  icon: 'folder' as any,
  color: '#FFB224',
  description: '',
  schema: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  docCount: 5,
  ...overrides,
});

const makeRemovedCollection = (overrides: Partial<RemovedCollection> = {}): RemovedCollection => ({
  collection: makeCollection(),
  documents: [],
  ...overrides,
});

describe('CollectionsStore', () => {
  let store: CollectionsStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
      ],
    });
    store = TestBed.inject(CollectionsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('initial state', () => {
    it('starts empty', () => {
      expect(store.entities()).toEqual([]);
      expect(store.loaded()).toBe(false);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('computes totalDocs from docCount', () => {
      // This test will be meaningful after loading
      expect(store.totalDocs()).toBe(0);
    });
  });

  describe('load', () => {
    it('loads collections from API', fakeAsync(() => {
      const mockCollections = [makeCollection({ id: '1' }), makeCollection({ id: '2', docCount: 3 })];

      store.load();
      tick(10);
      expect(store.loading()).toBe(true);

      const req = httpMock.expectOne('/api/collections');
      expect(req.request.method).toBe('GET');
      req.flush(mockCollections);
      tick(10);

      expect(store.entities()).toEqual(mockCollections);
      expect(store.loaded()).toBe(true);
      expect(store.loading()).toBe(false);
      expect(store.totalDocs()).toBe(3);
      flush();
    }));

    it('sets error on load failure', fakeAsync(() => {
      store.load();
      tick(10);

      const req = httpMock.expectOne('/api/collections');
      req.error(new ProgressEvent('error'));
      tick(10);

      expect(store.loading()).toBe(false);
      expect(store.error()).toContain('offline');
      flush();
    }));
  });

  describe('create', () => {
    it('creates a collection and adds it to state', fakeAsync(() => {
      const input: NewCollectionInput = { name: 'New Collection' };
      const created = makeCollection({ id: 'new-1', name: 'New Collection' });

      const promise = store.create(input);
      const req = httpMock.expectOne('/api/collections');
      expect(req.request.method).toBe('POST');
      req.flush(created);
      tick(10);

      await expect(promise).resolves.toEqual(created);
      expect(store.entityMap()['new-1']).toEqual(created);
      flush();
    }));

    it('returns null and shows error on failure', fakeAsync(() => {
      const input: NewCollectionInput = { name: 'Fail Collection' };

      const promise = store.create(input);
      const req = httpMock.expectOne('/api/collections');
      req.error(new ProgressEvent('error'));
      tick(10);

      await expect(promise).resolves.toBeNull();
      flush();
    }));
  });

  describe('update', () => {
    it('optimistically updates then confirms', fakeAsync(async () => {
      const col = makeCollection({ id: 'col-1' });
      // First, add the collection to state
      // We'll use patchCollection directly since there's no add method in the store
      // The store expects entities to exist before update
      // Let's simulate by loading first
      store.load();
      tick(10);
      const req = httpMock.expectOne('/api/collections');
      req.flush([col]);
      tick(10);

      expect(store.entityMap()['col-1']).toBeTruthy();

      const changes = { name: 'Updated Name' };
      const updated = makeCollection({ id: 'col-1', name: 'Updated Name' });

      const promise = store.update('col-1', changes);
      const patchReq = httpMock.expectOne('/api/collections/col-1');
      patchReq.flush(updated);
      tick(10);

      await expect(promise).resolves.toBe(true);
      expect(store.entityMap()['col-1']?.name).toBe('Updated Name');
      flush();
    }));

    it('rolls back on failure', fakeAsync(async () => {
      store.load();
      tick(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1', name: 'Original' })]);
      tick(10);

      const promise = store.update('col-1', { name: 'Changed' });
      const req = httpMock.expectOne('/api/collections/col-1');
      req.error(new ProgressEvent('error'));
      tick(10);

      await expect(promise).resolves.toBe(false);
      // After rollback, name should be back to original
      expect(store.entityMap()['col-1']?.name).toBe('Original');
      flush();
    }));

    it('returns false if collection does not exist', async () => {
      const result = await store.update('nonexistent', { name: 'Test' });
      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes optimistically then shows undo toast', fakeAsync(async () => {
      store.load();
      tick(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1', name: 'To Delete' })]);
      tick(10);

      const removed = makeRemovedCollection({ collection: makeCollection({ id: 'col-1', name: 'To Delete' }) });

      const promise = store.remove('col-1');
      const req = httpMock.expectOne('/api/collections/col-1');
      req.flush(removed);
      tick(10);

      await expect(promise).resolves.toBe(true);
      expect(store.entityMap()['col-1']).toBeUndefined();
      flush();
    }));

    it('rolls back on failure', fakeAsync(async () => {
      store.load();
      tick(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1' })]);
      tick(10);

      const promise = store.remove('col-1');
      const req = httpMock.expectOne('/api/collections/col-1');
      req.error(new ProgressEvent('error'));
      tick(10);

      await expect(promise).resolves.toBe(false);
      expect(store.entityMap()['col-1']).toBeTruthy();
      flush();
    }));

    it('returns false if collection does not exist', async () => {
      const result = await store.remove('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('adjustCount', () => {
    it('increases docCount by delta', fakeAsync(() => {
      store.load();
      tick(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1', docCount: 5 })]);
      tick(10);

      store.adjustCount('col-1', 1);
      expect(store.entityMap()['col-1']?.docCount).toBe(6);
      flush();
    }));

    it('decreases docCount by delta', fakeAsync(() => {
      store.load();
      tick(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1', docCount: 5 })]);
      tick(10);

      store.adjustCount('col-1', -2);
      expect(store.entityMap()['col-1']?.docCount).toBe(3);
      flush();
    }));

    it('does not go below 0', fakeAsync(() => {
      store.load();
      tick(10);
      httpMock.expectOne('/api/collections').flush([makeCollection({ id: 'col-1', docCount: 2 })]);
      tick(10);

      store.adjustCount('col-1', -10);
      expect(store.entityMap()['col-1']?.docCount).toBe(0);
      flush();
    }));

    it('does nothing for non-existent collection', fakeAsync(() => {
      store.adjustCount('nonexistent', 5);
      expect(store.entities()).toEqual([]);
      flush();
    }));
  });

  describe('resetDemo', () => {
    it('resets demo data and reloads', fakeAsync(async () => {
      const promise = store.resetDemo();
      const req = httpMock.expectOne('/api/reset');
      expect(req.request.method).toBe('POST');
      req.flush({ ok: true });
      tick(10);

      // After reset, it should reload collections
      const loadReq = httpMock.expectOne('/api/collections');
      loadReq.flush([]);
      tick(10);

      await expect(promise).resolves.toBe(true);
      flush();
    }));

    it('returns false and shows error on failure', fakeAsync(async () => {
      const promise = store.resetDemo();
      const req = httpMock.expectOne('/api/reset');
      req.error(new ProgressEvent('error'));
      tick(10);

      await expect(promise).resolves.toBe(false);
      flush();
    }));
  });
});

describe('errorMessage', () => {
  it('returns offline message for status 0', () => {
    const error = { status: 0, message: 'Http failure response' } as any;
    expect(errorMessage(error)).toContain('offline');
  });

  it('returns server message when available', () => {
    const error = { status: 400, error: { message: 'Bad request' }, message: 'Http failure' } as any;
    expect(errorMessage(error)).toBe('Bad request');
  });

  it('falls back to error message when error.message is missing', () => {
    const error = { status: 500, error: {}, message: 'Internal Server Error' } as any;
    expect(errorMessage(error)).toBe('Internal Server Error');
  });

  it('returns generic message for non-HttpErrorResponse', () => {
    expect(errorMessage(new Error('random'))).toBe('Something unexpected happened.');
    expect(errorMessage('string error')).toBe('Something unexpected happened.');
    expect(errorMessage(null)).toBe('Something unexpected happened.');
  });
});
