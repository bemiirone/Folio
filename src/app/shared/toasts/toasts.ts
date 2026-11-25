import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastKind, ToastService } from '../../core/toast.service';
import { Icon, IconName } from '../icon/icon';

const KIND_ICON: Record<ToastKind, IconName> = { success: 'check-circle', error: 'exclamation-triangle', info: 'information-circle', warn: 'exclamation-triangle' };
const KIND_TEXT: Record<ToastKind, string> = {
  success: 'text-viridian-400', error: 'text-vermil-400', info: 'text-cobalt-400', warn: 'text-amber-400',
};
const KIND_BAR: Record<ToastKind, string> = {
  success: 'bg-viridian-500', error: 'bg-vermil-500', info: 'bg-cobalt-500', warn: 'bg-amber-400',
};

@Component({
  selector: 'app-toasts',
  imports: [Icon],
  templateUrl: './toasts.html',
  styleUrl: './toasts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toasts {
  protected toasts = inject(ToastService);
  protected icon = (k: ToastKind) => KIND_ICON[k];
  protected text = (k: ToastKind) => KIND_TEXT[k];
  protected bar = (k: ToastKind) => KIND_BAR[k];
}
