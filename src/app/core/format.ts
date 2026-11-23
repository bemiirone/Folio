import { FieldDef } from './models';

export const uid = (): string => Math.random().toString(36).slice(2, 10);

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_{2,}/g, '_').slice(0, 40);
}

export function tint(hex: string, percent: number): string {
  return `color-mix(in srgb, ${hex} ${percent}%, transparent)`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateValue(value: string): string {
  const d = new Date(value + 'T00:00:00');
  return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatValue(def: FieldDef, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (def.type) {
    case 'toggle': return value ? 'Yes' : 'No';
    case 'tags': return Array.isArray(value) && value.length ? value.join(', ') : '—';
    case 'date': return formatDateValue(String(value));
    case 'number': return Number(value).toLocaleString();
    default: return String(value);
  }
}

export interface HighlightPart { text: string; hit: boolean }

export function highlightParts(text: string, query: string): HighlightPart[] {
  const q = query.trim().toLowerCase();
  if (!q) return [{ text, hit: false }];
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return [{ text, hit: false }];
  const parts: HighlightPart[] = [];
  if (idx > 0) parts.push({ text: text.slice(0, idx), hit: false });
  parts.push({ text: text.slice(idx, idx + q.length), hit: true });
  if (idx + q.length < text.length) parts.push({ text: text.slice(idx + q.length), hit: false });
  return parts;
}

export function isTypingTarget(event: Event): boolean {
  const el = event.target as HTMLElement | null;
  return !!el?.closest('input, textarea, select, [contenteditable="true"]');
}