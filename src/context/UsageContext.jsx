/**
 * @file context/UsageContext.jsx
 * @description 사용량 제한 관리 Context
 *
 * 기능:
 * - 일일 사용량 조회 및 캐싱
 * - 사용량 제한 체크
 * - 플랜별 제한 정보 제공
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getUsage, checkUsageLimit, USAGE_LIMITS } from '../utils/api'
import { cognitoService } from '../auth'

// Context 생성
const UsageContext = createContext(null)

/**
 * 사용량 관리 Provider
 */
export function UsageProvider({ children }) {
  // 사용량 상태
  const [usage, setUsage] = useState({
    plan: 'free',
    chatCount: 0,
    ttsCount: 0,
    analyzeCount: 0,
    resetTime: null,
    loading: true,
    error: null,
  })

  // 업그레이드 모달 상태
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [limitType, setLimitType] = useState(null) // 어떤 제한에 걸렸는지

  /**
   * 사용량 정보 로드
   */
  const loadUsage = useCallback(async () => {
    // 로그인하지 않은 경우 무료 플랜 기본값 사용
    if (!cognitoService.isAuthenticated()) {
      setUsage(prev => ({
        ...prev,
        plan: 'free',
        loading: false,
      }))
      return
    }

    try {
      setUsage(prev => ({ ...prev, loading: true, error: null }))
      const data = await getUsage()

      setUsage({
        plan: data.plan || 'free',
        chatCount: data.chatCount || 0,
        ttsCount: data.ttsCount || 0,
        analyzeCount: data.analyzeCount || 0,
        resetTime: data.resetTime,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('[UsageContext] Failed to load usage:', error)
      setUsage(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }))
    }
  }, [])

  // 앱 시작 및 인증 상태 변경 시 사용량 로드
  useEffect(() => {
    loadUsage()
  }, [loadUsage])

  /**
   * 현재 플랜의 제한 정보 가져오기
   */
  const getLimits = useCallback(() => {
    return USAGE_LIMITS[usage.plan] || USAGE_LIMITS.free
  }, [usage.plan])

  /**
   * 특정 타입의 남은 횟수 계산
   * @param {string} type - 'chat' | 'tts' | 'analyze'
   * @returns {number} 남은 횟수 (-1이면 무제한)
   */
  const getRemaining = useCallback((type) => {
    const limits = getLimits()

    switch (type) {
      case 'chat': {
        if (limits.dailyChatCount === -1) return -1
        return Math.max(0, limits.dailyChatCount - usage.chatCount)
      }
      case 'tts': {
        if (limits.dailyTtsCount === -1) return -1
        return Math.max(0, limits.dailyTtsCount - usage.ttsCount)
      }
      case 'analyze': {
        if (limits.dailyAnalyzeCount === -1) return -1
        return Math.max(0, limits.dailyAnalyzeCount - usage.analyzeCount)
      }
      default:
        return 0
    }
  }, [usage, getLimits])

  /**
   * 사용 가능 여부 확인
   * @param {string} type - 'chat' | 'tts' | 'analyze'
   * @returns {boolean}
   */
  const canUse = useCallback((type) => {
    const remaining = getRemaining(type)
    return remaining === -1 || remaining > 0
  }, [getRemaining])

  /**
   * 사용량 제한 체크 및 모달 표시
   * API 호출 전에 호출하여 제한 초과 시 모달 표시
   *
   * @param {string} type - 'chat' | 'tts' | 'analyze'
   * @returns {boolean} 사용 가능 여부
   */
  const checkAndShowLimit = useCallback((type) => {
    if (canUse(type)) {
      return true
    }

    // 제한 초과 시 모달 표시
    setLimitType(type)
    setShowUpgradeModal(true)
    return false
  }, [canUse])

  /**
   * 로컬 사용량 증가 (API 호출 성공 후 호출)
   * @param {string} type - 'chat' | 'tts' | 'analyze'
   */
  const incrementLocal = useCallback((type) => {
    setUsage(prev => {
      switch (type) {
        case 'chat':
          return { ...prev, chatCount: prev.chatCount + 1 }
        case 'tts':
          return { ...prev, ttsCount: prev.ttsCount + 1 }
        case 'analyze':
          return { ...prev, analyzeCount: prev.analyzeCount + 1 }
        default:
          return prev
      }
    })
  }, [])

  /**
   * 업그레이드 모달 닫기
   */
  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false)
    setLimitType(null)
  }, [])

  /**
   * 플랜 업그레이드 후 사용량 새로고침
   */
  const onUpgradeSuccess = useCallback(async (newPlan) => {
    setUsage(prev => ({ ...prev, plan: newPlan }))
    closeUpgradeModal()
    await loadUsage()
  }, [closeUpgradeModal, loadUsage])

  // Context 값
  const value = {
    // 상태
    usage,
    showUpgradeModal,
    limitType,

    // 계산된 값
    limits: getLimits(),
    isUnlimited: usage.plan === 'premium',

    // 함수
    loadUsage,
    getRemaining,
    canUse,
    checkAndShowLimit,
    incrementLocal,
    closeUpgradeModal,
    onUpgradeSuccess,
  }

  return (
    <UsageContext.Provider value={value}>
      {children}
    </UsageContext.Provider>
  )
}

/**
 * 사용량 Context 사용 Hook
 * @returns {Object} 사용량 상태 및 함수
 */
export function useUsage() {
  const context = useContext(UsageContext)
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider')
  }
  return context
}

export default UsageContext
