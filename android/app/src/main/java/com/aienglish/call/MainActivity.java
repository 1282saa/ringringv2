package com.aienglish.call;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // CallScheduler 플러그인 등록
        registerPlugin(CallSchedulerPlugin.class);

        super.onCreate(savedInstanceState);

        // Intent에서 route 확인 (IncomingCallActivity에서 전달)
        handleIncomingRoute(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIncomingRoute(intent);
    }

    private void handleIncomingRoute(Intent intent) {
        if (intent == null) return;

        String route = intent.getStringExtra("route");
        if (route != null && route.equals("/call")) {
            Log.d(TAG, "Navigating to /call from incoming call");

            // WebView가 준비된 후 라우팅
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    // localStorage에 플래그 저장 + 페이지 이동
                    String js = "localStorage.setItem('navigateToCall', 'true'); " +
                                "window.location.href = '/call';";
                    getBridge().getWebView().evaluateJavascript(js, null);
                    Log.d(TAG, "JavaScript executed for /call navigation");
                }
            }, 500); // 500ms 딜레이로 WebView 준비 대기
        }
    }
}
