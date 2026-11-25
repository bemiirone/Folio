import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DynamicForm } from './dynamic-form';
import type { FieldDef } from '../../core/models';

@Component({
  standalone: true,
  imports: [DynamicForm, ReactiveFormsModule],
  template: `<app-dynamic-form [defs]="defs()" [group]="group()" [tone]="tone()" />`,
})
class TestHost {
  private fb = new FormBuilder();
  defs = signal<FieldDef[]>([
    { id: '1', key: 'name', label: 'Name', type: 'text', required: true },
    { id: '2', key: 'email', label: 'Email', type: 'email', required: false },
    { id: '3', key: 'bio', label: 'Bio', type: 'textarea', required: false },
    { id: '4', key: 'tags', label: 'Tags', type: 'tags', required: false },
    { id: '5', key: 'active', label: 'Active', type: 'toggle', required: false },
  ]);
  group = signal(this.fb.group({
    name: [''],
    email: [''],
    bio: [''],
    tags: [[]],
    active: [false],
  }));
  tone = signal<'desk' | 'paper'>('paper');
}

describe('DynamicForm', () => {
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

  it('should render one field input per definition', () => {
    const fieldInputs = fixture.nativeElement.querySelectorAll('app-field-input');
    expect(fieldInputs.length).toBe(5);
  });

  it('should span 2 columns for textarea and tags fields', () => {
    // wide fields (textarea, tags) get sm:col-span-2 class
    const colSpan2 = fixture.nativeElement.querySelectorAll('.sm\\:col-span-2');
    expect(colSpan2.length).toBe(2); // bio (textarea) and tags
  });
});
