// Thin wrapper around the Android bridge (window.CloneNative), with browser fallbacks
// so the UI also runs in a normal browser for development.
const N = window.CloneNative || null;
export const isNative = !!N;
const listeners = {};

window.__clone = window.__clone || {};
window.__clone.onNative = (type, data) => {
  let payload = data;
  if (typeof data === 'string') { try { payload = JSON.parse(data); } catch (e) { payload = data; } }
  [...(listeners[type] || [])].forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } });
};

export function on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); }

function call(name, ...args) {
  if (!N || typeof N[name] !== 'function') return undefined;
  try { return N[name](...args); } catch (e) { console.warn('native', name, e); return undefined; }
}

export const native = {
  info() {
    const raw = call('info');
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return { version: 'web', versionCode: 0, sdk: 0, systemDark: matchMedia('(prefers-color-scheme: dark)').matches, notificationsAllowed: false, web: true };
  },
  systemDark() {
    const v = call('isSystemDark');
    return typeof v === 'boolean' ? v : matchMedia('(prefers-color-scheme: dark)').matches;
  },
  ready() { call('ready'); },
  insets() { const raw = call('insets'); if (!raw) return null; try { return JSON.parse(raw); } catch (e) { return null; } },
  setTheme(dark, bg) { call('setTheme', !!dark, bg); },
  haptic(kind = 'tick') {
    if (N) return call('haptic', kind);
    if (navigator.vibrate) { try { navigator.vibrate(kind === 'heavy' ? 18 : kind === 'confirm' ? [8, 40, 12] : 6); } catch (e) {} }
  },
  share(title, text, url) {
    if (N) return call('share', title || '', text || '', url || '');
    if (navigator.share) return navigator.share({ title, text, url }).catch(() => {});
    if (navigator.clipboard) navigator.clipboard.writeText([text, url].filter(Boolean).join(' ')).catch(() => {});
  },
  openUrl(url) { if (N) return call('openUrl', url); window.open(url, '_blank', 'noopener'); },
  setCanGoBack(v) { call('setCanGoBack', !!v); },
  download(url, fileName, title) {
    if (N) { const id = call('download', url, fileName || '', title || ''); return typeof id === 'number' ? id : Number(id); }
    window.open(url, '_blank', 'noopener'); return -1;
  },
  downloadStatus(id) {
    const raw = call('downloadStatus', id);
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return null;
  },
  installDownloaded(id) { call('installDownloaded', id); },
  cancelDownload(id) { call('cancelDownload', id); },
  scheduleDaily(enabled, hour, minute, picks) { call('scheduleDaily', !!enabled, hour | 0, minute | 0, JSON.stringify(picks || [])); },
  notificationsAllowed() { const v = call('notificationsAllowed'); return v === undefined ? ('Notification' in window && Notification.permission === 'granted') : !!v; },
  requestNotifications() {
    return new Promise((resolve) => {
      if (!N) {
        if ('Notification' in window) Notification.requestPermission().then((p) => resolve(p === 'granted')).catch(() => resolve(false));
        else resolve(false);
        return;
      }
      const once = (granted) => { const l = listeners.notifPerm; l.splice(l.indexOf(once), 1); resolve(!!(granted && (granted.granted ?? granted))); };
      on('notifPerm', once);
      call('requestNotificationPermission');
    });
  },
  launchRoute() { const r = call('takeLaunchRoute'); return r || ''; },
  openNotificationSettings() { call('openNotificationSettings'); },
  openInstallSettings() { call('openInstallSettings'); },
  canInstall() { const v = call('canRequestInstalls'); return v === undefined ? true : !!v; },
};
