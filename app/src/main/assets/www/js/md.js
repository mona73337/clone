// Sanitise GitHub-rendered HTML (README, release notes) into a safe, styled fragment.
const ALLOWED = new Set(['P', 'A', 'IMG', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'PRE', 'CODE', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'EM', 'STRONG', 'B', 'I', 'DEL', 'S', 'BR', 'HR', 'DETAILS', 'SUMMARY', 'KBD', 'SUB', 'SUP', 'DIV', 'SPAN', 'DL', 'DT', 'DD', 'PICTURE', 'SOURCE', 'INS', 'MARK', 'SMALL']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'VIDEO', 'AUDIO', 'SVG', 'MATH', 'LINK', 'META', 'BASE', 'NOSCRIPT', 'TEMPLATE']);
const ATTRS = { A: ['href', 'title'], IMG: ['src', 'alt', 'width', 'height', 'title'], TD: ['align', 'colspan', 'rowspan'], TH: ['align', 'colspan', 'rowspan'], OL: ['start'], DETAILS: ['open'], P: ['align'], DIV: ['align'], H1: ['align'], H2: ['align'], H3: ['align'], SOURCE: ['srcset', 'media'] };

function absolutize(url, repo, branch, raw) {
  if (!url) return '';
  url = url.trim();
  if (/^(javascript|data|vbscript):/i.test(url)) return '';
  if (/^https?:\/\//i.test(url)) return url.replace(/^http:/i, 'https:');
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('#')) return '';
  if (url.startsWith('mailto:')) return url;
  const path = url.replace(/^\.?\//, '');
  if (url.startsWith('/')) return `https://github.com${url}`;
  return raw ? `https://raw.githubusercontent.com/${repo}/${branch || 'HEAD'}/${path}` : `https://github.com/${repo}/blob/${branch || 'HEAD'}/${path}`;
}

export function sanitize(html, repo, branch) {
  const doc = new DOMParser().parseFromString(`<div id="r">${html || ''}</div>`, 'text/html');
  const root = doc.getElementById('r');
  const walk = (node) => {
    for (const child of [...node.children]) {
      const tag = child.tagName;
      if (DROP.has(tag)) { child.remove(); continue; }
      if (!ALLOWED.has(tag)) {
        // unwrap unknown elements, keeping their children
        walk(child);
        child.replaceWith(...child.childNodes);
        continue;
      }
      const canonical = tag === 'IMG' ? child.getAttribute('data-canonical-src') : null;
      const keep = ATTRS[tag] || [];
      for (const a of [...child.attributes]) if (!keep.includes(a.name)) child.removeAttribute(a.name);
      if (tag === 'A') {
        const href = absolutize(child.getAttribute('href'), repo, branch, false);
        if (href) { child.setAttribute('href', href); child.setAttribute('data-ext', '1'); } else child.removeAttribute('href');
      }
      if (tag === 'IMG') {
        const src = absolutize(child.getAttribute('src') || canonical, repo, branch, true);
        if (!src) { child.remove(); continue; }
        child.setAttribute('src', src);
        child.setAttribute('loading', 'lazy');
        child.setAttribute('decoding', 'async');
        child.setAttribute('referrerpolicy', 'no-referrer');
        const w = parseInt(child.getAttribute('width'), 10);
        if (w > 0) child.style.width = Math.min(w, 600) + 'px';
        child.removeAttribute('width'); child.removeAttribute('height');
      }
      if (tag === 'SOURCE') {
        // prefer the dark variant in dark mode, light otherwise; drop otherwise
        const media = child.getAttribute('media') || '';
        const img = child.parentElement && child.parentElement.querySelector('img');
        const dark = document.documentElement.dataset.theme === 'dark';
        if (img && media.includes(dark ? 'dark' : 'light')) {
          const src = (child.getAttribute('srcset') || '').split(/[ ,]/)[0];
          const abs = absolutize(src, repo, branch, true);
          if (abs) img.setAttribute('src', abs);
        }
        child.remove(); continue;
      }
      walk(child);
    }
  };
  walk(root);
  return root.innerHTML;
}

// very small markdown fallback for plain-text release bodies
export function miniMarkdown(md) {
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lines = (md || '').replace(/\r/g, '').split('\n');
  let out = '', inList = false;
  for (let l of lines) {
    const t = l.trim();
    if (/^[-*] /.test(t)) { if (!inList) { out += '<ul>'; inList = true; } out += `<li>${inline(esc(t.slice(2)))}</li>`; continue; }
    if (inList) { out += '</ul>'; inList = false; }
    if (!t) continue;
    const m = t.match(/^(#{1,4}) (.*)/);
    if (m) out += `<h${m[1].length + 1}>${inline(esc(m[2]))}</h${m[1].length + 1}>`;
    else out += `<p>${inline(esc(t))}</p>`;
  }
  if (inList) out += '</ul>';
  return out;
  function inline(s) {
    return s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" data-ext="1">$1</a>');
  }
}
