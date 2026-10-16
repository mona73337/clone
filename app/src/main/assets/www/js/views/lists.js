// Full-page lists: fresh releases, rising twins, new on GitHub.
import { icon } from '../icons.js';
import { $, h, esc, twinTile, hydrateTiles, watchScroll, skelRows } from '../ui.js';
import { db, fmtNum, relTime, cleanTag, daysAgo } from '../data.js';
import { fetchNewOnGitHub } from '../github.js';
import { native } from '../native.js';
import { growth, newRow } from './today.js';
import { repoSheet } from './common.js';

const META = {
  fresh: { title: 'Fresh releases', sub: 'Every twin, newest release first.' },
  rising: { title: 'Rising on GitHub', sub: 'Twins gaining the most stars this week.' },
  new: { title: 'New on GitHub', sub: 'Android apps created recently, ranked by stars. Not curated — explore with care.' },
};

export class ListView {
  constructor(ctx, kind, params) {
    this.ctx = ctx; this.kind = META[kind] ? kind : 'fresh';
    const m = META[this.kind];
    this.el = h(`<div class="page" data-view="list">
      <div class="topbar"><button class="iconbtn" data-act="back" aria-label="Back">${icon('back', 22)}</button><div class="title">${esc(m.title)}</div><span style="width:44px"></span></div>
      <div class="wrap"><header class="page-head" style="padding-top:0"><h1>${esc(m.title)}</h1><p>${esc(m.sub)}</p></header>
      <div class="card list" style="margin-top:18px" data-list>${skelRows(6)}</div></div></div>`);
    watchScroll(this.el, $('.topbar', this.el));
    this.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="back"]')) return this.ctx.back();
      const r = e.target.closest('[data-item]'); if (r) return repoSheet(JSON.parse(decodeURIComponent(r.dataset.item)));
      const a = e.target.closest('[data-app]'); if (a) this.ctx.go(`#/app/${a.dataset.app}/${a.dataset.twin || 0}`);
    });
    this.render();
  }

  uniq(arr) { return arr.filter((t, i) => arr.findIndex((x) => x.key === t.key) === i); }

  async render() {
    const list = $('[data-list]', this.el);
    if (this.kind === 'new') {
      try {
        const { items } = await fetchNewOnGitHub();
        list.innerHTML = items.length ? items.map(newRow).join('') : '<div class="empty" style="padding:24px">Nothing new right now.</div>';
      } catch (e) {
        list.outerHTML = `<div class="note">${icon('wifiOff', 18)}<div>${esc(e.message)}</div></div>`;
      }
      return;
    }
    let rows;
    if (this.kind === 'fresh') {
      rows = this.uniq(db.twins.filter((t) => t.release && t.release.date).sort((a, b) => b.release.date.localeCompare(a.release.date)))
        .map((t) => this.row(t, `${esc(cleanTag(t.release.tag))} · ${relTime(t.release.date)}`, daysAgo(t.release.date) <= 2));
    } else {
      rows = this.uniq(db.twins.filter((t) => growth(t) > 0).sort((a, b) => growth(b) - growth(a)))
        .map((t) => this.row(t, `+${fmtNum(growth(t))} stars this week`, false));
    }
    list.innerHTML = rows.join('') || '<div class="empty" style="padding:24px">Nothing here yet.</div>';
    hydrateTiles(list);
  }

  row(t, sub, isNew) {
    return `<button class="row" data-app="${t.app.id}" data-twin="${t.idx}">${twinTile(t, 'md')}
      <span class="main"><div class="t1">${esc(t.name)} <span style="color:var(--text-4);font-weight:400">for ${esc(t.app.name)}</span></div>
      <div class="t2">${isNew ? '<span class="hl-new"><span class="pulse"></span>' + sub + '</span>' : sub}</div></span>
      <span class="side">${t.stars != null ? `<span style="color:var(--star)">${icon('starFill', 13)}</span>${fmtNum(t.stars)}` : ''}</span></button>`;
  }
}
