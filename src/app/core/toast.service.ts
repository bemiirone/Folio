import { Injectable, signal } from '@angular/core';
import { uid } from './format';

export type ToastKind = 'success' | 'error' | 'info' | 'warn';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  life: number;
  action?: { label: string; run: () => void | Promise<void> };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  success(message: string, action?: Toast['action']) { this.push('success', message, action); }
  error(message: string) { this.push('error', message); }
  info(message: string, action?: Toast['action']) { this.push('info', message, action); }
  warn(message: string) { this.push('warn', message); }

  dismiss(id: string) {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  async runAction(toast: Toast) {
    try { await toast.action?.run(); } finally { this.dismiss(toast.id); }
  }

  private push(kind: ToastKind, message: string, action?: Toast['action']) {
    const life = kind === 'error' ? 8000 : action ? 7000 : 4000;
    const toast: Toast = { id: uid(), kind, message, life, action };
    this.toasts.update((list) => {
      const next = [...list, toast];
      while (next.length > 4) {
        const oldest = next.shift()!;
        clearTimeout(this.timers.get(oldest.id));
        this.timers.delete(oldest.id);
      }
      return next;
    });
    this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), life));
  }
}
