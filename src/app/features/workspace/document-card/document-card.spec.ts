import { vi, describe, beforeEach, it, expect } from 'vitest';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentCard } from './document-card';
import type { DocRecord, FieldDef } from '../../../core/models';

@Component({
  standalone: true,
  imports: [DocumentCard],
  template: `
    <app-document-card
      [doc]="doc()"
      [schema]="schema()"
      [color]="color"
      (open)="onOpen($event)"
      (star)="onStar($event)"
      (duplicate)="onDuplicate($event)"
      (remove)="onRemove($event)"
      (select)="onSelect($event)"
    />
  `,
})
class TestHost {
  doc = signal<DocRecord>({
    id: 'doc-1', collectionId: 'col-1', title: 'Test Document',
    values: {}, tags: ['urgent', 'work'], starred: false,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z',
  });
  schema = signal<FieldDef[]>([
    { id: '1', key: 'name', label: 'Name', type: 'text', required: true },
  ]);
  color = '#FFB224';
  onOpen = vi.fn();
  onStar = vi.fn();
  onDuplicate = vi.fn();
  onRemove = vi.fn();
  onSelect = vi.fn();
}

describe('DocumentCard', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHost] }).compileComponents();
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(host).toBeTruthy();
  });

  it('should render the document title', () => {
    const title = fixture.nativeElement.querySelector('h3');
    expect(title?.textContent).toContain('Test Document');
  });

  it('should show time ago text', () => {
    const p = fixture.nativeElement.querySelector('p');
    expect(p?.textContent).toContain('updated');
  });

  it('should emit open event when card is clicked', () => {
    (fixture.nativeElement.querySelector('article') as HTMLElement).click();
    expect(host.onOpen).toHaveBeenCalledWith(host.doc());
  });

  it('should emit star event when star button is clicked', () => {
    const btn = fixture.nativeElement.querySelector('button[aria-label*="Star document"]');
    btn.click();
    expect(host.onStar).toHaveBeenCalledWith(host.doc());
  });

  it('should emit select event with doc id when checkbox is clicked', () => {
    const btn = fixture.nativeElement.querySelector('button[role="checkbox"]');
    btn.click();
    expect(host.onSelect).toHaveBeenCalledWith('doc-1');
  });

  it('should show starred state when doc is starred', () => {
    host.doc.update(d => ({ ...d, starred: true }));
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[aria-label*="Star"]');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('aria-label')).toBe('Unstar document');
  });
});
