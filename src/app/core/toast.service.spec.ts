import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [ToastService] });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with an empty toasts list', () => {
      expect(service.toasts()).toEqual([]);
    });
  });

  describe('pushing toasts', () => {
    it('adds a success toast', () => {
      service.success('All good!');
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].kind).toBe('success');
      expect(service.toasts()[0].message).toBe('All good!');
    });

    it('adds an error toast', () => {
      service.error('Oops!');
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].kind).toBe('error');
    });

    it('adds an info toast', () => {
      service.info('FYI');
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].kind).toBe('info');
    });

    it('adds a warn toast', () => {
      service.warn('Watch out');
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].kind).toBe('warn');
    });

    it('assigns a unique id to each toast', () => {
      service.success('First');
      service.success('Second');
      expect(service.toasts()[0].id).not.toBe(service.toasts()[1].id);
    });

    it('sets error life to 8000ms', () => {
      service.error('Error!');
      expect(service.toasts()[0].life).toBe(8000);
    });

    it('sets life to 7000ms for toasts with actions', () => {
      service.info('Info with action', { label: 'Undo', run: () => {} });
      expect(service.toasts()[0].life).toBe(7000);
    });

    it('sets life to 4000ms for toasts without actions', () => {
      service.success('Success');
      expect(service.toasts()[0].life).toBe(4000);
    });
  });

  describe('dismiss', () => {
    it('removes a toast by id', () => {
      service.success('Hello');
      const id = service.toasts()[0].id;
      service.dismiss(id);
      expect(service.toasts().length).toBe(0);
    });

    it('does nothing for non-existent id', () => {
      service.success('Hello');
      service.dismiss('non-existent');
      expect(service.toasts().length).toBe(1);
    });
  });

  describe('runAction', () => {
    it('executes the action and dismisses the toast', async () => {
      let ran = false;
      service.info('Info', { label: 'Undo', run: () => { ran = true; } });
      const toast = service.toasts()[0];
      expect(ran).toBe(false);

      await service.runAction(toast);
      expect(ran).toBe(true);
      expect(service.toasts().length).toBe(0);
    });

    it('dismisses the toast even if the action throws', async () => {
      service.info('Info', { label: 'Retry', run: () => { throw new Error('fail'); } });
      const toast = service.toasts()[0];

      try {
        await service.runAction(toast);
      } catch {
        // expected
      }
      expect(service.toasts().length).toBe(0);
    });
  });

  describe('toast limit', () => {
    it('keeps max 4 toasts, removing oldest when exceeded', () => {
      service.success('1');
      service.success('2');
      service.success('3');
      service.success('4');
      service.success('5');
      expect(service.toasts().length).toBe(4);
      expect(service.toasts()[0].message).toBe('2');
      expect(service.toasts()[3].message).toBe('5');
    });
  });

  describe('auto-dismiss timers', () => {
    it('auto-dismisses toasts after their life period', () => {
      service.success('Quick');
      expect(service.toasts().length).toBe(1);
      vi.advanceTimersByTime(4100);
      expect(service.toasts().length).toBe(0);
    });

    it('auto-dismisses error toasts after 8s', () => {
      service.error('Error!');
      expect(service.toasts().length).toBe(1);
      vi.advanceTimersByTime(8100);
      expect(service.toasts().length).toBe(0);
    });

    it('auto-dismisses info with action after 7s', () => {
      service.info('Info', { label: 'Undo', run: () => {} });
      expect(service.toasts().length).toBe(1);
      vi.advanceTimersByTime(7100);
      expect(service.toasts().length).toBe(0);
    });
  });
});
