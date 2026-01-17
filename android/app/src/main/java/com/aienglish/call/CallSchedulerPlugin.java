package com.aienglish.call;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 전화 예약 Capacitor 플러그인
 * Foreground Service를 통해 안정적인 알람 예약
 */
@CapacitorPlugin(name = "CallScheduler")
public class CallSchedulerPlugin extends Plugin {

    private static final String TAG = "CallSchedulerPlugin";

    /**
     * 권한 상태 확인
     */
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();

        // 정확한 알람 권한 (Android 12+)
        boolean canScheduleExactAlarms = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            canScheduleExactAlarms = alarmManager != null && alarmManager.canScheduleExactAlarms();
        }
        ret.put("exactAlarm", canScheduleExactAlarms);

        // 배터리 최적화 제외 여부
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        boolean isIgnoringBatteryOptimizations = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
            isIgnoringBatteryOptimizations = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        } else {
            isIgnoringBatteryOptimizations = true; // 구버전은 필요 없음
        }
        ret.put("batteryOptimization", isIgnoringBatteryOptimizations);

        ret.put("allGranted", canScheduleExactAlarms && isIgnoringBatteryOptimizations);

        call.resolve(ret);
    }

    /**
     * 정확한 알람 권한 요청 (설정 화면으로 이동)
     */
    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "Error opening exact alarm settings", e);
                call.reject("Failed to open settings: " + e.getMessage());
            }
        } else {
            // Android 12 미만은 권한 불필요
            call.resolve();
        }
    }

    /**
     * 배터리 최적화 제외 요청
     */
    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "Error requesting battery optimization exemption", e);
                call.reject("Failed to request: " + e.getMessage());
            }
        } else {
            call.resolve();
        }
    }

    /**
     * 테스트: N초 후 전화 오기
     */
    @PluginMethod
    public void scheduleTestCall(PluginCall call) {
        int delaySeconds = call.getInt("delaySeconds", 5);
        String tutorName = call.getString("tutorName", "AI Tutor");

        long triggerTime = System.currentTimeMillis() + (delaySeconds * 1000L);

        // Foreground Service를 통해 알람 예약
        startSchedulerService(triggerTime, tutorName, 999999);

        JSObject ret = new JSObject();
        ret.put("scheduled", true);
        ret.put("triggerTime", triggerTime);
        ret.put("delaySeconds", delaySeconds);
        call.resolve(ret);

        Log.d(TAG, "Test call scheduled in " + delaySeconds + " seconds via Foreground Service");
    }

    /**
     * 특정 시간에 전화 예약
     */
    @PluginMethod
    public void scheduleCall(PluginCall call) {
        long triggerTime = call.getLong("triggerTime", 0L);
        String tutorName = call.getString("tutorName", "AI Tutor");
        int requestCode = call.getInt("requestCode", 0);

        if (triggerTime == 0) {
            call.reject("triggerTime is required");
            return;
        }

        // Foreground Service를 통해 알람 예약
        startSchedulerService(triggerTime, tutorName, requestCode);

        JSObject ret = new JSObject();
        ret.put("scheduled", true);
        ret.put("triggerTime", triggerTime);
        call.resolve(ret);

        Log.d(TAG, "Call scheduled for " + triggerTime + " via Foreground Service");
    }

    /**
     * 예약된 전화 취소
     */
    @PluginMethod
    public void cancelCall(PluginCall call) {
        int requestCode = call.getInt("requestCode", 0);

        Intent serviceIntent = new Intent(getContext(), CallSchedulerService.class);
        serviceIntent.setAction(CallSchedulerService.ACTION_CANCEL_CALL);
        serviceIntent.putExtra("requestCode", requestCode);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }

        JSObject ret = new JSObject();
        ret.put("cancelled", true);
        call.resolve(ret);

        Log.d(TAG, "Call cancelled: " + requestCode);
    }

    /**
     * 즉시 전화 화면 띄우기 (테스트용)
     */
    @PluginMethod
    public void triggerCallNow(PluginCall call) {
        String tutorName = call.getString("tutorName", "AI Tutor");

        Intent callIntent = new Intent(getContext(), IncomingCallActivity.class);
        callIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        callIntent.putExtra("tutorName", tutorName);
        getContext().startActivity(callIntent);

        JSObject ret = new JSObject();
        ret.put("triggered", true);
        call.resolve(ret);

        Log.d(TAG, "Call triggered now!");
    }

    /**
     * Foreground Service 시작
     */
    private void startSchedulerService(long triggerTime, String tutorName, int requestCode) {
        Intent serviceIntent = new Intent(getContext(), CallSchedulerService.class);
        serviceIntent.setAction(CallSchedulerService.ACTION_SCHEDULE_CALL);
        serviceIntent.putExtra("triggerTime", triggerTime);
        serviceIntent.putExtra("tutorName", tutorName);
        serviceIntent.putExtra("requestCode", requestCode);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }

        Log.d(TAG, "Scheduler service started");
    }
}
