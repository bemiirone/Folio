import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { DynamicForm } from './dynamic-form';
import { FieldDef } from '../../core/models';

@Component({
  standalone: true,
  imports: [DynamicForm, ReactiveFormsModule],
  template: `
    <app-dynamic-form [defs]="defs()" [group]="group()" [tone]="tone()" />
  `,
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

  it('should render one field input per definition', () => {
    const inputs = fixture.debugElement.queryAll(By.directive(TestHost));
    // We test by checking the component renders field inputs
    const fieldInputs = fixture.debugElement.queryAll(By.css('app-field-input'));
    expect(fieldInputs.length).toBe(5);
  });

  it('should render labels for each field', () => {
    const labels = fixture.nativeElement.querySelectorAll('label');
    const labelTexts = Array.from(labels).map((l: any) => l.textContent.trim());
    expect(labelTexts).toContain('Name');
    expect(labelTexts).toContain('Email');
    expect(labelTexts).toContain('Bio');
    expect(labelTexts).toContain('Tags');
  });

  it('should mark wide fields for textarea and tags', () => {
    const component = fixture.debugElement.query(By.directive(DynamicForm)).componentInstance;
    const textareaDef: FieldDef = { id: '1', key: 'bio', label: 'Bio', type: 'textarea', required: false };
    const tagsDef: FieldDef = { id: '1', key: 'tags', label: 'Tags', type: 'tags', required: false };
    const textDef: FieldDef = { id: '1', key: 'name', label: 'Name', type: 'text', required: false };

    expect(component.wide(textareaDef)).toBe(true);
    expect(component.wide(tagsDef)).toBe(true);
    expect(component.wide(textDef)).toBe(false);
  });
});
