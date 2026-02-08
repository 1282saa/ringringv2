# Phase 12: Learning Cycle (학습 사이클)

**Timeline:** 2026-02-06 ~ 2026-02-07
**Status:** Completed
**Branch:** `main`
**Impact:** 모닝 퀴즈 → AI 수업 → 복습 전화의 완전한 학습 사이클 구현

---

## Overview

사용자가 체계적으로 영어를 학습할 수 있도록 3단계 학습 사이클을 구현했습니다. 아침에 퀴즈로 복습하고, 메인 수업을 진행한 뒤, 저녁에 복습 전화로 마무리하는 완전한 학습 파이프라인입니다.

**Key Objectives:**
- 모닝 퀴즈 페이지 (듣기 4지선다)
- 복습 전화 페이지 (3가지 모드)
- TodayProgress 컴포넌트 (진행률 추적)
- 자동 팝업 시스템 (설정 시간 알림)
- 학습 사이클 유틸리티 (자동 연결)

---

## Implementation Details

### 1. 학습 사이클 유틸리티 (learningCycle.js)

**파일:** `src/utils/learningCycle.js`

```javascript
// 오늘의 학습 진행 상황
export const getTodayProgress = () => {
  const sessions = getFromStorage(STORAGE_KEYS.LEARNING_SESSIONS, [])
  const today = new Date().toDateString()
  const todaySessions = sessions.filter(s => new Date(s.date).toDateString() === today)

  return {
    quizDone: todaySessions.some(s => s.type === 'quiz'),
    callDone: todaySessions.some(s => s.type === 'call'),
    reviewDone: todaySessions.some(s => s.type === 'review'),
    sessions: todaySessions
  }
}

// 퀴즈 결과 저장 → AI 수업 설정 자동 생성
export const saveQuizResult = (quizData) => { ... }

// 수업 결과 저장 → 복습 설정 자동 생성
export const saveCallResult = (callData) => { ... }

// 복습 결과 저장
export const saveReviewResult = (reviewData) => { ... }

// 퀴즈 문제 생성 (전날 약점 기반)
export const generateListeningQuizQuestions = () => { ... }
```

**핵심 기능:**
- 학습 세션 저장/조회 (localStorage)
- 연속 학습 스트릭 계산
- 약점 영역 분석 및 다음 학습에 반영
- 성취도 체크 (7일/14일/30일 연속)

---

### 2. 자동 스케줄러 (featureScheduler.js)

**파일:** `src/utils/featureScheduler.js`

```javascript
// 스케줄 설정 기본값
{
  morningQuizEnabled: true,
  morningQuizTime: '07:00',
  reviewCallEnabled: true,
  reviewCallTime: '20:00'
}

// 자동 스케줄 체크
export const checkAutoSchedule = () => {
  if (shouldShowMorningQuiz()) return 'morningQuiz'
  if (shouldShowReviewCall()) return 'reviewCall'
  return null
}

// 24시간 중복 실행 방지
export const hasExecutedToday = (featureKey) => { ... }

// 시간 범위 체크 (±5분)
export const isTimeInWindow = (settingTime, windowMinutes = 5) => { ... }
```

---

### 3. TodayProgress 컴포넌트

**파일:** `src/components/TodayProgress.jsx`

```jsx
function TodayProgress() {
  const steps = [
    { id: 'quiz', step: 1, label: '퀴즈' },
    { id: 'call', step: 2, label: '수업' },
    { id: 'review', step: 3, label: '복습' }
  ]

  return (
    <div className="today-progress">
      <div className="tp-card">
        <div className="tp-header">
          <h3>오늘의 학습</h3>
          <span>{completedCount}/{steps.length}</span>
        </div>

        <div className="tp-steps">
          {steps.map((step, index) => (
            <button
              className={`tp-step ${step.status}`}
              onClick={() => handleStepClick(step.id)}
            >
              {step.status === 'completed' ? <Check /> : step.step}
              <span>{step.label}</span>
            </button>
          ))}
        </div>

        <div className="tp-progress-bar">
          <div className="tp-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
```

**스타일:** `TodayProgress.css`
- 미니멀 카드 디자인 (border-radius: 16px)
- 스텝 간 연결선 (connector)
- 완료 시 체크마크 표시

---

### 4. 모닝 퀴즈 페이지 (MorningQuiz.jsx)

**파일:** `src/pages/MorningQuiz.jsx`

**퀴즈 흐름:**
1. 문제 표시 (4지선다)
2. 오디오 재생 (정답 문장 TTS)
3. 답 선택 → 정답 확인 (햅틱 피드백)
4. 다음 문제 → 결과 화면
5. "본 수업 시작하기" → /call로 이동

**문제 유형:**
- 현재완료진행형 문법
- 공손한 요청 표현
- 동명사 표현
- 수동태 현재완료
- 비즈니스 마무리 표현
- 동의/사과 표현

```jsx
// 퀴즈 결과 저장 및 수업 연결
const handleStartLesson = () => {
  const autoCallSettings = generateCallSettingsFromQuiz()

  navigate('/call', {
    state: {
      mode: 'main',
      fromQuiz: true,
      focusAreas: autoCallSettings.focus_areas,
      focusIntensity: autoCallSettings.focus_intensity
    }
  })
}
```

---

### 5. 복습 전화 페이지 (ReviewCall.jsx)

**파일:** `src/pages/ReviewCall.jsx`

**3가지 모드:**

| 모드 | 아이콘 | 설명 |
|------|--------|------|
| 문법 교정 | 📝 | AI가 틀린 문장 제시 → 사용자가 교정 |
| 표현 바꿔말하기 | 🔄 | 같은 의미를 다른 표현으로 |
| 자유 대화 | 💬 | AI 튜터와 자유롭게 대화 |

```jsx
const REVIEW_MODES = [
  { id: 'grammar', icon: '📝', title: '문법 교정 연습' },
  { id: 'expression', icon: '🔄', title: '표현 바꿔 말하기' },
  { id: 'free', icon: '💬', title: '자유 대화' }
]

// 모드별 AI 프롬프트
if (selectedMode.id === 'grammar') {
  systemPrompt = `The student is correcting: "${currentPrompt}". Give brief feedback.`
} else if (selectedMode.id === 'expression') {
  systemPrompt = `The student is paraphrasing: "${currentPrompt}". Accept reasonable paraphrases.`
}
```

---

### 6. 자동 팝업 오버레이 (IncomingCallOverlay.jsx)

**파일:** `src/components/IncomingCallOverlay.jsx`

```jsx
function IncomingCallOverlay({ type, onAccept, onDismiss }) {
  const isMorningQuiz = type === 'morningQuiz'

  return (
    <div className="incoming-overlay">
      <div className="incoming-card">
        <div className="incoming-icon">
          {isMorningQuiz ? <Sun size={40} /> : <BookOpen size={40} />}
        </div>
        <h2>{isMorningQuiz ? '모닝 퀴즈 시간!' : '복습 시간이에요'}</h2>
        <button onClick={onAccept}>
          {isMorningQuiz ? '퀴즈 시작' : '복습 시작'}
        </button>
        <button onClick={onDismiss}>나중에</button>
      </div>
    </div>
  )
}
```

---

### 7. Home.jsx 통합

**수정 사항:**
- TodayProgress 컴포넌트 추가 (call 탭)
- 자동 스케줄 체크 (1분 간격)
- IncomingCallOverlay 팝업 통합
- 스케줄 설정 UI (schedule 탭)

```jsx
// 자동 스케줄 체크
useEffect(() => {
  const checkSchedule = () => {
    const featureType = checkAutoSchedule()
    if (featureType && !showAutoPopup) {
      setAutoPopupType(featureType)
      setShowAutoPopup(true)
    }
  }

  checkSchedule()
  const intervalId = setInterval(checkSchedule, 60000)
  return () => clearInterval(intervalId)
}, [showAutoPopup])
```

---

## 라우트 추가 (App.jsx)

```jsx
<Route path="/morning-quiz" element={<ProtectedRoute><MorningQuiz /></ProtectedRoute>} />
<Route path="/review-call" element={<ProtectedRoute><ReviewCall /></ProtectedRoute>} />
```

---

## Storage Keys (constants/index.js)

```javascript
export const STORAGE_KEYS = {
  // 기존 키...
  LEARNING_SESSIONS: 'learningSessions',
  MORNING_QUIZ_RESULTS: 'morningQuizResults',
  REVIEW_RESULTS: 'reviewResults',
  FEATURE_SCHEDULE: 'featureSchedule',
  FEATURE_EXECUTION: 'featureExecution',
  TODAY_PROGRESS: 'todayProgress',
}
```

---

## File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `src/utils/learningCycle.js` | New | 학습 사이클 관리 유틸리티 |
| `src/utils/featureScheduler.js` | New | 자동 스케줄 체커 |
| `src/components/TodayProgress.jsx` | New | 오늘의 학습 진행률 |
| `src/components/TodayProgress.css` | New | 진행률 스타일 |
| `src/components/IncomingCallOverlay.jsx` | New | 자동 팝업 오버레이 |
| `src/components/IncomingCallOverlay.css` | New | 팝업 스타일 |
| `src/pages/MorningQuiz.jsx` | New | 모닝 퀴즈 페이지 |
| `src/pages/MorningQuiz.css` | New | 퀴즈 스타일 |
| `src/pages/ReviewCall.jsx` | New | 복습 전화 페이지 |
| `src/pages/ReviewCall.css` | New | 복습 스타일 |
| `src/pages/Home.jsx` | Modified | TodayProgress, 자동팝업 통합 |
| `src/pages/Home.css` | Modified | 스케줄 설정 UI 스타일 |
| `src/components/index.js` | Modified | 컴포넌트 export 추가 |
| `src/constants/index.js` | Modified | STORAGE_KEYS 추가 |
| `src/App.jsx` | Modified | 라우트 추가 |

---

## 학습 사이클 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                      아침 (07:00)                            │
│                    ┌───────────────┐                         │
│                    │  모닝 퀴즈    │                         │
│                    │  (4지선다)    │                         │
│                    └───────┬───────┘                         │
│                            │                                 │
│                    약점 영역 분석                            │
│                            │                                 │
│                            ▼                                 │
│                    ┌───────────────┐                         │
│                    │   AI 수업     │                         │
│                    │ (약점 집중)   │                         │
│                    └───────┬───────┘                         │
│                            │                                 │
│                    학습 결과 저장                            │
│                            │                                 │
│                            ▼                                 │
│                    ┌───────────────┐                         │
│                    │  복습 전화    │                         │
│                    │ (저녁 20:00)  │                         │
│                    └───────────────┘                         │
│                                                              │
│                     ↻ 다음 날 반복                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

- [x] 모닝 퀴즈 문제 생성 및 표시
- [x] TTS 오디오 재생
- [x] 정답 확인 및 햅틱 피드백
- [x] 퀴즈 결과 저장
- [x] 퀴즈 → 수업 연결 (약점 반영)
- [x] 복습 전화 3가지 모드
- [x] TodayProgress 진행률 표시
- [x] 자동 팝업 (시간 기반)
- [x] 24시간 중복 실행 방지
- [x] 연속 학습 스트릭 계산

---

## Next Steps

- Phase 13: 음성 클로닝 (ElevenLabs)
- Phase 14: 구글 캘린더 연동
- Phase 15: 크로스 세션 메모리

---

## References

- [Phase 11: Native Call Scheduling](PHASE-11-native-call-scheduling.md)
- [Ringle_ver1 learningCycle.js 참고](/tmp/Ringle_ver1/)

---

*Last Updated: 2026-02-08*
