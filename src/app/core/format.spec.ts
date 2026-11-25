import {
  uid, slugify, tint, timeAgo, fullDate, formatDateValue,
  formatValue, highlightParts, isTypingTarget,
} from './format';
import { FieldDef } from './models';

describe('format.ts', () => {
  describe('uid', () => {
    it('returns a string', () => {
      expect(typeof uid()).toBe('string');
    });

    it('returns an 8-character string (chars 2..10 of base-36)', () => {
      const id = uid();
      expect(id.length).toBe(8);
    });

    it('returns different values on successive calls', () => {
      expect(uid()).not.toBe(uid());
    });
  });

  describe('slugify', () => {
    it('lowercases text', () => {
      expect(slugify('Hello World')).toBe('hello_world');
    });

    it('replaces non-alphanumeric characters with underscores', () => {
      expect(slugify('Hello-World!')).toBe('hello_world');
    });

    it('removes leading/trailing underscores', () => {
      expect(slugify('__hello__')).toBe('hello');
    });

    it('collapses multiple underscores', () => {
      expect(slugify('hello___world')).toBe('hello_world');
    });

    it('truncates to 40 characters', () => {
      const long = 'a'.repeat(50);
      expect(slugify(long).length).toBe(40);
    });

    it('handles already clean text', () => {
      expect(slugify('hello_world')).toBe('hello_world');
    });
  });

  describe('tint', () => {
    it('returns a color-mix string', () => {
      expect(tint('#FFB224', 50)).toBe('color-mix(in srgb, #FFB224 50%, transparent)');
    });

    it('works with 0 percent', () => {
      expect(tint('#F04A32', 0)).toBe('color-mix(in srgb, #F04A32 0%, transparent)');
    });

    it('works with 100 percent', () => {
      expect(tint('#5B8CFF', 100)).toBe('color-mix(in srgb, #5B8CFF 100%, transparent)');
    });
  });

  describe('timeAgo', () => {
    it('returns "just now" for recent timestamps', () => {
      const now = new Date(Date.now() - 10_000).toISOString();
      expect(timeAgo(now)).toBe('just now');
    });

    it('returns minutes ago', () => {
      const then = new Date(Date.now() - 5 * 60_000).toISOString();
      expect(timeAgo(then)).toBe('5m ago');
    });

    it('returns hours ago', () => {
      const then = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
      expect(timeAgo(then)).toBe('3h ago');
    });

    it('returns days ago for less than a week', () => {
      const then = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString();
      expect(timeAgo(then)).toBe('3d ago');
    });

    it('returns date format for older dates', () => {
      const then = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
      const result = timeAgo(then);
      // Should be like "1 Nov" or "31 Oct" — not "Xd ago"
      expect(result).not.toContain(' ago');
    });
  });

  describe('fullDate', () => {
    it('formats a date in en-GB style', () => {
      const result = fullDate('2025-03-15T00:00:00Z');
      expect(result).toContain('Mar');
      expect(result).toContain('2025');
    });
  });

  describe('formatDateValue', () => {
    it('formats a YYYY-MM-DD date value', () => {
      expect(formatDateValue('2025-06-21')).toContain('Jun');
      expect(formatDateValue('2025-06-21')).toContain('2025');
    });

    it('returns the original value for invalid dates', () => {
      expect(formatDateValue('not-a-date')).toBe('not-a-date');
    });
  });

  describe('formatValue', () => {
    const makeDef = (type: FieldDef['type'], required = false): FieldDef => ({
      id: '1', key: 'test', label: 'Test', type, required,
    });

    it('returns em-dash for null', () => {
      expect(formatValue(makeDef('text'), null)).toBe('—');
    });

    it('returns em-dash for undefined', () => {
      expect(formatValue(makeDef('text'), undefined)).toBe('—');
    });

    it('returns em-dash for empty string', () => {
      expect(formatValue(makeDef('text'), '')).toBe('—');
    });

    it('returns Yes/No for toggle', () => {
      expect(formatValue(makeDef('toggle'), true)).toBe('Yes');
      expect(formatValue(makeDef('toggle'), false)).toBe('No');
    });

    it('joins tags with commas', () => {
      expect(formatValue(makeDef('tags'), ['alpha', 'beta'])).toBe('alpha, beta');
    });

    it('returns em-dash for empty tags array', () => {
      expect(formatValue(makeDef('tags'), [])).toBe('—');
    });

    it('formats dates', () => {
      expect(formatValue(makeDef('date'), '2025-06-21')).toContain('Jun');
    });

    it('formats numbers with locale', () => {
      expect(formatValue(makeDef('number'), 1234.5)).toContain('1');
    });

    it('returns string for text type', () => {
      expect(formatValue(makeDef('text'), 'hello')).toBe('hello');
    });
  });

  describe('highlightParts', () => {
    it('returns single non-hit part when query is empty', () => {
      const parts = highlightParts('Hello World', '');
      expect(parts).toEqual([{ text: 'Hello World', hit: false }]);
    });

    it('returns single non-hit part when query is whitespace only', () => {
      const parts = highlightParts('Hello World', '   ');
      expect(parts).toEqual([{ text: 'Hello World', hit: false }]);
    });

    it('splits text into hit and non-hit parts', () => {
      const parts = highlightParts('Hello World', 'World');
      expect(parts).toEqual([
        { text: 'Hello ', hit: false },
        { text: 'World', hit: true },
      ]);
    });

    it('handles match at start of text', () => {
      const parts = highlightParts('Hello World', 'Hello');
      expect(parts).toEqual([
        { text: 'Hello', hit: true },
        { text: ' World', hit: false },
      ]);
    });

    it('handles case-insensitive matching', () => {
      const parts = highlightParts('Hello World', 'world');
      expect(parts).toEqual([
        { text: 'Hello ', hit: false },
        { text: 'World', hit: true },
      ]);
    });

    it('returns single non-hit when no match', () => {
      const parts = highlightParts('Hello World', 'xyz');
      expect(parts).toEqual([{ text: 'Hello World', hit: false }]);
    });

    it('handles match in the middle', () => {
      const parts = highlightParts('Hello World', 'lo Wo');
      expect(parts).toEqual([
        { text: 'Hel', hit: false },
        { text: 'lo Wo', hit: true },
        { text: 'rld', hit: false },
      ]);
    });
  });

  describe('isTypingTarget', () => {
    it('returns true for input element', () => {
      const input = document.createElement('input');
      const event = { target: input } as unknown as Event;
      expect(isTypingTarget(event)).toBe(true);
    });

    it('returns true for textarea element', () => {
      const textarea = document.createElement('textarea');
      const event = { target: textarea } as unknown as Event;
      expect(isTypingTarget(event)).toBe(true);
    });

    it('returns true for element inside input', () => {
      const input = document.createElement('input');
      const event = { target: input } as unknown as Event;
      expect(isTypingTarget(event)).toBe(true);
    });

    it('returns false for div element', () => {
      const div = document.createElement('div');
      const event = { target: div } as unknown as Event;
      expect(isTypingTarget(event)).toBe(false);
    });

    it('returns true for contenteditable element', () => {
      const el = document.createElement('div');
      el.setAttribute('contenteditable', 'true');
      const event = { target: el } as unknown as Event;
      expect(isTypingTarget(event)).toBe(true);
    });

    it('returns true for element inside contenteditable', () => {
      const parent = document.createElement('div');
      parent.setAttribute('contenteditable', 'true');
      const child = document.createElement('span');
      parent.appendChild(child);
      const event = { target: child } as unknown as Event;
      expect(isTypingTarget(event)).toBe(true);
    });
  });
});
