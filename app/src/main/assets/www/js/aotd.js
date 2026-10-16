// App of the Day: one installable twin per day, favouring fresh releases.
// The pick for a day is planned up to a week ahead (so the daily notification can name it)
// and locked once the day arrives; the lock is what Today shows.
import { ls } from './store.js';
import { db } from './data.js';

const COOLDOWN_DAYS = 45;
const FRESH_DAYS = 10;
const APP_GAP_DAYS = 10; // the same popular app is not featured twice within this window

const z = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
// calendar-day number for a 'YYYY-MM-DD' key (timezone-proof)
const dnum = (k) => Math.round(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / 864e5);

// small deterministic PRNG so every device shows the same rotation for a date
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const valid = (e) => e && db.byRepo.has(e.repo) && (db.byRepo.get(e.repo) || []).some((t) => t.app.id === e.app);
const candidates = () => db.twins.filter((t) => t.kind === 'app' && !t.archived);

function score(t, onDate) {
  const rel = t.release && t.release.date;
  let fresh = 0;
  if (rel && /^\d{4}-\d{2}-\d{2}/.test(rel)) {
    const age = dnum(onDate) - dnum(rel.slice(0, 10));
    if (age >= 0 && age <= FRESH_DAYS) fresh = 1 - age / (FRESH_DAYS + 1);
  }
  const pop = 1 - (t.app.rank - 1) / 100;
  const stars = Math.min(1, Math.log10((t.stars || 300) + 1) / 5);
  const primary = t.idx === 0 ? 0.08 : 0;
  return { fresh, total: fresh * 0.55 + pop * 0.25 + stars * 0.12 + primary };
}

/** Plan picks for `days` days starting today. Today's entry is kept if already locked or announced. */
export function plan(days = 7) {
  const now = new Date();
  const today = dayKey(now);
  const hist = ls.get('aotd:history', []); // newest first: [{date, repo, app}]
  const prevPlan = ls.get('aotd:plan', []);
  const fixedToday = [hist.find((h) => h.date === today), prevPlan.find((p) => p.date === today)].find(valid);
  // most recent date each repo was featured (history + already-announced plan days before today)
  const used = new Map();     // repo -> last featured date
  const usedApp = new Map();  // popular app -> last featured date (keeps the rotation varied)
  const note = (repo, date, app) => {
    if (!used.has(repo) || date > used.get(repo)) used.set(repo, date);
    if (app && (!usedApp.has(app) || date > usedApp.get(app))) usedApp.set(app, date);
  };
  hist.forEach((h) => note(h.repo, h.date, h.app));
  const pool = candidates();
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = dayKey(addDays(now, i));
    if (i === 0 && fixedToday) { out.push(fixedToday); note(fixedToday.repo, date, fixedToday.app); continue; }
    const rand = seeded('clone:' + date);
    const recent = (repo) => {
      const d = used.get(repo);
      return !!d && d !== date && Math.abs(dnum(date) - dnum(d)) < COOLDOWN_DAYS;
    };
    const appRecent = (id) => {
      const d = usedApp.get(id);
      return !!d && d !== date && Math.abs(dnum(date) - dnum(d)) < APP_GAP_DAYS;
    };
    let avail = pool.filter((t) => !recent(t.key) && !appRecent(t.app.id));
    if (!avail.length) avail = pool.filter((t) => !recent(t.key));
    if (!avail.length) avail = pool.slice();
    const ranked = avail.map((t) => ({ t, s: score(t, date), r: rand() }));
    const fresh = ranked.filter((x) => x.s.fresh > 0).sort((a, b) => b.s.total - a.s.total || b.r - a.r);
    let pick;
    if (fresh.length) pick = fresh[0].t;
    else {
      // rotation weighted toward popular apps
      ranked.sort((a, b) => (b.s.total + b.r * 0.35) - (a.s.total + a.r * 0.35));
      pick = ranked.length ? ranked[0].t : null;
    }
    if (!pick) break;
    const entry = { date, repo: pick.key, app: pick.app.id, fresh: fresh.length > 0 };
    note(pick.key, date, pick.app.id);
    out.push(entry);
  }
  return out;
}

/** Today's pick, locked into history the first time it is asked for. */
export function today() {
  const key = dayKey();
  const hist = ls.get('aotd:history', []);
  let entry = hist.find((h) => h.date === key);
  if (!valid(entry)) {
    const planned = ls.get('aotd:plan', []).find((p) => p.date === key);
    entry = valid(planned) ? planned : plan(1)[0];
    if (!entry) return null;
    const rest = hist.filter((h) => h.date !== key);
    rest.unshift(entry);
    ls.set('aotd:history', rest.slice(0, 120));
  }
  const twin = (db.byRepo.get(entry.repo) || []).find((t) => t.app.id === entry.app) || (db.byRepo.get(entry.repo) || [])[0];
  if (!twin) return null;
  return { date: key, twin, app: twin.app };
}

export function pastPicks(n = 7) {
  const key = dayKey();
  return ls.get('aotd:history', [])
    .filter((h) => h.date < key)
    .slice(0, n)
    .map((h) => {
      const twin = (db.byRepo.get(h.repo) || []).find((t) => t.app.id === h.app);
      return twin ? { date: h.date, twin, app: twin.app } : null;
    }).filter(Boolean);
}

/** Build the 7-day plan and hand it to the native notification scheduler. */
export function planForNotifications() {
  today(); // lock today first so the notification and the Today screen always agree
  // days that were announced by notification but never opened still count as featured
  const key = dayKey();
  const hist = ls.get('aotd:history', []);
  let moved = false;
  for (const e of ls.get('aotd:plan', [])) {
    if (e.date < key && valid(e) && !hist.some((h) => h.date === e.date)) { hist.push(e); moved = true; }
  }
  if (moved) { hist.sort((x, y) => y.date.localeCompare(x.date)); ls.set('aotd:history', hist.slice(0, 120)); }
  const p = plan(7);
  ls.set('aotd:plan', p);
  return p.map((e) => {
    const twin = (db.byRepo.get(e.repo) || []).find((t) => t.app.id === e.app);
    if (!twin) return null;
    const rd = twin.release && twin.release.date;
    const age = rd ? dnum(e.date) - dnum(rd.slice(0, 10)) : 99;
    const shipped = age >= 0 && age <= FRESH_DAYS ? ` · ${twin.release.tag} just shipped` : '';
    return { date: e.date, title: `App of the Day: ${twin.name}`, text: `The open-source twin of ${twin.app.name}${shipped}.`, route: `#/app/${twin.app.id}/${twin.idx}` };
  }).filter(Boolean);
}
