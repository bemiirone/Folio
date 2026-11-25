import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, FormControl } from '@angular/forms';
import { FieldInput } from './field-input';
import type { FieldDef } from '../../core/models';

@Component({
  standalone: true,
  imports: [FieldInput, ReactiveFormsModule],
  template: `<app-field-input [def]="def()" [control]="control()" />`,
})
class TestHost {
  def = signal<FieldDef>({ id: '1', key: 'name', label: 'Name', type: 'text', required: false });
  control = signal(new FormControl('') as FormControl<unknown>);

  init(def: FieldDef, value: unknown = '') {
    this.control.set(new FormControl(value));
    this.def.set(def);
  }
}

describe('FieldInput', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHost] }).compileComponents();
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
  });

  describe('text input', () => {
    beforeEach(() => {
      host.init({ id: '1', key: 'name', label: 'Name', type: 'text', required: false }, 'Hello');
      fixture.detectChanges();
    });

    it('should render a text input with value', () => {
      const input = fixture.nativeElement.querySelector('input[type="text"]');
      expect(input).toBeTruthy();
      expect(input.value).toBe('Hello');
    });

    it('should show the label', () => {
      expect(fixture.nativeElement.querySelector('label')?.textContent).toContain('Name');
    });
  });

  describe('email input', () => {
    it('should render an email input', () => {
      host.init({ id: '1', key: 'email', label: 'Email', type: 'email', required: false }, 'test@example.com');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('input[type="email"]')).toBeTruthy();
    });
  });

  describe('number input', () => {
    it('should render a number input with min/max', () => {
      host.init({ id: '1', key: 'age', label: 'Age', type: 'number', required: false, min: 18, max: 100 }, '25');
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input[type="number"]');
      expect(input).toBeTruthy();
      expect(input.getAttribute('min')).toBe('18');
      expect(input.getAttribute('max')).toBe('100');
    });
  });

  describe('textarea', () => {
    it('should render a textarea', () => {
      host.init({ id: '1', key: 'bio', label: 'Bio', type: 'textarea', required: false }, 'Long text');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('textarea')).toBeTruthy();
    });
  });

  describe('date input', () => {
    it('should render a date input', () => {
      host.init({ id: '1', key: 'date', label: 'Date', type: 'date', required: false }, '2024-06-21');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeTruthy();
    });
  });

  describe('select input', () => {
    it('should render a select with options', () => {
      host.init({ id: '1', key: 'choice', label: 'Choice', type: 'select', required: false, options: ['A', 'B'] }, 'A');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('select')).toBeTruthy();
      expect(fixture.nativeElement.querySelectorAll('option').length).toBeGreaterThan(1);
    });
  });

  describe('toggle', () => {
    beforeEach(() => {
      host.init({ id: '1', key: 'active', label: 'Active', type: 'toggle', required: false }, true);
      fixture.detectChanges();
    });

    it('should render a switch button', () => {
      expect(fixture.nativeElement.querySelector('button[role="switch"]')).toBeTruthy();
    });

    it('should show ON when true', () => {
      expect(fixture.nativeElement.textContent).toContain('ON');
    });

    it('should show OFF when false', () => {
      // Replace the signal with a new FormControl set to false to trigger OnPush re-render
      host.control.set(new FormControl(false));
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('OFF');
    });

    it('should toggle value on click', () => {
      (fixture.nativeElement.querySelector('button[role="switch"]') as HTMLElement).click();
      expect(host.control().value).toBe(false);
    });
  });

  describe('tags input', () => {
    beforeEach(() => {
      host.init({ id: '1', key: 'tags', label: 'Tags', type: 'tags', required: false }, ['alpha', 'beta']);
      fixture.detectChanges();
    });

    it('should render tag chips', () => {
      expect(fixture.nativeElement.querySelectorAll('span[class*="inline-flex"]').length).toBe(2);
    });

    it('should remove a tag when remove button is clicked', () => {
      (fixture.nativeElement.querySelector('button[aria-label="Remove tag alpha"]') as HTMLElement).click();
      expect(host.control().value).toEqual(['beta']);
    });
  });

  describe('error display', () => {
    it('should show required error when control has error', () => {
      // Create a FormControl that's already invalid and touched to trigger OnPush re-render
      const fc = new FormControl('', { nonNullable: false });
      fc.setErrors({ required: true });
      fc.markAsTouched();
      host.control.set(fc);
      host.def.set({ id: '1', key: 'name', label: 'Name', type: 'text', required: true });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('required');
    });

    it('should show email error when control has email error', () => {
      const fc = new FormControl('invalid', { nonNullable: false });
      fc.setErrors({ email: true });
      fc.markAsTouched();
      host.control.set(fc);
      host.def.set({ id: '1', key: 'email', label: 'Email', type: 'email', required: false });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('valid email');
    });
  });
});
