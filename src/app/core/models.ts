export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'tags' | 'toggle' | 'email';

export const FIELD_TYPES: ReadonlyArray<{ value: FieldType; label: string }> = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'tags', label: 'Tags' },
  { value: 'toggle', label: 'Toggle' },
  { value: 'email', label: 'Email' },
];

export const PALETTE = ['#FFB224', '#F04A32', '#5B8CFF', '#23C48E', '#E86BD0', '#9D7BFF', '#B7E34D', '#39C6E8'] as const;

export const EMOJIS = ['🗂️', '📓', '📚', '🧭', '🍳', '🌿', '🧪', '🎬', '🎧', '🏔️', '🐦', '✈️'] as const;

export interface FieldDef {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  min?: number | null;
  max?: number | null;
}

export interface Collection {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  schema: FieldDef[];
  createdAt: string;
  updatedAt: string;
  docCount?: number;
}

export interface DocRecord {
  id: string;
  collectionId: string;
  title: string;
  values: Record<string, unknown>;
  tags: string[];
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchHit {
  doc: DocRecord;
  collectionId: string;
  collectionName: string;
  emoji: string;
  color: string;
  snippet: string;
  matchField: string;
}

export interface Health {
  ok: boolean;
  name: string;
  version: string;
  collections: number;
  docs: number;
  uptime: number;
  storage: string;
}

export type SortKey = 'updated_desc' | 'updated_asc' | 'title_asc' | 'created_desc';
export type DocFilter = 'all' | 'starred';

export interface LoadDocsParams {
  collectionId: string;
  q: string;
  sort: SortKey;
  filter: DocFilter;
  tag: string | null;
  refresh?: number;
}

export interface NewDocumentInput {
  collectionId: string;
  title: string;
  values: Record<string, unknown>;
  tags: string[];
  starred: boolean;
}

export interface NewCollectionInput {
  name: string;
  description?: string;
  emoji?: string;
  color?: string;
}

export interface RemovedCollection {
  collection: Collection;
  documents: DocRecord[];
}

/** Per-collection saved view (sort / filter / tag) persisted to localStorage. */
export interface ViewPrefs {
  sort: SortKey;
  filter: DocFilter;
  tag: string | null;
}

const VIEW_KEY = 'folio.view.';

export function loadViewPrefs(collectionId: string): ViewPrefs {
  const fallback: ViewPrefs = { sort: 'updated_desc', filter: 'all', tag: null };
  try {
    const raw = localStorage.getItem(VIEW_KEY + collectionId);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<ViewPrefs>;
    return {
      sort: (['updated_desc', 'updated_asc', 'title_asc', 'created_desc'] as const).includes(p.sort as SortKey) ? (p.sort as SortKey) : 'updated_desc',
      filter: p.filter === 'starred' ? 'starred' : 'all',
      tag: typeof p.tag === 'string' && p.tag ? p.tag : null,
    };
  } catch {
    return fallback;
  }
}

export function saveViewPrefs(collectionId: string, prefs: ViewPrefs): void {
  try {
    localStorage.setItem(VIEW_KEY + collectionId, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — views simply won't persist */
  }
}
