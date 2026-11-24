import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { FieldDef } from '../../core/models';
import { FieldInput } from '../field-input/field-input';

@Component({
  selector: 'app-dynamic-form',
  imports: [FieldInput],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicForm {
  defs = input.required<FieldDef[]>();
  group = input.required<FormGroup>();
  tone = input<'desk' | 'paper'>('paper');

  protected controls = computed(() => {
    const g = this.group();
    const map: Record<string, FormControl> = {};
    for (const def of this.defs()) {
      const c = g.get(def.key);
      if (c instanceof FormControl) map[def.key] = c;
    }
    return map;
  });

  protected wide(def: FieldDef): boolean {
    return def.type === 'textarea' || def.type === 'tags';
  }
}