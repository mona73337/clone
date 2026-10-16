package app.clone;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * The daily App of the Day notification. The UI plans a week of picks ahead and hands them over;
 * an inexact, Doze-friendly alarm fires once a day at the chosen time and posts today's pick.
 */
final class Daily {
    static final String CHANNEL = "app_of_the_day";
    static final String ACTION = "app.clone.action.DAILY";
    private static final String PREFS = "clone_daily";
    private static final int NOTIFICATION_ID = 1001;

    private Daily() {
    }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void save(Context c, boolean enabled, int hour, int minute, String plan) {
        prefs(c).edit()
                .putBoolean("enabled", enabled)
                .putInt("hour", Math.max(0, Math.min(23, hour)))
                .putInt("minute", Math.max(0, Math.min(59, minute)))
                .putString("plan", plan == null ? "[]" : plan)
                .apply();
    }

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        Api26.channel(c);
    }

    static boolean notificationsAllowed(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return nm != null && nm.areNotificationsEnabled();
    }

    private static PendingIntent alarmIntent(Context c) {
        Intent i = new Intent(c, DailyReceiver.class).setAction(ACTION);
        return PendingIntent.getBroadcast(c, 11, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void schedule(Context c) {
        SharedPreferences p = prefs(c);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = alarmIntent(c);
        am.cancel(pi);
        if (!p.getBoolean("enabled", false)) return;
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, p.getInt("hour", 9));
        cal.set(Calendar.MINUTE, p.getInt("minute", 0));
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis() + 5000) cal.add(Calendar.DAY_OF_YEAR, 1);
        // Below Android 12 an inexact alarm may slip by many hours; exact ones need no permission there.
        if (Build.VERSION.SDK_INT < 31) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
    }

    static void notifyToday(Context c) {
        if (!prefs(c).getBoolean("enabled", false) || !notificationsAllowed(c)) return;
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        String title = "Your App of the Day is ready";
        String text = "A new open-source twin is waiting on Today.";
        String route = "#/aotd";
        try {
            JSONArray plan = new JSONArray(prefs(c).getString("plan", "[]"));
            for (int i = 0; i < plan.length(); i++) {
                JSONObject o = plan.getJSONObject(i);
                if (today.equals(o.optString("date"))) {
                    title = o.optString("title", title);
                    text = o.optString("text", text);
                    route = o.optString("route", route);
                    break;
                }
            }
        } catch (Exception ignored) {
        }
        Intent open = new Intent(c, MainActivity.class)
                .putExtra("route", route)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(c, 12, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        ensureChannel(c);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? Api26.builder(c) : legacyBuilder(c);
        b.setSmallIcon(R.drawable.ic_stat_clone)
                .setColor(0xFFD97757)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
                .setShowWhen(true)
                .setCategory(Notification.CATEGORY_RECOMMENDATION)
                .setContentIntent(content);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, b.build());
    }

    @SuppressWarnings("deprecation")
    private static Notification.Builder legacyBuilder(Context c) {
        return new Notification.Builder(c).setPriority(Notification.PRIORITY_DEFAULT);
    }

    static final class Api26 {
        static void channel(Context c) {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
            NotificationChannel ch = new NotificationChannel(CHANNEL, c.getString(R.string.channel_daily), NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription(c.getString(R.string.channel_daily_desc));
            ch.setShowBadge(true);
            nm.createNotificationChannel(ch);
        }

        static Notification.Builder builder(Context c) {
            return new Notification.Builder(c, CHANNEL);
        }
    }
}
