// Settings: profile, appearance, App of the Day reminder, GitHub access, data, about.
import { icon, mark } from '../icons.js';
import { $, $$, h, esc, haptic, toast, openSheet, chooser, watchScroll } from '../ui.js';
import { settings, getThemePref, library, history, ls } from '../store.js';
import { native, isNative } from '../native.js';
import { limits, syncCatalog, syncState, clearCache, resetLimits } from '../github.js';
import { relShort, db } from '../data.js';

const fmtTime = (hh, mm) => new Date(2000, 0, 1, hh, mm).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export class SettingsView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = h(`<div class="page" data-view="settings">
      <div class="topbar"><button class="iconbtn" data-act="back" aria-label="Back">${icon('back', 22)}</button><div class="title">Settings</div><span style="width:44px"></span></div>
      <div class="wrap" data-body></div></div>`);
    watchScroll(this.el, $('.topbar', this.el));
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.render();
  }

  render() {
    const pref = getThemePref();
    const d = settings.daily;
    const info = native.info();
    const notif = native.notificationsAllowed();
    const core = limits.core, search = limits.search;
    const lim = core ? `${core.remaining}/${core.limit} requests left${core.remaining < core.limit && core.reset > Date.now() ? ` · resets in ${Math.max(1, Math.round((core.reset - Date.now()) / 60000))} min` : ''}` : 'No requests yet';
    $('[data-body]', this.el).innerHTML = `
      <header class="page-head" style="padding-top:0"><h1>Settings</h1></header>

      <div class="group-title eyebrow">You</div>
      <div class="card list">
        <button class="srow" data-act="name"><span class="ic">${icon('users', 21)}</span><span class="main"><div class="t1">Your name</div><div class="t2">Used for your greeting on Today</div></span><span class="val">${esc(settings.name || 'Add')}</span></button>
      </div>

      <div class="group-title eyebrow">Appearance</div>
      <div class="card" style="margin:0 var(--gutter);padding:14px 14px 16px">
        <div class="seg" data-seg role="radiogroup" aria-label="Theme"><span class="thumb"></span>
          <button data-themeopt="system" aria-pressed="${pref === 'system'}">${icon('system', 17)}System</button>
          <button data-themeopt="light" aria-pressed="${pref === 'light'}">${icon('sun', 17)}Light</button>
          <button data-themeopt="dark" aria-pressed="${pref === 'dark'}">${icon('moon', 17)}Dark</button>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px">${['light', 'dark'].map((m) => `
          <div style="flex:1;border-radius:14px;padding:10px;background:${m === 'dark' ? '#262624' : '#FAF9F5'};box-shadow:inset 0 0 0 .5px var(--line-2)">
            <div style="display:flex;align-items:center;gap:6px;font-family:var(--font-serif);font-size:15px;color:${m === 'dark' ? '#FAF9F5' : '#141413'}">${mark(16)}Good ${m === 'dark' ? 'evening' : 'morning'}</div>
            <div style="height:22px;border-radius:7px;margin-top:8px;background:${m === 'dark' ? '#30302E' : '#FFFFFF'};box-shadow:0 0 0 .5px ${m === 'dark' ? 'rgba(222,220,209,.16)' : 'rgba(31,30,29,.14)'}"></div>
            <div style="display:flex;gap:4px;margin-top:6px"><span style="height:6px;flex:2;border-radius:3px;background:#D97757"></span><span style="height:6px;flex:3;border-radius:3px;background:${m === 'dark' ? '#40403C' : '#E8E6DC'}"></span></div>
          </div>`).join('')}</div>
      </div>
      <div class="card list" style="margin-top:10px">
        <div class="srow static"><span class="ic">${icon('zap', 21)}</span><span class="main"><div class="t1">Reduce motion</div><div class="t2">Fewer animations and transitions</div></span><button class="switch" role="switch" data-toggle="reduceMotion" aria-checked="${settings.reduceMotion}" aria-label="Reduce motion"></button></div>
        <div class="srow static"><span class="ic">${icon('hand', 21)}</span><span class="main"><div class="t1">Haptics</div><div class="t2">Subtle vibration on taps</div></span><button class="switch" role="switch" data-toggle="haptics" aria-checked="${settings.haptics}" aria-label="Haptics"></button></div>
      </div>

      <div class="group-title eyebrow">App of the Day</div>
      <div class="card list">
        <div class="srow static"><span class="ic">${icon('bell', 21)}</span><span class="main"><div class="t1">Daily notification</div><div class="t2">${d.enabled && isNative && !notif ? 'Notifications are blocked — tap to allow' : 'A new twin, every morning'}</div></span><button class="switch" role="switch" data-toggle="daily" aria-checked="${d.enabled}" aria-label="Daily notification"></button></div>
        <button class="srow" data-act="time" ${d.enabled ? '' : 'style="opacity:.5"'}><span class="ic">${icon('clock', 21)}</span><span class="main"><div class="t1">Time</div></span><span class="val">${fmtTime(d.hour, d.minute)}</span></button>
        <button class="srow" data-act="aotd"><span class="ic">${icon('sparkle', 21)}</span><span class="main"><div class="t1">Open today’s pick</div></span><span class="chev">${icon('chevR', 18)}</span></button>
      </div>

      <div class="group-title eyebrow">GitHub</div>
      <div class="card list">
        <button class="srow" data-act="token"><span class="ic">${icon('key', 21)}</span><span class="main"><div class="t1">Personal access token</div><div class="t2">${settings.token ? 'Added — 5,000 requests per hour' : 'Optional — raises the 60/hour limit'}</div></span><span class="val">${settings.token ? '••••' + esc(settings.token.slice(-4)) : 'Add'}</span></button>
        <div class="srow static"><span class="ic">${icon('activity', 21)}</span><span class="main"><div class="t1">Rate limit</div><div class="t2">${esc(lim)}${search ? ` · search ${search.remaining}/${search.limit}` : ''}</div></span></div>
        <button class="srow" data-act="sync"><span class="ic">${icon('refresh', 21)}</span><span class="main"><div class="t1">Sync live data now</div><div class="t2">${syncState.running ? `Syncing… ${syncState.done}/${syncState.total}` : syncState.last ? `Last synced ${relShort(syncState.last)}` : 'Not synced yet'}</div></span></button>
      </div>

      <div class="group-title eyebrow">Data</div>
      <div class="card list">
        <button class="srow" data-act="clear-cache"><span class="ic">${icon('trash', 21)}</span><span class="main"><div class="t1">Clear cached GitHub data</div><div class="t2">Saved twins and settings stay</div></span></button>
        <button class="srow" data-act="onboarding"><span class="ic">${icon('eye', 21)}</span><span class="main"><div class="t1">Show the welcome tour</div></span></button>
      </div>

      <div class="group-title eyebrow">About</div>
      <div class="card list">
        <div class="srow static"><span class="ic">${mark(22)}</span><span class="main"><div class="t1">Clone</div><div class="t2">Version ${esc(info.version || 'web')}${info.versionCode ? ` (${info.versionCode})` : ''} · catalog ${esc(db.snapshot)}</div></span></div>
        <button class="srow" data-act="sources"><span class="ic">${icon('layers', 21)}</span><span class="main"><div class="t1">Data sources & licenses</div></span><span class="chev">${icon('chevR', 18)}</span></button>
        <button class="srow" data-act="privacy"><span class="ic">${icon('shield', 21)}</span><span class="main"><div class="t1">Privacy</div><div class="t2">No accounts, no analytics, no ads</div></span><span class="chev">${icon('chevR', 18)}</span></button>
      </div>
      <p class="foot-note">Made with care for the open-source community.<br>${library.all().length} saved · ${history.all().length} recently viewed</p>`;
    this.moveThumb();
  }

  moveThumb() {
    const seg = $('[data-seg]', this.el); if (!seg) return;
    const btn = $(`[data-themeopt="${getThemePref()}"]`, seg), th = $('.thumb', seg);
    requestAnimationFrame(() => { th.style.width = btn.offsetWidth + 'px'; th.style.transform = `translateX(${btn.offsetLeft - 3}px)`; });
  }

  async toggleDaily() {
    const d = settings.daily;
    if (!d.enabled) {
      let ok = native.notificationsAllowed();
      if (!ok) ok = await native.requestNotifications();
      if (!ok && isNative) {
        toast('Allow notifications to get your daily pick', { action: 'Settings', onAction: () => native.openNotificationSettings(), duration: 5000 });
      }
      settings.daily = { ...d, enabled: true };
      toast(`Daily pick at ${fmtTime(d.hour, d.minute)}`, { icon: 'bell' });
    } else {
      settings.daily = { ...d, enabled: false };
    }
    this.ctx.scheduleDaily();
    this.render();
  }

  onClick(e) {
    const th = e.target.closest('[data-themeopt]');
    if (th) {
      haptic('tick');
      $$('[data-themeopt]', this.el).forEach((b) => b.setAttribute('aria-pressed', String(b === th)));
      this.ctx.setTheme(th.dataset.themeopt);
      this.moveThumb();
      return;
    }
    const tg = e.target.closest('[data-toggle]');
    if (tg) {
      haptic('tick');
      const k = tg.dataset.toggle;
      if (k === 'daily') return this.toggleDaily();
      settings[k] = !settings[k];
      tg.setAttribute('aria-checked', String(settings[k]));
      return;
    }
    const act = e.target.closest('[data-act]'); if (!act) return;
    const a = act.dataset.act;
    if (a === 'back') return this.ctx.back();
    if (a === 'name') return this.editName();
    if (a === 'time') return this.pickTime();
    if (a === 'aotd') return this.ctx.go('#/aotd');
    if (a === 'token') return this.editToken();
    if (a === 'sync') { syncCatalog(true, true); toast('Syncing live data…', { icon: 'refresh' }); setTimeout(() => this.render(), 300); return; }
    if (a === 'clear-cache') { clearCache(); ls.del('live'); ls.del('rels'); ls.del('lastSync'); ls.del('lastSyncAttempt'); resetLimits(); toast('Cache cleared', { icon: 'check' }); return; }
    if (a === 'onboarding') { import('./onboarding.js').then((m) => m.showOnboarding(this.ctx)); return; }
    if (a === 'sources') return this.sources();
    if (a === 'privacy') return this.privacy();
  }

  editName() {
    const body = h(`<div><p style="color:var(--text-3);font-size:14px;margin-bottom:12px">How should Clone greet you?</p>
      <label class="search-box" style="padding:0 16px"><input type="text" maxlength="40" placeholder="Your first name" value="${esc(settings.name)}" autocomplete="given-name" enterkeyhint="done"></label>
      <button class="btn primary block" style="margin-top:16px" data-save>Save</button></div>`);
    const s = openSheet({ title: 'Your name', body });
    const input = $('input', body);
    setTimeout(() => input.focus(), 350);
    const save = () => { settings.name = input.value; s.close(); this.render(); haptic('confirm'); };
    $('[data-save]', body).onclick = save;
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') save(); });
  }

  pickTime() {
    const d = settings.daily;
    const presets = [[7, 0], [8, 0], [9, 0], [12, 0], [18, 0], [20, 30]];
    const opts = presets.map(([hh, mm]) => ({ id: `${hh}:${mm}`, label: fmtTime(hh, mm), icon: hh < 12 ? 'sun' : hh < 18 ? 'clock' : 'moon', checked: d.hour === hh && d.minute === mm }));
    opts.push({ id: 'custom', label: 'Custom time…', icon: 'plus' });
    chooser('Notify me at', opts, (id) => {
      if (id === 'custom') {
        const body = h(`<div><label class="search-box" style="padding:0 16px"><input type="time" value="${String(d.hour).padStart(2, '0')}:${String(d.minute).padStart(2, '0')}"></label><button class="btn primary block" style="margin-top:16px" data-save>Set time</button></div>`);
        const s = openSheet({ title: 'Custom time', body });
        $('[data-save]', body).onclick = () => {
          const [hh, mm] = ($('input', body).value || '9:00').split(':').map(Number);
          settings.daily = { ...settings.daily, hour: hh, minute: mm }; s.close(); this.ctx.scheduleDaily(); this.render();
        };
        return;
      }
      const [hh, mm] = id.split(':').map(Number);
      settings.daily = { ...settings.daily, hour: hh, minute: mm };
      this.ctx.scheduleDaily(); this.render();
      toast(`Daily pick at ${fmtTime(hh, mm)}`, { icon: 'bell' });
    });
  }

  editToken() {
    const body = h(`<div>
      <p style="color:var(--text-2);font-size:14.5px;line-height:1.55">Without a token GitHub allows 60 requests an hour from your network. A <b>fine-grained token with no permissions</b> (public data only) raises that to 5,000.</p>
      <p style="color:var(--text-3);font-size:13.5px;margin:10px 0 14px">It stays on this device and is only sent to api.github.com.</p>
      <label class="search-box" style="padding:0 16px"><input type="password" placeholder="github_pat_…" value="${esc(settings.token)}" autocomplete="off" spellcheck="false"></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
        <button class="btn ghost" data-new>${icon('external', 17)}Create token</button>
        <button class="btn primary" data-save>Save</button></div>
      ${settings.token ? `<button class="btn block" style="margin-top:10px;color:var(--danger)" data-del>Remove token</button>` : ''}</div>`);
    const s = openSheet({ title: 'GitHub token', body });
    $('[data-new]', body).onclick = () => native.openUrl('https://github.com/settings/personal-access-tokens/new');
    $('[data-save]', body).onclick = () => { settings.token = $('input', body).value; resetLimits(); s.close(); this.render(); toast(settings.token ? 'Token saved' : 'Token removed', { icon: 'key' }); syncCatalog(true); };
    const del = $('[data-del]', body); if (del) del.onclick = () => { settings.token = ''; resetLimits(); s.close(); this.render(); toast('Token removed', { icon: 'key' }); };
  }

  sources() {
    openSheet({ title: 'Data sources & licenses', body: `<div class="md" style="font-size:14px">
      <p><b>Popular apps</b> — Clone’s editorial list of 100 of the most-downloaded and most-used apps worldwide, informed by public 2025 download rankings.</p>
      <p><b>GitHub twins</b> — each twin is a public GitHub repository. Live stars, forks, releases and READMEs come from the <a data-ext href="https://docs.github.com/rest">GitHub REST API</a>.</p>
      <p><b>Bundled snapshot (${esc(db.snapshot)})</b> — star counts from <a data-ext href="https://github.com/EvanLi/Github-Ranking">EvanLi/Github-Ranking</a> and <a data-ext href="https://github.com/awesome-selfhosted/awesome-selfhosted-data">awesome-selfhosted-data</a>; release tags read directly from each repository.</p>
      <p><b>Fonts</b> — Source Serif 4, Instrument Sans and JetBrains Mono, under the SIL Open Font License 1.1.</p>
      <p><b>Trademarks</b> — app names belong to their owners and are used only to describe what each open-source project is an alternative to. Clone is not affiliated with any of them.</p></div>` });
    const top = $('#sheet-root .sheet:last-child');
    top && top.addEventListener('click', (ev) => { const a = ev.target.closest('a[data-ext]'); if (a) { ev.preventDefault(); native.openUrl(a.href); } });
  }

  privacy() {
    openSheet({ title: 'Privacy', body: `<div class="md" style="font-size:14.5px">
      <p>Clone has no accounts, no analytics and no ads.</p>
      <ul><li>Your saved twins, history and settings live only on this device.</li>
      <li>The app talks to <b>api.github.com</b> for live data, and loads icons and screenshots from GitHub’s image hosts.</li>
      <li>Downloads come straight from each project’s GitHub releases via Android’s download manager.</li>
      <li>An optional GitHub token is stored on this device and sent only to GitHub.</li></ul></div>` });
  }

  onShow() { this.render(); }
  update(what) { if (what === 'sync' || what === 'limits' || what === 'settings') { clearTimeout(this.t); this.t = setTimeout(() => this.render(), 150); } }
}
