// Today: greeting, search composer, App of the Day, fresh releases, the Equator top 10, rising, new on GitHub.
import { icon, mark, CAT_ICON, CAT_HUE, KIND } from '../icons.js';
import { $, $$, h, esc, appTile, twinTile, eq, hydrateTiles, starMeta, pullToRefresh, haptic, toast, skelRows, onLongPress } from '../ui.js';
import { db, fmtNum, relTime, cleanTag, daysAgo, relShort, appCount } from '../data.js';
import { settings, ls } from '../store.js';
import { syncCatalog, syncState, fetchNewOnGitHub, fetchReleases } from '../github.js';
import * as aotd from '../aotd.js';
import { quickActions, repoSheet } from './common.js';

const HINTS = ['YouTube', 'Spotify', 'Google Photos', 'WhatsApp', 'Notion', 'Google Maps', 'ChatGPT', '1Password', 'Gmail', 'Netflix'];

function greeting(name) {
  const hr = new Date().getHours();
  const part = hr < 5 ? 'Up late' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${esc(name)}` : part;
}

export function growth(t) {
  // live delta since the bundled snapshot (normalised to a week) or the snapshot's own weekly gain
  const snapAge = daysAgo(db.snapshot);
  if (t.liveAt && t.snap.stars != null && t.stars != null && snapAge >= 3) {
    return Math.round((t.stars - t.snap.stars) * 7 / Math.max(1, snapAge));
  }
  return t.wk ?? null;
}

function heroArt(app, dark) {
  const hue = CAT_HUE[app.cat] ?? 20;
  const sky1 = dark ? `hsl(${hue} 14% 24%)` : `hsl(${hue} 42% 90%)`;
  const sky2 = dark ? `hsl(${hue} 10% 20%)` : `hsl(${hue} 36% 95%)`;
  const sea = dark ? `hsl(${hue} 8% 17%)` : `hsl(${hue} 30% 97.5%)`;
  const sun = '#D97757';
  const so = dark ? 0.34 : 0.26;
  const line = dark ? 'rgba(250,249,245,.16)' : 'rgba(31,30,29,.13)';
  const H = 104; // horizon
  return `<svg class="bgart" viewBox="0 0 360 184" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="sky-${app.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs>
    <rect width="360" height="${H}" fill="url(#sky-${app.id})"/>
    <rect y="${H}" width="360" height="${184 - H}" fill="${sea}"/>
    <circle class="ring" cx="180" cy="${H}" r="92" fill="none" stroke="${sun}" stroke-opacity="${so * 0.35}" stroke-width="1"/>
    <circle class="ring r2" cx="180" cy="${H}" r="122" fill="none" stroke="${sun}" stroke-opacity="${so * 0.22}" stroke-width="1"/>
    <path d="M118 ${H}a62 62 0 0 1 124 0z" fill="${sun}" fill-opacity="${so}"/>
    ${[[0, 124, 7, 1], [1, 98, 6, .7], [2, 70, 5, .48], [3, 44, 4, .3], [4, 22, 3, .18]].map(([i, w, hh, o]) => `<rect x="${180 - w / 2}" y="${H + 9 + i * 12}" width="${w}" height="${hh}" rx="${hh / 2}" fill="${sun}" fill-opacity="${so * o}"/>`).join('')}
    <line x1="0" y1="${H + .5}" x2="360" y2="${H + .5}" stroke="${line}"/>
  </svg>`;
}

export class TodayView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = h('<div class="page" data-view="today"></div>');
    this.wrap = h('<div class="wrap"></div>');
    this.el.appendChild(this.wrap);
    this.render();
    this.el.addEventListener('click', (e) => this.onClick(e));
    onLongPress(this.el, '[data-app]', (el) => quickActions(this.ctx, db.byId.get(el.dataset.app), Number(el.dataset.twin || 0)));
    requestAnimationFrame(() => pullToRefresh(this.el, () => this.refresh()));
  }

  render() {
    const pick = aotd.today();
    this.pick = pick;
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    this.wrap.innerHTML = `
      <header class="today-head">
        <div class="grow">
          <div class="eyebrow">${esc(dateStr)}</div>
          <h1 class="greet ${settings.name ? 'long' : ''}">${mark(34)}<span class="gtext">${greeting(settings.name)}</span></h1>
        </div>
        <button class="avatar" data-act="settings" aria-label="Settings">${settings.name ? esc(settings.name.charAt(0).toUpperCase()) : icon('settings', 19)}</button>
      </header>

      <button class="composer" data-act="search" aria-label="Search for an open-source twin">
        <div class="ph"><span class="typed">Find the open-source twin of…</span><span class="caret"></span></div>
        <div class="row">
          <div class="tools"><span class="tool">${icon('plus', 17)}</span></div>
          <div class="right"><span class="model">${db.apps.length} apps · ${db.twins.length} twins${icon('chevD', 15)}</span><span class="send">${icon('search', 17)}</span></div>
        </div>
      </button>

      <div class="chips" role="list">
        ${db.cats.map((c) => `<button class="chip" role="listitem" data-cat="${c.id}">${icon(CAT_ICON[c.id], 17)}${esc(c.name)}<span class="count">${appCount(c.id)}</span></button>`).join('')}
      </div>

      <div data-slot="aotd">${pick ? this.heroHTML(pick) : ''}</div>
      ${pick ? `<p class="aotd-next">${icon('clock', 14)}<span data-next></span></p>` : ''}

      <section class="section" data-slot="fresh"></section>
      <section class="section" data-slot="equator"></section>
      <section class="section" data-slot="rising"></section>
      <section class="section" data-slot="new"></section>
      <section class="section" data-slot="past"></section>
      <p class="foot-note" data-slot="foot"></p>
    `;
    this.renderFresh();
    this.renderEquator(true);
    this.renderRising();
    this.renderPast();
    this.renderFoot();
    this.loadNew();
    hydrateTiles(this.el);
    this.startTypewriter();
    this.tickNext();
    if (pick) this.refreshPickRelease();
  }

  tickNext() {
    clearInterval(this.nt);
    const el = $('[data-next]', this.wrap);
    if (!el) return;
    const f = () => {
      const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
      const m = Math.max(1, Math.round((mid - now) / 60000));
      const hh = Math.floor(m / 60), mm = m % 60;
      el.textContent = `Next App of the Day in ${hh ? hh + ' h ' : ''}${mm} min`;
      if (this.pick && this.pick.date !== aotd.dayKey()) this.render();
    };
    f();
    this.nt = setInterval(f, 30000);
  }

  heroHTML({ app, twin }) {
    const dark = document.documentElement.dataset.theme === 'dark';
    const rel = twin.release;
    const age = rel ? daysAgo(rel.date) : null;
    const fresh = age != null && age <= 3;
    const kind = KIND[twin.kind] || KIND.app;
    return `
      <article class="card aotd pressable" data-app="${app.id}" data-twin="${twin.idx}" role="link" tabindex="0" aria-label="App of the Day: ${esc(twin.name)}">
        <div class="art">${heroArt(app, dark)}
          <div class="badge-row">
            <span class="stamp"><span class="dot"></span>App of the Day</span>
            ${fresh ? `<span class="stamp fresh">${icon('sparkle', 13)} New release</span>` : ''}
          </div>
          <div class="pair">${appTile(app, 'lg lift')}${eq()}${twinTile(twin, 'lg lift')}</div>
        </div>
        <div class="body">
          <h3>${esc(twin.name)}</h3>
          <div class="sub">The open-source twin of <b style="color:var(--text-2);font-weight:600">${esc(app.name)}</b></div>
          <p class="tagline">${esc(twin.tagline)}</p>
          <div class="foot">
            <div class="meta" data-slot="aotd-meta">${this.heroMeta(twin)}</div>
            <span class="getbtn solid" data-act="get" aria-label="${twin.kind === 'app' ? 'Get' : 'Open'} ${esc(twin.name)}">${twin.kind === 'app' ? 'Get' : 'Open'}</span>
          </div>
        </div>
      </article>`;
  }
  heroMeta(t) {
    const rel = t.release;
    const kind = KIND[t.kind] || KIND.app;
    return `${starMeta(t)}${rel ? `<span class="${daysAgo(rel.date) <= 3 ? 'new' : ''}">${icon('tag', 14)}${esc(cleanTag(rel.tag))} · ${relTime(rel.date)}</span>` : `<span>${icon(kind.icon, 14)}${kind.label}</span>`}`;
  }
  async refreshPickRelease() {
    try { await fetchReleases(this.pick.twin.repo); } catch (e) {}
  }

  renderFresh() {
    const list = db.twins.filter((t) => t.release && t.release.date && !t.archived)
      .sort((a, b) => b.release.date.localeCompare(a.release.date) || a.app.rank - b.app.rank)
      .filter((t, i, arr) => arr.findIndex((x) => x.key === t.key) === i)
      .slice(0, 12);
    const slot = $('[data-slot="fresh"]', this.wrap);
    slot.innerHTML = `
      <div class="section-head"><div><h2>Fresh releases</h2><p>Twins that shipped new versions</p></div>
        <button class="more" data-go="#/list/fresh">See all${icon('chevR', 16)}</button></div>
      <div class="rail">${list.map((t) => this.relCard(t)).join('')}</div>`;
    hydrateTiles(slot);
  }
  relCard(t) {
    const age = daysAgo(t.release.date);
    return `<button class="card rcard pressable" data-app="${t.app.id}" data-twin="${t.idx}">
      <div class="top">${twinTile(t, 'md')}<div style="min-width:0"><div class="name">${esc(t.name)}</div><div class="of">twin of ${esc(t.app.name)}</div></div></div>
      <div class="desc">${esc(t.tagline)}</div>
      <div class="ver"><b>${esc(cleanTag(t.release.tag))}</b>${age <= 2 ? '<span class="hl-new"><span class="pulse"></span>' + relTime(t.release.date) + '</span>' : relTime(t.release.date)}</div>
    </button>`;
  }

  renderEquator(animate = false) {
    const top = db.apps.slice(0, 10);
    const slot = $('[data-slot="equator"]', this.wrap);
    slot.innerHTML = `
      <div class="section-head"><div><h2>The Equator</h2><p>The most popular apps, mirrored by their best-rated twins</p></div>
        <button class="more" data-go="tab:explore">All 100${icon('chevR', 16)}</button></div>
      <div class="card list ${animate ? 'stagger' : ''}">${top.map((a) => this.pairRow(a)).join('')}</div>`;
    hydrateTiles(slot);
  }
  pairRow(a) {
    const t = a.twins[0];
    return `<button class="row pairrow" data-app="${a.id}" data-twin="0">
      <span class="rank">${a.rank}</span>
      <span class="pairtiles">${appTile(a, 'sm')}${twinTile(t, 'sm')}</span>
      <span class="main"><div class="t1">${esc(a.name)}</div>
        <div class="t2 to">${icon('arrowR', 13)}<b>${esc(t.name)}</b>${a.twins.length > 1 ? `<span class="plus">+${a.twins.length - 1}</span>` : ''}</div></span>
      <span class="side">${t.stars != null ? `<span style="color:var(--star)">${icon('starFill', 13)}</span>${fmtNum(t.stars)}` : ''}</span>
    </button>`;
  }

  renderRising() {
    const list = db.twins.map((t) => ({ t, g: growth(t) })).filter((x) => x.g > 0)
      .sort((a, b) => b.g - a.g).filter((x, i, arr) => arr.findIndex((y) => y.t.key === x.t.key) === i).slice(0, 10);
    const slot = $('[data-slot="rising"]', this.wrap);
    if (!list.length) { slot.innerHTML = ''; return; }
    slot.innerHTML = `
      <div class="section-head"><div><h2>Rising on GitHub</h2><p>Stars gained this week</p></div>
        <button class="more" data-go="#/list/rising">See all${icon('chevR', 16)}</button></div>
      <div class="rail">${list.map(({ t, g }) => `
        <button class="card mini pressable" data-app="${t.app.id}" data-twin="${t.idx}">
          ${twinTile(t, 'md')}
          <div class="name">${esc(t.name)}</div>
          <div class="of">for ${esc(t.app.name)}</div>
          <span class="delta">${icon('trend', 14)}+${fmtNum(g)}</span>
        </button>`).join('')}</div>`;
    hydrateTiles(slot);
  }

  async loadNew() {
    const slot = $('[data-slot="new"]', this.wrap);
    const head = `<div class="section-head"><div><h2>New on GitHub</h2><p data-sub>Brand-new Android apps, by stars</p></div><button class="more" data-go="#/list/new">More${icon('chevR', 16)}</button></div>`;
    slot.innerHTML = `${head}<div class="card list">${skelRows(3)}</div>`;
    try {
      const { window: win, items } = await fetchNewOnGitHub();
      $('[data-sub]', slot).textContent = `Android apps created in the last ${win === 7 ? 'week' : 'month'}, by stars`;
      if (!items.length) { slot.querySelector('.list').innerHTML = `<div class="empty" style="padding:24px">Nothing new yet this week.</div>`; return; }
      slot.querySelector('.list').innerHTML = items.slice(0, 5).map((it) => newRow(it)).join('');
      slot.querySelector('.list').classList.add('fade-in');
    } catch (e) {
      slot.innerHTML = `${head}<div class="note">${icon(e.kind === 'offline' || e.kind === 'network' ? 'wifiOff' : 'info', 18)}<div>${e.kind === 'ratelimit' ? '<b>GitHub needs a breather.</b> The hourly limit was reached — add a token in Settings for more.' : e.kind === 'offline' || e.kind === 'network' ? '<b>You’re offline.</b> New apps appear here when you reconnect.' : esc(e.message)}</div></div>`;
    }
  }

  renderPast() {
    const past = aotd.pastPicks(10);
    const slot = $('[data-slot="past"]', this.wrap);
    if (!past.length) { slot.innerHTML = ''; return; }
    slot.innerHTML = `
      <div class="section-head"><div><h2>Previously featured</h2><p>Earlier Apps of the Day</p></div></div>
      <div class="rail">${past.map(({ date, twin }) => `
        <button class="card mini pressable" data-app="${twin.app.id}" data-twin="${twin.idx}">
          ${twinTile(twin, 'md')}
          <div class="name">${esc(twin.name)}</div>
          <div class="of">${new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
        </button>`).join('')}</div>`;
    hydrateTiles(slot);
  }

  renderFoot() {
    const slot = $('[data-slot="foot"]', this.wrap);
    const snap = new Date(db.snapshot + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    let live;
    if (syncState.running) live = `Syncing live GitHub data… ${syncState.done}/${syncState.total}`;
    else if (syncState.error && !syncState.last) live = syncState.error.includes('rate') ? 'GitHub rate limit reached — showing the bundled snapshot' : 'Couldn’t reach GitHub — showing the bundled snapshot';
    else if (syncState.last) live = `Live GitHub data synced ${relShort(syncState.last)}`;
    else live = 'Live data syncs when you’re online';
    slot.innerHTML = `${esc(live)} · <button data-act="sync">Refresh</button><br>Catalog snapshot ${snap} · 100 apps · ${db.twins.length} twins`;
  }

  async refresh() {
    haptic('tick');
    const p = syncCatalog(false, true);
    this.renderFoot();
    await Promise.race([p, new Promise((r) => setTimeout(r, 2500))]);
    this.loadNew();
    if (this.pick) this.refreshPickRelease();
    toast('Refreshed', { icon: 'check', duration: 1400 });
  }

  startTypewriter() {
    clearInterval(this.tw);
    const el = $('.composer .typed', this.wrap);
    if (!el || settings.reduceMotion) return;
    let i = 0, pos = 0, dir = 1, hold = 0;
    const base = 'Find the open-source twin of ';
    this.tw = setInterval(() => {
      if (this.el.hidden) return;
      const word = HINTS[i % HINTS.length] + '…';
      if (hold > 0) { hold--; return; }
      pos += dir;
      if (pos > word.length) { dir = -1; hold = 22; pos = word.length; }
      if (pos < 0) { dir = 1; pos = 0; i++; hold = 3; }
      el.textContent = base + word.slice(0, pos);
    }, 70);
  }

  onClick(e) {
    const t = e.target;
    const act = t.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'settings') return this.ctx.go('#/settings');
      if (a === 'search') return this.ctx.switchTab('search', { focus: '1' });
      if (a === 'sync') { this.refresh(); return; }
      if (a === 'get') {
        e.stopPropagation();
        const card = act.closest('[data-app]');
        return this.ctx.go(`#/app/${card.dataset.app}/${card.dataset.twin}?get=1`);
      }
    }
    const cat = t.closest('[data-cat]');
    if (cat) return this.ctx.switchTab('explore', { cat: cat.dataset.cat });
    const g = t.closest('[data-go]');
    if (g) { const r = g.dataset.go; return r.startsWith('tab:') ? this.ctx.switchTab(r.slice(4)) : this.ctx.go(r); }
    const repo = t.closest('[data-item]');
    if (repo) return repoSheet(JSON.parse(decodeURIComponent(repo.dataset.item)));
    const app = t.closest('[data-app]');
    if (app) return this.ctx.go(`#/app/${app.dataset.app}/${app.dataset.twin || 0}`);
  }

  update(what) {
    if (what === 'live' || what === 'release') {
      clearTimeout(this.ut);
      this.ut = setTimeout(() => {
        if (this.pick) { const m = $('[data-slot="aotd-meta"]', this.wrap); if (m) m.innerHTML = this.heroMeta(this.pick.twin); }
        this.renderFresh(); this.renderEquator(); this.renderRising(); this.renderFoot();
      }, 250);
    }
    if (what === 'sync') this.renderFoot();
    if (what === 'settings') {
      const g = $('.gtext', this.wrap); if (g) { g.innerHTML = greeting(settings.name); g.parentElement.classList.toggle('long', !!settings.name); }
      const av = $('.avatar', this.wrap); if (av) av.innerHTML = settings.name ? esc(settings.name.charAt(0).toUpperCase()) : icon('settings', 19);
    }
  }
  onShow() { this.startTypewriter(); this.tickNext(); }
  onHide() { clearInterval(this.tw); clearInterval(this.nt); }
  onResume() {
    const k = aotd.dayKey();
    if (this.pick && this.pick.date !== k) this.render();
  }
}

export function newRow(it) {
  return `<button class="row" data-repo="${esc(it.repo)}" data-item="${esc(encodeURIComponent(JSON.stringify(it)))}">
    <span class="tile twin sm" style="--s:44px">${it.avatar ? `<img class="avatar-img ok" src="${esc(it.avatar)}&s=96" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : esc(it.name.charAt(0).toUpperCase())}</span>
    <span class="main"><div class="t1">${esc(it.name)}</div><div class="t2">${esc(it.desc || it.repo)}</div></span>
    <span class="side"><span style="color:var(--star)">${icon('starFill', 14)}</span>${fmtNum(it.stars)}</span>
  </button>`;
}
