/**
 * @file utils/googleCalendar.js
 * @description Google Calendar API 연동 유틸리티
 */

// Google API 설정 (환경변수 또는 설정에서 가져옴)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SCOPES = 'https://www.googleapis.com/auth/calendar.events'
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'

let tokenClient = null
let gapiInited = false
let gisInited = false

/**
 * Google API 스크립트 로드
 */
export const loadGoogleAPI = () => {
  return new Promise((resolve, reject) => {
    // gapi 스크립트가 이미 로드되어 있는지 확인
    if (window.gapi && gapiInited) {
      resolve()
      return
    }

    // gapi 스크립트 로드
    const gapiScript = document.createElement('script')
    gapiScript.src = 'https://apis.google.com/js/api.js'
    gapiScript.async = true
    gapiScript.defer = true
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
          })
          gapiInited = true
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    }
    gapiScript.onerror = reject
    document.head.appendChild(gapiScript)
  })
}

/**
 * Google Identity Services 로드
 */
export const loadGIS = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts && gisInited) {
      resolve()
      return
    }

    const gisScript = document.createElement('script')
    gisScript.src = 'https://accounts.google.com/gsi/client'
    gisScript.async = true
    gisScript.defer = true
    gisScript.onload = () => {
      gisInited = true
      resolve()
    }
    gisScript.onerror = reject
    document.head.appendChild(gisScript)
  })
}

/**
 * Google Calendar 초기화
 */
export const initGoogleCalendar = async () => {
  if (!GOOGLE_CLIENT_ID) {
    console.warn('[GoogleCalendar] Client ID not configured')
    return false
  }

  try {
    await Promise.all([loadGoogleAPI(), loadGIS()])
    return true
  } catch (err) {
    console.error('[GoogleCalendar] Init error:', err)
    return false
  }
}

/**
 * Google 계정 연결 (OAuth 로그인)
 */
export const connectGoogleCalendar = () => {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) {
      reject(new Error('Google Client ID가 설정되지 않았습니다'))
      return
    }

    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error))
            return
          }

          // 토큰 저장
          const tokenData = {
            access_token: response.access_token,
            expires_at: Date.now() + (response.expires_in * 1000),
          }
          localStorage.setItem('google_calendar_token', JSON.stringify(tokenData))

          resolve(tokenData)
        },
      })

      // 로그인 팝업 표시
      tokenClient.requestAccessToken({ prompt: 'consent' })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * 저장된 토큰 가져오기
 */
export const getStoredToken = () => {
  try {
    const tokenStr = localStorage.getItem('google_calendar_token')
    if (!tokenStr) return null

    const token = JSON.parse(tokenStr)

    // 만료 확인 (5분 여유)
    if (token.expires_at < Date.now() + 300000) {
      localStorage.removeItem('google_calendar_token')
      return null
    }

    return token
  } catch {
    return null
  }
}

/**
 * 연결 해제
 */
export const disconnectGoogleCalendar = () => {
  const token = getStoredToken()
  if (token?.access_token) {
    // 토큰 취소
    window.google?.accounts?.oauth2?.revoke(token.access_token)
  }
  localStorage.removeItem('google_calendar_token')
}

/**
 * 연결 상태 확인
 */
export const isGoogleCalendarConnected = () => {
  return !!getStoredToken()
}

/**
 * 캘린더에 학습 이벤트 추가
 */
export const addLearningEvent = async (eventData) => {
  const token = getStoredToken()
  if (!token) {
    throw new Error('구글 캘린더가 연결되지 않았습니다')
  }

  const { title, description, startTime, endTime, colorId } = eventData

  // 이벤트 생성
  const event = {
    summary: title,
    description: description || '',
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: colorId || '9', // 기본: 파란색
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
      ],
    },
  }

  try {
    // gapi 클라이언트에 토큰 설정
    window.gapi.client.setToken({ access_token: token.access_token })

    const response = await window.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    })

    console.log('[GoogleCalendar] Event created:', response.result.htmlLink)
    return response.result
  } catch (err) {
    console.error('[GoogleCalendar] Add event error:', err)
    throw err
  }
}

/**
 * 학습 완료 이벤트 추가 (간편 함수)
 */
export const addCompletedLearningEvent = async (type, duration = 10) => {
  const now = new Date()
  const endTime = new Date(now.getTime() + duration * 60000)

  const eventTitles = {
    quiz: '🌅 영어 모닝 퀴즈 완료',
    call: '📞 AI 영어 수업 완료',
    review: '💪 영어 복습 완료',
  }

  const eventColors = {
    quiz: '5',   // 노란색
    call: '8',   // 회색 (검정 대신)
    review: '1', // 보라색
  }

  return addLearningEvent({
    title: eventTitles[type] || '📚 영어 학습 완료',
    description: `Ringgle 앱에서 ${type === 'quiz' ? '퀴즈' : type === 'call' ? 'AI 수업' : '복습'}을 완료했습니다.`,
    startTime: now,
    endTime: endTime,
    colorId: eventColors[type] || '9',
  })
}

/**
 * 학습 예정 이벤트 추가 (알림용)
 */
export const scheduleLearningReminder = async (type, scheduledTime) => {
  const startTime = new Date(scheduledTime)
  const endTime = new Date(startTime.getTime() + 30 * 60000) // 30분

  const eventTitles = {
    quiz: '🌅 영어 모닝 퀴즈',
    call: '📞 AI 영어 수업',
    review: '💪 영어 복습',
  }

  return addLearningEvent({
    title: eventTitles[type] || '📚 영어 학습',
    description: 'Ringgle 앱에서 학습을 시작하세요!',
    startTime: startTime,
    endTime: endTime,
    colorId: '10', // 초록색 (예정)
  })
}

export default {
  initGoogleCalendar,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  isGoogleCalendarConnected,
  addLearningEvent,
  addCompletedLearningEvent,
  scheduleLearningReminder,
}
