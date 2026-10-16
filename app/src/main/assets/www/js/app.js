// Clone — app shell: boot, theme, navigation stack, tab bar, native wiring.
import { icon } from './icons.js';
import { $, h, haptic, closeTopSheet, hasSheet, toast, captureFlight } from './ui.js';
import { native, on as onNative, isNative } from './native.js';
import { settings, subscribe, getThemePref, setThemePref, ls } from './store.js';
import { db, loadCatalog } from './data.js';
import { syncCatalog, pruneCache } from './github.js';
import * as aotd from './aotd.js';
import { TodayView } from './views/today.js';
import { ExploreView } from './views/explore.js';
import { SearchView } from './views/search.js';
import { LibraryView } from './views/library.js';
import { DetailView } from './views/detail.js';
import { SettingsView } from './views/settings.js';
import { ListView } from './views/lists.js';
import { showOnboarding } from './views/onboarding.js';

const stage = $('#stage');
const tabbar = $('#tabbar');

const TABS = [
  { id: 'today', label: 'Today', icon: 'today', View: TodayView },
  { id: 'explore', label: 'Explore', icon: 'explore', View: ExploreView },
  { id: 'search', label: 'Search', icon: 'search', View: SearchView },
  { id: 'library', label: 'Library', icon: 'library', View: LibraryView },
];

// ---------------- theme ----------------
export function effectiveDark() {
  const pref = getThemePref();
  return pref === 'dark' || (pref === 'system' && native.systemDark());
}
export function applyTheme(animate = false) {
  const dark = effectiveDark();
  const set = () => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const bg = dark ? '#262624' : '#FAF9F5';
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = bg;
    native.setTheme(dark, bg);
  };
  if (animate && document.startViewTransition && !settings.reduceMotion) document.startViewTransition(set);
  else set();
}
export function setTheme(pref) { setThemePref(pref); applyTheme(true); }

// ---------------- navigation ----------------
const nav = {
  tab: 'today',
  tabs: new Map(),   // id -> {view, el}
  stack: [],         // pushed pages: {route, view, el}
};
window.__nav = nav;
window.__clone = window.__clone || {};

function parseRoute(route) {
  const [path, query = ''] = route.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(query));
  return { parts, params };
}

function makePage(view) {
  const el = view.el;
  el.classList.add('page');
  return el;
}

function ensureTab(id) {
  let t = nav.tabs.get(id);
  if (!t) {
    const def = TABS.find((x) => x.id === id);
    const view = new def.View(ctx);
    const el = makePage(view);
    stage.appendChild(el);
    t = { view, el };
    nav.tabs.set(id, t);
  }
  return t;
}

function renderTabbar() {
  if (!tabbar.firstElementChild) {
    tabbar.innerHTML = '<span class="pill" aria-hidden="true"></span>' + TABS.map((t) => `
      <button class="tab" role="tab" data-tab="${t.id}" aria-selected="false" aria-label="${t.label}">
        <span class="ti">${icon(t.icon, 22)}</span><span>${t.label}</span>
      </button>`).join('');
    window.addEventListener('resize', () => movePill(false));
  }
  tabbar.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === nav.tab)));
  movePill(true);
}
function movePill(animate) {
  const pill = tabbar.querySelector('.pill');
  const ti = tabbar.querySelector(`.tab[data-tab="${nav.tab}"] .ti`);
  if (!pill || !ti) return;
  const x = ti.getBoundingClientRect().left - tabbar.getBoundingClientRect().left;
  if (!animate) pill.style.transition = 'none';
  pill.style.transform = `translateX(${x}px)`;
  if (!animate) { void pill.offsetWidth; pill.style.transition = ''; }
}
tabbar.addEventListener('click', (e) => {
  const b = e.target.closest('.tab'); if (!b) return;
  const id = b.dataset.tab;
  if (id === nav.tab) { // re-tap: scroll to top / focus search
    const t = nav.tabs.get(id);
    if (t) { t.el.scrollTo({ top: 0, behavior: 'smooth' }); t.view.onRetap && t.view.onRetap(); }
    haptic('tick');
    return;
  }
  switchTab(id);
});

export function switchTab(id, params = {}) {
  haptic('tick');
  // collapse pushed pages first
  while (nav.stack.length) { const p = nav.stack.pop(); p.view.destroy && p.view.destroy(); p.el.remove(); }
  const prev = nav.tabs.get(nav.tab);
  nav.tab = id;
  const cur = ensureTab(id);
  for (const [tid, t] of nav.tabs) {
    if (tid !== id) { t.el.hidden = true; t.view.onHide && t.view.onHide(); }
  }
  cur.el.hidden = false;
  if (prev !== cur) {
    cur.el.classList.remove('enter-fade'); void cur.el.offsetWidth; cur.el.classList.add('enter-fade');
    cur.el.addEventListener('animationend', () => cur.el.classList.remove('enter-fade'), { once: true });
  }
  cur.view.onShow && cur.view.onShow(params);
  tabbar.classList.remove('hidden');
  renderTabbar();
  history.replaceState({ depth: 0 }, '', `#/${id}${Object.keys(params).length ? '?' + new URLSearchParams(params) : ''}`);
  syncBack();
}

function viewForRoute(route) {
  const { parts, params } = parseRoute(route);
  const [head, a, b] = parts;
  const idx = Math.max(0, Math.floor(Number(b) || 0));
  if (head === 'app' && db.byId.has(a)) return new DetailView(ctx, db.byId.get(a), idx, { params });
  if (head === 'aotd') { const p = aotd.today(); if (p) return new DetailView(ctx, p.app, p.twin.idx, { aotd: true, params }); }
  if (head === 'settings') return new SettingsView(ctx);
  if (head === 'list') return new ListView(ctx, a, params);
  return null;
}

export function go(route, fromPop = false) {
  const view = viewForRoute(route);
  if (!view) return;
  haptic('tick');
  const el = makePage(view);
  el.classList.add('no-tabbar');
  const under = nav.stack.length ? nav.stack[nav.stack.length - 1].el : nav.tabs.get(nav.tab).el;
  stage.appendChild(el);
  nav.stack.push({ route, view, el });
  if (!fromPop) history.pushState({ depth: nav.stack.length }, '', route);
  tabbar.classList.add('hidden');
  el.classList.add('enter-push');
  under.classList.add('leave-push');
  setTimeout(() => {
    el.classList.remove('enter-push');
    under.classList.remove('leave-push');
    const top = nav.stack.length ? nav.stack[nav.stack.length - 1].el : nav.tabs.get(nav.tab).el;
    if (under !== top) under.hidden = true; // the user may already have gone back
  }, 380);
  view.onShow && view.onShow();
  syncBack();
}

function popPage() {
  const top = nav.stack.pop();
  if (!top) return;
  const under = nav.stack.length ? nav.stack[nav.stack.length - 1].el : nav.tabs.get(nav.tab).el;
  under.hidden = false;
  under.classList.add('enter-pop');
  top.el.classList.add('leave-pop');
  if (!nav.stack.length) tabbar.classList.remove('hidden');
  const underView = nav.stack.length ? nav.stack[nav.stack.length - 1].view : nav.tabs.get(nav.tab).view;
  underView.onShow && underView.onShow();
  setTimeout(() => {
    under.classList.remove('enter-pop');
    top.view.destroy && top.view.destroy();
    top.el.remove();
  }, 380);
  syncBack();
}

window.addEventListener('popstate', () => {
  if (hasSheet()) {
    closeTopSheet();
    const cur = nav.stack.length ? nav.stack[nav.stack.length - 1].route : `#/${nav.tab}`;
    history.pushState({ depth: nav.stack.length }, '', cur);
    return;
  }
  const hash = location.hash || '#/today';
  const { parts } = parseRoute(hash);
  const below = nav.stack.length > 1 ? nav.stack[nav.stack.length - 2].route : null;
  if (nav.stack.length && (hash === below || TABS.some((t) => t.id === parts[0]) || !viewForRouteCheck(hash))) { popPage(); return; }
  if (!TABS.some((t) => t.id === parts[0]) && viewForRouteCheck(hash)) go(hash, true);
  else if (TABS.some((t) => t.id === parts[0]) && parts[0] !== nav.tab) switchTab(parts[0]);
});
function viewForRouteCheck(route) {
  const { parts } = parseRoute(route);
  return (parts[0] === 'app' && db.byId.has(parts[1])) || ['aotd', 'settings', 'list'].includes(parts[0]);
}

export function back() {
  if (closeTopSheet()) { syncBack(); return true; }
  if (nav.stack.length) { history.back(); return true; }
  if (nav.tab !== 'today') { switchTab('today'); return true; }
  return false;
}

function syncBack() {
  native.setCanGoBack(hasSheet() || nav.stack.length > 0 || nav.tab !== 'today');
}

const ctx = { go, back, switchTab, setTheme, applyTheme, syncBack, effectiveDark };
window.__clone.go = go; window.__clone.tab = switchTab;

// ---------------- native wiring ----------------
function applyInsets(i) {
  const r = document.documentElement.style;
  r.setProperty('--sat', `${i.top || 0}px`);
  r.setProperty('--sab', `${i.bottom || 0}px`);
  r.setProperty('--sal', `${i.left || 0}px`);
  r.setProperty('--sar', `${i.right || 0}px`);
  r.setProperty('--kb', `${i.ime || 0}px`);
}
onNative('insets', applyInsets);
try { const i = native.insets(); if (i) applyInsets(i); } catch (e) {}
window.addEventListener('clone:sheet', () => syncBack());
stage.addEventListener('click', (e) => {
  const src = e.target.closest('[data-app]');
  if (src && !e.target.closest('[data-act]')) captureFlight(src);
}, true);
onNative('back', () => { if (!back()) native.setCanGoBack(false); });
onNative('installBlocked', () => toast('Allow installs from Clone to finish installing', { icon: 'info', action: 'Settings', onAction: () => native.openInstallSettings(), duration: 6000 }));
onNative('systemTheme', () => { if (getThemePref() === 'system') applyTheme(true); });
onNative('route', (r) => openRoute(typeof r === 'string' ? r : r.route));
onNative('resume', () => {
  aotd.today();
  const t = nav.tabs.get(nav.tab);
  t && t.view.onResume && t.view.onResume();
  syncCatalog(false);
});
if (!isNative && window.matchMedia) {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (getThemePref() === 'system') applyTheme(true); });
}
window.addEventListener('online', () => { toast('Back online', { icon: 'check' }); syncCatalog(false, true); });
window.addEventListener('offline', () => toast('You are offline — showing saved data', { icon: 'wifiOff' }));

function openRoute(route) {
  if (!route) return;
  const r = route.startsWith('#') ? route : '#' + route;
  const { parts, params } = parseRoute(r);
  if (TABS.some((t) => t.id === parts[0])) switchTab(parts[0], params);
  else go(r);
}

export function scheduleDaily() {
  const d = settings.daily;
  try { native.scheduleDaily(d.enabled, d.hour, d.minute, d.enabled ? aotd.planForNotifications() : []); } catch (e) { console.warn(e); }
}
ctx.scheduleDaily = scheduleDaily;

subscribe((what) => {
  const all = [...nav.tabs.values(), ...nav.stack];
  for (const p of all) p.view.update && p.view.update(what);
  if (what === 'live' || what === 'release') { clearTimeout(scheduleDaily.t); scheduleDaily.t = setTimeout(scheduleDaily, 1500); }
});

// ---------------- boot ----------------
async function boot() {
  applyTheme(false);
  if (settings.reduceMotion) document.documentElement.classList.add('reduce-motion');
  pruneCache();
  try {
    await loadCatalog();
  } catch (e) {
    stage.innerHTML = '<div class="empty"><h3>Couldn’t load the catalog</h3><p>Please reinstall the app.</p></div>';
    native.ready();
    return;
  }
  renderTabbar();
  const initial = native.launchRoute() || location.hash || '#/today';
  const { parts, params } = parseRoute(initial);
  switchTab(TABS.some((t) => t.id === parts[0]) ? parts[0] : 'today', TABS.some((t) => t.id === parts[0]) ? params : {});
  if (!TABS.some((t) => t.id === parts[0]) && parts[0]) go(initial.startsWith('#') ? initial : '#' + initial);
  // never gate this on requestAnimationFrame: the native side holds frames until ready() arrives
  setTimeout(() => native.ready(), 0);
  if (!settings.onboarded) showOnboarding(ctx);
  scheduleDaily();
  setTimeout(() => syncCatalog(false), 900);
  ls.set('lastOpen', Date.now());
}
boot();
