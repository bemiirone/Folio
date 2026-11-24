import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FieldDef } from '../../core/models';
import { uid } from '../../core/format';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-field-input',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './field-input.html',
  styleUrl: './field-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldInput {
  def = input.required<FieldDef>();
  control = input.required<FormControl>();
  tone = input<'desk' | 'paper'>('paper');

  protected fid = `f-${uid()}`;
  protected draft = signal('');
  protected paper = () => this.tone() === 'paper';

  protected showError(): boolean {
    const c = this.control();
    return c.invalid && (c.touched || c.dirty);
  }

  protected errorText(): string | null {
    if (!this.showError()) return null;
    const e = this.control().errors ?? {};
    if (e['required']) return this.def().type === 'tags' ? 'Add at least one tag.' : 'This field is required.';
    if (e['email']) return 'Enter a valid email address.';
    if (e['min']) return `Minimum is ${e['min'].min}.`;
    if (e['max']) return `Maximum is ${e['max'].max}.`;
    return 'Please check this value.';
  }

  protected flip() {
    const c = this.control();
    c.setValue(c.value !== true);
    c.markAsDirty();
    c.markAsTouched();
  }

  protected tagsValue(): string[] {
    const v = this.control().value;
    return Array.isArray(v) ? v : [];
  }

  protected onDraft(event: Event) {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected commitTag() {
    const raw = this.draft().trim().replace(/,+$/, '').toLowerCase();
    if (!raw) { this.draft.set(''); return; }
    const next = [...new Set([...this.tagsValue(), ...raw.split(',').map((t) => t.trim()).filter(Boolean)])].slice(0, 12);
    const c = this.control();
    c.setValue(next);
    c.markAsDirty();
    c.markAsTouched();
    this.draft.set('');
  }

  protected removeTag(tag: string) {
    const c = this.control();
    c.setValue(this.tagsValue().filter((t) => t !== tag));
    c.markAsDirty();
  }

  protected onTagKey(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitTag();
    } else if (event.key === 'Backspace' && this.draft() === '' && this.tagsValue().length) {
      this.removeTag(this.tagsValue()[this.tagsValue().length - 1]);
    }
  }
}