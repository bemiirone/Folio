import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const ICONS = {
  search: { d: ['M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14', 'm16.5 16.5 4 4'] },
  plus: { d: ['M12 5v14', 'M5 12h14'] },
  x: { d: ['M6 6l12 12', 'M18 6L6 18'] },
  check: { d: ['m5 12.5 4.5 4.5L19 7'] },
  trash: { d: ['M4 7h16', 'M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2', 'M6.5 7l1 12a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12', 'M10 11v6', 'M14 11v6'] },
  pencil: { d: ['M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3'] },
  star: { d: ['M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9L12 3.5'] },
  'chevron-down': { d: ['m6 9 6 6 6-6'] },
  'chevron-right': { d: ['m9 6 6 6-6 6'] },
  'arrow-up': { d: ['M12 19V5', 'm5 12 7-7 7 7'] },
  'arrow-down': { d: ['M12 5v14', 'm19 12-7 7-7-7'] },
  grip: { d: ['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01'], w: 2.8 },
  database: { d: ['M12 3c-4.4 0-8 1.3-8 3v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0-1.7-3.6-3-8-3', 'M4 6c0 1.7 3.6 3 8 3s8-1.3 8-3', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'] },
  file: { d: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5', 'M14 3v5h5', 'M9 13h6', 'M9 17h6'] },
  sliders: { d: ['M4 8h10', 'M18 8h2', 'M16 6v4', 'M4 16h2', 'M10 16h10', 'M8 14v4'] },
  grid: { d: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'] },
  clock: { d: ['M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16', 'M12 8v4l2.5 2.5'] },
  alert: { d: ['M12 3 2.5 20h19L12 3', 'M12 9.5v4.5', 'M12 17h.01'], w: 2 },
  undo: { d: ['M4 10h11a5 5 0 0 1 0 10h-4', 'M8 6l-4 4 4 4'] },
  loader: { d: ['M12 3a9 9 0 1 0 9 9'], w: 2.2 },
  copy: { d: ['M11 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'] },
  feather: { d: ['M20.2 3.8a6 6 0 0 0-8.5 0L4 11.5V20h8.5l7.7-7.7a6 6 0 0 0 0-8.5', 'M16 8 2 22', 'M17.5 15H9'] },
  save: { d: ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2', 'M17 21v-8H7v8', 'M7 3v5h8'] },
  tag: { d: ['M3 3h8l10 10-8 8L3 11V3', 'M7.5 7.5h.01'], w: 2 },
  sparkles: { d: ['M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15'] },
  'check-circle': { d: ['M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16', 'm8.5 12.5 2.5 2.5 4.5-5'] },
  info: { d: ['M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16', 'M12 11v5', 'M12 8h.01'], w: 2 },
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  name = input.required<IconName>();
  filled = input(false);
  protected spec = computed(() => ICONS[this.name()] as { d: readonly string[]; w?: number });
}
