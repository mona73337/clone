// Explore: all 100 pairs, filter by category, sort by popularity / stars / freshness / name.
import { icon, CAT_ICON, KIND } from '../icons.js';
import { $, $$, h, esc, appTile, twinTile, hydrateTiles, chooser, watchScroll, onLongPress, haptic } from '../ui.js';
import { db, fmtNum, relTime, sortApps, appCount } from '../data.js';
import { settings } from '../store.js';
import { quickActions } from './common.js';

const SORTS = [
  { id: 'popular', label: 'Most popular app', sub: 'Ranked by global downloads and usage', icon: 'users' },
  { id: 'stars', label: 'Most starred twin', sub: 'GitHub stars, live when online', icon: 'star' },
  { id: 'fresh', label: 'Recently released', sub: 'Newest twin releases first', icon: 'sparkle' },
  { id: 'az', label: 'Name (A–Z)', icon: 'type' },
];

export class ExploreView {
  constructor(ctx) {
    this.ctx = ctx;
    this.cat = 'all';
    this.sort = settings.sort;
    this.el = h(`<div class="page" data-view="explore">
      <div class="topbar"><span style="width:12px"></span><div class="title">Explore</div>
        <button class="iconbtn" data-act="sort" aria-label="Sort">${icon('sort', 21)}</button></div>
      <div class="wrap">
        <header class="page-head" style="padding-top:0"><h1>Explore</h1><p>100 of the world’s most popular apps, each paired with its best-rated open-source twin on GitHub.</p></header>
        <div class="sticky-chips"><div class="chips" data-chips></div></div>
        <div class="section-head" style="margin:18px 0 10px"><p data-summary style="margin:0"></p>
          <button class="more" data-act="sort">${icon('sort', 15)}<span data-sortlabel></span></button></div>
        <div class="card list" data-list></div>
      </div></div>`);
    this.bar = $('.topbar', this.el);
    watchScroll(this.el, this.bar);
    const sc = $('.sticky-chips', this.el);
    this.el.addEventListener('scroll', () => sc.classList.toggle('stuck', sc.getBoundingClientRect().top <= this.bar.getBoundingClientRect().bottom + 1), { passive: true });
    this.renderChips();
    this.renderList();
    this.el.addEventListener('click', (e) => this.onClick(e));
    onLongPress(this.el, '[data-app]', (el) => quickActions(this.ctx, db.byId.get(el.dataset.app), 0));
  }

  renderChips() {
    const c = $('[data-chips]', this.el);
    c.innerHTML = `<button class="chip" data-cat="all" aria-pressed="${this.cat === 'all'}">${icon('grid', 16)}All<span class="count">100</span></button>` +
      db.cats.map((x) => `<button class="chip" data-cat="${x.id}" aria-pressed="${this.cat === x.id}">${icon(CAT_ICON[x.id], 17)}${esc(x.name)}<span class="count">${appCount(x.id)}</span></button>`).join('');
  }

  renderList(animate = false) {
    let apps = this.cat === 'all' ? db.apps : db.apps.filter((a) => a.cat === this.cat);
    apps = sortApps(apps, this.sort);
    const s = SORTS.find((x) => x.id === this.sort);
    $('[data-sortlabel]', this.el).textContent = s.label.replace(' (A–Z)', '');
    const catLabel = this.cat === 'all' ? 'All categories' : db.cats.find((c) => c.id === this.cat).name;
    $('[data-summary]', this.el).textContent = `${catLabel} · ${apps.length} pairs`;
    const list = $('[data-list]', this.el);
    list.innerHTML = apps.map((a) => {
      const t = a.twins[0];
      const k = KIND[t.kind] || KIND.app;
      const sub = this.sort === 'fresh' && t.release ? `Released ${relTime(t.release.date)}` : this.sort === 'stars' ? `${t.stars != null ? fmtNum(t.stars) + ' stars' : 'Stars syncing…'}` : k.label;
      return `<button class="row pairrow" data-app="${a.id}">
        <span class="rank">${this.sort === 'popular' ? a.rank : ''}</span>
        <span class="pairtiles">${appTile(a, 'sm')}${twinTile(t, 'sm')}</span>
        <span class="main"><div class="t1">${esc(a.name)}</div>
          <div class="t2 to">${icon('arrowR', 13)}<b>${esc(t.name)}</b><span class="dim">· ${esc(sub)}</span></div></span>
        <span class="side">${t.stars != null && this.sort !== 'stars' ? `<span style="color:var(--star)">${icon('starFill', 13)}</span>${fmtNum(t.stars)}` : ''}</span>
      </button>`;
    }).join('');
    if (this.sort !== 'popular') $$('.rank', list).forEach((r) => (r.style.display = 'none'));
    if (animate) { list.classList.remove('stagger'); void list.offsetWidth; list.classList.add('stagger'); }
    hydrateTiles(list);
  }

  onClick(e) {
    const chip = e.target.closest('[data-cat]');
    if (chip) {
      haptic('tick');
      this.cat = chip.dataset.cat;
      $$('[data-cat]', this.el).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      this.renderList(true);
      return;
    }
    if (e.target.closest('[data-act="sort"]')) {
      chooser('Sort by', SORTS.map((s) => ({ ...s, checked: s.id === this.sort })), (id) => {
        this.sort = id; settings.sort = id; this.renderList(true);
      });
      return;
    }
    const app = e.target.closest('[data-app]');
    if (app) this.ctx.go(`#/app/${app.dataset.app}/0`);
  }

  onShow(params = {}) {
    if (params.cat && params.cat !== 'all' && !db.cats.some((c) => c.id === params.cat)) return;
    if (params.cat && params.cat !== this.cat) {
      this.cat = params.cat;
      this.renderChips(); this.renderList();
      this.el.scrollTop = 0;
      requestAnimationFrame(() => { const c = $(`[data-cat="${this.cat}"]`, this.el); c && c.scrollIntoView({ inline: 'center', block: 'nearest' }); });
    }
  }
  update(what) { if (what === 'live' || what === 'release') { clearTimeout(this.t); this.t = setTimeout(() => this.renderList(), 300); } }
}
