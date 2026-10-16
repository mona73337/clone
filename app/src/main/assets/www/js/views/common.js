// Shared actions: quick-action sheet, share, save, APK download flow.
import { icon, KIND } from '../icons.js';
import { h, esc, openSheet, toast, haptic, twinTile, appTile, eq, progressRing } from '../ui.js';
import { native, isNative } from '../native.js';
import { library } from '../store.js';
import { fmtNum, fmtBytes, cleanTag, relTime } from '../data.js';
import { fetchReleases, pickApk } from '../github.js';

export function shareTwin(app, t) {
  haptic('tick');
  const stars = t.stars != null ? ` (★ ${fmtNum(t.stars)})` : '';
  native.share(`${t.name} — open-source twin of ${app.name}`, `${t.name}${stars} is the open-source twin of ${app.name}: ${t.tagline}`, `https://github.com/${t.repo}`);
}

export function toggleSave(app, t) {
  const saved = library.toggle({ repo: t.repo, app: app.id, tag: t.release && t.release.tag });
  haptic(saved ? 'confirm' : 'tick');
  toast(saved ? `Saved ${t.name} to Library` : `Removed ${t.name}`, { icon: saved ? 'bookmarkFill' : 'bookmark' });
  return saved;
}

export function quickActions(ctx, app, idx = 0) {
  if (!app) return;
  const t = app.twins[idx] || app.twins[0];
  const saved = library.has(t.repo);
  const body = h(`<div>
    <div style="display:flex;align-items:center;gap:12px;padding:4px 2px 16px">
      ${appTile(app, 'md')}${eq('sm')}${twinTile(t, 'md')}
      <div style="min-width:0;margin-left:6px"><div style="font-weight:600;font-size:16px">${esc(t.name)}</div><div style="color:var(--text-3);font-size:13px">twin of ${esc(app.name)}</div></div>
    </div>
    <button class="opt" data-q="open"><span class="ic">${icon('arrowUR', 21)}</span>Open details</button>
    <button class="opt" data-q="save"><span class="ic">${icon(saved ? 'bookmarkFill' : 'bookmark', 21)}</span>${saved ? 'Remove from Library' : 'Save to Library'}</button>
    <button class="opt" data-q="share"><span class="ic">${icon('share', 21)}</span>Share</button>
    <button class="opt" data-q="github"><span class="ic">${icon('code', 21)}</span>View source on GitHub</button>
  </div>`);
  const s = openSheet({ body });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    s.close();
    const q = b.dataset.q;
    if (q === 'open') ctx.go(`#/app/${app.id}/${t.idx}`);
    if (q === 'save') toggleSave(app, t);
    if (q === 'share') shareTwin(app, t);
    if (q === 'github') native.openUrl(`https://github.com/${t.repo}`);
  });
}

// ---------- downloads ----------
const active = new Map(); // repo -> {id, name, progress, status}
export const downloads = active;

function poll(repo, onProgress) {
  const d = active.get(repo); if (!d || d.id < 0) return;
  const st = native.downloadStatus(d.id);
  if (!st) return;
  d.status = st.status; d.progress = st.total > 0 ? st.bytes / st.total : null;
  onProgress && onProgress(d);
  if (st.status === 'successful') {
    active.delete(repo);
    haptic('confirm');
    toast(`${d.name} downloaded`, { icon: 'check', action: 'Install', onAction: () => native.installDownloaded(d.id), duration: 6000 });
    native.installDownloaded(d.id);
    onProgress && onProgress(null);
    return;
  }
  if (st.status === 'failed') { active.delete(repo); toast('Download failed — try again', { icon: 'info' }); onProgress && onProgress(null); return; }
  d.timer = setTimeout(() => poll(repo, onProgress), 450);
}

export function startDownload(t, asset, onProgress) {
  if (!isNative) { native.openUrl(asset.browser_download_url); return; }
  if (!native.canInstall()) {
    toast('Allow Clone to install apps to finish setup', { action: 'Allow', onAction: () => native.openInstallSettings(), duration: 6000 });
  }
  const id = native.download(asset.browser_download_url, asset.name, `${t.name} ${cleanTag((t.release || {}).tag || '')}`.trim());
  if (id == null || id < 0 || isNaN(id)) { native.openUrl(asset.browser_download_url); return; }
  active.set(t.repo, { id, name: t.name, progress: 0, status: 'pending' });
  haptic('confirm');
  toast(`Downloading ${t.name}…`, { icon: 'download' });
  poll(t.repo, onProgress);
}

export function resumePolling(t, onProgress) {
  const d = active.get(t.repo);
  if (d) { clearTimeout(d.timer); poll(t.repo, onProgress); }
}

export function cancelDownload(t) {
  const d = active.get(t.repo); if (!d) return;
  clearTimeout(d.timer); native.cancelDownload(d.id); active.delete(t.repo);
  toast('Download cancelled', { icon: 'close' });
}

/** Opens the APK picker for a twin's latest release. */
export async function getFlow(app, t, onProgress) {
  if (active.has(t.repo)) { cancelDownload(t); onProgress && onProgress(null); return; }
  if (t.kind !== 'app') { native.openUrl(t.homepage || `https://github.com/${t.repo}`); return; }
  const sheet = openSheet({ title: `Get ${t.name}`, body: `<div style="padding:18px 0 8px;display:grid;place-items:center;color:var(--accent-text)">${progressRing(null)}</div><p class="center" style="color:var(--text-3);font-size:14px">Checking the latest release…</p>` });
  let rel;
  try { rel = (await fetchReleases(t.repo)).latest; } catch (e) {
    sheet.body.innerHTML = `<div class="note" style="margin:0">${icon('info', 18)}<div>${esc(e.message)}. You can still grab it from GitHub.</div></div>
      <button class="btn primary block" style="margin-top:16px" data-o="gh">${icon('external', 18)}Open releases on GitHub</button>`;
    sheet.body.querySelector('[data-o]').onclick = () => { sheet.close(); native.openUrl(`https://github.com/${t.repo}/releases`); };
    return;
  }
  const abis = (native.info().abis || []);
  const { apks, best } = rel ? pickApk(rel.assets, abis) : { apks: [] };
  if (!rel || !apks.length) {
    sheet.body.innerHTML = `<div class="empty" style="padding:8px 8px 4px"><h3 style="font-size:21px">No APK in this release</h3>
      <p>${esc(t.name)} publishes installs elsewhere (often F-Droid or its website). Open the project to choose a source.</p></div>
      <button class="btn primary block" style="margin-top:18px" data-o="gh">${icon('external', 18)}Open ${esc(t.name)} on GitHub</button>`;
    sheet.body.querySelector('[data-o]').onclick = () => { sheet.close(); native.openUrl(t.homepage || `https://github.com/${t.repo}#readme`); };
    return;
  }
  sheet.body.innerHTML = `
    <div class="meta" style="margin-bottom:6px">${icon('tag', 14)}<span><b style="color:var(--text)">${esc(rel.tag_name)}</b></span><span>${relTime((rel.published_at || '').slice(0, 10))}</span>${rel.prerelease ? '<span class="new">Pre-release</span>' : ''}</div>
    <div>${apks.map((a, i) => `
      <button class="asset" data-i="${i}">
        <span class="ic">${icon('pkg', 19)}</span>
        <span class="main"><div class="t1">${esc(a.name)}</div><div class="t2">${fmtBytes(a.size)}${a.download_count ? ` · ${fmtNum(a.download_count)} downloads` : ''}${a === best ? ' · <span class="rec">Best for this phone</span>' : ''}</div></span>
        ${icon('download', 20)}
      </button>`).join('')}</div>
    <p style="color:var(--text-4);font-size:12.5px;margin-top:12px;line-height:1.5">Downloaded straight from the project’s GitHub release. Android will ask you to confirm the install.</p>`;
  sheet.body.addEventListener('click', (e) => {
    const b = e.target.closest('.asset'); if (!b) return;
    sheet.close();
    startDownload(t, apks[Number(b.dataset.i)], onProgress);
  });
}

/** Lightweight preview for a GitHub repo that is not in the catalog. */
export function repoSheet(it) {
  const created = it.created ? new Date(it.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const body = h(`<div>
    <div style="display:flex;align-items:center;gap:14px;padding:2px 0 14px">
      <span class="tile twin lg" style="--s:56px">${it.avatar ? `<img class="avatar-img ok" src="${esc(it.avatar)}${it.avatar.includes('?') ? '&' : '?'}s=128" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : esc(it.name.charAt(0).toUpperCase())}</span>
      <div style="min-width:0"><div style="font-family:var(--font-serif);font-size:22px;line-height:1.2">${esc(it.name)}</div>
        <div class="mono" style="color:var(--text-3);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.repo)}</div></div>
    </div>
    ${it.desc ? `<p style="color:var(--text-2);font-size:15px;line-height:1.5;font-family:var(--font-serif)">${esc(it.desc)}</p>` : ''}
    <div class="meta" style="margin-top:12px">
      <span><span class="star">${icon('starFill', 14)}</span>${fmtNum(it.stars)} stars</span>
      ${it.lang ? `<span>${icon('code', 14)}${esc(it.lang)}</span>` : ''}
      ${created ? `<span>${icon('calendar', 14)}Created ${esc(created)}</span>` : ''}
    </div>
    <div class="note" style="margin:16px 0 0">${icon('info', 18)}<div>Not part of Clone’s curated catalog — check the project before installing anything.</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
      <button class="btn ghost" data-o="rel">${icon('tag', 17)}Releases</button>
      <button class="btn primary" data-o="gh">${icon('external', 17)}Open GitHub</button>
    </div></div>`);
  const s = openSheet({ body });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-o]'); if (!b) return;
    s.close();
    native.openUrl(`https://github.com/${it.repo}${b.dataset.o === 'rel' ? '/releases' : ''}`);
  });
}
