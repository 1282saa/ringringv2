package com.aienglish.call;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * 전화 알람 BroadcastReceiver
 * Full-Screen Intent를 사용하여 화면이 꺼져있어도 전화 화면을 띄움
 */
public class CallAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "CallAlarmReceiver";
    public static final String ACTION_INCOMING_CALL = "com.aienglish.call.INCOMING_CALL";
    private static final String CHANNEL_ID = "incoming_call_channel";
    private static final int NOTIFICATION_ID = 2001;

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "=== ALARM RECEIVED! ===");

        String tutorName = "AI Tutor";
        if (intent != null && intent.hasExtra("tutorName")) {
            tutorName = intent.getStringExtra("tutorName");
        }

        // 알림 채널 생성 (Android 8.0+)
        createNotificationChannel(context);

        // Full-Screen Intent로 IncomingCallActivity 실행
        showFullScreenNotification(context, tutorName);
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "전화 수신",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("AI 영어 전화 수신 알림");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true); // 방해금지 모드 무시

            // 벨소리 설정
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            channel.setSound(ringtoneUri, audioAttributes);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 500, 1000});

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created");
            }
        }
    }

    private void showFullScreenNotification(Context context, String tutorName) {
        // IncomingCallActivity를 열기 위한 Intent
        Intent fullScreenIntent = new Intent(context, IncomingCallActivity.class);
        fullScreenIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_NO_USER_ACTION |
            Intent.FLAG_ACTIVITY_CLEAR_TOP
        );
        fullScreenIntent.putExtra("tutorName", tutorName);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            0,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 전화 받기 액션
        Intent answerIntent = new Intent(context, IncomingCallActivity.class);
        answerIntent.setAction("ANSWER_CALL");
        answerIntent.putExtra("tutorName", tutorName);
        PendingIntent answerPendingIntent = PendingIntent.getActivity(
            context,
            1,
            answerIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 전화 거절 액션
        Intent declineIntent = new Intent(context, CallDeclineReceiver.class);
        PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
            context,
            2,
            declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 알림 빌드
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle(tutorName)
            .setContentText("AI 영어 전화가 왔어요!")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreenPendingIntent, true)  // 핵심: Full-Screen Intent
            .addAction(android.R.drawable.ic_menu_call, "받기", answerPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "거절", declinePendingIntent);

        // 벨소리 (Android 8.0 미만)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            builder.setSound(ringtoneUri);
            builder.setVibrate(new long[]{0, 1000, 500, 1000});
        }

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, builder.build());
            Log.d(TAG, "Full-screen notification shown!");
        }

        // 추가로 직접 Activity 시작 시도 (일부 기기에서 필요)
        try {
            context.startActivity(fullScreenIntent);
            Log.d(TAG, "Activity started directly");
        } catch (Exception e) {
            Log.e(TAG, "Could not start activity directly: " + e.getMessage());
        }
    }
}
