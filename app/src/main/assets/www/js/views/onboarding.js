// First-run welcome: three slides explaining the equator, live data and App of the Day.
import { icon, mark } from '../icons.js';
import { $, $$, h, haptic, toast } from '../ui.js';
import { settings } from '../store.js';
import { native } from '../native.js';

const ill1 = `<svg width="280" height="230" viewBox="0 0 280 230" aria-hidden="true">
  <path d="M30 118a110 110 0 0 1 220 0z" fill="var(--accent-softer)"/>
  <path d="M30 124a110 110 0 0 0 220 0z" fill="var(--accent-softer)" opacity=".55"/>
  <line x1="6" y1="121" x2="274" y2="121" stroke="var(--line-2)" stroke-dasharray="5 6"/>
  <g transform="translate(46 56)"><rect width="74" height="74" rx="20" fill="hsl(352 34% var(--tile-l))" stroke="var(--line)"/><text x="37" y="49" text-anchor="middle" font-family="Clone Serif, Georgia, serif" font-size="36" fill="hsl(352 38% var(--tile-ink-l))">Y</text></g>
  <g transform="translate(160 56)"><rect width="74" height="74" rx="20" fill="var(--bg-raised)" stroke="var(--line-2)"/><circle cx="37" cy="37" r="23" fill="none" stroke="var(--accent-soft)" stroke-width="2"/><text x="37" y="49" text-anchor="middle" font-family="Clone Serif, Georgia, serif" font-size="36" fill="var(--accent-text)">N</text></g>
  <g transform="translate(128 109)"><circle cx="12" cy="12" r="14" fill="var(--bg-raised)" stroke="var(--line-2)"/><path d="M5 11a7 7 0 0 1 14 0z" fill="var(--accent-2)"/><path d="M5 13.5a7 7 0 0 0 14 0z" fill="var(--accent-2)" opacity=".32"/></g>
  <text x="83" y="160" text-anchor="middle" font-family="Clone Sans, sans-serif" font-size="12" font-weight="700" letter-spacing="1.2" fill="var(--text-4)">THE APP</text>
  <text x="197" y="160" text-anchor="middle" font-family="Clone Sans, sans-serif" font-size="12" font-weight="700" letter-spacing="1.2" fill="var(--accent-text)">THE TWIN</text>
</svg>`;

const ill2 = `<svg width="280" height="230" viewBox="0 0 280 230" aria-hidden="true">
  <rect x="40" y="34" width="200" height="150" rx="22" fill="var(--bg-raised)" stroke="var(--line-2)"/>
  <rect x="62" y="56" width="44" height="44" rx="12" fill="var(--accent-softer)" stroke="var(--line)"/>
  <path d="M73 79a11 11 0 0 1 22 0z" fill="var(--accent-2)"/><path d="M73 82a11 11 0 0 0 22 0z" fill="var(--accent-2)" opacity=".32"/>
  <rect x="118" y="60" width="90" height="11" rx="5.5" fill="var(--text)" opacity=".8"/>
  <rect x="118" y="80" width="60" height="9" rx="4.5" fill="var(--text-4)" opacity=".7"/>
  <g transform="translate(62 118)" font-family="Clone Serif, Georgia, serif" font-size="21" fill="var(--text)">
    <text x="0" y="20">40.1k</text><text x="96" y="20">v0.29</text>
    <text x="0" y="40" font-family="Clone Sans, sans-serif" font-size="11.5" fill="var(--text-3)">★ Stars</text>
    <text x="96" y="40" font-family="Clone Sans, sans-serif" font-size="11.5" fill="var(--text-3)">Latest release</text></g>
  <g transform="translate(204 12)"><circle r="26" cx="26" cy="26" fill="var(--accent)"/><path d="M26 15v19M18 27l8 8 8-8M17 40h18" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
</svg>`;

const ill3 = `<svg width="280" height="230" viewBox="0 0 280 230" aria-hidden="true">
  <g transform="rotate(-6 140 115)"><rect x="70" y="40" width="140" height="150" rx="22" fill="var(--bg-raised)" stroke="var(--line-2)"/></g>
  <rect x="70" y="40" width="140" height="150" rx="22" fill="var(--bg-raised)" stroke="var(--line-2)"/>
  <path d="M70 62a22 22 0 0 1 22-22h96a22 22 0 0 1 22 22v18H70z" fill="var(--accent)"/>
  <text x="140" y="68" text-anchor="middle" font-family="Clone Sans, sans-serif" font-size="12" font-weight="700" letter-spacing="1.4" fill="#fff">APP OF THE DAY</text>
  <path d="M104 140a36 36 0 0 1 72 0z" fill="var(--accent-2)"/>
  <rect x="104" y="146" width="72" height="7" rx="3.5" fill="var(--accent-2)" opacity=".55"/>
  <rect x="116" y="158" width="48" height="6" rx="3" fill="var(--accent-2)" opacity=".35"/>
  <rect x="126" y="169" width="28" height="5" rx="2.5" fill="var(--accent-2)" opacity=".2"/>
  <g transform="translate(196 28)"><circle r="18" cx="18" cy="18" fill="var(--bg-raised)" stroke="var(--line-2)"/><path d="M11 22v-5a7 7 0 0 1 14 0v5l2 2H9z" fill="none" stroke="var(--accent-text)" stroke-width="2" stroke-linejoin="round"/><circle cx="27" cy="9" r="4" fill="var(--accent)"/></g>
</svg>`;

export function showOnboarding(ctx) {
  const el = h(`<div class="onb" role="dialog" aria-label="Welcome to Clone">
    <button class="skip" data-act="skip">Skip</button>
    <div class="slides">
      <section class="slide"><div class="ill">${ill1}</div><h2>Every app has a twin.</h2><p>Clone pairs 100 of the world’s most popular apps with their best-rated open-source twins on GitHub — across the equator.</p></section>
      <section class="slide"><div class="ill">${ill2}</div><h2>Rated by the people who build them.</h2><p>Live GitHub stars, releases and READMEs. Get APKs straight from the source, with no store in between.</p></section>
      <section class="slide"><div class="ill">${ill3}</div><h2>A new App of the Day, every day.</h2><p>Fresh releases are featured each morning on your Today screen. Want a gentle nudge when it’s ready?</p></section>
    </div>
    <div class="dots"><i class="on"></i><i></i><i></i></div>
    <div class="cta"><button class="btn primary block" data-act="next">Continue</button>
      <button class="btn block" data-act="later" style="margin-top:6px;color:var(--text-3);visibility:hidden">Maybe later</button></div>
  </div>`);
  document.body.appendChild(el);
  const slides = $('.slides', el), dots = $$('.dots i', el), next = $('[data-act="next"]', el), later = $('[data-act="later"]', el);
  let page = 0;
  const setPage = (p) => {
    page = p;
    dots.forEach((d, i) => d.classList.toggle('on', i === p));
    next.textContent = p === 2 ? 'Notify me daily' : 'Continue';
    if (p === 2) next.insertAdjacentHTML('afterbegin', icon('bell', 19));
    later.style.visibility = p === 2 ? 'visible' : 'hidden';
    $('[data-act="skip"]', el).style.visibility = p === 2 ? 'hidden' : 'visible';
  };
  slides.addEventListener('scroll', () => {
    const p = Math.round(slides.scrollLeft / slides.clientWidth);
    if (p !== page) { setPage(p); haptic('tick'); }
  }, { passive: true });
  const finish = async (enableDaily) => {
    settings.onboarded = true;
    if (enableDaily) {
      let ok = native.notificationsAllowed();
      if (!ok) ok = await native.requestNotifications();
      settings.daily = { ...settings.daily, enabled: true };
      ctx.scheduleDaily && ctx.scheduleDaily();
      const d = settings.daily;
      const at = new Date(2000, 0, 1, d.hour, d.minute).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      toast(ok ? `You’ll get a daily pick at ${at}` : 'Daily pick on — allow notifications in Settings', { icon: 'bell' });
    }
    haptic('confirm');
    el.classList.add('out');
    setTimeout(() => el.remove(), 380);
  };
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'skip' || a.dataset.act === 'later') return finish(false);
    if (a.dataset.act === 'next') {
      if (page < 2) { slides.scrollTo({ left: (page + 1) * slides.clientWidth, behavior: 'smooth' }); haptic('tick'); }
      else finish(true);
    }
  });
}
