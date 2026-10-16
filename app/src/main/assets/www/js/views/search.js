// Search: instant search across the catalog, recent searches, and a live GitHub-wide fallback.
import { icon, KIND } from '../icons.js';
import { $, $$, h, esc, appTile, twinTile, hydrateTiles, haptic, skelRows } from '../ui.js';
import { db, search, fmtNum } from '../data.js';
import { recents } from '../store.js';
import { searchGitHub } from '../github.js';
import { native } from '../native.js';
import { newRow } from './today.js';
import { repoSheet } from './common.js';

const TRY = ['YouTube', 'Instagram', 'Google Photos', 'password manager', 'offline maps', 'Spotify', 'notes', 'self-hosted', 'keyboard', 'Notion'];

// highlight on the raw text, then escape each piece (never splits HTML entities)
function mark(text, q) {
  const words = q.trim().split(/\s+/).filter((w) => w.length > 0).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return esc(text);
  return String(text).split(new RegExp(`(${words.join('|')})`, 'ig'))
    .map((part, i) => (i % 2 ? `<mark class="mark-hit">${esc(part)}</mark>` : esc(part))).join('');
}

export class SearchView {
  constructor(ctx) {
    this.ctx = ctx;
    this.q = '';
    this.el = h(`<div class="page" data-view="search">
      <div class="search-head"><label class="search-box">${icon('search', 20, 'class="lead"')}
        <input type="search" placeholder="Search apps, twins, features…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search">
        <button class="iconbtn" data-act="clear" aria-label="Clear" style="width:38px;height:38px" hidden>${icon('close', 18)}</button></label></div>
      <div class="wrap" data-body></div></div>`);
    this.input = $('input', this.el);
    this.body = $('[data-body]', this.el);
    this.input.addEventListener('input', () => { this.q = this.input.value; this.renderSoon(); });
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { recents.add(this.q); this.input.blur(); } });
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.el.addEventListener('scroll', () => { if (document.activeElement === this.input) this.input.blur(); }, { passive: true });
    this.render();
  }

  renderSoon() { clearTimeout(this.t); this.t = setTimeout(() => this.render(), 60); }

  render() {
    const q = this.q.trim();
    $('[data-act="clear"]', this.el).hidden = !q;
    if (!q) return this.renderIdle();
    const res = search(q).slice(0, 40);
    this.body.innerHTML = `
      ${res.length ? `<div class="section-head" style="margin:6px 0 10px"><p style="margin:0">${res.length} match${res.length === 1 ? '' : 'es'} in the catalog</p></div>
      <div class="card list">${res.map(({ app, twin }) => `
        <button class="row pairrow" data-app="${app.id}" data-twin="${twin.idx}">
          <span class="pairtiles">${appTile(app, 'sm')}${twinTile(twin, 'sm')}</span>
          <span class="main"><div class="t1">${mark(twin.name, q)}</div>
            <div class="t2">for <b>${mark(app.name, q)}</b> · ${mark(twin.tagline, q)}</div></span>
          <span class="side">${twin.stars != null ? `<span style="color:var(--star)">${icon('starFill', 13)}</span>${fmtNum(twin.stars)}` : ''}</span>
        </button>`).join('')}</div>` : `
        <div class="empty"><svg class="art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="54" cy="54" r="30" fill="none" stroke="var(--line-2)" stroke-width="5"/><path d="m76 76 22 22" stroke="var(--line-2)" stroke-width="7" stroke-linecap="round"/><path d="M38 54h32" stroke="var(--accent-2)" stroke-width="5" stroke-linecap="round" opacity=".7"/></svg>
          <h3>No twin in the catalog</h3><p>Nothing among the 100 pairs matches “${esc(q)}”. Try GitHub below.</p></div>`}
      <div class="section" style="margin-top:22px">
        <button class="card row" data-act="github" style="margin:0 var(--gutter);width:calc(100% - 2*var(--gutter))">
          <span class="tile twin sm" style="--s:40px">${icon('globe', 20)}</span>
          <span class="main"><div class="t1">Search all of GitHub for “${esc(q)}”</div><div class="t2">Live results, sorted by stars</div></span>
          <span class="chev">${icon('chevR', 18)}</span></button>
        <div data-gh style="margin-top:12px"></div>
      </div>`;
    hydrateTiles(this.body);
  }

  renderIdle() {
    const rec = recents.all();
    this.body.innerHTML = `
      ${rec.length ? `<div class="section" style="margin-top:8px"><div class="section-head"><h2 style="font-size:19px">Recent</h2><button class="more" data-act="clear-recent">Clear</button></div>
        <div class="recent">${rec.map((r) => `<button class="chip sm" data-q="${esc(r)}">${icon('history', 15)}${esc(r)}</button>`).join('')}</div></div>` : ''}
      <div class="section" style="margin-top:${rec.length ? 28 : 8}px"><div class="section-head"><h2 style="font-size:19px">Try searching</h2></div>
        <div class="recent">${TRY.map((r) => `<button class="chip sm" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>
      <div class="section" style="margin-top:28px"><div class="section-head"><h2 style="font-size:19px">Most starred twins</h2></div>
        <div class="card list">${db.twins.filter((t) => t.stars != null).sort((a, b) => b.stars - a.stars).filter((t, i, arr) => arr.findIndex((x) => x.key === t.key) === i).slice(0, 6).map((t) => `
          <button class="row" data-app="${t.app.id}" data-twin="${t.idx}">${twinTile(t, 'sm')}
            <span class="main"><div class="t1">${esc(t.name)}</div><div class="t2">twin of ${esc(t.app.name)} · ${esc((KIND[t.kind] || KIND.app).label)}</div></span>
            <span class="side"><span style="color:var(--star)">${icon('starFill', 13)}</span>${fmtNum(t.stars)}</span></button>`).join('')}</div></div>`;
    hydrateTiles(this.body);
  }

  async runGitHub() {
    const slot = $('[data-gh]', this.body); if (!slot) return;
    const q = this.q.trim();
    slot.innerHTML = `<div class="card list">${skelRows(4)}</div>`;
    try {
      const items = await searchGitHub(q);
      if (q !== this.q.trim()) return;
      slot.innerHTML = items.length ? `<div class="card list fade-in">${items.map(newRow).join('')}</div>` : `<div class="note">${icon('info', 18)}<div>No repositories found.</div></div>`;
    } catch (e) {
      slot.innerHTML = `<div class="note">${icon(e.kind === 'offline' || e.kind === 'network' ? 'wifiOff' : 'info', 18)}<div>${esc(e.message)}</div></div>`;
    }
  }

  onClick(e) {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'clear') { this.input.value = ''; this.q = ''; this.render(); this.input.focus(); haptic('tick'); return; }
      if (a === 'clear-recent') { recents.clear(); this.render(); return; }
      if (a === 'github') { recents.add(this.q); this.input.blur(); this.runGitHub(); return; }
    }
    const qb = e.target.closest('[data-q]');
    if (qb) { this.input.value = qb.dataset.q; this.q = qb.dataset.q; recents.add(this.q); this.render(); haptic('tick'); return; }
    const repo = e.target.closest('[data-item]');
    if (repo) { repoSheet(JSON.parse(decodeURIComponent(repo.dataset.item))); return; }
    const app = e.target.closest('[data-app]');
    if (app) { if (this.q.trim()) recents.add(this.q); this.ctx.go(`#/app/${app.dataset.app}/${app.dataset.twin || 0}`); }
  }

  onShow(params = {}) {
    if (params.focus) setTimeout(() => this.input.focus({ preventScroll: true }), 260);
    if (params.q) { this.input.value = params.q; this.q = params.q; this.render(); }
  }
  onRetap() { this.input.focus(); }
  onHide() { this.input.blur(); }
  update(what) { if ((what === 'live') && !this.q.trim()) { clearTimeout(this.u); this.u = setTimeout(() => this.renderIdle(), 400); } }
}
