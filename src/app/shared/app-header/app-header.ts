import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HealthService } from '../../core/health.service';
import { isTypingTarget } from '../../core/format';
import { Typeahead } from '../typeahead/typeahead';

@Component({
  selector: 'app-header',
  imports: [RouterLink, Typeahead],
  templateUrl: './app-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class AppHeader {
  protected health = inject(HealthService);
  private typeahead = viewChild(Typeahead);

  protected onShortcut(event: KeyboardEvent) {
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event)) {
      event.preventDefault();
      this.typeahead()?.focusInput();
    }
  }
}
