package app.clone;

import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.view.HapticFeedbackConstants;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The JavaScript interface exposed to the UI as window.CloneNative.
 * Methods run on a WebView background thread; anything touching views is posted to the UI thread.
 */
final class Bridge {
    private final MainActivity a;

    Bridge(MainActivity activity) {
        this.a = activity;
    }

    @JavascriptInterface
    public String info() {
        try {
            JSONObject o = new JSONObject();
            o.put("version", a.versionName());
            o.put("versionCode", a.versionCode());
            o.put("sdk", Build.VERSION.SDK_INT);
            o.put("device", Build.MANUFACTURER + " " + Build.MODEL);
            JSONArray abis = new JSONArray();
            for (String abi : Build.SUPPORTED_ABIS) abis.put(abi);
            o.put("abis", abis);
            o.put("systemDark", a.isSystemDark());
            o.put("notificationsAllowed", Daily.notificationsAllowed(a));
            o.put("density", a.getResources().getDisplayMetrics().density);
            return o.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    @JavascriptInterface
    public boolean isSystemDark() {
        return a.isSystemDark();
    }

    @JavascriptInterface
    public String insets() {
        return a.insetsJson();
    }

    @JavascriptInterface
    public void ready() {
        a.onWebReady();
    }

    @JavascriptInterface
    public void setTheme(boolean dark, String bg) {
        a.applyTheme(dark, bg);
    }

    @JavascriptInterface
    public void haptic(final String kind) {
        a.handler().post(new Runnable() {
            @Override
            public void run() {
                if (a.web == null) return;
                int c;
                if ("click".equals(kind)) c = HapticFeedbackConstants.CONTEXT_CLICK;
                else if ("heavy".equals(kind)) c = HapticFeedbackConstants.LONG_PRESS;
                else if ("confirm".equals(kind)) c = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.VIRTUAL_KEY;
                else if ("reject".equals(kind)) c = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.REJECT : HapticFeedbackConstants.LONG_PRESS;
                else c = HapticFeedbackConstants.KEYBOARD_TAP;
                a.web.performHapticFeedback(c);
            }
        });
    }

    @JavascriptInterface
    public void share(final String title, final String text, final String url) {
        a.handler().post(new Runnable() {
            @Override
            public void run() {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                if (title != null && !title.isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, title);
                String body = text == null ? "" : text;
                if (url != null && !url.isEmpty()) body = body.isEmpty() ? url : body + "\n" + url;
                send.putExtra(Intent.EXTRA_TEXT, body);
                Intent chooser = Intent.createChooser(send, title);
                try {
                    a.startActivity(chooser);
                } catch (Exception ignored) {
                }
            }
        });
    }

    @JavascriptInterface
    public void openUrl(final String url) {
        if (url == null) return;
        if (!(url.startsWith("https://") || url.startsWith("http://") || url.startsWith("mailto:"))) return;
        a.handler().post(new Runnable() {
            @Override
            public void run() {
                a.openExternal(url);
            }
        });
    }

    @JavascriptInterface
    public void setCanGoBack(boolean value) {
        a.setCanGoBack(value);
    }

    @JavascriptInterface
    public long download(String url, String fileName, String title) {
        return Downloads.enqueue(a, url, fileName, title);
    }

    @JavascriptInterface
    public String downloadStatus(long id) {
        return Downloads.status(a, id);
    }

    @JavascriptInterface
    public void installDownloaded(final long id) {
        a.handler().post(new Runnable() {
            @Override
            public void run() {
                if (Downloads.canInstall(a)) {
                    Downloads.install(a, id);
                } else {
                    a.armInstall(id);
                    a.openSettings(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, true);
                }
            }
        });
    }

    @JavascriptInterface
    public void cancelDownload(long id) {
        Downloads.cancel(a, id);
    }

    @JavascriptInterface
    public boolean canRequestInstalls() {
        return Downloads.canInstall(a);
    }

    @JavascriptInterface
    public void scheduleDaily(boolean enabled, int hour, int minute, String planJson) {
        Daily.save(a, enabled, hour, minute, planJson);
        Daily.schedule(a);
    }

    @JavascriptInterface
    public boolean notificationsAllowed() {
        return Daily.notificationsAllowed(a);
    }

    @JavascriptInterface
    public void requestNotificationPermission() {
        a.requestNotificationPermission();
    }

    @JavascriptInterface
    public void openNotificationSettings() {
        a.handler().post(new Runnable() {
            @Override
            public void run() {
                a.openSettings(Build.VERSION.SDK_INT >= 26 ? Settings.ACTION_APP_NOTIFICATION_SETTINGS : Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Build.VERSION.SDK_INT < 26);
            }
        });
    }

    @JavascriptInterface
    public void openInstallSettings() {
        a.handler().post(new Runnable() {
            @Override
            public void run() {
                if (Build.VERSION.SDK_INT >= 26) a.openSettings(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, true);
                else a.openSettings(Settings.ACTION_SECURITY_SETTINGS, false);
            }
        });
    }

    @JavascriptInterface
    public String takeLaunchRoute() {
        String r = a.takeLaunchRoute();
        return r == null ? "" : r;
    }
}
