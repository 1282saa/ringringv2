package com.aienglish.call;

import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.ScaleAnimation;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

/**
 * 전화 수신 화면 Activity (네이티브 UI)
 * 화면이 꺼져있어도 켜지면서 전화 수신 화면을 보여줌
 */
public class IncomingCallActivity extends AppCompatActivity {

    private static final String TAG = "IncomingCallActivity";
    private static final int NOTIFICATION_ID = 2001;

    private PowerManager.WakeLock wakeLock;
    private Vibrator vibrator;
    private Ringtone ringtone;
    private Handler handler;
    private boolean isRinging = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Log.d(TAG, "IncomingCallActivity created!");

        // 알림 취소 (Full-Screen Intent로 인해 표시된 알림)
        cancelNotification();

        // ANSWER_CALL 액션이면 바로 전화 받기
        if ("ANSWER_CALL".equals(getIntent().getAction())) {
            Log.d(TAG, "ANSWER_CALL action received, answering immediately");
            answerCall();
            return;
        }

        // 화면 켜기 및 잠금 해제
        setupScreenWake();

        // 네이티브 레이아웃 사용
        setContentView(R.layout.activity_incoming_call);

        // 튜터 이름 설정
        String tutorName = getIntent().getStringExtra("tutorName");
        if (tutorName == null) tutorName = "AI Tutor";

        TextView nameView = findViewById(R.id.tutorName);
        TextView avatarView = findViewById(R.id.avatarText);

        nameView.setText(tutorName);
        avatarView.setText(String.valueOf(tutorName.charAt(0)).toUpperCase());

        // 버튼 클릭 리스너
        LinearLayout answerButton = findViewById(R.id.answerButton);
        LinearLayout declineButton = findViewById(R.id.declineButton);

        answerButton.setOnClickListener(v -> answerCall());
        declineButton.setOnClickListener(v -> declineCall());

        // 펄스 애니메이션
        startPulseAnimation();

        // 벨소리 및 진동 시작
        startRinging();

        // 30초 후 자동 종료
        handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(this::declineCall, 30000);
    }

    private void setupScreenWake() {
        Log.d(TAG, "Setting up screen wake...");

        // 화면을 켜고 잠금 화면 위에 표시
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);

            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }

        // WakeLock으로 화면 유지
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK |
                PowerManager.ACQUIRE_CAUSES_WAKEUP |
                PowerManager.ON_AFTER_RELEASE,
                "AIEnglishCall::IncomingCallWakeLock"
            );
            wakeLock.acquire(60 * 1000L); // 60초간 유지
            Log.d(TAG, "WakeLock acquired!");
        }
    }

    private void startPulseAnimation() {
        View pulseView = findViewById(R.id.pulseView);
        if (pulseView != null) {
            ScaleAnimation pulse = new ScaleAnimation(
                1f, 1.2f, 1f, 1.2f,
                Animation.RELATIVE_TO_SELF, 0.5f,
                Animation.RELATIVE_TO_SELF, 0.5f
            );
            pulse.setDuration(1000);
            pulse.setRepeatMode(Animation.REVERSE);
            pulse.setRepeatCount(Animation.INFINITE);
            pulseView.startAnimation(pulse);
        }
    }

    private void startRinging() {
        Log.d(TAG, "Starting ringtone and vibration...");

        // 진동 시작
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = vibratorManager.getDefaultVibrator();
        } else {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        }

        if (vibrator != null && vibrator.hasVibrator()) {
            // 전화 벨 패턴: 1초 진동, 1초 쉬고 반복
            long[] pattern = {0, 1000, 1000};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
            Log.d(TAG, "Vibration started!");
        }

        // 벨소리 시작
        try {
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            ringtone = RingtoneManager.getRingtone(this, ringtoneUri);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                ringtone.setLooping(true);
            }

            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                // 볼륨을 적당히 (최대의 70%)
                int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_RING);
                audioManager.setStreamVolume(AudioManager.STREAM_RING, (int)(maxVolume * 0.7), 0);
            }

            ringtone.play();
            Log.d(TAG, "Ringtone started!");
        } catch (Exception e) {
            Log.e(TAG, "Error starting ringtone", e);
        }
    }

    private void cancelNotification() {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
            Log.d(TAG, "Notification cancelled");
        }
    }

    private void stopRinging() {
        isRinging = false;

        if (vibrator != null) {
            vibrator.cancel();
        }

        if (ringtone != null && ringtone.isPlaying()) {
            ringtone.stop();
        }

        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }

        Log.d(TAG, "Ringing stopped!");
    }

    /**
     * 전화 받기 - MainActivity로 이동
     */
    public void answerCall() {
        Log.d(TAG, "Call answered!");
        stopRinging();

        // MainActivity의 /call 경로로 이동
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("route", "/call");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }

    /**
     * 전화 거절
     */
    public void declineCall() {
        Log.d(TAG, "Call declined!");
        stopRinging();
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopRinging();

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    @Override
    public void onBackPressed() {
        // 뒤로가기 버튼으로 거절
        declineCall();
    }
}
