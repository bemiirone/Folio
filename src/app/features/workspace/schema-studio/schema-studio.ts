import {
  ChangeDetectionStrategy, Component, ElementRef, OnInit, afterEveryRender, effect, inject,
  input, output, signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators,
} from '@angular/forms';
import { map } from 'rxjs';
import { Collection, FIELD_TYPES, FieldDef, FieldType } from '../../../core/models';
import { buildValuesGroup } from '../../../core/dynamic-form';
import { slugify, uid } from '../../../core/format';
import { CollectionsStore } from '../../../state/collections.store';
import { ToastService } from '../../../core/toast.service';
import { Icon } from '../../../shared/icon/icon';
import { DynamicForm } from '../../../shared/dynamic-form/dynamic-form';

interface RowValue {
  id: string; key: string; label: string; type: FieldType; required: boolean;
  optionsText: string; placeholder: string; min: number | null; max: number | null; autoKey: boolean;
}

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const splitOptions = (text: string): string[] =>
  [...new Set(String(text ?? '').split(',').map((s) => s.trim()).filter(Boolean))];

const rowValidator: ValidatorFn = (g: AbstractControl): ValidationErrors | null => {
  if (g.get('type')?.value === 'select' && splitOptions(g.get('optionsText')?.value).length < 2) {
    return { optionsRequired: true };
  }
  return null;
};

const uniqueKeysValidator: ValidatorFn = (arr: AbstractControl): ValidationErrors | null => {
  const keys = (arr as FormArray).controls.map((g) => String(g.get('key')?.value ?? ''));
  const dupes = keys.filter((k, i) => k && keys.indexOf(k) !== i);
  return dupes.length ? { duplicateKeys: [...new Set(dupes)] } : null;
};

@Component({
  selector: 'app-schema-studio',
  imports: [ReactiveFormsModule, Icon, DynamicForm],
  templateUrl: './schema-studio.html',
  styleUrl: './schema-studio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchemaStudio implements OnInit {
  collection = input.required<Collection>();
  fileDocument = output<void>();

  private fb = inject(FormBuilder);
  private collections = inject(CollectionsStore);
  private toasts = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);

  protected fieldTypes = FIELD_TYPES;
  protected form = this.fb.group({ fields: this.fb.array<FormGroup>([], { validators: uniqueKeysValidator }) });
  protected rows = this.form.controls.fields;
  protected dirty = signal(false);
  protected saving = signal(false);
  protected dragIdx = signal<number | null>(null);
  protected overIdx = signal<number | null>(null);
  protected previewSig = signal<FormGroup | null>(null);
  private previewGroup: FormGroup | null = null;
  private pendingFocus: string | null = null;
  private prevId = '';

  protected defs = toSignal(
    this.rows.valueChanges.pipe(map(() => this.mapRows(this.rows.getRawValue() as RowValue[]))),
    { initialValue: [] as FieldDef[] },
  );

  constructor() {
    // Rebuild the preview form live, preserving typed values by key.
    effect(() => {
      const defs = this.defs();
      const prev = this.previewGroup?.getRawValue() ?? {};
      this.previewGroup = buildValuesGroup(this.fb, defs, prev);
      this.previewSig.set(this.previewGroup);
    });
    // Rebuild rows only when the collection identity changes.
    effect(() => {
      const col = this.collection();
      if (col.id !== this.prevId) {
        this.prevId = col.id;
        this.buildRows(col.schema);
        this.dirty.set(false);
      }
    });
    // Focus freshly added field labels after render (zoneless-safe).
    afterEveryRender(() => {
      if (!this.pendingFocus) return;
      const el = this.host.nativeElement.querySelector(`[data-row-label="${this.pendingFocus}"]`) as HTMLInputElement | null;
      this.pendingFocus = null;
      el?.focus();
    });
  }

  ngOnInit() {
    this.rows.valueChanges.subscribe(() => this.dirty.set(true));
  }

  /* ----- row plumbing ----- */

  private buildRows(schema: FieldDef[]) {
    this.rows.clear({ emitEvent: false });
    for (const f of schema) this.rows.push(this.rowGroup(f), { emitEvent: false });
    this.rows.updateValueAndValidity();
  }

  private rowGroup(f?: Partial<FieldDef>): FormGroup {
    return this.fb.group({
      id: [f?.id ?? uid()],
      key: [f?.key ?? '', [Validators.required, Validators.pattern(KEY_PATTERN)]],
      label: [f?.label ?? '', Validators.required],
      type: [f?.type ?? 'text'],
      required: [f?.required ?? false],
      optionsText: [(f?.options ?? []).join(', ')],
      placeholder: [f?.placeholder ?? ''],
      min: [f?.min ?? null],
      max: [f?.max ?? null],
      autoKey: [!f],
    }, { validators: rowValidator });
  }

  private uniqueKey(base: string, exclude?: FormGroup): string {
    const taken = new Set(
      this.rows.controls.filter((g) => g !== exclude).map((g) => String(g.get('key')!.value)),
    );
    let key = base || 'field';
    if (!/^[a-z]/.test(key)) key = 'f_' + key;
    let candidate = key; let n = 2;
    while (taken.has(candidate)) candidate = `${key}_${n++}`;
    return candidate;
  }

  private mapRows(raw: RowValue[]): FieldDef[] {
    const seen = new Set<string>();
    return raw.map((r, i) => {
      let key = r.key || `field_${i + 1}`;
      while (seen.has(key)) key += '_p';
      seen.add(key);
      return {
        id: r.id, key, label: r.label || 'Untitled field', type: r.type, required: r.required,
        ...(r.type === 'select' ? { options: splitOptions(r.optionsText) } : {}),
        ...(r.type === 'number' ? { min: r.min, max: r.max } : {}),
        ...(r.placeholder ? { placeholder: r.placeholder } : {}),
      };
    });
  }

  protected hasPlaceholder(row: FormGroup): boolean {
    return ['text', 'textarea', 'number', 'email', 'tags'].includes(row.get('type')!.value);
  }

  /* ----- builder actions ----- */

  protected addField(type: FieldType) {
    const row = this.rowGroup({ type });
    row.get('key')!.setValue(this.uniqueKey(type === 'textarea' ? 'notes' : type), { emitEvent: false });
    this.rows.push(row);
    this.pendingFocus = row.get('id')!.value;
  }

  protected removeField(i: number) { this.rows.removeAt(i); }

  protected move(i: number, j: number) {
    if (j < 0 || j >= this.rows.length) return;
    const control = this.rows.at(i);
    this.rows.removeAt(i);
    this.rows.insert(j, control);
  }

  protected flipRequired(row: FormGroup) {
    const c = row.get('required')!;
    c.setValue(!c.value);
  }

  protected onLabelInput(row: FormGroup) {
    if (row.get('autoKey')!.value) {
      const base = slugify(String(row.get('label')!.value));
      row.get('key')!.setValue(this.uniqueKey(base, row));
    }
  }

  protected onKeyInput(row: FormGroup) {
    row.get('autoKey')!.setValue(false, { emitEvent: false });
  }

  /* ----- drag reorder ----- */

  protected onDragStart(event: DragEvent, i: number) {
    this.dragIdx.set(i);
    event.dataTransfer?.setData('text/plain', String(i));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onDragOver(event: DragEvent, i: number) {
    if (this.dragIdx() === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.overIdx.set(i);
  }

  protected onDrop(i: number) {
    const from = this.dragIdx();
    if (from !== null && from !== i) this.move(from, i);
    this.endDrag();
  }

  protected endDrag() { this.dragIdx.set(null); this.overIdx.set(null); }

  /* ----- preview / persistence ----- */

  protected resetPreview() {
    this.previewGroup = buildValuesGroup(this.fb, this.defs(), {});
    this.previewSig.set(this.previewGroup);
  }

  protected revert() {
    const saved = this.collections.entityMap()[this.collection().id];
    this.buildRows(saved?.schema ?? []);
    this.dirty.set(false);
    this.toasts.info('Reverted to the saved schema.');
  }

  protected async saveSchema() {
    if (this.saving() || !this.dirty()) return;
    if (this.rows.invalid) {
      this.rows.markAllAsTouched();
      for (const row of this.rows.controls) row.markAllAsTouched();
      this.toasts.warn('Fix the highlighted fields before saving the schema.');
      return;
    }
    const raw = this.rows.getRawValue() as RowValue[];
    const schema: FieldDef[] = raw.map((r) => ({
      id: r.id, key: r.key, label: r.label.trim(), type: r.type, required: r.required,
      ...(r.type === 'select' ? { options: splitOptions(r.optionsText) } : {}),
      ...(r.type === 'number' ? { min: r.min ?? null, max: r.max ?? null } : {}),
      ...(r.placeholder.trim() ? { placeholder: r.placeholder.trim() } : {}),
    }));
    this.saving.set(true);
    const ok = await this.collections.update(this.collection().id, { schema });
    this.saving.set(false);
    if (ok) {
      this.dirty.set(false);
      this.toasts.success(`Schema saved — ${schema.length} live field${schema.length === 1 ? '' : 's'}.`, {
        label: 'File one', run: () => this.fileDocument.emit(),
      });
    }
  }
}
