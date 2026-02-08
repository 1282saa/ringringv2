# Phase 14: Google Calendar Integration (구글 캘린더 연동)

**Timeline:** 2026-02-08
**Status:** Completed
**Branch:** `main`
**Impact:** 학습 완료 시 Google Calendar에 자동 기록

---

## Overview

학습 완료 시 Google Calendar에 자동으로 일정을 추가하여 학습 기록을 관리할 수 있도록 했습니다. OAuth 2.0 인증을 통해 사용자의 캘린더에 접근합니다.

**Key Objectives:**
- Google OAuth 2.0 인증
- Google Calendar API 연동
- 학습 완료 시 자동 일정 추가
- Settings에서 연결 관리

---

## Implementation Details

### 1. Google Calendar 유틸리티

**파일:** `src/utils/googleCalendar.js`

```javascript
const SCOPES = 'https://www.googleapis.com/auth/calendar.events'

let tokenClient = null
let accessToken = null

/**
 * Google Identity Services 초기화
 */
export const initGoogleCalendar = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            accessToken = response.access_token
            localStorage.setItem('google_calendar_token', accessToken)
          }
        }
      })
      resolve(true)
    }
    document.head.appendChild(script)
  })
}

/**
 * Google Calendar 연결
 */
export const connectGoogleCalendar = async () => {
  if (!tokenClient) {
    await initGoogleCalendar()
  }

  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response.error) {
        reject(response.error)
      } else {
        accessToken = response.access_token
        localStorage.setItem('google_calendar_token', accessToken)
        localStorage.setItem('google_calendar_connected', 'true')
        resolve(true)
      }
    }
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

/**
 * 연결 해제
 */
export const disconnectGoogleCalendar = () => {
  accessToken = null
  localStorage.removeItem('google_calendar_token')
  localStorage.removeItem('google_calendar_connected')
}

/**
 * 연결 상태 확인
 */
export const isGoogleCalendarConnected = () => {
  return localStorage.getItem('google_calendar_connected') === 'true'
}

/**
 * 학습 완료 일정 추가
 */
export const addCompletedLearningEvent = async (type, durationMinutes) => {
  const token = localStorage.getItem('google_calendar_token')
  if (!token) return { success: false, error: 'Not connected' }

  const now = new Date()
  const endTime = new Date(now.getTime() + durationMinutes * 60000)

  const titles = {
    quiz: '🌅 모닝 퀴즈 완료',
    call: '📞 AI 영어 수업 완료',
    review: '💪 복습 전화 완료'
  }

  const event = {
    summary: titles[type] || '📚 영어 학습 완료',
    description: `Ringle AI English Learning\n학습 시간: ${durationMinutes}분`,
    start: {
      dateTime: now.toISOString(),
      timeZone: 'Asia/Seoul'
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Asia/Seoul'
    },
    colorId: type === 'quiz' ? '5' : type === 'call' ? '1' : '2'
  }

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }
  )

  if (!response.ok) {
    const error = await response.json()
    return { success: false, error: error.error?.message }
  }

  return { success: true, event: await response.json() }
}
```

---

### 2. GoogleCalendarSection 컴포넌트

**파일:** `src/components/GoogleCalendarSection.jsx`

```jsx
import { useState, useEffect } from 'react'
import { Calendar, Check, X, Loader } from 'lucide-react'
import {
  initGoogleCalendar,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  isGoogleCalendarConnected
} from '../utils/googleCalendar'
import { haptic } from '../utils/capacitor'
import './GoogleCalendarSection.css'

function GoogleCalendarSection() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsConnected(isGoogleCalendarConnected())
    initGoogleCalendar()
  }, [])

  const handleConnect = async () => {
    haptic.medium()
    setIsLoading(true)

    try {
      await connectGoogleCalendar()
      setIsConnected(true)
    } catch (error) {
      console.error('Calendar connect error:', error)
      alert('캘린더 연결에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    haptic.light()
    disconnectGoogleCalendar()
    setIsConnected(false)
  }

  return (
    <div className="calendar-section">
      <div className="calendar-header">
        <Calendar size={20} />
        <span>Google 캘린더</span>
      </div>

      {isConnected ? (
        <div className="calendar-connected">
          <div className="calendar-status">
            <Check size={16} className="status-icon connected" />
            <span>연결됨</span>
          </div>
          <button className="calendar-disconnect-btn" onClick={handleDisconnect}>
            연결 해제
          </button>
        </div>
      ) : (
        <button
          className="calendar-connect-btn"
          onClick={handleConnect}
          disabled={isLoading}
        >
          {isLoading ? <Loader className="spinner" /> : '캘린더 연결하기'}
        </button>
      )}

      <div className="calendar-features">
        <p>• 학습 완료 시 자동 기록</p>
        <p>• 모닝 퀴즈, AI 수업, 복습 기록</p>
      </div>
    </div>
  )
}

export default GoogleCalendarSection
```

---

### 3. Result.jsx에서 자동 기록

**파일:** `src/pages/Result.jsx`

```jsx
import { isGoogleCalendarConnected, addCompletedLearningEvent } from '../utils/googleCalendar'

function Result() {
  const { result, duration } = location.state || {}

  useEffect(() => {
    // Google Calendar 연결 시 학습 기록 추가
    const addCalendarEvent = async () => {
      if (isGoogleCalendarConnected() && result) {
        try {
          const durationMinutes = Math.round(duration / 60)
          await addCompletedLearningEvent('call', durationMinutes)
          console.log('[Calendar] Learning event added')
        } catch (error) {
          console.error('[Calendar] Failed to add event:', error)
        }
      }
    }

    addCalendarEvent()
  }, [result, duration])

  // ... 나머지 컴포넌트
}
```

---

### 4. Settings.jsx 통합

**파일:** `src/pages/Settings.jsx`

```jsx
import GoogleCalendarSection from '../components/GoogleCalendarSection'

function Settings() {
  return (
    <div className="settings-page">
      {/* 다른 설정들... */}

      <section className="settings-section">
        <h2>외부 서비스 연동</h2>
        <GoogleCalendarSection />
      </section>
    </div>
  )
}
```

---

### 5. 환경 변수

**파일:** `.env`

```env
VITE_GOOGLE_CLIENT_ID=408302746123-0585sblnrcitj3cvusqderegoo6s0gji.apps.googleusercontent.com
```

---

## Google Cloud Console 설정

### 1. OAuth 동의 화면

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. "API 및 서비스" → "OAuth 동의 화면"
3. 사용자 유형: "외부" 선택
4. 앱 이름, 이메일 등 입력
5. 범위 추가: `https://www.googleapis.com/auth/calendar.events`
6. **대상** → **앱 게시** (프로덕션 전환)

### 2. OAuth 클라이언트 ID

1. "사용자 인증 정보" → "OAuth 클라이언트 ID 만들기"
2. 애플리케이션 유형: "웹 애플리케이션"
3. 승인된 JavaScript 원본:
   - `http://localhost:5173`
   - `https://d3pw62uy753kuv.cloudfront.net`
4. 클라이언트 ID 복사 → `.env`에 추가

---

## File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `src/utils/googleCalendar.js` | New | Google Calendar API 유틸리티 |
| `src/components/GoogleCalendarSection.jsx` | New | 캘린더 연결 UI |
| `src/components/GoogleCalendarSection.css` | New | 캘린더 섹션 스타일 |
| `src/pages/Settings.jsx` | Modified | GoogleCalendarSection 추가 |
| `src/pages/Result.jsx` | Modified | 학습 완료 시 캘린더 기록 |
| `src/components/index.js` | Modified | export 추가 |
| `.env` | New | VITE_GOOGLE_CLIENT_ID |

---

## 캘린더 연동 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                     Settings 페이지                          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  GoogleCalendarSection                                 │  │
│  │                                                        │  │
│  │  📅 Google 캘린더                                      │  │
│  │                                                        │  │
│  │  [캘린더 연결하기]                                      │  │
│  │                                                        │  │
│  │  • 학습 완료 시 자동 기록                               │  │
│  │  • 모닝 퀴즈, AI 수업, 복습 기록                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 클릭
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google OAuth 팝업                          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Sign in with Google                                   │  │
│  │                                                        │  │
│  │  Ringle AI English에서 다음을 요청합니다:              │  │
│  │                                                        │  │
│  │  ✓ Google Calendar 일정 생성                          │  │
│  │                                                        │  │
│  │  [허용]  [거부]                                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 허용
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     연결 완료!                               │
│                                                              │
│  📅 Google 캘린더                                           │
│  ✓ 연결됨         [연결 해제]                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 학습 완료 시
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google Calendar                            │
│                                                              │
│  2월 8일 (토)                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 14:30 🌅 모닝 퀴즈 완료                              │   │
│  │ 15:00 📞 AI 영어 수업 완료 (10분)                    │   │
│  │ 20:00 💪 복습 전화 완료                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 이벤트 색상

| 학습 유형 | colorId | 색상 |
|----------|---------|------|
| 모닝 퀴즈 | 5 | 노란색 |
| AI 수업 | 1 | 파란색 |
| 복습 전화 | 2 | 녹색 |

---

## Testing Checklist

- [x] OAuth 동의 화면 설정
- [x] 클라이언트 ID 생성
- [x] 캘린더 연결 버튼 클릭
- [x] Google 로그인 팝업
- [x] 권한 승인
- [x] 연결 상태 표시
- [x] 학습 완료 시 이벤트 추가
- [x] 연결 해제

---

## Known Issues

### 1. 403 access_denied 오류
- **문제:** OAuth 동의 화면이 테스트 모드
- **해결:** "대상" → "앱 게시"로 프로덕션 전환

### 2. 토큰 만료
- **문제:** access_token 1시간 후 만료
- **해결:** 재연결 필요 (refresh_token 미사용)

---

## Next Steps

- Phase 15: 세션 메모리 (크로스 세션 AI 기억)
- Phase 16: Claude API 마이그레이션

---

## References

- [Google Calendar API](https://developers.google.com/calendar/api)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [Phase 13: Voice Cloning](PHASE-13-voice-cloning.md)

---

*Last Updated: 2026-02-08*
