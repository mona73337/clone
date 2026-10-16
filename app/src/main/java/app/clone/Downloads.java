package app.clone;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Log;

/** APK downloads through the system DownloadManager, then a hand-off to the package installer. */
final class Downloads {
    static final String APK_MIME = "application/vnd.android.package-archive";

    private Downloads() {
    }

    static long enqueue(Context c, String url, String fileName, String title) {
        try {
            if (url == null || !url.startsWith("https://")) return -1;
            String name = sanitize(fileName == null || fileName.isEmpty() ? "app.apk" : fileName);
            if (!name.toLowerCase().endsWith(".apk")) name = name + ".apk";
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
            r.setTitle(title == null || title.isEmpty() ? name : title);
            r.setDescription("Downloading with Clone");
            r.setMimeType(APK_MIME);
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            r.setDestinationInExternalFilesDir(c, Environment.DIRECTORY_DOWNLOADS, name);
            DownloadManager dm = (DownloadManager) c.getSystemService(Context.DOWNLOAD_SERVICE);
            return dm.enqueue(r);
        } catch (Exception e) {
            Log.w(MainActivity.TAG, "download failed", e);
            return -1;
        }
    }

    static String sanitize(String name) {
        String n = name.replaceAll("[^A-Za-z0-9._+-]", "_");
        return n.length() > 120 ? n.substring(n.length() - 120) : n;
    }

    static String status(Context c, long id) {
        DownloadManager dm = (DownloadManager) c.getSystemService(Context.DOWNLOAD_SERVICE);
        Cursor cur = null;
        try {
            cur = dm.query(new DownloadManager.Query().setFilterById(id));
            if (cur == null || !cur.moveToFirst()) return "{\"status\":\"failed\",\"bytes\":0,\"total\":0}";
            int st = cur.getInt(cur.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long bytes = cur.getLong(cur.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = cur.getLong(cur.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            String s;
            switch (st) {
                case DownloadManager.STATUS_SUCCESSFUL: s = "successful"; break;
                case DownloadManager.STATUS_FAILED: s = "failed"; break;
                case DownloadManager.STATUS_PAUSED: s = "paused"; break;
                case DownloadManager.STATUS_RUNNING: s = "running"; break;
                default: s = "pending";
            }
            return "{\"status\":\"" + s + "\",\"bytes\":" + bytes + ",\"total\":" + total + "}";
        } catch (Exception e) {
            return "{\"status\":\"failed\",\"bytes\":0,\"total\":0}";
        } finally {
            if (cur != null) cur.close();
        }
    }

    static void cancel(Context c, long id) {
        try {
            ((DownloadManager) c.getSystemService(Context.DOWNLOAD_SERVICE)).remove(id);
        } catch (Exception ignored) {
        }
    }

    static boolean canInstall(Context c) {
        if (Build.VERSION.SDK_INT < 26) return true;
        return Api26.canRequestInstalls(c);
    }

    static void install(Context c, long id) {
        try {
            DownloadManager dm = (DownloadManager) c.getSystemService(Context.DOWNLOAD_SERVICE);
            Uri uri = dm.getUriForDownloadedFile(id);
            if (uri == null) return;
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, APK_MIME);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(i);
        } catch (Exception e) {
            Log.w(MainActivity.TAG, "install hand-off failed", e);
        }
    }

    static final class Api26 {
        static boolean canRequestInstalls(Context c) {
            return c.getPackageManager().canRequestPackageInstalls();
        }
    }
}
