import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Tiny local document database: one JSON file, debounced atomic writes. */
export class JsonDb {
  constructor(file) {
    this.file = file;
    this.data = null;
    this._timer = null;
  }

  load(seedFn) {
    if (existsSync(this.file)) {
      try {
        this.data = JSON.parse(readFileSync(this.file, 'utf8'));
        return this.data;
      } catch {
        console.warn('[folio-db] folio.json was corrupt — reseeding demo data.');
      }
    }
    this.data = seedFn();
    this.flushSync();
    return this.data;
  }

  /** Debounced write: tmp file + rename, so a crash never truncates the store. */
  flush() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.flushSync(), 120);
  }

  flushSync() {
    clearTimeout(this._timer);
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.file);
  }
}