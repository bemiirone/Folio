import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, afterNextRender,
  inject, input, output, signal, viewChild,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Collection, DocRecord, FieldDef } from '../../../core/models';
import { buildValuesGroup } from '../../../core/dynamic-form';
import { fullDate, timeAgo } from '../../../core/format';
import { DocumentsStore } from '../../../state/documents.store';
import { ToastService } from '../../../core/toast.service';
import { Icon } from '../../../shared/icon/icon';
import { DynamicForm } from '../../../shared/dynamic-form/dynamic-form';
import { FieldInput } from '../../../shared/field-input/field-input';

@Component({
  selector: 'app-editor-drawer',
  imports: [ReactiveFormsModule, Icon, DynamicForm, FieldInput],
  templateUrl: './editor-drawer.html',
  styleUrl: './editor-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKeydown($event)' },
})
export class EditorDrawer implements OnInit {
  collection = input.required<Collection>();
  doc = input<DocRecord | null>(null);
  closed = output<void>();

  private fb = inject(FormBuilder);
  private store = inject(DocumentsStore);
  private toasts = inject(ToastService);
  private titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  protected formSig = signal<FormGroup | null>(null);
  protected saving = signal(false);
  protected confirmDiscard = signal(false);
  protected fullDate = fullDate;
  protected timeAgo = timeAgo;
  protected tagsDef: FieldDef = { id: 'doc-tags', key: 'tags', label: 'Tags', type: 'tags', required: false, placeholder: 'birds, dawn, water…' };

  constructor() {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => { document.body.style.overflow = prevOverflow; });
    afterNextRender(() => this.titleInput()?.nativeElement.focus());
  }

  ngOnInit() {
    const d = this.doc();
    const form = this.fb.nonNullable.group({
      title: [d?.title ?? '', [Validators.required, Validators.maxLength(160)]],
      tags: [d?.tags ?? [] as string[]],
      starred: [d?.starred ?? false],
      values: buildValuesGroup(this.fb, this.collection().schema, d?.values ?? {}),
    });
    this.formSig.set(form);
  }

  protected valuesGroup(f: FormGroup): FormGroup {
    return f.get('values') as FormGroup;
  }

  protected asFc(f: FormGroup, key: string): FormControl {
    return f.get(key) as FormControl;
  }

  protected titleError(f: FormGroup): string | null {
    const c = f.get('title')!;
    if (!(c.invalid && (c.touched || c.dirty))) return null;
    return c.errors?.['required'] ? 'A title is required.' : 'Keep it under 160 characters.';
  }

  protected flipStar(f: FormGroup) {
    const c = f.get('starred')!;
    c.setValue(!c.value);
    c.markAsDirty();
  }

  protected onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (!(ke.target as HTMLElement).closest('textarea') && !ke.ctrlKey && !ke.metaKey) {
      event.preventDefault(); // Enter never implicitly submits; Ctrl/⌘+Enter does.
    }
  }

  protected onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.stopPropagation(); this.attemptClose(); }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); this.save(); }
  }

  protected attemptClose() {
    const f = this.formSig();
    if (f?.dirty && !this.saving()) this.confirmDiscard.set(true);
    else this.closed.emit();
  }

  protected async save() {
    const f = this.formSig();
    if (!f || this.saving()) return;
    if (f.invalid) {
      f.markAllAsTouched();
      this.toasts.warn('A few fields need attention before this can be filed.');
      const bad = document.querySelector('.ng-invalid') as HTMLElement | null;
      bad?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const raw = f.getRawValue();
    const payload = { title: raw.title.trim(), tags: raw.tags, starred: raw.starred, values: raw.values as Record<string, unknown> };
    this.saving.set(true);
    try {
      const d = this.doc();
      if (d) {
        const ok = await this.store.update(d.id, payload);
        if (ok) { this.toasts.success('Saved. The card is back on the desk.'); this.closed.emit(); }
      } else {
        const saved = await this.store.create({ collectionId: this.collection().id, ...payload });
        if (saved) { this.toasts.success(`Filed to ${this.collection().name}.`); this.closed.emit(); }
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteDoc(d: DocRecord) {
    this.closed.emit();
    await this.store.remove(d);
  }
}
