package com.aienglish.call;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * 부팅 완료 시 호출되는 Receiver
 * 예약된 전화가 있으면 서비스를 재시작
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {

            Log.d(TAG, "Boot completed, checking for scheduled calls...");

            // TODO: SharedPreferences에서 예약된 전화 정보를 읽어서 재예약
            // 현재는 단순히 로그만 출력
        }
    }
}
