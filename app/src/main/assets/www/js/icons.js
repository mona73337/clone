// Hand-drawn 24px stroke icon set for Clone (1.75 stroke, round caps).
const P = {
  today: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-5v6h-4A1.5 1.5 0 0 1 4 19z"/>',
  explore: '<circle cx="12" cy="12" r="8.5"/><path d="m15.6 8.4-2.2 5-5 2.2 2.2-5z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  library: '<path d="M6.5 3.8h11a1 1 0 0 1 1 1v15.4l-6.5-4.1-6.5 4.1V4.8a1 1 0 0 1 1-1z"/>',
  bookmark: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.8L6 20V5a1 1 0 0 1 1-1z"/>',
  bookmarkFill: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.8L6 20V5a1 1 0 0 1 1-1z" fill="currentColor"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  star: '<path d="m12 3.6 2.55 5.3 5.8.75-4.25 4 1.07 5.75L12 16.6 6.83 19.4 7.9 13.65l-4.25-4 5.8-.75z"/>',
  starFill: '<path d="m12 3.6 2.55 5.3 5.8.75-4.25 4 1.07 5.75L12 16.6 6.83 19.4 7.9 13.65l-4.25-4 5.8-.75z" fill="currentColor"/>',
  fork: '<circle cx="6.5" cy="5.5" r="2"/><circle cx="17.5" cy="5.5" r="2"/><circle cx="12" cy="18.5" r="2"/><path d="M6.5 7.5v1a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-1M12 11.5v5"/>',
  tag: '<path d="M3.8 12.6V4.8a1 1 0 0 1 1-1h7.8l7.6 7.6a1 1 0 0 1 0 1.4l-7.8 7.8a1 1 0 0 1-1.4 0z"/><circle cx="8.5" cy="8.5" r="1.4"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  share: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevD: '<path d="m6 9.5 6 6 6-6"/>',
  back: '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  moon: '<path d="M19.5 14.2A8 8 0 0 1 9.8 4.5a8 8 0 1 0 9.7 9.7z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M4.6 4.6 6 6M18 18l1.4 1.4M2.8 12h2M19.2 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  system: '<rect x="3.5" y="4.5" width="17" height="12" rx="1.5"/><path d="M9 20h6M12 16.5V20"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
  sparkle: '<path d="M12 3.5c.5 4.3 2.2 6 6.5 6.5-4.3.5-6 2.2-6.5 6.5-.5-4.3-2.2-6-6.5-6.5 4.3-.5 6-2.2 6.5-6.5z"/><path d="M18.5 15.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  scale: '<path d="M12 4v16M8 20h8M5 7h14M7.5 7 4.5 14a3 3 0 0 0 6 0zM16.5 7l-3 7a3 3 0 0 0 6 0z"/>',
  code: '<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5"/>',
  shield: '<path d="M12 3.5 19 6v5.5c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.6-7-9V6z"/><path d="m9 12 2.2 2.2L15.2 10"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>',
  trend: '<path d="m3.5 16.5 6-6 4 4 7-7"/><path d="M15 7.5h5.5V13"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  sort: '<path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5"/>',
  more: '<circle cx="5.5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z"/>',
  phone: '<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.4"/><path d="M10.5 18h3"/>',
  server: '<rect x="4" y="4" width="16" height="7" rx="1.6"/><rect x="4" y="13" width="16" height="7" rx="1.6"/><path d="M7.5 7.5h.1M7.5 16.5h.1"/>',
  laptop: '<rect x="5" y="5" width="14" height="10" rx="1.4"/><path d="M2.5 19h19"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  heart: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>',
  zap: '<path d="M13 3 5 13.5h6.5L10.5 21 19 10.5h-6.5z"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.4-3 2.6-5 5.5-5s5.1 2 5.5 5"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.7c1.7.6 2.8 2.3 3 4.8"/>',
  chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z"/>',
  play: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m10.2 9.2 4.6 2.8-4.6 2.8z" fill="currentColor"/>',
  music: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  brush: '<path d="M14.5 4.5 19.5 9.5l-7.6 7.6-5-5z"/><path d="M6.9 12.1C4 13 4.6 17 3.5 19.5c2.5-1.1 6.5-.5 7.4-3.4"/>',
  ai: '<path d="M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.1 10.2 12.6 4.5 10.8 10.2 9z"/><path d="M18.5 15.5v4M16.5 17.5h4"/>',
  briefcase: '<rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/>',
  folder: '<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4.4l2 2.2H19A1.5 1.5 0 0 1 20.5 9.2v8.3A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
  news: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7 9h10M7 12.5h10M7 16h6"/>',
  map: '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  wrench: '<path d="M14.8 4.2a4.6 4.6 0 0 0-5.6 5.9L4 15.3a2 2 0 0 0 2.8 2.8l5.2-5.2a4.6 4.6 0 0 0 5.9-5.6l-2.8 2.8-2.4-.4-.4-2.4z"/>',
  activity: '<path d="M3.5 12h4l2.5-6 4 12 2.5-6h4"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5V8"/><rect x="4" y="8" width="16.5" height="11.5" rx="2"/><path d="M16 13.8h.1"/>',
  bag: '<path d="M5.5 8h13l-1 12h-11z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  grad: '<path d="m12 5 9.5 4.5L12 14 2.5 9.5z"/><path d="M6.5 11.5V16c1.5 1.6 3.4 2.5 5.5 2.5s4-.9 5.5-2.5v-4.5M21.5 9.5v5"/>',
  game: '<path d="M7 7.5h10a4.5 4.5 0 0 1 4.4 5.4l-.8 4A2.6 2.6 0 0 1 16 18l-1.5-2.5h-5L8 18a2.6 2.6 0 0 1-4.6-1.1l-.8-4A4.5 4.5 0 0 1 7 7.5z"/><path d="M8 10.5v3M6.5 12h3M15.5 11h.1M17.5 13h.1"/>',
  wifiOff: '<path d="M3.5 3.5l17 17M8.5 16.5a5 5 0 0 1 7 0M5.2 13.2a9.5 9.5 0 0 1 4.2-2.3M12 8.6a9.6 9.6 0 0 1 6.8 3M2 9.9A14.5 14.5 0 0 1 6 7.4M14.9 6.3A14.4 14.4 0 0 1 22 9.9M12 20h.1"/>',
  key: '<circle cx="8" cy="15.5" r="3.8"/><path d="m10.7 12.8 8.3-8.3M16.5 7l2.5 2.5M14 9.5l2 2"/>',
  trash: '<path d="M4.5 7h15M10 4h4M6.5 7l.9 12.1A1.5 1.5 0 0 0 8.9 20.5h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.1M4 12h.1M4 17.5h.1"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.7"/><path d="M4 4.5v4.2h4.2M12 8v4.5l3 1.8"/>',
  type: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',
  pkg: '<path d="m12 3.5 8 4.3v8.4l-8 4.3-8-4.3V7.8z"/><path d="m4 7.8 8 4.3 8-4.3M12 12.1v8.4"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  arrowR: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  arrowUR: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11.5V5a1.5 1.5 0 0 1 3 0v6.5M14 11.5v-5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a5.4 5.4 0 0 1-4.3-2.1L3.6 15.6a1.6 1.6 0 0 1 2.5-2z"/>',
  equals: '<path d="M6 9.5h12M6 14.5h12"/>',
};

export function icon(name, size = 22, extra = '') {
  const body = P[name] || P.info;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;
}

// The Clone mark: a disc split at the equator, its lower half a mirrored ghost.
export function mark(size = 28, opts = {}) {
  const c = opts.color || 'var(--accent-2)';
  return `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <path d="M16 56.5a44 44 0 0 1 88 0z" fill="${c}"/>
    <path d="M16 63.5a44 44 0 0 0 88 0z" fill="${c}" opacity=".32"/></svg>`;
}

export const CAT_ICON = {
  social: 'users', chat: 'chat', watch: 'play', listen: 'music', create: 'brush', ai: 'ai',
  work: 'briefcase', files: 'folder', web: 'news', places: 'map', privacy: 'lock', system: 'wrench',
  health: 'activity', money: 'wallet', shop: 'bag', learn: 'grad', play: 'game',
};
export const CAT_HUE = {
  social: 14, chat: 150, watch: 352, listen: 286, create: 34, ai: 18, work: 214, files: 188,
  web: 44, places: 120, privacy: 240, system: 30, health: 6, money: 82, shop: 26, learn: 262, play: 330,
};
export const KIND = {
  app: { label: 'Android app', icon: 'phone' },
  server: { label: 'Self-hosted', icon: 'server' },
  desktop: { label: 'Desktop', icon: 'laptop' },
  web: { label: 'Web app', icon: 'globe' },
  engine: { label: 'Engine', icon: 'cpu' },
};
