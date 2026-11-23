import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, merge, of, switchMap, timer } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private api = inject(ApiService);
  private ping$ = new Subject<void>();

  readonly health = toSignal(
    merge(timer(0, 15_000), this.ping$).pipe(
      switchMap(() => this.api.health().pipe(catchError(() => of(null)))),
    ),
  );

  readonly state = computed<'checking' | 'online' | 'offline'>(() => {
    const h = this.health();
    return h === undefined ? 'checking' : h === null ? 'offline' : 'online';
  });

  ping() { this.ping$.next(); }
}