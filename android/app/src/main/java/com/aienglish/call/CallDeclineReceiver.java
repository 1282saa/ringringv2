package com.aienglish.call;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * 전화 거절 BroadcastReceiver
 * 알림에서 거절 버튼을 눌렀을 때 알림을 제거
 */
public class CallDeclineReceiver extends BroadcastReceiver {

    private static final String TAG = "CallDeclineReceiver";
    private static final int NOTIFICATION_ID = 2001;

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Call declined from notification");

        // 알림 제거
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
        }
    }
}
