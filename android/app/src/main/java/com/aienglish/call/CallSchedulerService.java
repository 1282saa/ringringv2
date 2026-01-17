package com.aienglish.call;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service for reliable call scheduling
 * 앱이 백그라운드에 있거나 종료되어도 알람이 확실히 작동하도록 함
 */
public class CallSchedulerService extends Service {

    private static final String TAG = "CallSchedulerService";
    private static final String CHANNEL_ID = "call_scheduler_channel";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_SCHEDULE_CALL = "com.aienglish.call.SCHEDULE_CALL";
    public static final String ACTION_CANCEL_CALL = "com.aienglish.call.CANCEL_CALL";
    public static final String ACTION_STOP_SERVICE = "com.aienglish.call.STOP_SERVICE";

    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service created");
        createNotificationChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service started with action: " + (intent != null ? intent.getAction() : "null"));

        // Foreground 알림 시작
        startForeground(NOTIFICATION_ID, createNotification("AI 전화 대기 중..."));

        if (intent != null) {
            String action = intent.getAction();

            if (ACTION_SCHEDULE_CALL.equals(action)) {
                long triggerTime = intent.getLongExtra("triggerTime", 0);
                String tutorName = intent.getStringExtra("tutorName");
                int requestCode = intent.getIntExtra("requestCode", 0);

                if (triggerTime > 0) {
                    scheduleAlarm(triggerTime, tutorName, requestCode);
                    updateNotification("전화 예약됨: " + tutorName);
                }
            } else if (ACTION_CANCEL_CALL.equals(action)) {
                int requestCode = intent.getIntExtra("requestCode", 0);
                cancelAlarm(requestCode);
            } else if (ACTION_STOP_SERVICE.equals(action)) {
                stopSelf();
            }
        }

        // 서비스가 죽어도 다시 시작
        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "AI 전화 예약",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("AI 전화 예약 서비스");
            channel.setShowBadge(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String text) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AI English Call")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, createNotification(text));
        }
    }

    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "AIEnglishCall::SchedulerWakeLock"
            );
            wakeLock.acquire(10 * 60 * 1000L); // 10분
            Log.d(TAG, "WakeLock acquired");
        }
    }

    private void scheduleAlarm(long triggerTime, String tutorName, int requestCode) {
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager is null");
            return;
        }

        Intent intent = new Intent(this, CallAlarmReceiver.class);
        intent.setAction(CallAlarmReceiver.ACTION_INCOMING_CALL);
        intent.putExtra("tutorName", tutorName);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            this,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 정확한 알람 설정
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setAlarmClock(
                        new AlarmManager.AlarmClockInfo(triggerTime, pendingIntent),
                        pendingIntent
                    );
                    Log.d(TAG, "Alarm clock set for: " + triggerTime);
                } else {
                    // 권한이 없으면 일반 알람 사용
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    );
                    Log.d(TAG, "Fallback alarm set for: " + triggerTime);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAlarmClock(
                    new AlarmManager.AlarmClockInfo(triggerTime, pendingIntent),
                    pendingIntent
                );
                Log.d(TAG, "Alarm clock set for: " + triggerTime);
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
                Log.d(TAG, "Exact alarm set for: " + triggerTime);
            }
        } catch (SecurityException e) {
            Log.e(TAG, "SecurityException scheduling alarm", e);
            // 폴백: 일반 알람
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        }
    }

    private void cancelAlarm(int requestCode) {
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(this, CallAlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            this,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        alarmManager.cancel(pendingIntent);
        Log.d(TAG, "Alarm cancelled: " + requestCode);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service destroyed");

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
