import { describe, beforeEach, it, expect } from 'vitest';
import { FormBuilder } from '@angular/forms';
import { FieldDef } from './models';
import { defaultValue, buildValuesGroup } from './dynamic-form';

describe('dynamic-form.ts', () => {
  let fb: FormBuilder;

  beforeEach(() => {
    fb = new FormBuilder();
  });

  describe('defaultValue', () => {
    it('returns existing value when provided', () => {
      const def: FieldDef = { id: '1', key: 'name', label: 'Name', type: 'text', required: false };
      expect(defaultValue(def, 'existing')).toBe('existing');
    });

    it('returns false for toggle with no existing value', () => {
      const def: FieldDef = { id: '1', key: 'active', label: 'Active', type: 'toggle', required: false };
      expect(defaultValue(def, undefined)).toBe(false);
      expect(defaultValue(def, null)).toBe(false);
    });

    it('returns empty array for tags with no existing value', () => {
      const def: FieldDef = { id: '1', key: 'tags', label: 'Tags', type: 'tags', required: false };
      expect(defaultValue(def, undefined)).toEqual([]);
    });

    it('returns null for number with no existing value', () => {
      const def: FieldDef = { id: '1', key: 'age', label: 'Age', type: 'number', required: false };
      expect(defaultValue(def, undefined)).toBeNull();
    });

    it('returns empty string for text with no existing value', () => {
      const def: FieldDef = { id: '1', key: 'name', label: 'Name', type: 'text', required: false };
      expect(defaultValue(def, undefined)).toBe('');
    });
  });

  describe('buildValuesGroup', () => {
    const makeDef = (key: string, type: FieldDef['type'] = 'text', required = false): FieldDef => ({
      id: key, key, label: key.charAt(0).toUpperCase() + key.slice(1), type, required,
    });

    it('creates a FormGroup with one control per field definition', () => {
      const defs: FieldDef[] = [makeDef('name'), makeDef('email', 'email')];
      const group = buildValuesGroup(fb, defs);
      expect(group.get('name')).toBeTruthy();
      expect(group.get('email')).toBeTruthy();
    });

    it('sets default values for each field type', () => {
      const defs: FieldDef[] = [
        makeDef('name'),
        makeDef('active', 'toggle'),
        makeDef('age', 'number'),
        makeDef('tags', 'tags'),
      ];
      const group = buildValuesGroup(fb, defs);
      expect(group.get('name')?.value).toBe('');
      expect(group.get('active')?.value).toBe(false);
      expect(group.get('age')?.value).toBeNull();
      expect(group.get('tags')?.value).toEqual([]);
    });

    it('carries over existing values when provided', () => {
      const defs: FieldDef[] = [makeDef('name'), makeDef('active', 'toggle')];
      const group = buildValuesGroup(fb, defs, { name: 'Alice', active: true });
      expect(group.get('name')?.value).toBe('Alice');
      expect(group.get('active')?.value).toBe(true);
    });

    it('adds required validator when field is required', () => {
      const defs: FieldDef[] = [makeDef('name', 'text', true)];
      const group = buildValuesGroup(fb, defs);
      expect(group.get('name')?.hasError('required')).toBe(true);
    });

    it('adds email validator for email fields', () => {
      const defs: FieldDef[] = [makeDef('email', 'email')];
      const group = buildValuesGroup(fb, defs);
      group.get('email')?.setValue('not-an-email');
      expect(group.get('email')?.hasError('email')).toBe(true);
    });

    it('accepts valid email', () => {
      const defs: FieldDef[] = [makeDef('email', 'email')];
      const group = buildValuesGroup(fb, defs);
      group.get('email')?.setValue('test@example.com');
      expect(group.get('email')?.valid).toBe(true);
    });

    it('adds min validator for number fields with min', () => {
      const defs: FieldDef[] = [{ ...makeDef('age', 'number'), min: 18 }];
      const group = buildValuesGroup(fb, defs);
      group.get('age')?.setValue(10);
      expect(group.get('age')?.hasError('min')).toBe(true);
    });

    it('adds max validator for number fields with max', () => {
      const defs: FieldDef[] = [{ ...makeDef('age', 'number'), max: 100 }];
      const group = buildValuesGroup(fb, defs);
      group.get('age')?.setValue(150);
      expect(group.get('age')?.hasError('max')).toBe(true);
    });

    it('adds both min and max validators', () => {
      const defs: FieldDef[] = [{ ...makeDef('age', 'number'), min: 18, max: 65 }];
      const group = buildValuesGroup(fb, defs);
      group.get('age')?.setValue(10);
      expect(group.get('age')?.hasError('min')).toBe(true);
      group.get('age')?.setValue(70);
      expect(group.get('age')?.hasError('max')).toBe(true);
      group.get('age')?.setValue(30);
      expect(group.get('age')?.valid).toBe(true);
    });

    it('uses tagsRequired validator for required tags fields', () => {
      const defs: FieldDef[] = [makeDef('tags', 'tags', true)];
      const group = buildValuesGroup(fb, defs);
      expect(group.get('tags')?.hasError('required')).toBe(true);
      group.get('tags')?.setValue(['alpha']);
      expect(group.get('tags')?.valid).toBe(true);
    });

    it('works with empty definitions', () => {
      const group = buildValuesGroup(fb, []);
      expect(group.valid).toBe(true);
    });
  });
});
