import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DocumentCard } from './document-card';
import { DocRecord, FieldDef } from '../../../core/models';

// Host component to test inputs/outputs
@Component({
  standalone: true,
  imports: [DocumentCard],
  template: `
    <app-document-card
      [doc]="doc"
      [schema]="schema"
      [color]="color"
      [selected]="selected"
      [anySelection]="anySelection"
      (open)="onOpen($event)"
      (star)="onStar($event)"
      (duplicate)="onDuplicate($event)"
      (remove)="onRemove($event)"
      (select)="onSelect($event)"
    />
  `,
})
class TestHost {
  doc: DocRecord = {
    id: 'doc-1',
    collectionId: 'col-1',
    title: 'Test Document',
    values: { name: 'Alice', email: 'alice@test.com' },
    tags: ['urgent', 'work'],
    starred: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  };
  schema: FieldDef[] = [
    { id: '1', key: 'name', label: 'Name', type: 'text', required: true },
    { id: '2', key: 'email', label: 'Email', type: 'email', required: false },
    { id: '3', key: 'bio', label: 'Bio', type: 'textarea', required: false },
    { id: '4', key: 'tags', label: 'Tags', type: 'tags', required: false },
  ];
  color = '#FFB224';
  selected = false;
  anySelection = false;

  onOpen = jasmine.createSpy('onOpen');
  onStar = jasmine.createSpy('onStar');
  onDuplicate = jasmine.createSpy('onDuplicate');
  onRemove = jasmine.createSpy('onRemove');
  onSelect = jasmine.createSpy('onSelect');
}

describe('DocumentCard', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(host).toBeTruthy();
  });

  it('should render the document title', () => {
    const title = fixture.nativeElement.querySelector('h3');
    expect(title.textContent).toContain('Test Document');
  });

  it('should render the color accent bar', () => {
    const bar = fixture.nativeElement.querySelector('span[style*="background"]');
    expect(bar).toBeTruthy();
  });

  it('should show time ago text', () => {
    const timeEl = fixture.nativeElement.querySelector('p');
    expect(timeEl.textContent).toContain('updated');
  });

  it('should render tags', () => {
    const tagEls = fixture.nativeElement.querySelectorAll('span[class*="rounded-md"]');
    expect(tagEls.length).toBeGreaterThan(0);
  });

  it('should emit open event when card is clicked', () => {
    const article = fixture.nativeElement.querySelector('article');
    article.click();
    expect(host.onOpen).toHaveBeenCalledWith(host.doc);
  });

  it('should emit star event when star button is clicked', () => {
    const starBtn = fixture.nativeElement.querySelector('button[aria-label*="tar"]');
    starBtn.click();
    expect(host.onStar).toHaveBeenCalledWith(host.doc);
  });

  it('should emit duplicate event when duplicate button is clicked', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const dupBtn = Array.from(buttons).find(
      (b: any) => b.getAttribute('aria-label') === 'Duplicate document'
    ) as HTMLButtonElement;
    dupBtn.click();
    expect(host.onDuplicate).toHaveBeenCalledWith(host.doc);
  });

  it('should emit remove event when remove button is clicked', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const removeBtn = Array.from(buttons).find(
      (b: any) => b.getAttribute('aria-label') === 'Delete document'
    ) as HTMLButtonElement;
    removeBtn.click();
    expect(host.onRemove).toHaveBeenCalledWith(host.doc);
  });

  it('should emit select event with doc id when checkbox is clicked', () => {
    const checkbox = fixture.nativeElement.querySelector('button[role="checkbox"]');
    checkbox.click();
    expect(host.onSelect).toHaveBeenCalledWith('doc-1');
  });

  it('should stop propagation on checkbox click', () => {
    const checkbox = fixture.nativeElement.querySelector('button[role="checkbox"]');
    const event = new MouseEvent('click', { bubbles: true });
    const spy = spyOn(event, 'stopPropagation');
    checkbox.dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
  });

  it('should show starred state when doc is starred', () => {
    host.doc = { ...host.doc, starred: true };
    fixture.detectChanges();
    const starBtn = fixture.nativeElement.querySelector('button[aria-label*="tar"]');
    expect(starBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('should filter out textarea and tags from preview defs', () => {
    const card = fixture.debugElement.query(By.directive(DocumentCard)).componentInstance;
    const preview = card.previewDefs();
    expect(preview.map(d => d.type)).not.toContain('textarea');
    expect(preview.map(d => d.type)).not.toContain('tags');
    expect(preview.length).toBeLessThanOrEqual(2);
  });
});
