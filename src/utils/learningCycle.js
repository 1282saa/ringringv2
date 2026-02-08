/**
 * @file utils/learningCycle.js
 * @description 학습 사이클 관리 유틸리티
 *
 * 흐름: 모닝퀴즈 → AI 수업 → 복습 → 다음 모닝퀴즈
 */

import { getFromStorage, setToStorage } from './helpers'
import { STORAGE_KEYS } from '../constants'

// ============================================
// 학습 사이클 상태 관리
// ============================================

/**
 * 오늘의 학습 진행 상황 가져오기
 */
export const getTodayProgress = () => {
  const sessions = getFromStorage(STORAGE_KEYS.LEARNING_SESSIONS, [])
  const today = new Date().toDateString()

  const todaySessions = sessions.filter(
    s => new Date(s.date).toDateString() === today
  )

  return {
    quizDone: todaySessions.some(s => s.type === 'quiz'),
    callDone: todaySessions.some(s => s.type === 'call'),
    reviewDone: todaySessions.some(s => s.type === 'review'),
    sessions: todaySessions
  }
}

/**
 * 학습 스트릭 계산
 */
export const calculateStreak = () => {
  const sessions = getFromStorage(STORAGE_KEYS.LEARNING_SESSIONS, [])

  if (sessions.length === 0) return 0

  let streak = 0
  let currentDate = new Date()

  while (true) {
    const dateStr = currentDate.toDateString()
    const hasSession = sessions.some(s => new Date(s.date).toDateString() === dateStr)

    if (!hasSession) {
      // 오늘인 경우 아직 안했을 수 있으므로 계속
      if (dateStr === new Date().toDateString()) {
        currentDate.setDate(currentDate.getDate() - 1)
        continue
      }
      break
    }

    streak++
    currentDate.setDate(currentDate.getDate() - 1)
  }

  return streak
}

/**
 * 학습 세션 저장
 */
export const saveLearningSession = (sessionId, data) => {
  const sessions = getFromStorage(STORAGE_KEYS.LEARNING_SESSIONS, [])

  const newSession = {
    sessionId,
    date: new Date().toISOString(),
    type: data.type, // 'quiz' | 'call' | 'review'
    score: data.score,
    weakPoints: data.weakPoints || [],
    focusExpressions: data.focusExpressions || []
  }

  sessions.push(newSession)
  setToStorage(STORAGE_KEYS.LEARNING_SESSIONS, sessions.slice(-100)) // 최근 100개 유지

  // 커스텀 이벤트 발생 (TodayProgress 컴포넌트 업데이트용)
  window.dispatchEvent(new CustomEvent('learning-session-updated'))

  console.log('[LearningCycle] Session saved:', newSession.type)
  return newSession
}

// ============================================
// 모닝 퀴즈 관련
// ============================================

/**
 * 퀴즈 결과 저장 → AI 수업 설정 자동 생성
 */
export const saveQuizResult = (quizData) => {
  const results = getFromStorage(STORAGE_KEYS.MORNING_QUIZ_RESULTS, [])

  // 약점 영역 분석
  const weakAreas = []
  const questions = quizData.questions || []

  questions.forEach((q, idx) => {
    if (!quizData.correct_answers?.[idx]) {
      weakAreas.push(q.focus || q.type || 'general')
    }
  })

  const result = {
    id: `quiz_${Date.now()}`,
    date: new Date().toISOString(),
    weak_areas: [...new Set(weakAreas)],
    total_accuracy: quizData.total_accuracy || 0,
    response_times: quizData.response_times || [],
    avg_response_time: quizData.avg_response_time || 0,
    correct_count: quizData.correct_count || 0,
    total_count: quizData.total_count || questions.length,
    questions
  }

  results.push(result)
  setToStorage(STORAGE_KEYS.MORNING_QUIZ_RESULTS, results.slice(-30))

  // 학습 세션에도 저장
  saveLearningSession(result.id, {
    type: 'quiz',
    score: result.total_accuracy,
    weakPoints: result.weak_areas.map(area => ({ type: area }))
  })

  console.log('[LearningCycle] Quiz result saved:', {
    accuracy: `${result.total_accuracy.toFixed(1)}%`,
    weak_areas: result.weak_areas
  })

  return result
}

/**
 * 퀴즈 결과 기반 AI 수업 설정 생성
 */
export const generateCallSettingsFromQuiz = () => {
  const results = getFromStorage(STORAGE_KEYS.MORNING_QUIZ_RESULTS, [])
  const lastResult = results[results.length - 1]

  if (!lastResult) {
    return {
      focus_areas: [],
      focus_intensity: 50,
      mode: 'general'
    }
  }

  const focusIntensity = Math.max(30, 100 - (lastResult.total_accuracy || 50))

  return {
    focus_areas: lastResult.weak_areas || [],
    focus_intensity: focusIntensity,
    mode: lastResult.weak_areas?.length > 0 ? 'focused' : 'general',
    quiz_accuracy: lastResult.total_accuracy,
    from_quiz_id: lastResult.id
  }
}

// ============================================
// AI 수업 관련
// ============================================

/**
 * AI 수업 결과 저장 → 복습 설정 자동 생성
 */
export const saveCallResult = (callData) => {
  const sessionId = callData.session_id || `call_${Date.now()}`

  saveLearningSession(sessionId, {
    type: 'call',
    score: callData.accuracy || 70,
    weakPoints: callData.weak_points || [],
    focusExpressions: callData.expressions || []
  })

  console.log('[LearningCycle] Call result saved')
  return { id: sessionId }
}

/**
 * 수업 결과 기반 복습 설정 생성
 */
export const generateReviewSettingsFromCall = () => {
  const sessions = getFromStorage(STORAGE_KEYS.LEARNING_SESSIONS, [])
  const lastCall = sessions.filter(s => s.type === 'call').pop()

  if (!lastCall) {
    return {
      priorities: [],
      mode: 'general',
      intensity: 'medium'
    }
  }

  return {
    priorities: lastCall.weakPoints || [],
    mode: lastCall.weakPoints?.length > 0 ? 'intensive' : 'maintenance',
    intensity: 'medium'
  }
}

// ============================================
// 복습 관련
// ============================================

/**
 * 복습 결과 저장
 */
export const saveReviewResult = (reviewData) => {
  const results = getFromStorage(STORAGE_KEYS.REVIEW_RESULTS, [])

  const result = {
    id: `review_${Date.now()}`,
    date: new Date().toISOString(),
    mode: reviewData.mode || 'free',
    retention_rate: reviewData.retention_rate || 80,
    practice_count: reviewData.practice_count || 0
  }

  results.push(result)
  setToStorage(STORAGE_KEYS.REVIEW_RESULTS, results.slice(-30))

  // 학습 세션에도 저장
  saveLearningSession(result.id, {
    type: 'review',
    score: result.retention_rate
  })

  console.log('[LearningCycle] Review result saved')
  return result
}

// ============================================
// 퀴즈 문제 생성
// ============================================

/**
 * 전날 대화 기록에서 개선 필요한 문장들 가져오기
 */
const getImprovementSentences = () => {
  // 실제로는 AI 분석 결과에서 추출, 여기서는 샘플 데이터 사용
  const sampleSentences = [
    {
      correct: "I've been working on this project for two weeks.",
      wrong: ["I working on this project for two weeks.", "I have work on this project for two weeks.", "I been working on this project for two weeks."],
      focus: "현재완료진행형",
      type: "grammar"
    },
    {
      correct: "Could you please send me the report?",
      wrong: ["Can you send me the report please?", "Please you send me the report?", "Send me the report could you?"],
      focus: "공손한 요청 표현",
      type: "expression"
    },
    {
      correct: "I'm looking forward to meeting you.",
      wrong: ["I look forward to meet you.", "I'm looking forward to meet you.", "I look forward meeting you."],
      focus: "to + 동명사 표현",
      type: "grammar"
    },
    {
      correct: "The meeting has been postponed until Friday.",
      wrong: ["The meeting postponed until Friday.", "The meeting is postpone until Friday.", "Meeting has been postpone until Friday."],
      focus: "수동태 현재완료",
      type: "grammar"
    },
    {
      correct: "I would appreciate it if you could help me.",
      wrong: ["I appreciate if you help me.", "I would appreciate you help me.", "I appreciate it you could help me."],
      focus: "가정법 공손 표현",
      type: "expression"
    },
    {
      correct: "Let me know if you have any questions.",
      wrong: ["Let me know if you have question.", "Let know me if you have any questions.", "Let me knowing if you have questions."],
      focus: "비즈니스 마무리 표현",
      type: "expression"
    },
    {
      correct: "That sounds like a great idea!",
      wrong: ["That sound like great idea!", "That's sounds like a great idea!", "That sounding like a great idea!"],
      focus: "동의 표현",
      type: "expression"
    },
    {
      correct: "I'm sorry for the inconvenience.",
      wrong: ["I sorry for inconvenience.", "I'm sorry the inconvenience.", "Sorry for inconvenient."],
      focus: "사과 표현",
      type: "expression"
    }
  ]

  // 랜덤하게 4개 선택
  return sampleSentences.sort(() => Math.random() - 0.5).slice(0, 4)
}

/**
 * 듣기 퀴즈용 문제 생성
 */
export const generateListeningQuizQuestions = () => {
  const sentences = getImprovementSentences()

  return sentences.map((item, idx) => {
    // 정답을 랜덤 위치에 배치
    const correctIndex = Math.floor(Math.random() * 4)
    const options = [...item.wrong]
    options.splice(correctIndex, 0, item.correct)

    return {
      id: idx + 1,
      text: item.correct, // TTS로 재생될 정답 문장
      question: "다음 문장 중 올바른 것은?",
      focus: item.focus,
      type: item.type,
      options,
      correctIndex
    }
  })
}

/**
 * 맞춤 퀴즈 구성
 */
export const buildPersonalizedQuiz = () => {
  const questions = generateListeningQuizQuestions()
  const quizResults = getFromStorage(STORAGE_KEYS.MORNING_QUIZ_RESULTS, [])
  const lastResult = quizResults[quizResults.length - 1]

  return {
    questions,
    metadata: {
      yesterdayScore: lastResult?.total_accuracy || null,
      weakPointCount: lastResult?.weak_areas?.length || 0
    }
  }
}

// ============================================
// 통계 및 유틸리티
// ============================================

/**
 * 학습 통계
 */
export const getLearningStats = () => {
  const sessions = getFromStorage(STORAGE_KEYS.LEARNING_SESSIONS, [])

  return {
    totalSessions: sessions.length,
    quizSessions: sessions.filter(s => s.type === 'quiz').length,
    callSessions: sessions.filter(s => s.type === 'call').length,
    reviewSessions: sessions.filter(s => s.type === 'review').length,
    averageScore: sessions.length > 0
      ? sessions.reduce((acc, s) => acc + (s.score || 0), 0) / sessions.length
      : 0,
    streak: calculateStreak()
  }
}

/**
 * 성취도 체크
 */
export const checkAchievements = () => {
  const sessions = getFromStorage(STORAGE_KEYS.LEARNING_SESSIONS, [])
  const today = new Date().toDateString()
  const todaySessions = sessions.filter(s => new Date(s.date).toDateString() === today)
  const achievements = []

  // 오늘의 모든 학습 완료
  if (todaySessions.some(s => s.type === 'quiz') &&
      todaySessions.some(s => s.type === 'call') &&
      todaySessions.some(s => s.type === 'review')) {
    achievements.push('COMPLETE_CYCLE')
  }

  // 연속 학습
  const streak = calculateStreak()
  if (streak >= 7) achievements.push('STREAK_7')
  if (streak >= 14) achievements.push('STREAK_14')
  if (streak >= 30) achievements.push('STREAK_30')

  return achievements
}

export default {
  getTodayProgress,
  calculateStreak,
  saveLearningSession,
  saveQuizResult,
  saveCallResult,
  saveReviewResult,
  generateCallSettingsFromQuiz,
  generateReviewSettingsFromCall,
  generateListeningQuizQuestions,
  buildPersonalizedQuiz,
  getLearningStats,
  checkAchievements
}
