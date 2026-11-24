import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DocRecord, FieldDef } from '../../../core/models';
import { formatValue, timeAgo } from '../../../core/format';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-document-card',
  imports: [Icon],
  templateUrl: './document-card.html',
  styleUrl: './document-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentCard {
  doc = input.required<DocRecord>();
  schema = input.required<FieldDef[]>();
  color = input.required<string>();
  selected = input(false);
  anySelection = input(false);

  open = output<DocRecord>();
  star = output<DocRecord>();
  duplicate = output<DocRecord>();
  remove = output<DocRecord>();
  select = output<string>();

  protected timeAgo = timeAgo;

  protected previewDefs(): FieldDef[] {
    return this.schema().filter((d) => d.type !== 'textarea' && d.type !== 'tags').slice(0, 2);
  }

  protected value(def: FieldDef): string {
    return formatValue(def, this.doc().values[def.key]);
  }
}
