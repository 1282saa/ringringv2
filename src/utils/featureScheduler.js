/**
 * @file utils/featureScheduler.js
 * @description 모닝 퀴즈, 복습 전화 자동 스케줄링
 */

import { getFromStorage, setToStorage } from './helpers'
import { STORAGE_KEYS } from '../constants'

/**
 * 현재 시간이 설정된 시간과 일치하는지 확인
 * @param {string} settingTime - "HH:MM" 형식의 시간 (예: "07:00")
 * @param {number} windowMinutes - 허용 시간 범위 (분 단위, 기본값: 5분)
 * @returns {boolean} 현재 시간이 범위 내인지 여부
 */
export const isTimeInWindow = (settingTime, windowMinutes = 5) => {
  if (!settingTime) return false

  const now = new Date()
  const [settingHour, settingMinute] = settingTime.split(':').map(Number)
  const settingDate = new Date()
  settingDate.setHours(settingHour, settingMinute, 0, 0)

  const timeDiff = Math.abs(now - settingDate)
  const differenceInMinutes = timeDiff / (1000 * 60)

  return differenceInMinutes <= windowMinutes
}

/**
 * 마지막 실행 시간 저장 (24시간 중복 실행 방지)
 * @param {string} featureKey - 기능 키 (예: "morningQuiz", "reviewCall")
 */
export const saveLastExecutionTime = (featureKey) => {
  const executions = getFromStorage(STORAGE_KEYS.FEATURE_EXECUTION, {})
  executions[featureKey] = new Date().toISOString()
  setToStorage(STORAGE_KEYS.FEATURE_EXECUTION, executions)
}

/**
 * 24시간 이내에 이미 실행되었는지 확인
 * @param {string} featureKey - 기능 키
 * @returns {boolean} 24시간 이내 실행 여부
 */
export const hasExecutedToday = (featureKey) => {
  const executions = getFromStorage(STORAGE_KEYS.FEATURE_EXECUTION, {})
  const lastExecution = executions[featureKey]

  if (!lastExecution) return false

  const lastExecutionTime = new Date(lastExecution)
  const now = new Date()
  const hoursDiff = (now - lastExecutionTime) / (1000 * 60 * 60)

  return hoursDiff < 24
}

/**
 * 스케줄 설정 가져오기
 */
export const getScheduleSettings = () => {
  return getFromStorage(STORAGE_KEYS.FEATURE_SCHEDULE, {
    morningQuizEnabled: true,
    morningQuizTime: '07:00',
    reviewCallEnabled: true,
    reviewCallTime: '20:00'
  })
}

/**
 * 스케줄 설정 저장
 */
export const saveScheduleSettings = (settings) => {
  const current = getScheduleSettings()
  const newSettings = { ...current, ...settings }
  setToStorage(STORAGE_KEYS.FEATURE_SCHEDULE, newSettings)
  return newSettings
}

/**
 * 모닝 퀴즈 자동 실행 확인
 * @returns {boolean} 실행 조건 충족 여부
 */
export const shouldShowMorningQuiz = () => {
  const settings = getScheduleSettings()
  const hasRun = hasExecutedToday('morningQuiz')

  return settings.morningQuizEnabled && !hasRun && isTimeInWindow(settings.morningQuizTime)
}

/**
 * 복습 전화 자동 실행 확인
 * @returns {boolean} 실행 조건 충족 여부
 */
export const shouldShowReviewCall = () => {
  const settings = getScheduleSettings()
  const hasRun = hasExecutedToday('reviewCall')

  return settings.reviewCallEnabled && !hasRun && isTimeInWindow(settings.reviewCallTime)
}

/**
 * 자동 스케줄 체크 (모든 기능)
 * @returns {string|null} 표시할 팝업 타입 ('morningQuiz' | 'reviewCall' | null)
 */
export const checkAutoSchedule = () => {
  // 모닝 퀴즈 우선
  if (shouldShowMorningQuiz()) {
    return 'morningQuiz'
  }

  // 복습 전화
  if (shouldShowReviewCall()) {
    return 'reviewCall'
  }

  return null
}

/**
 * 기능별 자동 라우팅 함수
 * @param {Function} navigate - React Router navigate 함수
 * @param {string} featureType - 기능 타입 ('morningQuiz' | 'reviewCall')
 */
export const navigateToFeature = (navigate, featureType) => {
  switch (featureType) {
    case 'morningQuiz':
      saveLastExecutionTime('morningQuiz')
      navigate('/morning-quiz')
      break
    case 'reviewCall':
      saveLastExecutionTime('reviewCall')
      navigate('/review-call')
      break
    default:
      break
  }
}

/**
 * 자동 팝업 표시 필요 여부 (일정 간격으로 체크)
 * @param {number} checkIntervalMs - 체크 간격 (밀리초, 기본값: 1분)
 * @returns {Object} 체크 함수
 */
export const createAutoScheduleChecker = (checkIntervalMs = 60000) => {
  return {
    start: (onScheduleDetected) => {
      // 초기 체크
      const initialCheck = checkAutoSchedule()
      if (initialCheck) {
        onScheduleDetected(initialCheck)
      }

      // 주기적 체크
      const intervalId = setInterval(() => {
        const featureType = checkAutoSchedule()
        if (featureType) {
          onScheduleDetected(featureType)
        }
      }, checkIntervalMs)

      return () => clearInterval(intervalId)
    }
  }
}

export default {
  isTimeInWindow,
  saveLastExecutionTime,
  hasExecutedToday,
  getScheduleSettings,
  saveScheduleSettings,
  shouldShowMorningQuiz,
  shouldShowReviewCall,
  checkAutoSchedule,
  navigateToFeature,
  createAutoScheduleChecker
}
