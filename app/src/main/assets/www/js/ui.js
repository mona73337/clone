// Shared UI building blocks: tiles, sheets, toasts, gestures, small animations.
import { icon, mark, CAT_HUE } from './icons.js';
import { monogram, fmtNum } from './data.js';
import { native } from './native.js';
import { settings } from './store.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

export function haptic(kind = 'tick') { if (settings.haptics) native.haptic(kind); }

// ---------- tiles ----------
export function appTile(app, cls = '') {
  const hue = CAT_HUE[app.cat] ?? 20;
  const m = monogram(app.name);
  return `<span class="tile ${m.length > 2 ? 'm3' : m.length > 1 ? 'm2' : ''} ${cls}" style="--h:${hue}" aria-hidden="true">${esc(m)}</span>`;
}

function iconSources(t) {
  const src = [];
  if (t.icon) src.push({ url: `https://raw.githubusercontent.com/${t.repo}/${t.branch || 'HEAD'}/${t.icon}`, cls: '' });
  src.push({ url: t.avatar ? `${t.avatar}${t.avatar.includes('?') ? '&' : '?'}s=160` : `https://github.com/${t.owner}.png?size=160`, cls: 'avatar-img' });
  return src;
}

export function twinTile(t, cls = '') {
  const letters = esc(t.name.replace(/^(the|a)\s+/i, '').charAt(0).toUpperCase());
  const srcs = encodeURIComponent(JSON.stringify(iconSources(t)));
  return `<span class="tile twin mono ${cls}" data-srcs="${srcs}" aria-hidden="true">${letters}</span>`;
}

// progressively upgrade monogram tiles to real icons once they scroll into view
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); loadTile(e.target); }
}, { rootMargin: '200px' }) : null;

export function hydrateTiles(root) {
  $$('.tile[data-srcs]', root).forEach((el) => { if (io) io.observe(el); else loadTile(el); });
}
const loadedUrls = new Map(); // url -> true (loaded) | false (failed), so re-renders don't flash
function loadTile(el) {
  if (el.dataset.loaded) return;
  el.dataset.loaded = '1';
  let list = [];
  try { list = JSON.parse(decodeURIComponent(el.dataset.srcs)); } catch (e) { return; }
  list = list.filter((s) => loadedUrls.get(s.url) !== false);
  const known = list.find((s) => loadedUrls.get(s.url) === true);
  if (known) {
    const img = new Image();
    img.alt = ''; img.referrerPolicy = 'no-referrer'; img.className = (known.cls ? known.cls + ' ' : '') + 'ok';
    img.src = known.url;
    el.classList.remove('mono');
    el.appendChild(img);
    return;
  }
  const next = () => {
    const s = list.shift();
    if (!s) return;
    const img = new Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.alt = '';
    if (s.cls) img.className = s.cls;
    img.onload = () => {
      if (img.naturalWidth < 8) { loadedUrls.set(s.url, false); img.remove(); next(); return; }
      loadedUrls.set(s.url, true);
      el.classList.remove('mono');
      requestAnimationFrame(() => img.classList.add('ok'));
    };
    img.onerror = () => { loadedUrls.set(s.url, false); img.remove(); next(); };
    img.src = s.url;
    el.appendChild(img);
  };
  next();
}

export function eq(size = '') {
  return `<span class="eq ${size}"><span class="line"><span class="knot">${mark(size ? 11 : 14)}</span></span></span>`;
}

export function starMeta(t) {
  return t.stars != null ? `<span><span class="star">${icon('starFill', 14)}</span>${fmtNum(t.stars)}</span>` : '';
}

// ---------- toasts ----------
export function toast(msg, opts = {}) {
  const root = $('#toast-root');
  const el = h(`<div class="toast" role="status">${opts.icon ? icon(opts.icon, 18) : ''}<span>${esc(msg)}</span>${opts.action ? `<button class="act">${esc(opts.action)}</button>` : ''}</div>`);
  root.appendChild(el);
  while (root.children.length > 2) root.firstElementChild.remove();
  if (opts.action) $('.act', el).addEventListener('click', () => { opts.onAction && opts.onAction(); dismiss(); });
  const dismiss = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
  setTimeout(dismiss, opts.duration || 2600);
  return dismiss;
}

// ---------- bottom sheets ----------
const sheetStack = [];
export function openSheet({ title = '', body = '', onClose, className = '' } = {}) {
  const root = $('#sheet-root');
  const scrim = h('<div class="scrim"></div>');
  const sheet = h(`<section class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="grab"></div>
      ${title ? `<div class="sh-head"><h2>${esc(title)}</h2><button class="iconbtn" data-close aria-label="Close">${icon('close', 20)}</button></div>` : ''}
      <div class="sh-body"></div></section>`);
  const bodyEl = $('.sh-body', sheet);
  if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
  root.append(scrim, sheet);
  hydrateTiles(sheet);
  let closed = false;
  requestAnimationFrame(() => requestAnimationFrame(() => { if (closed) return; scrim.classList.add('show'); sheet.classList.add('show'); }));
  const close = () => {
    if (closed) return; closed = true;
    sheet.style.transition = ''; sheet.style.transform = '';
    scrim.classList.remove('show'); sheet.classList.remove('show');
    setTimeout(() => { scrim.remove(); sheet.remove(); }, 380);
    const i = sheetStack.indexOf(api); if (i >= 0) sheetStack.splice(i, 1);
    window.dispatchEvent(new Event('clone:sheet'));
    onClose && onClose();
  };
  scrim.addEventListener('click', close);
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  // drag to dismiss from the handle/header, or from the body when it is scrolled to top
  let y0 = null, dy = 0, t0 = 0, fromBody = false;
  const start = (e) => {
    fromBody = !e.target.closest('.grab, .sh-head');
    if (fromBody && bodyEl.scrollTop > 0) return;
    y0 = e.touches[0].clientY; dy = 0; t0 = Date.now();
    sheet.style.transition = 'none';
  };
  const move = (e) => {
    if (y0 == null) return;
    if (fromBody && (bodyEl.scrollTop > 0 || !e.cancelable)) { // the body is scrolling: this is not a drag
      y0 = null; sheet.style.transition = ''; sheet.style.transform = ''; scrim.style.opacity = ''; return;
    }
    dy = Math.max(0, e.touches[0].clientY - y0);
    if (fromBody && dy <= 0) return;
    if (dy > 0 && fromBody && e.cancelable) e.preventDefault();
    sheet.style.transform = `translate3d(0, ${dy}px, 0)`;
    scrim.style.opacity = String(Math.max(0, 1 - dy / 400));
  };
  const end = () => {
    if (y0 == null) return;
    const v = dy / Math.max(1, Date.now() - t0);
    sheet.style.transition = '';
    scrim.style.opacity = '';
    if (dy > 120 || v > 0.6) { haptic('tick'); close(); } else sheet.style.transform = '';
    y0 = null;
  };
  sheet.addEventListener('touchstart', start, { passive: true });
  sheet.addEventListener('touchmove', move, { passive: false });
  sheet.addEventListener('touchend', end);
  sheet.addEventListener('touchcancel', end);
  const api = { el: sheet, body: bodyEl, close };
  sheetStack.push(api);
  window.dispatchEvent(new Event('clone:sheet'));
  haptic('tick');
  return api;
}
export function closeTopSheet() { const s = sheetStack[sheetStack.length - 1]; if (s) { s.close(); return true; } return false; }
export const hasSheet = () => sheetStack.length > 0;

// Option-list sheet: [{id, label, sub, icon, checked}]
export function chooser(title, options, onPick) {
  const body = h(`<div>${options.map((o) => `
    <button class="opt" data-id="${esc(o.id)}" role="menuitemradio" aria-checked="${o.checked ? 'true' : 'false'}">
      ${o.icon ? `<span class="ic">${icon(o.icon, 21)}</span>` : ''}
      <span>${esc(o.label)}${o.sub ? `<span class="t2">${esc(o.sub)}</span>` : ''}</span>
      <span class="check">${icon('check', 20)}</span>
    </button>`).join('')}</div>`);
  const s = openSheet({ title, body });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('.opt'); if (!b) return;
    haptic('tick');
    $$('.opt', body).forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
    setTimeout(() => { s.close(); onPick(b.dataset.id); }, 140);
  });
  return s;
}

// ---------- gestures ----------
export function onLongPress(root, selector, fn) {
  let timer = null, sx = 0, sy = 0, target = null, fired = false;
  root.addEventListener('mousedown', () => { fired = false; });
  const trigger = (t) => { if (fired) return; fired = true; clearTimeout(timer); timer = null; haptic('heavy'); fn(t); };
  root.addEventListener('touchstart', (e) => {
    target = e.target.closest(selector); if (!target) return;
    fired = false; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    clearTimeout(timer);
    timer = setTimeout(() => trigger(target), 480);
  }, { passive: true });
  root.addEventListener('touchmove', (e) => {
    if (!timer) return;
    if (Math.hypot(e.touches[0].clientX - sx, e.touches[0].clientY - sy) > 10) { clearTimeout(timer); timer = null; }
  }, { passive: true });
  const cancel = () => { clearTimeout(timer); timer = null; };
  root.addEventListener('touchend', cancel); root.addEventListener('touchcancel', cancel);
  root.addEventListener('click', (e) => { if (fired && e.target.closest(selector)) { e.preventDefault(); e.stopPropagation(); fired = false; } }, true);
  root.addEventListener('contextmenu', (e) => { const t = e.target.closest(selector); if (t) { e.preventDefault(); trigger(t); } });
}

// Pull-to-refresh on a scroll container. onRefresh returns a promise.
export function pullToRefresh(page, onRefresh) {
  const ptr = h(`<div class="ptr"><div class="ball">${mark(22)}</div></div>`);
  page.parentElement.appendChild(ptr);
  const ball = $('.ball', ptr);
  let y0 = null, d = 0, busy = false;
  const max = 120, trigger = 72;
  page.addEventListener('touchstart', (e) => { if (page.scrollTop <= 0 && !busy) { y0 = e.touches[0].clientY; d = 0; ptr.classList.remove('go'); } }, { passive: true });
  page.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    d = e.touches[0].clientY - y0;
    if (d <= 0 || page.scrollTop > 0) { ball.style.transform = ''; ball.style.opacity = ''; return; }
    const p = Math.min(max, d * 0.5);
    ball.style.opacity = String(Math.min(1, p / trigger));
    ball.style.transform = `translateY(${p - 50}px) scale(${0.6 + 0.4 * Math.min(1, p / trigger)}) rotate(${p * 3}deg)`;
    if (p >= trigger && !ball.dataset.armed) { ball.dataset.armed = '1'; haptic('tick'); }
    if (p < trigger) delete ball.dataset.armed;
  }, { passive: true });
  const reset = () => { ptr.classList.add('go'); ball.style.transform = ''; ball.style.opacity = ''; delete ball.dataset.armed; };
  page.addEventListener('touchcancel', () => { if (y0 != null && !busy) { y0 = null; reset(); } });
  page.addEventListener('touchend', async () => {
    if (y0 == null) return; y0 = null;
    if (Math.min(max, d * 0.5) >= trigger && !busy) {
      busy = true; ptr.classList.add('go');
      ball.style.transform = 'translateY(22px) scale(1)'; ball.style.opacity = '1';
      ball.firstElementChild.classList.add('spin');
      try { await onRefresh(); } catch (e) {}
      ball.firstElementChild.classList.remove('spin');
      busy = false; reset();
    } else reset();
  });
  return () => ptr.remove();
}

export function countUp(el, to, fmt = fmtNum, ms = 700) {
  if (to == null) { el.textContent = '—'; return; }
  const from = 0, t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function watchScroll(page, bar) {
  const f = () => bar.classList.toggle('scrolled', page.scrollTop > 8);
  page.addEventListener('scroll', f, { passive: true }); f();
}

export function skelRows(n = 4) {
  return Array.from({ length: n }, () => `<div class="row"><span class="sk tile" style="width:44px;height:44px"></span><div class="main"><div class="sk line" style="width:55%"></div><div class="sk line" style="width:80%;height:10px"></div></div></div>`).join('');
}

export function progressRing(p) {
  const r = 9, c = 2 * Math.PI * r;
  const off = p == null ? c * 0.7 : c * (1 - Math.max(0, Math.min(1, p)));
  return `<svg class="pring ${p == null ? 'spin' : ''}" viewBox="0 0 22 22"><circle class="bg" cx="11" cy="11" r="${r}"/><circle class="fg" cx="11" cy="11" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/></svg>`;
}

// ---------- shared-element flight: the tapped tiles fly into the detail hero ----------
export function captureFlight(fromEl) {
  const twin = fromEl.querySelector('.tile.twin');
  const app = [...fromEl.querySelectorAll('.tile')].find((t) => !t.classList.contains('twin'));
  const pick = (n) => (n ? { node: n, rect: n.getBoundingClientRect() } : null);
  window.__flight = { app: pick(app), twin: pick(twin), at: Date.now() };
}

export function landFlight(page) {
  const f = window.__flight;
  window.__flight = null;
  if (!f || Date.now() - f.at > 700 || settings.reduceMotion) return;
  const targets = page.querySelectorAll('.d-pair .side .tile');
  const pairs = [[f.app, targets[0]], [f.twin, targets[1]]];
  const stage = document.getElementById('stage').getBoundingClientRect();
  requestAnimationFrame(() => {
    const pr = page.getBoundingClientRect();
    for (const [src, target] of pairs) {
      if (!src || !target || src.rect.width < 4) continue;
      const clone = src.node.cloneNode(true);
      clone.removeAttribute('data-srcs');
      clone.classList.add('flight');
      clone.classList.remove('lift');
      Object.assign(clone.style, { left: src.rect.left + 'px', top: src.rect.top + 'px', width: src.rect.width + 'px', height: src.rect.height + 'px' });
      clone.style.setProperty('--s', src.rect.width + 'px');
      document.body.appendChild(clone);
      target.classList.add('landing');
      const tr = target.getBoundingClientRect();
      const fx = tr.left - pr.left + stage.left, fy = tr.top - pr.top + stage.top;
      const s = tr.width / src.rect.width;
      requestAnimationFrame(() => {
        clone.style.transform = `translate(${fx - src.rect.left}px, ${fy - src.rect.top}px) scale(${s})`;
      });
      let finished = false;
      const done = () => { if (finished) return; finished = true; target.classList.remove('landing'); target.classList.add('landed'); clone.remove(); };
      clone.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 560);
    }
  });
}
