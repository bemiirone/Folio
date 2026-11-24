import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, afterNextRender,
  inject, input, output, signal, viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Collection, EMOJIS, PALETTE } from '../../../core/models';
import { CollectionsStore } from '../../../state/collections.store';
import { ToastService } from '../../../core/toast.service';
import { Icon } from '../../../shared/icon/icon';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-collection-dialog',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './collection-dialog.html',
  styleUrl: './collection-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'closed.emit()' },
})
export class CollectionDialog implements OnInit {
  collection = input<Collection | null>(null);
  closed = output<void>();

  private fb = inject(FormBuilder);
  private store = inject(CollectionsStore);
  private toasts = inject(ToastService);
  private router = inject(Router);
  private nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  protected emojis = EMOJIS;
  protected palette = PALETTE;
  protected pending = signal(false);
  protected confirmDelete = signal(false);

  protected form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    description: [''],
    emoji: ['🗂️'],
    color: [PALETTE[0] as string],
  });

  constructor() {
    const body = inject(DOCUMENT).body;
    const prev = body.style.overflow;
    body.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => { body.style.overflow = prev; });
    afterNextRender(() => this.nameInput()?.nativeElement.focus());
  }

  ngOnInit() {
    const col = this.collection();
    if (col) {
      this.form.setValue({ name: col.name, description: col.description, emoji: col.emoji, color: col.color });
    } else {
      this.form.controls.color.setValue(PALETTE[this.store.entities().length % PALETTE.length]);
    }
  }

  protected pick(control: 'emoji' | 'color', value: string) {
    this.form.controls[control].setValue(value);
    this.form.controls[control].markAsDirty();
  }

  protected async submit() {
    if (this.pending()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.pending.set(true);
    try {
      const col = this.collection();
      if (col) {
        const ok = await this.store.update(col.id, {
          name: v.name.trim(), description: v.description, emoji: v.emoji, color: v.color,
        });
        if (ok) { this.toasts.success('Collection updated.'); this.closed.emit(); }
      } else {
        const created = await this.store.create({
          name: v.name.trim(), description: v.description, emoji: v.emoji, color: v.color,
        });
        if (created) {
          this.toasts.success('Collection created — now design its fields.');
          this.closed.emit();
          await this.router.navigate(['/collections', created.id]);
        }
      }
    } finally {
      this.pending.set(false);
    }
  }

  protected async deleteCollection(col: Collection) {
    this.pending.set(true);
    const ok = await this.store.remove(col.id);
    this.pending.set(false);
    if (ok) this.closed.emit();
  }
}
