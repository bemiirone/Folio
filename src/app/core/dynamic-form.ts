import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { FieldDef } from './models';

const tagsRequired: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  Array.isArray(c.value) && c.value.length > 0 ? null : { required: true };

export function defaultValue(def: FieldDef, existing: unknown): unknown {
  if (existing !== undefined && existing !== null) return existing;
  switch (def.type) {
    case 'toggle': return false;
    case 'tags': return [];
    case 'number': return null;
    default: return '';
  }
}

/**
 * Builds a reactive FormGroup from field definitions at runtime.
 * Existing values are carried across rebuilds by key, so editing a
 * schema never throws away what the user already typed.
 */
export function buildValuesGroup(fb: FormBuilder, defs: FieldDef[], values: Record<string, unknown> = {}): FormGroup {
  const controls: Record<string, FormControl> = {};
  for (const def of defs) {
    const validators: ValidatorFn[] = [];
    if (def.required) validators.push(def.type === 'tags' ? tagsRequired : Validators.required);
    if (def.type === 'email') validators.push(Validators.email);
    if (def.type === 'number') {
      if (def.min !== null && def.min !== undefined) validators.push(Validators.min(def.min));
      if (def.max !== null && def.max !== undefined) validators.push(Validators.max(def.max));
    }
    controls[def.key] = new FormControl(defaultValue(def, values[def.key]), { validators, nonNullable: def.type === 'toggle' || def.type === 'tags' });
  }
  return fb.group(controls);
}