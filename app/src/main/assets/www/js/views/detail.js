// Detail: one popular app and its twins across the equator — stats, release notes, screenshots, README.
import { icon, mark, KIND, CAT_ICON } from '../icons.js';
import { $, $$, h, esc, appTile, twinTile, eq, hydrateTiles, watchScroll, haptic, toast, countUp, progressRing, onLongPress, landFlight } from '../ui.js';
import { db, fmtNum, fmtInt, relTime, fmtDate, cleanTag, daysAgo, catName } from '../data.js';
import { library, history } from '../store.js';
import { fetchReleases, fetchReadme, fetchRepo } from '../github.js';
import { native } from '../native.js';
import { sanitize, miniMarkdown } from '../md.js';
import { shareTwin, toggleSave, getFlow, downloads, resumePolling, quickActions } from './common.js';

const KIND_NOTE = {
  app: 'install it on your phone straight from the project’s GitHub releases.',
  server: 'run it on your own server or a home box, then use it from any browser or its apps.',
  desktop: 'download it for Windows, macOS or Linux.',
  web: 'use it in the browser, or host your own copy.',
  engine: 'the open runtime other apps build on — run it on your own hardware.',
};

export class DetailView {
  constructor(ctx, app, idx = 0, opts = {}) {
    this.ctx = ctx; this.app = app; this.idx = Math.min(idx, app.twins.length - 1); this.opts = opts;
    this.params = opts.params || {};
    this.el = h(`<div class="page" data-view="detail">
      <div class="topbar">
        <button class="iconbtn" data-act="back" aria-label="Back">${icon('back', 22)}</button>
        <div class="title"></div>
        <button class="iconbtn" data-act="share" aria-label="Share">${icon('share', 21)}</button>
        <button class="iconbtn" data-act="save" aria-label="Save">${icon('bookmark', 21)}</button>
      </div>
      <div class="wrap" data-body></div></div>`);
    this.bar = $('.topbar', this.el);
    this.body = $('[data-body]', this.el);
    watchScroll(this.el, this.bar);
    this.el.addEventListener('scroll', () => this.parallax(), { passive: true });
    this.el.addEventListener('click', (e) => this.onClick(e));
    onLongPress(this.el, '[data-other]', (el) => quickActions(this.ctx, this.app, Number(el.dataset.other)));
    this.render();
    landFlight(this.el);
  }

  get twin() { return this.app.twins[this.idx]; }

  parallax() {
    if (this.pf) return;
    this.pf = requestAnimationFrame(() => {
      this.pf = 0;
      const pair = this.body.querySelector('.d-pair');
      if (!pair) return;
      const y = Math.max(0, Math.min(140, this.el.scrollTop));
      const p = y / 140;
      pair.style.transform = `translateY(${y * 0.3}px) scale(${1 - p * 0.1})`;
      pair.style.opacity = String(Math.max(0, 1 - p * 1.6));
    });
  }

  render() {
    const a = this.app, t = this.twin;
    history.push(a.id, t.repo);
    $('.title', this.bar).textContent = t.name;
    this.syncSave();
    const k = KIND[t.kind] || KIND.app;
    const aotdStamp = this.opts.aotd ? `<div class="center" style="margin-top:4px"><span class="perk">${mark(14)}App of the Day</span></div>` : '';
    this.body.innerHTML = `
      <section class="d-hero">
        ${aotdStamp}
        <div class="d-pair">
          <div class="side">${appTile(a, 'xl lift')}<span class="lbl">The app</span><span class="nm">${esc(a.name)}</span></div>
          ${eq()}
          <div class="side">${twinTile(t, 'xl lift')}<span class="lbl" style="color:var(--accent-text)">The twin</span><span class="nm">${esc(t.name)}</span></div>
        </div>
        <div class="d-title">
          <h1>${esc(t.name)}</h1>
          <button class="repo" data-act="github" aria-label="Open ${esc(t.repo)} on GitHub">${icon('code', 14)}<span>${esc(t.repo)}</span></button>
        </div>
        <p class="d-tagline">${esc(t.tagline)}</p>
        <div class="d-perks">${t.perks.map((p) => `<span class="perk">${icon('check', 14)}${esc(p)}</span>`).join('')}
          ${t.perks.some((p) => p.toLowerCase() === k.label.toLowerCase()) ? '' : `<span class="perk kind">${icon(k.icon, 14)}${k.label}</span>`}</div>
      </section>

      ${a.twins.length > 1 ? `<div class="twin-tabs" role="tablist" aria-label="Twins of ${esc(a.name)}">${a.twins.map((x, i) => `
        <button class="twin-tab" data-tw="${i}" aria-pressed="${i === this.idx}">${twinTile(x)}${esc(x.name)}${x.stars != null ? `<span class="n">★ ${fmtNum(x.stars)}</span>` : ''}</button>`).join('')}</div>` : ''}

      <div class="d-actions">
        <button class="btn primary" data-act="get">${this.getLabel()}</button>
        <button class="btn ghost" data-act="github" aria-label="Source on GitHub">${icon('code', 21)}</button>
        <button class="btn ghost" data-act="releases" aria-label="All releases">${icon('tag', 20)}</button>
      </div>

      ${t.archived ? `<div class="note">${icon('info', 18)}<div><b>This repository is archived.</b> It still works, but is no longer actively maintained.</div></div>` : ''}

      <div class="card stats" data-stats>${this.statsHTML()}</div>

      ${t.shots && t.shots.length ? `<section class="section" style="margin-top:26px"><div class="section-head"><h2>Screenshots</h2></div>
        <div class="shots">${t.shots.map((s) => `<div class="shot"><img alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="https://raw.githubusercontent.com/${t.repo}/${t.branch || 'HEAD'}/${s}" onload="this.classList.add('ok')" onerror="this.parentElement.remove()"></div>`).join('')}</div></section>` : ''}

      <section class="card panel" data-release style="margin-top:22px">
        <h3>Latest release <small data-reltag></small></h3>
        <div data-relbody><div class="sk line" style="width:40%;margin-top:14px"></div><div class="sk line"></div><div class="sk line" style="width:86%"></div><div class="sk line" style="width:70%"></div></div>
      </section>

      <section class="card panel">
        <h3>Across the equator</h3>
        <p class="lead">How ${esc(a.name)} and ${esc(t.name)} compare.</p>
        <table class="compare">
          <thead><tr><th></th><th>${esc(a.name)}</th><th style="color:var(--accent-text)">${esc(t.name)}</th></tr></thead>
          <tbody>
            <tr><td>Made by</td><td>${esc(a.maker)}</td><td class="y">${esc(t.owner)}</td></tr>
            <tr><td>Source code</td><td>Closed</td><td class="y"><span class="src"><span class="yes">${icon('check', 15)}Open source</span>${t.license ? `<small>${esc(t.license)} licence</small>` : ''}</span></td></tr>
            <tr><td>Standing</td><td>#${a.rank} most popular</td><td class="y" data-standing>${t.stars != null ? `★ ${fmtInt(t.stars)} on GitHub` : 'Syncing…'}</td></tr>
            <tr><td>Twin type</td><td colspan="2" class="kindrow"><b>${k.label}</b> — ${esc(KIND_NOTE[t.kind] || '')}</td></tr>
            <tr><td>Category</td><td colspan="2">${esc(catName(a.cat))}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="card panel" data-readme>
        <h3>README <small>from GitHub</small></h3>
        <div data-readmebody><div class="sk line" style="margin-top:14px"></div><div class="sk line" style="width:90%"></div><div class="sk line" style="width:60%"></div></div>
      </section>

      ${a.twins.length > 1 ? `<section class="section"><div class="section-head"><div><h2>Other twins of ${esc(a.name)}</h2></div></div>
        <div class="card list">${a.twins.map((x, i) => i === this.idx ? '' : `
          <button class="row" data-other="${i}">${twinTile(x, 'md')}
            <span class="main"><div class="t1">${esc(x.name)}</div><div class="t2">${esc(x.tagline)}</div></span>
            <span class="side">${x.stars != null ? `<span style="color:var(--star)">${icon('starFill', 13)}</span>${fmtNum(x.stars)}` : ''}</span></button>`).join('')}</div></section>` : ''}

      ${this.moreInCategory()}

      <p class="foot-note">${esc(t.name)} is an independent open-source project. Clone links to its public GitHub repository and is not affiliated with ${esc(a.maker)} or ${esc(a.name)}.</p>
    `;
    hydrateTiles(this.body);
    this.loadLive();
    resumePolling(t, (d) => this.onProgress(d));
  }

  getLabel(d) {
    const t = this.twin;
    if (d) return `${progressRing(d.progress)}<span>${d.progress != null ? Math.round(d.progress * 100) + '%' : 'Starting…'}</span>`;
    if (downloads.has(t.repo)) return `${progressRing(null)}<span>Downloading…</span>`;
    if (t.kind === 'app') return `${icon('download', 20)}<span>Get APK</span>`;
    if (t.kind === 'server') return `${icon('server', 19)}<span>Self-host it</span>`;
    if (t.kind === 'web') return `${icon('globe', 19)}<span>Open project</span>`;
    if (t.kind === 'desktop') return `${icon('laptop', 19)}<span>Get for desktop</span>`;
    return `${icon('external', 19)}<span>Open project</span>`;
  }
  onProgress(d) {
    const b = $('[data-act="get"]', this.body);
    if (b) b.innerHTML = this.getLabel(d || undefined);
  }

  statsHTML() {
    const t = this.twin, r = t.release;
    return `
      <div class="stat"><div class="v" data-count="stars">${fmtNum(t.stars)}</div><div class="k">${icon('star', 13)}Stars</div></div>
      <div class="stat"><div class="v">${fmtNum(t.forks)}</div><div class="k">${icon('fork', 13)}Forks</div></div>
      <div class="stat"><div class="v ${r && cleanTag(r.tag).length > 8 ? 'small' : ''}">${r ? esc(cleanTag(r.tag)) : '—'}</div><div class="k">${icon('tag', 13)}${r ? relTime(r.date) : 'Release'}</div></div>
      <div class="stat"><div class="v small">${esc(t.license || '—')}</div><div class="k">${icon('scale', 13)}License</div></div>
      <div class="stat"><div class="v small">${esc(t.lang || '—')}</div><div class="k">${icon('code', 13)}Language</div></div>
      <div class="stat"><div class="v small">${t.pushed ? relTime(t.pushed) : '—'}</div><div class="k">${icon('activity', 13)}Last commit</div></div>`;
  }

  async loadLive() {
    const t = this.twin, idx = this.idx;
    const starsEl = $('[data-count="stars"]', this.body);
    if (starsEl && t.stars != null) countUp(starsEl, t.stars);
    // repo metadata (only if we never got live data for it)
    if (!t.liveAt) fetchRepo(t.repo).then(() => { if (this.idx === idx) this.refreshStats(); }).catch(() => {});
    // releases
    fetchReleases(t.repo).then(({ latest, list }) => {
      if (this.idx !== idx) return;
      this.renderRelease(latest, list);
      this.refreshStats();
      if (this.params.get === '1' && !this.autoGot) { this.autoGot = true; setTimeout(() => getFlow(this.app, this.twin, (d) => this.onProgress(d)), 250); }
    }).catch((e) => {
      if (this.idx !== idx) return;
      const rb = $('[data-relbody]', this.body);
      const r = t.release;
      rb.innerHTML = `${r ? `<div class="meta" style="margin-top:10px"><span>${icon('tag', 14)}<b style="color:var(--text)">${esc(r.tag)}</b></span><span>${fmtDate(r.date)}</span></div>` : ''}
        <div class="note" style="margin:12px 0 0">${icon(e.kind === 'offline' || e.kind === 'network' ? 'wifiOff' : 'info', 18)}<div>${e.kind === 'notfound' ? 'This project doesn’t publish GitHub releases.' : e.kind === 'ratelimit' ? 'GitHub’s hourly limit was reached. Notes will load later — or add a token in Settings.' : 'Release notes load when you’re online.'}</div></div>`;
      if (this.params.get === '1' && !this.autoGot) { this.autoGot = true; getFlow(this.app, this.twin, (d) => this.onProgress(d)); }
    });
    // readme
    fetchReadme(t.repo).then((html) => {
      if (this.idx !== idx) return;
      const box = $('[data-readmebody]', this.body);
      const clean = sanitize(html.trim().startsWith('{') ? '' : html, t.repo, t.branch);
      box.innerHTML = `<div class="relnotes md" style="max-height:420px">${clean || '<p>No README.</p>'}</div><button class="expand" data-act="expand">Read more${icon('chevD', 16)}</button>`;
      box.firstElementChild.classList.add('fade-in');
    }).catch((e) => {
      if (this.idx !== idx) return;
      $('[data-readme]', this.body).innerHTML = `<h3>README <small>from GitHub</small></h3><div class="note" style="margin:12px 0 0">${icon(e.kind === 'offline' || e.kind === 'network' ? 'wifiOff' : 'info', 18)}<div>${e.kind === 'ratelimit' ? 'GitHub’s hourly limit was reached.' : e.kind === 'notfound' ? 'No README found.' : 'The README loads when you’re online.'}</div></div>
        <button class="btn ghost block" style="margin-top:14px" data-act="github">${icon('external', 18)}Read it on GitHub</button>`;
    });
  }

  renderRelease(rel, list) {
    const t = this.twin;
    const box = $('[data-relbody]', this.body);
    if (!rel) {
      box.innerHTML = `<div class="note" style="margin:12px 0 0">${icon('info', 18)}<div>${esc(t.name)} doesn’t publish releases on GitHub${t.release ? ` — the latest tag is <b>${esc(t.release.tag)}</b>` : ''}.</div></div>`;
      return;
    }
    $('[data-reltag]', this.body).textContent = rel.tag_name;
    const html = rel.body_html ? sanitize(rel.body_html, t.repo, t.branch) : miniMarkdown(rel.body || '');
    const age = daysAgo((rel.published_at || '').slice(0, 10));
    const apks = (rel.assets || []).filter((x) => /\.apk$/i.test(x.name)).length;
    box.innerHTML = `
      <div class="meta" style="margin-top:8px">
        <span class="${age <= 3 ? 'new' : ''}">${icon('calendar', 14)}${fmtDate((rel.published_at || '').slice(0, 10))} · ${relTime((rel.published_at || '').slice(0, 10))}</span>
        ${rel.prerelease ? '<span class="new">Pre-release</span>' : ''}
        ${apks ? `<span>${icon('pkg', 14)}${apks} APK${apks > 1 ? 's' : ''}</span>` : ''}
      </div>
      <div class="relnotes md fade-in">${html || '<p>No release notes.</p>'}</div>
      <button class="expand" data-act="expand">Show full notes${icon('chevD', 16)}</button>`;
    const notes = $('.relnotes', box);
    requestAnimationFrame(() => { if (notes.scrollHeight <= notes.clientHeight + 4) { notes.classList.add('open'); const ex = $('.expand', box); ex && ex.remove(); } });
  }

  refreshStats() {
    const s = $('[data-stats]', this.body);
    if (s) s.innerHTML = this.statsHTML();
    const st = $('[data-standing]', this.body);
    if (st && this.twin.stars != null) st.textContent = `★ ${fmtInt(this.twin.stars)} on GitHub`;
  }

  moreInCategory() {
    const same = db.apps.filter((x) => x.cat === this.app.cat && x.id !== this.app.id).slice(0, 10);
    if (!same.length) return '';
    return `<section class="section"><div class="section-head"><div><h2>More in ${esc(catName(this.app.cat))}</h2></div>
      <button class="more" data-cat="${this.app.cat}">All${icon('chevR', 16)}</button></div>
      <div class="rail">${same.map((x) => `
        <button class="card mini pressable" data-goapp="${x.id}">
          <div style="display:flex;align-items:center">${appTile(x, 'sm')}<span style="margin-left:-8px">${twinTile(x.twins[0], 'sm')}</span></div>
          <div class="name">${esc(x.twins[0].name)}</div>
          <div class="of">for ${esc(x.name)}</div>
        </button>`).join('')}</div></section>`;
  }

  syncSave() {
    const b = $('[data-act="save"]', this.bar);
    const on = library.has(this.twin.repo);
    b.innerHTML = icon(on ? 'bookmarkFill' : 'bookmark', 21);
    b.classList.toggle('on', on);
    b.setAttribute('aria-label', on ? 'Remove from Library' : 'Save to Library');
  }

  switchTwin(i) {
    if (i === this.idx) return;
    haptic('tick');
    this.idx = i;
    const y = this.el.scrollTop;
    this.body.style.opacity = '0';
    setTimeout(() => {
      this.render();
      this.el.scrollTop = Math.min(y, 120);
      this.body.style.transition = 'opacity 220ms var(--ease)';
      this.body.style.opacity = '1';
      const tab = $(`[data-tw="${i}"]`, this.body); tab && tab.scrollIntoView({ inline: 'center', block: 'nearest' });
    }, 120);
  }

  onClick(e) {
    const el = e.target;
    const ext = el.closest('a[data-ext]');
    if (ext) { e.preventDefault(); native.openUrl(ext.href); return; }
    if (el.closest('a')) { e.preventDefault(); return; }
    const tw = el.closest('[data-tw]'); if (tw) return this.switchTwin(Number(tw.dataset.tw));
    const other = el.closest('[data-other]'); if (other) return this.switchTwin(Number(other.dataset.other));
    const ga = el.closest('[data-goapp]'); if (ga) return this.ctx.go(`#/app/${ga.dataset.goapp}/0`);
    const cat = el.closest('[data-cat]'); if (cat) return this.ctx.switchTab('explore', { cat: cat.dataset.cat });
    const act = el.closest('[data-act]'); if (!act) return;
    const a = act.dataset.act, t = this.twin;
    if (a === 'back') return this.ctx.back();
    if (a === 'share') return shareTwin(this.app, t);
    if (a === 'save') { toggleSave(this.app, t); this.syncSave(); const b = $('[data-act="save"]', this.bar); b.animate([{ transform: 'scale(.7)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.45,.64,1)' }); return; }
    if (a === 'github') { haptic('tick'); return native.openUrl(`https://github.com/${t.repo}`); }
    if (a === 'releases') { haptic('tick'); return native.openUrl(`https://github.com/${t.repo}/releases`); }
    if (a === 'get') { haptic('click'); return getFlow(this.app, t, (d) => this.onProgress(d)); }
    if (a === 'expand') {
      const box = act.previousElementSibling; if (!box) return;
      const open = box.classList.toggle('open');
      if (open) box.style.maxHeight = 'none'; else box.style.maxHeight = '';
      act.innerHTML = open ? `Show less${icon('chevD', 16, 'style="transform:rotate(180deg)"')}` : `Show more${icon('chevD', 16)}`;
      haptic('tick');
    }
  }

  onShow() { this.syncSave(); }
  update(what) {
    if (what === 'library') this.syncSave();
    if (what === 'live') { clearTimeout(this.u); this.u = setTimeout(() => this.refreshStats(), 200); }
  }
  destroy() {}
}
