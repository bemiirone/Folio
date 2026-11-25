import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { FieldInput } from './field-input';
import { FieldDef } from '../../core/models';

@Component({
  standalone: true,
  imports: [FieldInput, ReactiveFormsModule],
  template: `
    <app-field-input [def]="def()" [control]="control()" />
  `,
})
class TestHost {
  private fb = new FormBuilder();
  def = signal<FieldDef>({ id: '1', key: 'name', label: 'Name', type: 'text', required: false });
  control = signal<FormControl>(new FormControl(''));

  initControl(def: FieldDef, value: unknown = '') {
    const validators = def.required ? [Validators.required] : [];
    this.control.set(new FormControl(value, validators));
    this.def.set(def);
  }
}

describe('FieldInput', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
  });

  describe('text input', () => {
    beforeEach(() => {
      host.initControl({ id: '1', key: 'name', label: 'Name', type: 'text', required: false }, 'Hello');
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(host).toBeTruthy();
    });

    it('should render a text input', () => {
      const input = fixture.nativeElement.querySelector('input[type="text"]');
      expect(input).toBeTruthy();
    });

    it('should bind the form control value', () => {
      const input = fixture.nativeElement.querySelector('input[type="text"]');
      expect(input.value).toBe('Hello');
    });

    it('should show the label', () => {
      const label = fixture.nativeElement.querySelector('label');
      expect(label.textContent).toContain('Name');
    });

    it('should not show required indicator when not required', () => {
      const label = fixture.nativeElement.querySelector('label');
      expect(label.textContent).not.toContain('*');
    });

    it('should show required indicator when required', () => {
      host.initControl({ id: '1', key: 'name', label: 'Name', type: 'text', required: true });
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector('label');
      expect(label.textContent).toContain('*');
    });
  });

  describe('email input', () => {
    beforeEach(() => {
      host.initControl({ id: '1', key: 'email', label: 'Email', type: 'email', required: false }, 'test@example.com');
      fixture.detectChanges();
    });

    it('should render an email input', () => {
      const input = fixture.nativeElement.querySelector('input[type="email"]');
      expect(input).toBeTruthy();
    });
  });

  describe('number input', () => {
    beforeEach(() => {
      host.initControl({ id: '1', key: 'age', label: 'Age', type: 'number', required: false, min: 18, max: 100 }, 25);
      fixture.detectChanges();
    });

    it('should render a number input', () => {
      const input = fixture.nativeElement.querySelector('input[type="number"]');
      expect(input).toBeTruthy();
    });

    it('should set min/max attributes', () => {
      const input = fixture.nativeElement.querySelector('input[type="number"]');
      expect(input.getAttribute('min')).toBe('18');
      expect(input.getAttribute('max')).toBe('100');
    });
  });

  describe('textarea', () => {
    beforeEach(() => {
      host.initControl({ id: '1', key: 'bio', label: 'Bio', type: 'textarea', required: false }, 'Long text');
      fixture.detectChanges();
    });

    it('should render a textarea', () => {
      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });
  });

  describe('date input', () => {
    beforeEach(() => {
      host.initControl({ id: '1', key: 'date', label: 'Date', type: 'date', required: false }, '2024-06-21');
      fixture.detectChanges();
    });

    it('should render a date input', () => {
      const input = fixture.nativeElement.querySelector('input[type="date"]');
      expect(input).toBeTruthy();
    });
  });

  describe('select input', () => {
    beforeEach(() => {
      host.initControl(
        { id: '1', key: 'choice', label: 'Choice', type: 'select', required: false, options: ['Option A', 'Option B'] },
        'Option A'
      );
      fixture.detectChanges();
    });

    it('should render a select', () => {
      const select = fixture.nativeElement.querySelector('select');
      expect(select).toBeTruthy();
    });

    it('should render options', () => {
      const options = fixture.nativeElement.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(1);
    });
  });

  describe('toggle', () => {
    beforeEach(() => {
      host.initControl({ id: '1', key: 'active', label: 'Active', type: 'toggle', required: false }, true);
      fixture.detectChanges();
    });

    it('should render a switch button', () => {
      const button = fixture.nativeElement.querySelector('button[role="switch"]');
      expect(button).toBeTruthy();
    });

    it('should show ON when true', () => {
      const text = fixture.nativeElement.querySelector('span.font-mono');
      expect(text.textContent).toContain('ON');
    });

    it('should show OFF when false', () => {
      host.control().setValue(false);
      fixture.detectChanges();
      const text = fixture.nativeElement.querySelector('span.font-mono');
      expect(text.textContent).toContain('OFF');
    });

    it('should toggle value on click', () => {
      const button = fixture.nativeElement.querySelector('button[role="switch"]');
      button.click();
      expect(host.control().value).toBe(false);
    });
  });

  describe('tags input', () => {
    beforeEach(() => {
      host.initControl({ id: '1', key: 'tags', label: 'Tags', type: 'tags', required: false }, ['alpha', 'beta']);
      fixture.detectChanges();
    });

    it('should render tag chips', () => {
      const tags = fixture.nativeElement.querySelectorAll('span[class*="inline-flex"]');
      expect(tags.length).toBe(2);
    });

    it('should render a text input for adding tags', () => {
      const input = fixture.nativeElement.querySelector('div[class*="flex"] input[type="text"]');
      expect(input).toBeTruthy();
    });

    it('should remove a tag when remove button is clicked', () => {
      const removeBtn = fixture.nativeElement.querySelector('button[aria-label="Remove tag alpha"]');
      removeBtn.click();
      expect(host.control().value).toEqual(['beta']);
    });
  });

  describe('error display', () => {
    it('should not show error initially', () => {
      host.initControl({ id: '1', key: 'name', label: 'Name', type: 'text', required: true }, '');
      fixture.detectChanges();
      const error = fixture.nativeElement.querySelector('p[class*="text-xs"]');
      expect(error).toBeFalsy();
    });

    it('should show required error when touched and empty', () => {
      host.initControl({ id: '1', key: 'name', label: 'Name', type: 'text', required: true }, '');
      fixture.detectChanges();
      host.control().markAsTouched();
      fixture.detectChanges();
      const error = fixture.nativeElement.querySelector('p');
      expect(error.textContent).toContain('required');
    });

    it('should show email error', () => {
      host.initControl({ id: '1', key: 'email', label: 'Email', type: 'email', required: false }, 'invalid');
      fixture.detectChanges();
      host.control().markAsTouched();
      fixture.detectChanges();
      const error = fixture.nativeElement.querySelector('p');
      expect(error.textContent).toContain('valid email');
    });
  });
});
