// Catalog model: the 100 popular apps, their GitHub twins, plus the live overlay.
import { ls, emit } from './store.js';

export const db = { snapshot: '', cats: [], apps: [], byId: new Map(), twins: [], byRepo: new Map(), ready: false };

export async function loadCatalog() {
  const res = await fetch('data/catalog.json', { cache: 'no-cache' });
  const data = await res.json();
  db.snapshot = data.snapshot;
  db.cats = data.cats;
  db.apps = data.apps;
  db.byId.clear(); db.byRepo.clear(); db.twins = [];
  for (const a of db.apps) {
    db.byId.set(a.id, a);
    a.twins.forEach((t, i) => {
      t.app = a; t.idx = i; t.key = t.repo.toLowerCase();
      t.owner = t.repo.split('/')[0];
      t.snap = { stars: t.stars, release: t.release };
      db.twins.push(t);
      if (!db.byRepo.has(t.key)) db.byRepo.set(t.key, []);
      db.byRepo.get(t.key).push(t);
    });
  }
  applyOverlay();
  db.ready = true;
  return db;
}

// live data saved by github.js sync: { repoLower: {stars, forks, lang, license, archived, pushed, desc, homepage, avatar, at} }
export function applyOverlay() {
  const live = ls.get('live', {});
  for (const t of db.twins) {
    const l = live[t.key];
    if (!l) continue;
    if (l.stars != null) t.stars = l.stars;
    if (l.forks != null) t.forks = l.forks;
    if (l.lang) t.lang = l.lang;
    if (l.license) t.license = l.license;
    t.archived = !!l.archived;
    if (l.pushed) t.pushed = l.pushed.slice(0, 10);
    if (l.desc) t.desc = l.desc;
    if (l.homepage) t.homepage = l.homepage;
    if (l.avatar) t.avatar = l.avatar;
    if (l.issues != null) t.issues = l.issues;
    if (l.branch) t.branch = l.branch;
    if (l.liveAt) t.liveAt = l.liveAt;
  }
  const rels = ls.get('rels', {});
  for (const t of db.twins) {
    const r = rels[t.key];
    if (r && r.tag && (!t.release || (r.date || '') >= (t.release.date || ''))) t.release = { tag: r.tag, date: r.date, apk: r.apk, pre: r.pre };
  }
}

export function saveLive(map) {
  const live = ls.get('live', {});
  const now = Date.now();
  let changed = false;
  for (const [k, v] of Object.entries(map)) {
    const prev = live[k] || {};
    if (prev.stars !== v.stars || prev.release !== v.release || prev.pushed !== v.pushed || prev.archived !== v.archived) changed = true;
    live[k] = { ...prev, ...v, liveAt: now };
  }
  ls.set('live', live);
  applyOverlay();
  if (changed) emit('live');
}

export function saveRelease(repo, rel) {
  const rels = ls.get('rels', {});
  const k = repo.toLowerCase();
  const prev = rels[k];
  const changed = !prev || prev.tag !== rel.tag || prev.date !== rel.date || prev.apk !== rel.apk;
  rels[k] = { ...rel, at: Date.now() };
  ls.set('rels', rels);
  if (!changed) return;
  applyOverlay();
  emit('release', repo);
}

export const primary = (app) => app.twins[0];
export const catName = (id) => (db.cats.find((c) => c.id === id) || {}).name || id;
export const appCount = (cat) => db.apps.filter((a) => a.cat === cat).length;

// ---------- formatting ----------
export function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (n < 1e6) return Math.round(n / 1000) + 'k';
  return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
}
export function fmtInt(n) { return n == null ? '—' : Number(n).toLocaleString('en-US'); }

// whole calendar days between a date ('YYYY-MM-DD' or ISO) and today, in local time
export function dayNumber(d) { return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
export function daysAgo(dateStr) {
  if (!dateStr) return null;
  let d;
  if (dateStr.length <= 10) { const [y, m, dd] = dateStr.split('-').map(Number); d = new Date(y, m - 1, dd); }
  else d = new Date(dateStr);
  if (isNaN(d)) return null;
  return dayNumber(new Date()) - dayNumber(d);
}
export function relTime(dateStr) {
  const n = daysAgo(dateStr);
  if (n == null) return '';
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  if (n < 7) return `${n} days ago`;
  if (n < 14) return 'last week';
  if (n < 31) return `${Math.round(n / 7)} weeks ago`;
  if (n < 60) return 'last month';
  if (n < 365) return `${Math.round(n / 30)} months ago`;
  const y = Math.round(n / 365);
  return y === 1 ? 'a year ago' : `${y} years ago`;
}
export function relShort(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
export function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.length <= 10 ? dateStr + 'T12:00:00' : dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function cleanTag(tag) {
  if (!tag) return '';
  return String(tag).replace(/^release-/, '').replace(/^stable-/, '').replace(/-android$/, '').slice(0, 24);
}
export function fmtBytes(b) {
  if (!b) return '';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
  return (b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
}

// short monogram for proprietary apps, e.g. "Google Maps" -> "M"
export function monogram(name) {
  const n = name.replace(/^(Google|Microsoft|Adobe|Apple|Amazon|Samsung)\s+/i, '');
  if (/^\d/.test(n)) return n.replace(/[^0-9A-Z]/g, '').slice(0, 4).replace(/^(\d)([A-Z]).*/, '$1$2');
  return n.charAt(0).toUpperCase();
}

// ---------- sorting & search ----------
export function sortApps(list, mode) {
  const arr = list.slice();
  const st = (a) => a.twins[0].stars ?? -1;
  const rd = (a) => (a.twins[0].release && a.twins[0].release.date) || '';
  if (mode === 'stars') arr.sort((a, b) => st(b) - st(a) || a.rank - b.rank);
  else if (mode === 'fresh') arr.sort((a, b) => rd(b).localeCompare(rd(a)) || a.rank - b.rank);
  else if (mode === 'az') arr.sort((a, b) => a.name.localeCompare(b.name));
  else arr.sort((a, b) => a.rank - b.rank);
  return arr;
}

const norm = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
export function search(q) {
  q = norm(q).trim();
  if (!q) return [];
  const words = q.split(/\s+/);
  const out = [];
  for (const a of db.apps) {
    for (const t of a.twins) {
      const hayApp = norm(`${a.name} ${a.maker}`);
      const hayTwin = norm(`${t.name} ${t.repo}`);
      const hayRest = norm(`${a.blurb} ${t.tagline} ${t.perks.join(' ')} ${catName(a.cat)} ${t.lang || ''}`);
      let score = 0, all = true;
      for (const w of words) {
        let s = 0;
        if (norm(a.name).startsWith(w)) s = Math.max(s, 12);
        if (norm(t.name).startsWith(w)) s = Math.max(s, 12);
        if (hayApp.includes(w)) s = Math.max(s, 8);
        if (hayTwin.includes(w)) s = Math.max(s, 8);
        if (hayRest.includes(w)) s = Math.max(s, 3);
        if (!s) { all = false; break; }
        score += s;
      }
      if (!all) continue;
      score += (t.idx === 0 ? 3 : 0) + (100 - a.rank) / 50 + Math.log10((t.stars || 10)) / 3;
      out.push({ app: a, twin: t, score });
    }
  }
  out.sort((x, y) => y.score - x.score);
  return out;
}
