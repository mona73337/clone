// GitHub REST client: ETag revalidation, rate-limit awareness, compact caching and batched sync.
import { ls, settings, emit } from './store.js';
import { db, saveLive, saveRelease } from './data.js';

const API = 'https://api.github.com';
const mem = new Map();
const MAX_PERSIST = 100 * 1024;   // larger bodies (big READMEs) stay in memory only
const MAX_CACHE_KEYS = 40;
const TIMEOUT = 20000;

export const limits = ls.get('limits', {}); // { core: {remaining, limit, reset}, search: {...} }

export function resetLimits() {
  for (const k of Object.keys(limits)) delete limits[k];
  ls.set('limits', limits);
  emit('limits');
}

function headers(accept) {
  const h = { Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const tok = settings.token;
  if (tok) h.Authorization = `Bearer ${tok}`;
  return h;
}

function noteLimits(res) {
  const resource = res.headers.get('x-ratelimit-resource');
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (!resource || remaining == null) return;
  limits[resource] = { remaining: +remaining, limit: +(res.headers.get('x-ratelimit-limit') || 0), reset: +(res.headers.get('x-ratelimit-reset') || 0) * 1000 };
  ls.set('limits', limits);
  emit('limits');
}

export function limited(resource = 'core') {
  const l = limits[resource];
  return !!(l && l.remaining <= 0 && Date.now() < l.reset);
}

export class GHError extends Error {
  constructor(msg, status, kind) { super(msg); this.status = status; this.kind = kind; }
}

async function fetchWithTimeout(url, init) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try { return await fetch(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}

/**
 * GET with ETag revalidation.
 * opts: { ttl (ms: serve cache without network), accept, text, resource, persist (default true), shape (fn applied before caching) }
 */
export async function ghGet(path, opts = {}) {
  const url = path.startsWith('http') ? path : API + path;
  const key = 'gh:' + (opts.accept || '') + url;
  const persist = opts.persist !== false;
  const cached = mem.get(key) || (persist ? ls.get(key) : null);
  if (cached && opts.ttl && Date.now() - cached.at < opts.ttl) return cached.body;
  const resource = opts.resource || (url.includes('/search/') ? 'search' : 'core');
  if (!navigator.onLine) {
    if (cached) return cached.body;
    throw new GHError('You are offline', 0, 'offline');
  }
  if (limited(resource)) {
    if (cached) return cached.body;
    throw new GHError('GitHub rate limit reached', 403, 'ratelimit');
  }
  const h = headers(opts.accept);
  if (cached && cached.etag) h['If-None-Match'] = cached.etag;
  let res;
  try {
    res = await fetchWithTimeout(url, { headers: h, cache: 'no-store', mode: 'cors', credentials: 'omit' });
  } catch (e) {
    if (cached) return cached.body;
    throw new GHError('Network error', 0, 'network');
  }
  noteLimits(res);
  if (res.status === 304 && cached) {
    cached.at = Date.now();
    mem.set(key, cached);
    if (persist) store(key, cached);
    return cached.body;
  }
  if (!res.ok) {
    if (cached) return cached.body;
    if (res.status === 401) throw new GHError('Your GitHub token was rejected', 401, 'auth');
    if (res.status === 403 || res.status === 429) throw new GHError('GitHub rate limit reached', res.status, 'ratelimit');
    if (res.status === 404) throw new GHError('Not found on GitHub', 404, 'notfound');
    if (res.status === 422) throw new GHError('GitHub could not process the query', 422, 'invalid');
    throw new GHError(`GitHub error ${res.status}`, res.status, 'http');
  }
  let body = opts.text ? await res.text() : await res.json();
  if (opts.shape) body = opts.shape(body);
  const entry = { at: Date.now(), etag: res.headers.get('etag'), body };
  mem.set(key, entry);
  if (persist) store(key, entry);
  return body;
}

function store(key, entry) {
  const json = JSON.stringify(entry);
  if (json.length > MAX_PERSIST) { ls.del(key); return; }
  ls.set(key, entry);
}

/** Keep only the newest cached GitHub responses. `all` drops every one (used when storage is full). */
export function pruneCache(all = false) {
  const keys = ls.keys('gh:').map((k) => ({ k, at: (ls.get(k) || {}).at || 0 })).sort((a, b) => b.at - a.at);
  keys.slice(all ? 0 : MAX_CACHE_KEYS).forEach(({ k }) => ls.del(k));
}
ls.onQuota = () => pruneCache(true);

export function clearCache() {
  ls.keys('gh:').forEach((k) => ls.del(k));
  ls.del('newgh');
  mem.clear();
}

function mapRepo(it) {
  return {
    stars: it.stargazers_count, forks: it.forks_count, lang: it.language || null,
    license: it.license && it.license.spdx_id && it.license.spdx_id !== 'NOASSERTION' ? it.license.spdx_id : null,
    archived: !!it.archived, pushed: it.pushed_at, desc: it.description || '', homepage: it.homepage || '',
    avatar: it.owner && it.owner.avatar_url, issues: it.open_issues_count, branch: it.default_branch,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- catalog sync (search API, up to 12 repos per request) ----------
let syncing = null;
export const syncState = { running: false, done: 0, total: 0, last: ls.get('lastSync', 0), error: null };

async function searchChunk(chunk) {
  const q = chunk.map((r) => `repo:${r}`).join(' ') + ' fork:true';
  const body = await ghGet(`/search/repositories?q=${encodeURIComponent(q)}&per_page=100`, { persist: false, resource: 'search' });
  const map = {};
  for (const it of body.items || []) map[it.full_name.toLowerCase()] = mapRepo(it);
  saveLive(map);
}

/** Wait for the search quota to come back if the last response said it is spent. */
async function waitForSearchQuota() {
  const l = limits.search;
  if (l && l.remaining <= 1 && Date.now() < l.reset) await sleep(Math.min(70000, l.reset - Date.now() + 1500));
}

/** force: re-sync everything now. retry: ignore the 10-minute back-off after a failed attempt. */
export function syncCatalog(force = false, retry = false) {
  if (syncing) return syncing;
  const now = Date.now();
  const fresh = now - ls.get('lastSync', 0) < 12 * 3600e3;
  const recentlyTried = !retry && now - ls.get('lastSyncAttempt', 0) < 10 * 60e3;
  if (!force && (fresh || recentlyTried)) return Promise.resolve(false);
  ls.set('lastSyncAttempt', now);
  syncing = (async () => {
    const live = ls.get('live', {});
    const stale = (r) => force || !live[r] || now - (live[r].liveAt || 0) > 12 * 3600e3;
    const primaries = db.apps.map((a) => a.twins[0].repo.toLowerCase());
    const rest = db.twins.filter((t) => t.idx > 0).map((t) => t.key);
    const repos = [...new Set([...primaries, ...rest])].filter(stale);
    const queue = [];
    for (let i = 0; i < repos.length; i += 12) queue.push(repos.slice(i, i + 12));
    Object.assign(syncState, { running: true, done: 0, total: queue.length, error: null });
    emit('sync');
    let ok = 0, failed = 0;
    while (queue.length) {
      const chunk = queue.shift();
      let attempts = 0;
      for (;;) {
        await waitForSearchQuota();
        try {
          await searchChunk(chunk);
          ok++;
          break;
        } catch (e) {
          if (e.kind === 'ratelimit' && attempts < 2) {
            attempts++;
            const cur = limits.search;
            limits.search = { limit: (cur && cur.limit) || 10, remaining: 0, reset: cur && cur.reset > Date.now() ? cur.reset : Date.now() + 61000 };
            continue;
          }
          if (e.kind === 'invalid' && chunk.length > 1) {
            // one unknown/renamed repo makes GitHub reject the whole query: split and retry the halves
            const mid = Math.ceil(chunk.length / 2);
            queue.unshift(chunk.slice(0, mid), chunk.slice(mid));
            syncState.total += 1;
            break;
          }
          if (e.kind !== 'invalid') { syncState.error = e.message; failed++; }
          if (['offline', 'network', 'auth', 'ratelimit'].includes(e.kind)) { queue.length = 0; }
          break;
        }
      }
      syncState.done++;
      emit('sync');
    }
    syncState.running = false;
    if (ok && !failed) {
      syncState.last = Date.now();
      ls.set('lastSync', syncState.last);
      syncState.error = null;
    } else if (!repos.length) {
      syncState.last = Date.now();
      ls.set('lastSync', syncState.last);
    }
    emit('sync');
    syncing = null;
    return true;
  })();
  return syncing;
}

// ---------- per-repo detail ----------
export async function fetchRepo(repo) {
  const body = await ghGet(`/repos/${repo}`, { ttl: 6 * 3600e3, shape: (b) => ({ ...mapRepo(b), full_name: b.full_name }) });
  saveLive({ [repo.toLowerCase()]: { ...body } });
  return body;
}

const ABI_RX = /(arm64|aarch64|armeabi|armv7|x86_64|x86|universal)/i;
export function pickApk(assets, abis = []) {
  const apks = (assets || []).filter((a) => /\.apk$/i.test(a.name) && !/debug|unsigned/i.test(a.name));
  if (!apks.length) return { apks: [], best: null };
  const want = (abis[0] || 'arm64-v8a').toLowerCase();
  const score = (a) => {
    const n = a.name.toLowerCase();
    let s = 0;
    if (/universal/.test(n)) s += 50;
    if (!ABI_RX.test(n)) s += 40;
    if (n.includes(want) || (want.startsWith('arm64') && /arm64|aarch64/.test(n))) s += 60;
    if (/fdroid|foss/.test(n)) s += 2;
    if (/x86/.test(n) && !want.includes('x86')) s -= 40;
    if (/armeabi|armv7/.test(n) && want.startsWith('arm64')) s -= 10;
    return s;
  };
  const sorted = apks.slice().sort((a, b) => score(b) - score(a));
  return { apks: sorted, best: sorted[0] };
}

// keep only what the UI uses, so release lists stay small in storage
const shapeReleases = (list) => (list || []).map((r) => ({
  tag_name: r.tag_name, name: r.name, draft: !!r.draft, prerelease: !!r.prerelease,
  published_at: r.published_at || r.created_at, html_url: r.html_url,
  body_html: (r.body_html || '').slice(0, 20000), body: r.body_html ? '' : (r.body || '').slice(0, 8000),
  assets: (r.assets || []).map((a) => ({ name: a.name, size: a.size, download_count: a.download_count, browser_download_url: a.browser_download_url })),
}));

export async function fetchReleases(repo) {
  const list = await ghGet(`/repos/${repo}/releases?per_page=8`, { ttl: 3 * 3600e3, accept: 'application/vnd.github.html+json', shape: shapeReleases });
  const usable = (list || []).filter((r) => !r.draft);
  const stable = usable.find((r) => !r.prerelease) || usable[0] || null;
  if (stable) {
    const { apks } = pickApk(stable.assets);
    saveRelease(repo, { tag: stable.tag_name, date: (stable.published_at || '').slice(0, 10), apk: apks.length > 0, pre: !!stable.prerelease });
  }
  return { list: usable, latest: stable };
}

export async function fetchReadme(repo) {
  return ghGet(`/repos/${repo}/readme`, { ttl: 24 * 3600e3, accept: 'application/vnd.github.html', text: true });
}

const mapItem = (it) => ({ repo: it.full_name, name: it.name, desc: it.description || '', stars: it.stargazers_count, lang: it.language, created: it.created_at, avatar: it.owner && it.owner.avatar_url, url: it.html_url });

// New Android apps created recently, by stars. Stored compactly under one fixed key.
export async function fetchNewOnGitHub() {
  const cached = ls.get('newgh');
  if (cached && Date.now() - cached.at < 6 * 3600e3) return cached.data;
  const since = (days) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const run = async (days) => {
    const q = `topic:android-app created:>${since(days)} fork:false`;
    const b = await ghGet(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=12`, { persist: false, resource: 'search' });
    return (b.items || []).filter((it) => it.stargazers_count > 2).map(mapItem);
  };
  let data;
  try {
    let items = await run(7);
    let window = 7;
    if (items.length < 5) {
      try { const more = await run(30); if (more.length >= items.length) { items = more; window = 30; } } catch (e) { /* keep the 7-day results */ }
    }
    data = { window, items };
  } catch (e) {
    if (cached) return cached.data;
    throw e;
  }
  ls.set('newgh', { at: Date.now(), data });
  return data;
}

// Free-text search on GitHub for apps not in the catalog (memory-cached only).
export async function searchGitHub(q) {
  const query = `${q} in:name,description,topics fork:false`;
  const b = await ghGet(`/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`, { ttl: 3600e3, resource: 'search', persist: false });
  return (b.items || []).map(mapItem);
}
