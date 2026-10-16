// Persistent state: settings, library, history, live GitHub overlay.
const NS = 'clone:';

export const ls = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(NS + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    const v = JSON.stringify(value);
    try { localStorage.setItem(NS + key, v); return true; } catch (e) {
      // storage full: drop cached GitHub responses (never user data) and retry once
      if (ls.onQuota) { try { ls.onQuota(); localStorage.setItem(NS + key, v); return true; } catch (e2) {} }
      return false;
    }
  },
  del(key) { try { localStorage.removeItem(NS + key); } catch (e) {} },
  keys(prefix = '') {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(NS + prefix)) out.push(k.slice(NS.length)); } } catch (e) {}
    return out;
  },
};

// raw string for theme so the inline boot script can read it without JSON
export function getThemePref() { try { return localStorage.getItem(NS + 'theme') || 'system'; } catch (e) { return 'system'; } }
export function setThemePref(v) { try { localStorage.setItem(NS + 'theme', v); } catch (e) {} }

const subs = new Set();
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function emit(what, data) { subs.forEach((fn) => { try { fn(what, data); } catch (e) { console.error(e); } }); }

export const settings = {
  get name() { return ls.get('name', ''); },
  set name(v) { ls.set('name', (v || '').trim().slice(0, 40)); emit('settings'); },
  get daily() { return ls.get('daily', { enabled: false, hour: 9, minute: 0 }); },
  set daily(v) { ls.set('daily', v); emit('settings'); },
  get token() { return ls.get('token', ''); },
  set token(v) { ls.set('token', (v || '').trim()); emit('settings'); },
  get reduceMotion() { return ls.get('reduceMotion', false); },
  set reduceMotion(v) { ls.set('reduceMotion', !!v); document.documentElement.classList.toggle('reduce-motion', !!v); emit('settings'); },
  get haptics() { return ls.get('haptics', true); },
  set haptics(v) { ls.set('haptics', !!v); emit('settings'); },
  get onboarded() { return ls.get('onboarded', false); },
  set onboarded(v) { ls.set('onboarded', !!v); },
  get sort() { return ls.get('sort', 'popular'); },
  set sort(v) { ls.set('sort', v); },
};

// Library: saved twins (by repo) with the release tag at the moment of saving.
export const library = {
  all() { return ls.get('saved', []); },
  has(repo) { return this.all().some((s) => s.repo.toLowerCase() === repo.toLowerCase()); },
  toggle(entry) {
    const all = this.all();
    const i = all.findIndex((s) => s.repo.toLowerCase() === entry.repo.toLowerCase());
    if (i >= 0) { all.splice(i, 1); ls.set('saved', all); emit('library'); return false; }
    all.unshift({ repo: entry.repo, app: entry.app, at: Date.now(), tag: entry.tag || null });
    ls.set('saved', all.slice(0, 500)); emit('library'); return true;
  },
  seen(repo, tag) {
    const all = this.all(); const s = all.find((x) => x.repo.toLowerCase() === repo.toLowerCase());
    if (s && tag && s.tag !== tag) { s.seenTag = tag; ls.set('saved', all); }
  },
};

export const history = {
  all() { return ls.get('history', []); },
  push(appId, repo) {
    const all = this.all().filter((h) => !(h.app === appId && h.repo === repo));
    all.unshift({ app: appId, repo, at: Date.now() });
    ls.set('history', all.slice(0, 40)); emit('history');
  },
  clear() { ls.set('history', []); emit('history'); },
};

export const recents = {
  all() { return ls.get('recentSearches', []); },
  add(q) {
    q = (q || '').trim(); if (q.length < 2) return;
    const all = this.all().filter((x) => x.toLowerCase() !== q.toLowerCase());
    all.unshift(q); ls.set('recentSearches', all.slice(0, 8));
  },
  remove(q) { ls.set('recentSearches', this.all().filter((x) => x !== q)); },
  clear() { ls.set('recentSearches', []); },
};
