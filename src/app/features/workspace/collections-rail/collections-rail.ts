import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Collection } from '../../../core/models';
import { tint } from '../../../core/format';
import { HealthService } from '../../../core/health.service';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-collections-rail',
  imports: [RouterLink, Icon],
  templateUrl: './collections-rail.html',
  styleUrl: './collections-rail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionsRail {
  collections = input.required<Collection[]>();
  activeId = input<string | undefined>();
  loading = input(false);
  create = output<void>();
  edit = output<Collection>();
  reset = output<void>();

  protected health = inject(HealthService);
  protected confirmReset = signal(false);
  protected tint = tint;
}