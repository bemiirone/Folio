import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { ViewPrefs, loadViewPrefs, saveViewPrefs, SortKey, DocFilter, FIELD_TYPES, COLLECTION_ICONS, PALETTE } from './models';

describe('models.ts', () => {
  let getItemMock: ReturnType<typeof vi.spyOn>;
  let setItemMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    getItemMock = vi.spyOn(Storage.prototype, 'getItem');
    setItemMock = vi.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadViewPrefs', () => {
    it('returns default prefs when no entry exists', () => {
      expect(loadViewPrefs('abc123')).toEqual({ sort: 'updated_desc', filter: 'all', tag: null });
    });

    it('returns saved prefs when entry exists', () => {
      const saved: ViewPrefs = { sort: 'title_asc', filter: 'starred', tag: 'urgent' };
      localStorage.setItem('folio.view.abc123', JSON.stringify(saved));
      expect(loadViewPrefs('abc123')).toEqual(saved);
    });

    it('falls back to defaults for invalid sort value', () => {
      localStorage.setItem('folio.view.abc123', JSON.stringify({ sort: 'invalid' }));
      expect(loadViewPrefs('abc123').sort).toBe('updated_desc');
    });

    it('falls back to defaults for invalid filter value', () => {
      localStorage.setItem('folio.view.abc123', JSON.stringify({ filter: 'invalid' }));
      expect(loadViewPrefs('abc123').filter).toBe('all');
    });

    it('falls back to null for invalid tag value', () => {
      localStorage.setItem('folio.view.abc123', JSON.stringify({ tag: 123 }));
      expect(loadViewPrefs('abc123').tag).toBeNull();
    });

    it('falls back to defaults when localStorage throws', () => {
      getItemMock.mockImplementation(() => { throw new Error('Storage unavailable'); });
      expect(loadViewPrefs('abc123')).toEqual({ sort: 'updated_desc', filter: 'all', tag: null });
    });

    it('preserves all valid sort values', () => {
      const sorts: SortKey[] = ['updated_desc', 'updated_asc', 'title_asc', 'created_desc'];
      for (const s of sorts) {
        localStorage.setItem(`folio.view.test-${s}`, JSON.stringify({ sort: s }));
        expect(loadViewPrefs(`test-${s}`).sort).toBe(s);
      }
    });

    it('preserves starred filter', () => {
      localStorage.setItem('folio.view.starred-test', JSON.stringify({ filter: 'starred' }));
      expect(loadViewPrefs('starred-test').filter).toBe('starred');
    });

    it('preserves non-empty tag string', () => {
      localStorage.setItem('folio.view.tag-test', JSON.stringify({ tag: 'important' }));
      expect(loadViewPrefs('tag-test').tag).toBe('important');
    });

    it('falls back to null for empty tag string', () => {
      localStorage.setItem('folio.view.empty-tag', JSON.stringify({ tag: '' }));
      expect(loadViewPrefs('empty-tag').tag).toBeNull();
    });
  });

  describe('saveViewPrefs', () => {
    it('saves prefs to localStorage', () => {
      const prefs: ViewPrefs = { sort: 'title_asc', filter: 'starred', tag: 'work' };
      saveViewPrefs('xyz789', prefs);
      const saved = JSON.parse(localStorage.getItem('folio.view.xyz789')!);
      expect(saved).toEqual(prefs);
    });

    it('does not throw when localStorage is unavailable', () => {
      setItemMock.mockImplementation(() => { throw new Error('Storage unavailable'); });
      expect(() => saveViewPrefs('fail', { sort: 'updated_desc', filter: 'all', tag: null })).not.toThrow();
    });
  });

  describe('FIELD_TYPES', () => {
    it('contains all expected field types', () => {
      const types = FIELD_TYPES.map(t => t.value);
      ['text', 'textarea', 'number', 'date', 'select', 'tags', 'toggle', 'email'].forEach(t => expect(types).toContain(t));
    });

    it('has labels for each type', () => {
      FIELD_TYPES.forEach(ft => {
        expect(ft.label).toBeTruthy();
        expect(typeof ft.label).toBe('string');
      });
    });
  });

  describe('PALETTE', () => {
    it('contains 8 colors', () => {
      expect(PALETTE.length).toBe(8);
    });

    it('all colors are valid hex strings', () => {
      PALETTE.forEach(c => expect(c).toMatch(/^#[0-9A-F]{6}$/));
    });
  });

  describe('COLLECTION_ICONS', () => {
    it('contains expected icons', () => {
      expect(COLLECTION_ICONS).toContain('folder');
      expect(COLLECTION_ICONS).toContain('book-open');
      expect(COLLECTION_ICONS).toContain('map');
    });

    it('has the correct count', () => {
      expect(COLLECTION_ICONS.length).toBe(11);
    });
  });
});
