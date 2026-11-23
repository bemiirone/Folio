import {
  ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { CollectionsStore } from '../../state/collections.store';
import { SearchHit } from '../../core/models';
import { highlightParts, tint } from '../../core/format';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-typeahead',
  imports: [Icon],
  templateUrl: './typeahead.html',
  styleUrl: './typeahead.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'onDocClick($event)' },
})
export class Typeahead {
  private api = inject(ApiService);
  private router = inject(Router);
  private collections = inject(CollectionsStore);
  private host = inject(ElementRef<HTMLElement>);
  private box = viewChild.required<ElementRef<HTMLInputElement>>('box');
  private query$ = new Subject<string>();

  protected query = signal('');
  protected focused = signal(false);
  protected searching = signal(false);
  protected active = signal(0);
  protected offline = signal(false);
  protected results = signal<SearchHit[]>([]);
  protected totalDocs = this.collections.totalDocs;
  protected tint = tint;

  protected open = computed(() =>
    this.focused() && (this.searching() || this.results().length > 0 || this.query().length > 0 || this.offline()));

  constructor() {
    this.query$.pipe(
      debounceTime(150),
      switchMap((q) => this.api.search(q).pipe(
        tap(() => this.offline.set(false)),
        catchError(() => { this.offline.set(true); return of([] as SearchHit[]); }),
      )),
      takeUntilDestroyed(),
    ).subscribe((hits) => {
      this.results.set(hits);
      this.active.set(0);
      this.searching.set(false);
    });
  }

  focusInput() { this.box().nativeElement.focus(); }

  protected parts(text: string) { return highlightParts(text, this.query()); }

  protected onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.searching.set(true);
    this.focused.set(true);
    this.query$.next(value);
  }

  protected onFocus() {
    this.focused.set(true);
    if (!this.results().length) {
      this.searching.set(true);
      this.query$.next(this.query());
    }
  }

  protected onKey(event: KeyboardEvent) {
    const n = this.results().length;
    if (event.key === 'ArrowDown' && n) {
      event.preventDefault();
      this.active.set((this.active() + 1) % n);
    } else if (event.key === 'ArrowUp' && n) {
      event.preventDefault();
      this.active.set((this.active() - 1 + n) % n);
    } else if (event.key === 'Enter') {
      const hit = this.results()[this.active()];
      if (hit) { event.preventDefault(); this.select(hit); }
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      this.focused.set(false);
      if (event.key === 'Escape') this.box().nativeElement.blur();
    }
  }

  protected select(hit: SearchHit) {
    this.focused.set(false);
    this.searching.set(false);
    this.query.set('');
    this.results.set([]);
    this.box().nativeElement.blur();
    this.router.navigate(['/collections', hit.collectionId], { queryParams: { open: hit.doc.id } });
  }

  protected clear() {
    this.query.set('');
    this.results.set([]);
    this.searching.set(true);
    this.query$.next('');
    this.focusInput();
  }

  protected onDocClick(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.focused.set(false);
  }
}
