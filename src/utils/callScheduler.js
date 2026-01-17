/**
 * @file utils/callScheduler.js
 * @description 네이티브 전화 예약 플러그인 인터페이스
 * Android에서 Foreground Service + AlarmManager를 통해 전화 예약
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

// 네이티브 플러그인 등록
const CallScheduler = registerPlugin('CallScheduler');

/**
 * 플랫폼 체크
 */
export const isAndroid = () => Capacitor.getPlatform() === 'android';

/**
 * 권한 상태 확인
 * @returns {Promise<{exactAlarm: boolean, batteryOptimization: boolean, allGranted: boolean}>}
 */
export async function checkPermissions() {
  if (!isAndroid()) {
    return { exactAlarm: true, batteryOptimization: true, allGranted: true };
  }

  try {
    const result = await CallScheduler.checkPermissions();
    console.log('[CallScheduler] Permissions:', result);
    return result;
  } catch (error) {
    console.error('[CallScheduler] Error checking permissions:', error);
    return { exactAlarm: false, batteryOptimization: false, allGranted: false };
  }
}

/**
 * 정확한 알람 권한 요청 (설정 화면으로 이동)
 */
export async function requestExactAlarmPermission() {
  if (!isAndroid()) return;

  try {
    await CallScheduler.requestExactAlarmPermission();
    console.log('[CallScheduler] Exact alarm permission requested');
  } catch (error) {
    console.error('[CallScheduler] Error requesting exact alarm permission:', error);
    throw error;
  }
}

/**
 * 배터리 최적화 제외 요청
 */
export async function requestBatteryOptimizationExemption() {
  if (!isAndroid()) return;

  try {
    await CallScheduler.requestBatteryOptimizationExemption();
    console.log('[CallScheduler] Battery optimization exemption requested');
  } catch (error) {
    console.error('[CallScheduler] Error requesting battery optimization exemption:', error);
    throw error;
  }
}

/**
 * 모든 필요한 권한 확인 및 요청
 * @returns {Promise<boolean>} 모든 권한이 허용되었는지
 */
export async function ensurePermissions() {
  if (!isAndroid()) return true;

  const permissions = await checkPermissions();

  if (permissions.allGranted) {
    console.log('[CallScheduler] All permissions granted');
    return true;
  }

  // 정확한 알람 권한 요청
  if (!permissions.exactAlarm) {
    console.log('[CallScheduler] Requesting exact alarm permission...');
    await requestExactAlarmPermission();
    // 설정 화면으로 이동하므로 여기서 false 반환
    return false;
  }

  // 배터리 최적화 제외 요청
  if (!permissions.batteryOptimization) {
    console.log('[CallScheduler] Requesting battery optimization exemption...');
    await requestBatteryOptimizationExemption();
    // 다이얼로그가 뜨므로 여기서 false 반환
    return false;
  }

  return true;
}

/**
 * 테스트: N초 후 전화 오기
 * 화면이 꺼져있어도 전화 수신 화면이 자동으로 뜸
 * @param {number} delaySeconds - 몇 초 후에 전화가 올지
 * @param {string} tutorName - 튜터 이름
 */
export async function scheduleTestCall(delaySeconds = 5, tutorName = 'AI Tutor') {
  if (!isAndroid()) {
    console.log('[CallScheduler] Not Android, using web fallback');
    // 웹에서는 setTimeout으로 대체
    setTimeout(() => {
      window.location.href = '/incoming-call';
    }, delaySeconds * 1000);
    return { scheduled: true, web: true };
  }

  try {
    const result = await CallScheduler.scheduleTestCall({
      delaySeconds,
      tutorName
    });
    console.log('[CallScheduler] Test call scheduled:', result);
    return result;
  } catch (error) {
    console.error('[CallScheduler] Error scheduling test call:', error);
    throw error;
  }
}

/**
 * 특정 시간에 전화 예약
 * @param {Date} triggerDate - 전화가 올 시간
 * @param {string} tutorName - 튜터 이름
 * @param {number} requestCode - 알람 식별자 (취소 시 필요)
 */
export async function scheduleCall(triggerDate, tutorName = 'AI Tutor', requestCode = 0) {
  if (!isAndroid()) {
    console.log('[CallScheduler] Not Android, cannot schedule');
    return { scheduled: false, reason: 'Not Android' };
  }

  try {
    const result = await CallScheduler.scheduleCall({
      triggerTime: triggerDate.getTime(),
      tutorName,
      requestCode
    });
    console.log('[CallScheduler] Call scheduled:', result);
    return result;
  } catch (error) {
    console.error('[CallScheduler] Error scheduling call:', error);
    throw error;
  }
}

/**
 * 예약된 전화 취소
 * @param {number} requestCode - 알람 식별자
 */
export async function cancelCall(requestCode) {
  if (!isAndroid()) {
    return { cancelled: false, reason: 'Not Android' };
  }

  try {
    const result = await CallScheduler.cancelCall({ requestCode });
    console.log('[CallScheduler] Call cancelled:', result);
    return result;
  } catch (error) {
    console.error('[CallScheduler] Error cancelling call:', error);
    throw error;
  }
}

/**
 * 즉시 전화 화면 띄우기 (테스트용)
 * @param {string} tutorName - 튜터 이름
 */
export async function triggerCallNow(tutorName = 'AI Tutor') {
  if (!isAndroid()) {
    window.location.href = '/incoming-call';
    return { triggered: true, web: true };
  }

  try {
    const result = await CallScheduler.triggerCallNow({ tutorName });
    console.log('[CallScheduler] Call triggered:', result);
    return result;
  } catch (error) {
    console.error('[CallScheduler] Error triggering call:', error);
    throw error;
  }
}

export default {
  scheduleTestCall,
  scheduleCall,
  cancelCall,
  triggerCallNow,
  checkPermissions,
  requestExactAlarmPermission,
  requestBatteryOptimizationExemption,
  ensurePermissions,
  isAndroid
};
