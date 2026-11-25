import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { JsonDb } from './db.mjs';
import { seed } from './seed.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FILE = join(here, 'data', 'folio.json');
const PORT = process.env['PORT'] || 3000;

const db = new JsonDb(FILE);
db.load(seed);

const app = express();
app.use(express.json({ limit: '2mb' }));

// CORS for anyone running `ng serve` without the proxy; harmless with it.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  const t = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - t}ms)`));
  next();
});

/* ---------- helpers ---------- */

const FIELD_TYPES = new Set(['text', 'textarea', 'number', 'date', 'select', 'tags', 'toggle', 'email']);
const PALETTE = ['#FFB224', '#F04A32', '#5B8CFF', '#23C48E', '#E86BD0', '#9D7BFF', '#B7E34D', '#39C6E8'];
const SORTS = {
  updated_desc: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  updated_asc: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  title_asc: (a, b) => a.title.localeCompare(b.title),
  created_desc: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

const now = () => new Date().toISOString();
const bad = (res, message) => res.status(400).json({ message });
const missing = (res, what) => res.status(404).json({ message: `${what} not found.` });
const findCollection = (id) => db.data.collections.find((c) => c.id === id);
const findDoc = (id) => db.data.documents.find((d) => d.id === id);
const withCount = (c) => ({ ...c, docCount: db.data.documents.filter((d) => d.collectionId === c.id).length });
const touch = (c) => { c.updatedAt = now(); };

const flatValue = (v) => Array.isArray(v) ? v.join(' ') : v == null ? '' : String(v);
const docHaystack = (d) => [d.title, d.tags.join(' '), ...Object.values(d.values).map(flatValue)].join(' \u0001 ').toLowerCase();

function sanitizeSchema(raw) {
  if (!Array.isArray(raw)) return null;
  const seen = new Set();
  const out = [];
  for (const f of raw.slice(0, 40)) {
    if (!f || typeof f !== 'object') continue;
    let key = String(f.key ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    if (!/^[a-z][a-z0-9_]*$/.test(key) || !FIELD_TYPES.has(f.type)) continue;
    while (seen.has(key)) key += '_2';
    seen.add(key);
    out.push({
      id: typeof f.id === 'string' && f.id ? f.id : randomUUID().slice(0, 8),
      key,
      label: String(f.label ?? key).slice(0, 80) || key,
      type: f.type,
      required: Boolean(f.required),
      ...(f.type === 'select' ? { options: (Array.isArray(f.options) ? f.options : []).map((o) => String(o).slice(0, 60)).filter(Boolean).slice(0, 24) } : {}),
      ...(f.type === 'number' ? { min: Number.isFinite(f.min) ? f.min : null, max: Number.isFinite(f.max) ? f.max : null } : {}),
      ...(f.placeholder ? { placeholder: String(f.placeholder).slice(0, 120) } : {}),
    });
  }
  return out;
}

function docInput(body, res) {
  const title = String(body?.title ?? '').trim();
  if (!title) { bad(res, 'A document needs a title.'); return null; }
  const values = {};
  if (body?.values && typeof body.values === 'object') {
    for (const [k, v] of Object.entries(body.values)) {
      if (['__proto__', 'constructor', 'prototype'].includes(k)) continue;
      values[k] = v;
    }
  }
  const tags = [...new Set((Array.isArray(body?.tags) ? body.tags : []).map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  return { title: title.slice(0, 160), values, tags, starred: Boolean(body?.starred) };
}

/* ---------- health & meta ---------- */

app.get('/api/health', (_req, res) => res.json({
  ok: true, name: 'folio-local', version: '1.0.0',
  collections: db.data.collections.length, docs: db.data.documents.length,
  uptime: Math.round(process.uptime()), storage: 'server/data/folio.json',
}));

app.post('/api/reset', (_req, res) => {
  db.data = seed();
  db.flush();
  res.json({ ok: true, collections: db.data.collections.length, docs: db.data.documents.length });
});

/* ---------- collections ---------- */

app.get('/api/collections', (_req, res) => {
  const cols = [...db.data.collections].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(withCount);
  res.json(cols);
});

app.post('/api/collections', (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) return bad(res, 'A collection needs a name.');
  const col = {
    id: randomUUID(), name: name.slice(0, 60),
    description: String(req.body?.description ?? '').slice(0, 200),
    icon: req.body?.icon ?? 'folder',
    color: /^#[0-9a-fA-F]{6}$/.test(req.body?.color ?? '') ? req.body.color : PALETTE[db.data.collections.length % PALETTE.length],
    schema: sanitizeSchema(req.body?.schema ?? []) ?? [],
    createdAt: now(), updatedAt: now(),
  };
  db.data.collections.push(col);
  db.flush();
  res.status(201).json(withCount(col));
});

app.patch('/api/collections/:id', (req, res) => {
  const col = findCollection(req.params.id);
  if (!col) return missing(res, 'Collection');
  const b = req.body ?? {};
  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (!name) return bad(res, 'A collection needs a name.');
    col.name = name.slice(0, 60);
  }
  if (b.description !== undefined) col.description = String(b.description).slice(0, 200);
  if (b.icon !== undefined) col.icon = b.icon;
  if (b.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(b.color)) col.color = b.color;
  if (b.schema !== undefined) {
    const schema = sanitizeSchema(b.schema);
    if (!schema) return bad(res, 'Schema must be an array of field definitions.');
    col.schema = schema;
  }
  touch(col);
  db.flush();
  res.json(withCount(col));
});

app.delete('/api/collections/:id', (req, res) => {
  const col = findCollection(req.params.id);
  if (!col) return missing(res, 'Collection');
  const documents = db.data.documents.filter((d) => d.collectionId === col.id);
  db.data.collections = db.data.collections.filter((c) => c.id !== col.id);
  db.data.documents = db.data.documents.filter((d) => d.collectionId !== col.id);
  db.flush();
  res.json({ collection: col, documents });
});

app.post('/api/collections/restore', (req, res) => {
  const { collection, documents } = req.body ?? {};
  if (!collection?.id) return bad(res, 'Nothing to restore.');
  if (!findCollection(collection.id)) db.data.collections.push(collection);
  const inserted = [];
  for (const d of Array.isArray(documents) ? documents : []) {
    if (d?.id && !findDoc(d.id)) { db.data.documents.push(d); inserted.push(d); }
  }
  db.flush();
  res.json({ collection: withCount(findCollection(collection.id)), documents: inserted });
});

/* ---------- documents ---------- */

app.get('/api/collections/:id/documents', (req, res) => {
  const col = findCollection(req.params.id);
  if (!col) return missing(res, 'Collection');
  const q = String(req.query['q'] ?? '').trim().toLowerCase();
  const tag = String(req.query['tag'] ?? '').trim().toLowerCase();
  const starred = req.query['starred'] === '1';
  const sort = SORTS[String(req.query['sort'] ?? 'updated_desc')] ?? SORTS.updated_desc;
  let docs = db.data.documents.filter((d) => d.collectionId === col.id);
  if (starred) docs = docs.filter((d) => d.starred);
  if (tag) docs = docs.filter((d) => d.tags.some((t) => t.toLowerCase() === tag));
  if (q) docs = docs.filter((d) => docHaystack(d).includes(q));
  res.json([...docs].sort(sort));
});

app.post('/api/collections/:id/documents', (req, res) => {
  const col = findCollection(req.params.id);
  if (!col) return missing(res, 'Collection');
  const input = docInput(req.body, res);
  if (!input) return;
  const doc = { id: randomUUID(), collectionId: col.id, ...input, createdAt: now(), updatedAt: now() };
  db.data.documents.push(doc);
  touch(col);
  db.flush();
  res.status(201).json(doc);
});

app.get('/api/documents/:id', (req, res) => {
  const doc = findDoc(req.params.id);
  if (!doc) return missing(res, 'Document');
  res.json(doc);
});

app.patch('/api/documents/:id', (req, res) => {
  const doc = findDoc(req.params.id);
  if (!doc) return missing(res, 'Document');
  const b = req.body ?? {};
  if (b.title !== undefined) {
    const title = String(b.title).trim();
    if (!title) return bad(res, 'A document needs a title.');
    doc.title = title.slice(0, 160);
  }
  if (b.values !== undefined && typeof b.values === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(b.values)) {
      if (['__proto__', 'constructor', 'prototype'].includes(k)) continue;
      clean[k] = v;
    }
    doc.values = clean;
  }
  if (b.tags !== undefined) doc.tags = [...new Set((Array.isArray(b.tags) ? b.tags : []).map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  if (b.starred !== undefined) doc.starred = Boolean(b.starred);
  doc.updatedAt = now();
  const col = findCollection(doc.collectionId);
  if (col) touch(col);
  db.flush();
  res.json(doc);
});

app.delete('/api/documents/:id', (req, res) => {
  const doc = findDoc(req.params.id);
  if (!doc) return missing(res, 'Document');
  db.data.documents = db.data.documents.filter((d) => d.id !== doc.id);
  db.flush();
  res.json(doc);
});

app.post('/api/documents/bulk-delete', (req, res) => {
  const ids = new Set(Array.isArray(req.body?.ids) ? req.body.ids : []);
  const removed = db.data.documents.filter((d) => ids.has(d.id));
  db.data.documents = db.data.documents.filter((d) => !ids.has(d.id));
  db.flush();
  res.json({ documents: removed });
});

app.post('/api/documents/restore', (req, res) => {
  const inserted = [];
  for (const d of Array.isArray(req.body?.documents) ? req.body.documents : []) {
    if (d?.id && d?.collectionId && findCollection(d.collectionId) && !findDoc(d.id)) {
      db.data.documents.push(d);
      inserted.push(d);
    }
  }
  db.flush();
  res.json({ documents: inserted });
});

/* ---------- typeahead search ---------- */

app.get('/api/search', (req, res) => {
  const q = String(req.query['q'] ?? '').trim().toLowerCase();
  const limit = Math.min(20, Math.max(1, Number(req.query['limit']) || 8));
  const meta = (d) => {
    const c = findCollection(d.collectionId);
    return { collectionId: d.collectionId, collectionName: c?.name ?? 'Unknown', icon: c?.icon ?? 'folder', color: c?.color ?? '#5B8CFF', schema: c?.schema ?? [] };
  };
  const recent = (d) => {
    const m = meta(d);
    const first = m.schema.map((f) => flatValue(d.values[f.key])).find((v) => v.trim()) ?? d.tags.join(', ');
    return { doc: d, collectionId: m.collectionId, collectionName: m.collectionName, icon: m.icon, color: m.color, snippet: first.slice(0, 110), matchField: 'Recent' };
  };

  if (!q) {
    return res.json([...db.data.documents].sort(SORTS.updated_desc).slice(0, 6).map(recent));
  }

  const hits = [];
  for (const d of [...db.data.documents].sort(SORTS.updated_desc)) {
    const m = meta(d);
    let source = null, matchField = null;
    if (d.title.toLowerCase().includes(q)) { source = d.title; matchField = 'Title'; }
    else if (d.tags.join(' ').toLowerCase().includes(q)) { source = d.tags.join(', '); matchField = 'Tags'; }
    else {
      for (const f of m.schema) {
        const v = flatValue(d.values[f.key]);
        if (v.toLowerCase().includes(q)) { source = v; matchField = f.label; break; }
      }
      if (!source) {
        const any = Object.values(d.values).map(flatValue).find((v) => v.toLowerCase().includes(q));
        if (any) { source = any; matchField = 'Field'; }
      }
    }
    if (!source) continue;
    const idx = source.toLowerCase().indexOf(q);
    const start = Math.max(0, idx - 32);
    const snippet = (start > 0 ? '…' : '') + source.slice(start, idx + q.length + 64) + (idx + q.length + 64 < source.length ? '…' : '');
    hits.push({ doc: d, collectionId: m.collectionId, collectionName: m.collectionName, icon: m.icon, color: m.color, snippet, matchField });
    if (hits.length >= limit) break;
  }
  res.json(hits);
});

/* ---------- api 404 + errors ---------- */

app.use('/api', (_req, res) => res.status(404).json({ message: 'Unknown API route.' }));
app.use((err, _req, res, _next) => {
  console.error('[folio-api]', err);
  res.status(500).json({ message: 'Internal server error.' });
});

/* ---------- serve the built app when dist exists ---------- */

const dist = join(here, '..', 'dist', 'folio', 'browser');
if (existsSync(join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(join(dist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log('');
  console.log('  📒 Folio local API');
  console.log(`  → http://localhost:${PORT}/api  ·  storage: server/data/folio.json`);
  console.log(`  → ${db.data.collections.length} collections, ${db.data.documents.length} documents`);
  if (existsSync(join(dist, 'index.html'))) console.log(`  → serving built app at http://localhost:${PORT}`);
  console.log('  → ng serve proxies /api here automatically (proxy.conf.json)');
  console.log('');
});

process.on('SIGINT', () => { db.flushSync(); process.exit(0); });
process.on('SIGTERM', () => { db.flushSync(); process.exit(0); });