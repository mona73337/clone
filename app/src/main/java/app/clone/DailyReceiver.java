package app.clone;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Fires once a day: posts the App of the Day notification, then arms tomorrow's alarm. */
public class DailyReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (Daily.ACTION.equals(action)) {
            Daily.notifyToday(context);
        }
        Daily.schedule(context);
    }
}
