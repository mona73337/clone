package app.clone;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.widget.TextView;
import android.view.Gravity;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;

import org.json.JSONObject;

/**
 * Hosts the Clone UI (bundled web assets served from a private https origin) in a WebView,
 * and provides the native pieces: edge-to-edge insets, system bar theming, back navigation,
 * splash hand-off, downloads/installs and the daily App of the Day notification.
 */
public class MainActivity extends Activity {
    static final String TAG = "Clone";
    static final String START_URL = AssetClient.ORIGIN + "/www/index.html";
    static final int REQ_NOTIFICATIONS = 7;

    WebView web;
    private FrameLayout root;
    private final Handler ui = new Handler(Looper.getMainLooper());
    volatile boolean webReady = false;
    volatile boolean canGoBack = false;
    volatile String pendingRoute = null;
    volatile long pendingInstallId = -1;
    private long startedAt;
    private Object backCallback;
    private boolean backRegistered = false;
    private volatile String lastInsets = "{\"top\":0,\"bottom\":0,\"left\":0,\"right\":0,\"ime\":0}";
    private int recreations = 0;
    private long firstRecreationAt = 0;
    private int lastUiMode;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startedAt = SystemClock.uptimeMillis();
        lastUiMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        boolean fromHistory = (getIntent().getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0;
        pendingRoute = (savedInstanceState == null && !fromHistory) ? routeFrom(getIntent()) : null;
        SharedPreferences ip = getSharedPreferences("clone_install", MODE_PRIVATE);
        if (System.currentTimeMillis() - ip.getLong("at", 0) < 10 * 60 * 1000L) pendingInstallId = ip.getLong("id", -1);

        if (Build.VERSION.SDK_INT >= 31) Api31.fadeSplash(this);

        root = new FrameLayout(this);
        root.setBackgroundColor(themeBg(isSystemDark()));
        setContentView(root);
        SystemBars.edgeToEdge(getWindow(), isSystemDark());
        try {
            createWebView();
        } catch (RuntimeException e) {
            // Android System WebView missing, disabled or mid-update: explain instead of crashing.
            Log.e(TAG, "WebView unavailable", e);
            showWebViewMissing();
            webReady = true;
        }
        handleInsets();
        holdFirstFrameUntilReady();
        Daily.ensureChannel(this);
        Daily.schedule(this);
    }

    // ------------------------------------------------------------------ WebView

    private void createWebView() {
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setTextZoom(textZoom());
        s.setUserAgentString(s.getUserAgentString() + " CloneApp/" + versionName());
        if (Build.VERSION.SDK_INT >= 29 && Build.VERSION.SDK_INT <= 32) Api29.noForceDark(s);

        web.setBackgroundColor(themeBg(isSystemDark()));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setHapticFeedbackEnabled(true);
        web.addJavascriptInterface(new Bridge(this), "CloneNative");
        web.setWebViewClient(new AssetClient(this));
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                if (m.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                    Log.w(TAG, m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
                }
                return true;
            }
        });
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.loadUrl(START_URL);
    }

    private void showWebViewMissing() {
        TextView t = new TextView(this);
        t.setText("Clone needs Android System WebView.\n\nIt may be updating right now — please try again in a minute, or update it from your app store.");
        t.setTextSize(17f);
        t.setGravity(Gravity.CENTER);
        t.setTextColor(isSystemDark() ? 0xFFFAF9F5 : 0xFF141413);
        int pad = Math.round(32 * getResources().getDisplayMetrics().density);
        t.setPadding(pad, pad, pad, pad);
        root.addView(t, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    /** Called when the renderer crashed or was killed: rebuild the WebView instead of crashing. */
    void recreateWebView() {
        if (isFinishing() || isDestroyed()) return;
        long now = SystemClock.uptimeMillis();
        if (now - firstRecreationAt > 30000) {
            firstRecreationAt = now;
            recreations = 0;
        }
        if (++recreations > 3) {
            finish();
            return;
        }
        setCanGoBack(false);
        webReady = false;
        if (web != null) {
            root.removeView(web);
            web.destroy();
        }
        createWebView();
        root.requestApplyInsets();
    }

    private int textZoom() {
        float scale = getResources().getConfiguration().fontScale;
        int z = Math.round(scale * 100f);
        return Math.max(85, Math.min(135, z));
    }

    String versionName() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "1.0";
        }
    }

    long versionCode() {
        try {
            if (Build.VERSION.SDK_INT >= 28) return Api28.versionCode(getPackageManager().getPackageInfo(getPackageName(), 0));
            return legacyVersionCode();
        } catch (PackageManager.NameNotFoundException e) {
            return 1;
        }
    }

    @SuppressWarnings("deprecation")
    private long legacyVersionCode() throws PackageManager.NameNotFoundException {
        return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
    }

    // ------------------------------------------------------------------ JS events

    void emit(final String type, final String json) {
        ui.post(new Runnable() {
            @Override
            public void run() {
                if (web == null) return;
                web.evaluateJavascript("window.__clone&&window.__clone.onNative&&window.__clone.onNative("
                        + JSONObject.quote(type) + "," + (json == null ? "null" : json) + ")", null);
            }
        });
    }

    void onWebReady() {
        webReady = true;
        ui.post(new Runnable() {
            @Override
            public void run() {
                emit("insets", lastInsets);
                String r = takeLaunchRoute();
                if (r != null) emit("route", JSONObject.quote(r));
                View content = findViewById(android.R.id.content);
                if (content != null) content.invalidate();
            }
        });
    }

    String insetsJson() {
        return lastInsets;
    }

    // ------------------------------------------------------------------ insets / splash

    private void handleInsets() {
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                int[] in = Build.VERSION.SDK_INT >= 30 ? Api30.insets(insets) : legacyInsets(insets);
                int top = in[0], bottom = in[1], left = in[2], right = in[3], ime = in[4];
                boolean keyboard = ime > bottom;
                v.setPadding(0, 0, 0, keyboard ? ime : 0);
                float d = getResources().getDisplayMetrics().density;
                try {
                    JSONObject o = new JSONObject();
                    o.put("top", Math.round(top / d));
                    o.put("bottom", keyboard ? 0 : Math.round(bottom / d));
                    o.put("left", Math.round(left / d));
                    o.put("right", Math.round(right / d));
                    o.put("ime", keyboard ? Math.round(ime / d) : 0);
                    lastInsets = o.toString();
                } catch (Exception ignored) {
                }
                if (webReady) emit("insets", lastInsets);
                return Build.VERSION.SDK_INT >= 30 ? Api30.consumed() : legacyConsume(insets);
            }
        });
        root.requestApplyInsets();
    }

    @SuppressWarnings("deprecation")
    private int[] legacyInsets(WindowInsets insets) {
        int stable = insets.getStableInsetBottom();
        int all = insets.getSystemWindowInsetBottom();
        int[] r = new int[]{insets.getSystemWindowInsetTop(), stable, insets.getSystemWindowInsetLeft(),
                insets.getSystemWindowInsetRight(), all > stable ? all : 0};
        if (Build.VERSION.SDK_INT >= 28) Api28.cutout(insets, r);
        return r;
    }

    @SuppressWarnings("deprecation")
    private WindowInsets legacyConsume(WindowInsets insets) {
        return insets.consumeSystemWindowInsets();
    }

    /** Keep the splash on screen until the web UI has painted its first real frame (max 2.5 s). */
    private void holdFirstFrameUntilReady() {
        final View content = findViewById(android.R.id.content);
        content.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override
            public boolean onPreDraw() {
                if (webReady || SystemClock.uptimeMillis() - startedAt > 2500) {
                    content.getViewTreeObserver().removeOnPreDrawListener(this);
                    return true;
                }
                return false;
            }
        });
        ui.postDelayed(new Runnable() {
            @Override
            public void run() {
                content.invalidate();
            }
        }, 2600);
    }

    // ------------------------------------------------------------------ theme

    boolean isSystemDark() {
        return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    static int themeBg(boolean dark) {
        return dark ? 0xFF262624 : 0xFFFAF9F5;
    }

    void applyTheme(final boolean dark, final String bg) {
        ui.post(new Runnable() {
            @Override
            public void run() {
                int color = themeBg(dark);
                try {
                    if (bg != null && bg.startsWith("#")) color = Color.parseColor(bg);
                } catch (IllegalArgumentException ignored) {
                }
                getWindow().setBackgroundDrawable(new ColorDrawable(color));
                root.setBackgroundColor(color);
                SystemBars.appearance(getWindow(), dark);
            }
        });
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        int mode = newConfig.uiMode & Configuration.UI_MODE_NIGHT_MASK;
        if (mode != lastUiMode) {
            lastUiMode = mode;
            emit("systemTheme", "{\"dark\":" + (mode == Configuration.UI_MODE_NIGHT_YES) + "}");
        }
    }

    // ------------------------------------------------------------------ back navigation

    void setCanGoBack(final boolean value) {
        canGoBack = value;
        if (Build.VERSION.SDK_INT >= 33) {
            ui.post(new Runnable() {
                @Override
                public void run() {
                    if (backCallback == null) backCallback = Api33.callback(MainActivity.this);
                    if (value && !backRegistered) {
                        Api33.register(MainActivity.this, backCallback);
                        backRegistered = true;
                    } else if (!value && backRegistered) {
                        Api33.unregister(MainActivity.this, backCallback);
                        backRegistered = false;
                    }
                }
            });
        }
    }

    void dispatchBack() {
        if (webReady && canGoBack) emit("back", "{}");
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webReady && canGoBack) {
            emit("back", "{}");
            return;
        }
        super.onBackPressed();
    }

    // ------------------------------------------------------------------ routes / intents

    static String routeFrom(Intent intent) {
        try {
            return routeFromUnsafe(intent);
        } catch (RuntimeException e) {
            return null; // e.g. BadParcelableException from extras sent by another app
        }
    }

    private static String routeFromUnsafe(Intent intent) {
        if (intent == null) return null;
        String r = intent.getStringExtra("route");
        if (r != null && r.startsWith("#/")) return r;
        Uri data = intent.getData();
        if (data != null && "clone".equals(data.getScheme())) {
            String path = data.getPath();
            String query = data.getEncodedQuery();
            if ("route".equals(data.getHost()) && path != null) return "#" + path + (query != null ? "?" + query : "");
        }
        return null;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String r = routeFrom(intent);
        if (r == null) return;
        if (webReady) emit("route", JSONObject.quote(r));
        else pendingRoute = r;
    }

    /** Remember an install that waits for the "install unknown apps" permission (survives process death). */
    void armInstall(long id) {
        pendingInstallId = id;
        getSharedPreferences("clone_install", MODE_PRIVATE).edit()
                .putLong("id", id).putLong("at", System.currentTimeMillis()).apply();
    }

    String takeLaunchRoute() {
        String r = pendingRoute;
        pendingRoute = null;
        return r;
    }

    // ------------------------------------------------------------------ lifecycle

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        if (webReady) emit("resume", "{}");
        if (pendingInstallId >= 0) {
            long id = pendingInstallId;
            pendingInstallId = -1;
            getSharedPreferences("clone_install", MODE_PRIVATE).edit().clear().apply();
            if (Downloads.canInstall(this)) Downloads.install(this, id);
            else emit("installBlocked", "{\"id\":" + id + "}");
        }
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    // ------------------------------------------------------------------ permissions

    void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            ui.post(new Runnable() {
                @Override
                public void run() {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
                }
            });
        } else {
            emit("notifPerm", "{\"granted\":" + Daily.notificationsAllowed(this) + "}");
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_NOTIFICATIONS) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            emit("notifPerm", "{\"granted\":" + granted + "}");
            Daily.schedule(this);
        }
    }

    void openExternal(String url) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            Log.w(TAG, "No app to open " + url);
        }
    }

    void openSettings(String action, boolean packageUri) {
        try {
            Intent i = new Intent(action);
            if (packageUri) i.setData(Uri.parse("package:" + getPackageName()));
            if (Build.VERSION.SDK_INT >= 26 && android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS.equals(action)) {
                i.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getPackageName());
            }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            Intent i = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                startActivity(i);
            } catch (Exception ignored) {
            }
        }
    }

    Handler handler() {
        return ui;
    }

    // ------------------------------------------------------------------ API-level helpers
    // Kept in nested classes so older devices never verify methods that use newer APIs.

    static final class Api28 {
        static long versionCode(android.content.pm.PackageInfo p) {
            return p.getLongVersionCode();
        }

        static void cutout(WindowInsets in, int[] r) {
            android.view.DisplayCutout c = in.getDisplayCutout();
            if (c == null) return;
            r[0] = Math.max(r[0], c.getSafeInsetTop());
            r[1] = Math.max(r[1], c.getSafeInsetBottom());
            r[2] = Math.max(r[2], c.getSafeInsetLeft());
            r[3] = Math.max(r[3], c.getSafeInsetRight());
        }
    }

    static final class Api29 {
        @SuppressWarnings("deprecation")
        static void noForceDark(WebSettings s) {
            s.setForceDark(WebSettings.FORCE_DARK_OFF);
        }
    }

    static final class Api30 {
        static int[] insets(WindowInsets insets) {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
            return new int[]{bars.top, bars.bottom, bars.left, bars.right, ime.bottom};
        }

        static WindowInsets consumed() {
            return WindowInsets.CONSUMED;
        }
    }

    static final class Api31 {
        static void fadeSplash(Activity a) {
            a.getSplashScreen().setOnExitAnimationListener(new android.window.SplashScreen.OnExitAnimationListener() {
                @Override
                public void onSplashScreenExit(final android.window.SplashScreenView view) {
                    view.animate().alpha(0f).setDuration(260).withEndAction(new Runnable() {
                        @Override
                        public void run() {
                            view.remove();
                        }
                    }).start();
                }
            });
        }
    }

    static final class Api33 {
        static Object callback(final MainActivity a) {
            return new android.window.OnBackInvokedCallback() {
                @Override
                public void onBackInvoked() {
                    a.dispatchBack();
                }
            };
        }

        static void register(Activity a, Object cb) {
            a.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, (android.window.OnBackInvokedCallback) cb);
        }

        static void unregister(Activity a, Object cb) {
            a.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback((android.window.OnBackInvokedCallback) cb);
        }
    }

    /** Edge-to-edge window setup and light/dark system bar icons for every API level from 24. */
    static final class SystemBars {
        @SuppressWarnings("deprecation")
        static void edgeToEdge(Window w, boolean dark) {
            w.getDecorView(); // installs the decor; getInsetsController() reads it on API 30+
            w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            w.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
            if (Build.VERSION.SDK_INT < 35) {
                w.setStatusBarColor(Color.TRANSPARENT);
                w.setNavigationBarColor(Build.VERSION.SDK_INT >= 26 || dark ? Color.TRANSPARENT : 0x66000000);
            }
            if (Build.VERSION.SDK_INT >= 28) {
                WindowManager.LayoutParams lp = w.getAttributes();
                lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                w.setAttributes(lp);
            }
            if (Build.VERSION.SDK_INT >= 29) {
                w.setNavigationBarContrastEnforced(false);
                w.setStatusBarContrastEnforced(false);
            }
            if (Build.VERSION.SDK_INT >= 30) {
                w.setDecorFitsSystemWindows(false);
            } else {
                View decor = w.getDecorView();
                decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
            }
            appearance(w, dark);
        }

        @SuppressWarnings("deprecation")
        static void appearance(Window w, boolean dark) {
            if (Build.VERSION.SDK_INT >= 30) {
                // Android 11 can let the theme's legacy light-bar flags win, so keep them in sync too.
                View d = w.getDecorView();
                int lf = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                int cur = d.getSystemUiVisibility();
                d.setSystemUiVisibility(dark ? cur & ~lf : cur | lf);
                android.view.WindowInsetsController c = w.getInsetsController();
                if (c != null) {
                    int mask = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                            | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    c.setSystemBarsAppearance(dark ? 0 : mask, mask);
                }
                return;
            }
            View decor = w.getDecorView();
            int f = decor.getSystemUiVisibility();
            f |= View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            if (dark) f &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            else f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) {
                if (dark) f &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                else f |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            } else {
                w.setNavigationBarColor(dark ? Color.TRANSPARENT : 0x66000000);
            }
            decor.setSystemUiVisibility(f);
        }
    }
}
