// Library: saved twins (with update badges) and recently viewed history.
import { icon, mark, KIND } from '../icons.js';
import { $, $$, h, esc, twinTile, appTile, hydrateTiles, haptic, onLongPress, toast } from '../ui.js';
import { db, fmtNum, relTime, cleanTag, relShort } from '../data.js';
import { library, history } from '../store.js';
import { quickActions } from './common.js';

export class LibraryView {
  constructor(ctx) {
    this.ctx = ctx;
    this.tab = 'saved';
    this.el = h(`<div class="page" data-view="library">
      <div class="topbar"><span style="width:12px"></span><div class="title">Library</div></div>
      <div class="wrap">
        <header class="page-head" style="padding-top:0"><h1>Library</h1><p>Twins you saved, and updates since you saved them.</p></header>
        <div style="padding:16px var(--gutter) 0"><div class="seg" role="tablist"><span class="thumb"></span>
          <button data-seg="saved" aria-pressed="true">${icon('bookmark', 17)}Saved</button>
          <button data-seg="history" aria-pressed="false">${icon('history', 17)}History</button></div></div>
        <div data-body style="margin-top:18px"></div>
      </div></div>`);
    import('../ui.js').then(({ watchScroll }) => watchScroll(this.el, $('.topbar', this.el)));
    this.el.addEventListener('click', (e) => this.onClick(e));
    onLongPress(this.el, '[data-app]', (el) => quickActions(this.ctx, db.byId.get(el.dataset.app), Number(el.dataset.twin || 0)));
    this.render();
  }

  moveThumb() {
    const seg = $('.seg', this.el), btn = $(`[data-seg="${this.tab}"]`, seg), th = $('.thumb', seg);
    $$('[data-seg]', seg).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    requestAnimationFrame(() => { th.style.width = btn.offsetWidth + 'px'; th.style.transform = `translateX(${btn.offsetLeft - 3}px)`; });
  }

  render() {
    this.moveThumb();
    const body = $('[data-body]', this.el);
    if (this.tab === 'saved') {
      const items = library.all().map((s) => {
        const twin = (db.byRepo.get(s.repo.toLowerCase()) || []).find((t) => t.app.id === s.app) || (db.byRepo.get(s.repo.toLowerCase()) || [])[0];
        return twin ? { s, twin } : null;
      }).filter(Boolean);
      if (!items.length) {
        body.innerHTML = `<div class="empty fade-in">
          <svg class="art" viewBox="0 0 120 120" aria-hidden="true"><rect x="34" y="18" width="52" height="78" rx="8" fill="var(--bg-raised)" stroke="var(--line-2)" stroke-width="2.5"/><path d="M34 26a8 8 0 0 1 8-8h36a8 8 0 0 1 8 8v78l-26-15-26 15z" fill="var(--accent-softer)" stroke="var(--accent-2)" stroke-width="2.5" stroke-linejoin="round"/><path d="M46 52a14 14 0 0 1 28 0z" fill="var(--accent-2)"/><path d="M46 56a14 14 0 0 0 28 0z" fill="var(--accent-2)" opacity=".32"/></svg>
          <h3>Nothing saved yet</h3><p>Tap the bookmark on any twin to keep it here. We’ll flag new releases since you saved it.</p>
          <button class="btn primary" data-act="explore">${icon('explore', 18)}Explore twins</button></div>`;
        return;
      }
      const updated = items.filter(({ s, twin }) => s.tag && twin.release && twin.release.tag && twin.release.tag !== s.tag && twin.release.tag !== s.seenTag);
      body.innerHTML = `
        ${updated.length ? `<div class="note" style="margin-top:0;margin-bottom:14px">${icon('sparkle', 18)}<div><b>${updated.length} update${updated.length > 1 ? 's' : ''}</b> since you saved — new releases are marked below.</div></div>` : ''}
        <div class="card list stagger">${items.map(({ s, twin }) => {
          const upd = updated.some((u) => u.twin === twin);
          return `<button class="row" data-app="${twin.app.id}" data-twin="${twin.idx}">
            ${twinTile(twin, 'md')}
            <span class="main"><div class="t1">${esc(twin.name)}</div>
              <div class="t2">${upd ? `<span class="hl-new"><span class="pulse"></span>Updated to ${esc(cleanTag(twin.release.tag))}</span>` : `twin of ${esc(twin.app.name)}${twin.release ? ` · ${esc(cleanTag(twin.release.tag))}` : ''}`}</div></span>
            <span class="side">${twin.stars != null ? `<span style="color:var(--star)">${icon('starFill', 13)}</span>${fmtNum(twin.stars)}` : ''}</span>
          </button>`;
        }).join('')}</div>
        <p class="foot-note" style="margin-top:16px">Long-press a twin for quick actions.</p>
        ${this.suggestions(items)}`;
    } else {
      const items = history.all().map((x) => {
        const app = db.byId.get(x.app); if (!app) return null;
        const twin = app.twins.find((t) => t.repo === x.repo) || app.twins[0];
        return { x, app, twin };
      }).filter(Boolean);
      if (!items.length) {
        body.innerHTML = `<div class="empty fade-in"><svg class="art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="38" fill="var(--bg-raised)" stroke="var(--line-2)" stroke-width="2.5"/><path d="M60 38v24l15 9" fill="none" stroke="var(--accent-2)" stroke-width="5" stroke-linecap="round"/></svg>
          <h3>No history yet</h3><p>Twins you open will appear here.</p></div>`;
        return;
      }
      body.innerHTML = `<div class="card list">${items.map(({ x, app, twin }) => `
        <button class="row pairrow" data-app="${app.id}" data-twin="${twin.idx}">
          <span class="pairtiles">${appTile(app, 'sm')}${twinTile(twin, 'sm')}</span>
          <span class="main"><div class="t1">${esc(twin.name)}</div><div class="t2">twin of ${esc(app.name)} · ${relShort(x.at)}</div></span>
          <span class="chev">${icon('chevR', 18)}</span></button>`).join('')}</div>
        <div class="center" style="margin-top:14px"><button class="btn ghost sm" data-act="clear-history">${icon('trash', 16)}Clear history</button></div>`;
    }
    hydrateTiles(body);
  }

  suggestions(items) {
    const savedKeys = new Set(items.map(({ twin }) => twin.key));
    const cats = new Map();
    items.forEach(({ twin }) => cats.set(twin.app.cat, (cats.get(twin.app.cat) || 0) + 1));
    const picks = db.apps
      .filter((a) => cats.has(a.cat) && !savedKeys.has(a.twins[0].key))
      .sort((a, b) => (cats.get(b.cat) - cats.get(a.cat)) || a.rank - b.rank)
      .slice(0, 8);
    if (!picks.length) return '';
    return `<section class="section" style="margin-top:30px"><div class="section-head"><div><h2>Suggested for you</h2><p>Because of what you saved</p></div></div></section>
      <div class="rail">${picks.map((a) => `
        <button class="card mini pressable" data-app="${a.id}" data-twin="0">
          ${twinTile(a.twins[0], 'md')}
          <div class="name">${esc(a.twins[0].name)}</div>
          <div class="of">for ${esc(a.name)}</div>
        </button>`).join('')}</div>`;
  }

  onClick(e) {
    const seg = e.target.closest('[data-seg]');
    if (seg) { if (seg.dataset.seg !== this.tab) { haptic('tick'); this.tab = seg.dataset.seg; this.render(); } return; }
    const act = e.target.closest('[data-act]');
    if (act) {
      if (act.dataset.act === 'explore') return this.ctx.switchTab('explore');
      if (act.dataset.act === 'clear-history') { history.clear(); toast('History cleared', { icon: 'check' }); return; }
    }
    const app = e.target.closest('[data-app]');
    if (app) this.ctx.go(`#/app/${app.dataset.app}/${app.dataset.twin || 0}`);
  }

  onShow() { this.render(); }
  update(what) { if (['library', 'history', 'live', 'release'].includes(what) && !this.el.hidden) { clearTimeout(this.t); this.t = setTimeout(() => this.render(), 120); } }
}
