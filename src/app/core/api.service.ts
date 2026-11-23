import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Collection, DocRecord, Health, LoadDocsParams, NewCollectionInput,
  NewDocumentInput, RemovedCollection, SearchHit,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  health() {
    return this.http.get<Health>(`${this.base}/health`);
  }

  reset() {
    return firstValueFrom(this.http.post<{ ok: boolean }>(`${this.base}/reset`, {}));
  }

  /* collections */

  listCollections() {
    return this.http.get<Collection[]>(`${this.base}/collections`);
  }

  createCollection(input: NewCollectionInput) {
    return firstValueFrom(this.http.post<Collection>(`${this.base}/collections`, input));
  }

  patchCollection(id: string, changes: Partial<Collection>) {
    return firstValueFrom(this.http.patch<Collection>(`${this.base}/collections/${id}`, changes));
  }

  deleteCollection(id: string) {
    return firstValueFrom(this.http.delete<RemovedCollection>(`${this.base}/collections/${id}`));
  }

  restoreCollection(payload: RemovedCollection) {
    return firstValueFrom(this.http.post<RemovedCollection>(`${this.base}/collections/restore`, payload));
  }

  /* documents */

  listDocuments(p: LoadDocsParams) {
    let params = new HttpParams().set('sort', p.sort);
    if (p.q.trim()) params = params.set('q', p.q.trim());
    if (p.filter === 'starred') params = params.set('starred', '1');
    if (p.tag) params = params.set('tag', p.tag);
    return this.http.get<DocRecord[]>(`${this.base}/collections/${p.collectionId}/documents`, { params });
  }

  getDocument(id: string) {
    return firstValueFrom(this.http.get<DocRecord>(`${this.base}/documents/${id}`));
  }

  createDocument(input: NewDocumentInput) {
    return firstValueFrom(this.http.post<DocRecord>(`${this.base}/collections/${input.collectionId}/documents`, input));
  }

  patchDocument(id: string, changes: Partial<DocRecord>) {
    return firstValueFrom(this.http.patch<DocRecord>(`${this.base}/documents/${id}`, changes));
  }

  deleteDocument(id: string) {
    return firstValueFrom(this.http.delete<DocRecord>(`${this.base}/documents/${id}`));
  }

  bulkDelete(ids: string[]) {
    return firstValueFrom(this.http.post<{ documents: DocRecord[] }>(`${this.base}/documents/bulk-delete`, { ids }));
  }

  restoreDocuments(documents: DocRecord[]) {
    return firstValueFrom(this.http.post<{ documents: DocRecord[] }>(`${this.base}/documents/restore`, { documents }));
  }

  /* typeahead */

  search(q: string, limit = 8) {
    const params = new HttpParams().set('q', q).set('limit', String(limit));
    return this.http.get<SearchHit[]>(`${this.base}/search`, { params });
  }
}