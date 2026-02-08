import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Phone, ChevronLeft, ChevronRight, Flame, Check, User, LogOut, RotateCcw, FileText, TrendingUp, Sparkles } from 'lucide-react'
import { LoadingSpinner, UsageCard, LearningCalendar, DailyScheduleInput, CustomTutorModal } from '../components'
import TodayProgress from '../components/TodayProgress'
import IncomingCallOverlay from '../components/IncomingCallOverlay'
import { getSessions, getPet } from '../utils/api'
import { formatDuration, getFromStorage, setToStorage } from '../utils/helpers'
import { haptic } from '../utils/capacitor'
import { useApiCall } from '../hooks'
import { useUserSettings } from '../context'
import { useAuth } from '../auth'
import { notificationService } from '../services/notificationService'
import { checkAutoSchedule, navigateToFeature, saveLastExecutionTime, getScheduleSettings, saveScheduleSettings } from '../utils/featureScheduler'
import { STORAGE_KEYS } from '../constants'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'call')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [filterAnalysisOnly, setFilterAnalysisOnly] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [streak, setStreak] = useState(1)
  const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, goal: 5 })

  // 학습 사이클 상태
  const [showAutoPopup, setShowAutoPopup] = useState(false)
  const [autoPopupType, setAutoPopupType] = useState(null)
  const [showCustomTutorModal, setShowCustomTutorModal] = useState(false)
  const [customTutor, setCustomTutor] = useState(() => getFromStorage(STORAGE_KEYS.CUSTOM_TUTOR, null))

  // 펫 프로필 상태
  const [petData, setPetData] = useState(null)
  const [usePetAsProfile, setUsePetAsProfile] = useState(() => getFromStorage('usePetAsProfile', false))

  // 스케줄 설정 상태
  const [scheduleSettings, setScheduleSettings] = useState(() => getScheduleSettings())

  // 캘린더 날짜 선택 상태
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null)
  const [selectedDateData, setSelectedDateData] = useState(null)

  const { user, signOut } = useAuth()

  // 스트릭 로드
  useEffect(() => {
    const savedStreak = getFromStorage('learningStreak', { count: 1, lastDate: null })
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    if (savedStreak.lastDate === today) {
      setStreak(savedStreak.count)
    } else if (savedStreak.lastDate === yesterday) {
      setStreak(savedStreak.count)
    } else if (savedStreak.lastDate) {
      setStreak(1)
    }
  }, [])

  // 펫 프로필 로드
  useEffect(() => {
    const loadPetData = async () => {
      // 설정 확인
      const usePet = getFromStorage('usePetAsProfile', false)
      setUsePetAsProfile(usePet)
      console.log('[Home] usePetAsProfile:', usePet)

      try {
        const response = await getPet()
        console.log('[Home] getPet response:', response)
        if (response.success && response.pet) {
          setPetData({
            image: response.pet.imageUrl,
            name: response.pet.name
          })
          console.log('[Home] Pet loaded from server:', response.pet.imageUrl)
        } else {
          const localPet = getFromStorage(STORAGE_KEYS.PET_CHARACTER, null)
          console.log('[Home] Using local pet:', localPet)
          if (localPet) setPetData(localPet)
        }
      } catch (err) {
        console.error('[Home] getPet error:', err)
        const localPet = getFromStorage(STORAGE_KEYS.PET_CHARACTER, null)
        if (localPet) setPetData(localPet)
      }
    }
    loadPetData()
  }, [])

  // 자동 스케줄 체크 (1분 간격)
  useEffect(() => {
    const checkSchedule = () => {
      const featureType = checkAutoSchedule()
      if (featureType && !showAutoPopup) {
        setAutoPopupType(featureType)
        setShowAutoPopup(true)
      }
    }

    // 초기 체크
    checkSchedule()

    // 1분 간격 체크
    const intervalId = setInterval(checkSchedule, 60000)

    return () => clearInterval(intervalId)
  }, [showAutoPopup])

  // 자동 팝업 수락
  const handleAutoPopupAccept = () => {
    setShowAutoPopup(false)
    if (autoPopupType) {
      saveLastExecutionTime(autoPopupType)
      navigateToFeature(navigate, autoPopupType)
    }
  }

  // 자동 팝업 닫기
  const handleAutoPopupDismiss = () => {
    setShowAutoPopup(false)
    if (autoPopupType) {
      saveLastExecutionTime(autoPopupType)
    }
  }

  // 나만의 튜터 버튼 클릭
  const handleCustomTutorClick = () => {
    haptic.light()
    setShowCustomTutorModal(true)
  }

  // 커스텀 튜터 저장
  const handleCustomTutorSave = (data) => {
    setCustomTutor(data)
    // Context도 업데이트하여 메인 튜터 카드에 반영
    updateSettings({
      tutor: data.id,
      tutorId: data.id,
      tutorName: data.name,
      tutorImage: data.image,
      accent: data.accent,
      gender: data.gender,
      conversationStyle: data.conversationStyle || 'teacher',
      isCustomTutor: true,
    })
  }

  // 스케줄 설정 업데이트
  const handleScheduleChange = (key, value) => {
    haptic.light()
    const newSettings = saveScheduleSettings({ [key]: value })
    setScheduleSettings(newSettings)
  }

  // 캘린더 날짜 선택 핸들러
  const handleCalendarDateSelect = (date, data) => {
    setSelectedCalendarDate(date)
    setSelectedDateData(data)
  }

  // 선택된 날짜 포맷
  const formatSelectedDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getMonth() + 1}월 ${d.getDate()}일`
  }

  const handleLogout = async () => {
    haptic.medium()
    setShowProfileMenu(false)
    try {
      await signOut()
      navigate('/auth/login', { replace: true })
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // Context에서 튜터 설정 가져오기
  const {
    tutorName,
    tutorInitial,
    tutorImage,
    accentLabel,
    genderLabel,
    personalityTags,
    updateSettings
  } = useUserSettings()

  // API 호출 훅으로 세션 로드 관리
  const {
    data: sessionsData,
    loading: isLoadingSessions,
    execute: loadSessionsFromDB
  } = useApiCall(
    useCallback(async () => {
      console.log('[Home] Fetching sessions from DynamoDB...')
      const result = await getSessions(50)
      console.log('[Home] Loaded', result.sessions?.length || 0, 'sessions from DB')
      return result
    }, []),
    { initialData: { sessions: [] } }
  )

  const dbSessions = sessionsData?.sessions || []

  // 주간 진행률 계산 (DB 세션 기반)
  useEffect(() => {
    if (dbSessions.length > 0) {
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay()) // 일요일
      startOfWeek.setHours(0, 0, 0, 0)

      const thisWeekSessions = dbSessions.filter(s => {
        const sessionDate = new Date(s.startedAt || s.timestamp)
        return sessionDate >= startOfWeek
      })

      setWeeklyProgress(prev => ({ ...prev, completed: thisWeekSessions.length }))
    }
  }, [dbSessions])

  // 네비게이션 상태로 탭 변경
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state])

  // 초기 로드
  useEffect(() => {
    loadSessionsFromDB()
  }, [loadSessionsFromDB])

  // 히스토리 탭 활성화 시 세션 새로고침
  useEffect(() => {
    if (activeTab === 'history') {
      loadSessionsFromDB()
    }
  }, [activeTab, loadSessionsFromDB])

  // 월 변경
  const changeMonth = (delta) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentMonth(newDate)
  }

  // 완료한 전화 개수
  const completedCalls = dbSessions.length

  // DB 세션을 현재 월로 필터링
  const filteredDbSessions = dbSessions.filter(session => {
    const sessionDate = new Date(session.startedAt || session.timestamp)
    const sameMonth = sessionDate.getMonth() === currentMonth.getMonth() &&
                      sessionDate.getFullYear() === currentMonth.getFullYear()
    if (!sameMonth) return false
    if (filterAnalysisOnly) return (session.wordCount || 0) >= 150
    return true
  })

  // DB 세션 날짜 포맷팅 (KST 변환)
  const formatSessionDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    // 한국 시간대로 명시적 변환
    const kstOptions = { timeZone: 'Asia/Seoul' }
    const year = date.toLocaleString('en-US', { ...kstOptions, year: 'numeric' })
    const month = String(date.toLocaleString('en-US', { ...kstOptions, month: 'numeric' })).padStart(2, '0')
    const day = String(date.toLocaleString('en-US', { ...kstOptions, day: 'numeric' })).padStart(2, '0')
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const dayIndex = new Date(date.toLocaleString('en-US', kstOptions)).getDay()
    const dayName = dayNames[dayIndex]
    const hours = parseInt(date.toLocaleString('en-US', { ...kstOptions, hour: 'numeric', hour12: false }))
    const minutes = String(date.toLocaleString('en-US', { ...kstOptions, minute: 'numeric' })).padStart(2, '0')
    const ampm = hours >= 12 ? '오후' : '오전'
    const hour12 = hours % 12 || 12
    return `${year}. ${month}. ${day}(${dayName}) ${ampm} ${String(hour12).padStart(2, '0')}:${minutes}`
  }

  const handleCall = () => {
    haptic.medium()
    navigate('/call')
  }

  // 네비게이션 핸들러 (햅틱 포함)
  const handleNavClick = (action) => {
    haptic.light()
    action()
  }

  // 탭 변경 핸들러 (햅틱 포함)
  const handleTabChange = (tab) => {
    haptic.selection()
    if (tab === 'settings') {
      navigate('/settings')
    }
    setActiveTab(tab)
  }

  return (
    <div className="ringle-home">
      {/* Header */}
      <header className="ringle-header">
        <h1>AI 전화</h1>
        <div className="header-icons">
          <button className="streak-badge" onClick={() => { haptic.light(); navigate('/stats') }}>
            <Flame size={18} color="#fff" fill="#fff" />
            <span className="streak-count">{streak}</span>
          </button>
          <div className="profile-wrapper">
            <button
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {usePetAsProfile && petData?.image ? (
                <img src={petData.image} alt={petData.name || ''} className="profile-img" />
              ) : user?.attributes?.picture ? (
                <img src={user.attributes.picture} alt="" className="profile-img" />
              ) : (
                <User size={20} color="#666" />
              )}
            </button>
            {showProfileMenu && (
              <>
                <div className="profile-backdrop" onClick={() => setShowProfileMenu(false)} />
                <div className="profile-menu">
                  <div className="profile-info">
                    <span className="profile-email">{user?.email || '사용자'}</span>
                  </div>
                  <button className="logout-menu-btn" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>로그아웃</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'call' ? 'active' : ''}`}
          onClick={() => handleTabChange('call')}
        >
          전화
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabChange('settings')}
        >
          맞춤설정
        </button>
        <button
          className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => handleTabChange('schedule')}
        >
          스케줄
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          내역
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'call' && (
          <>
            {/* 오늘의 학습 진행률 */}
            <TodayProgress />

            {/* Tutor Card - 링글 스타일 (클릭 시 튜터 설정) */}
            <div className="tutor-card" onClick={() => handleNavClick(() => navigate('/settings/tutor'))}>
              <div className="tutor-avatar-wrapper">
                <div className="tutor-avatar">
                  {tutorImage ? (
                    <img src={tutorImage} alt={tutorName} className="tutor-avatar-img" />
                  ) : (
                    <span>{tutorInitial}</span>
                  )}
                </div>
              </div>

              <div className="tutor-tags">
                {personalityTags.map(tag => (
                  <span key={tag} className="personality-tag">{tag}</span>
                ))}
              </div>

              <h2 className="tutor-name">{tutorName}</h2>

              <div className="tutor-info-tags">
                <span className="info-tag">#{accentLabel}</span>
                <span className="info-tag">#{genderLabel}</span>
              </div>
            </div>

            {/* 오늘의 사용량 */}
            <UsageCard compact showTitle={false} />

            {/* Call Button - 링글 스타일 */}
            <button className="call-btn" onClick={handleCall}>
              바로 전화하기
            </button>

            {/* 나만의 AI 튜터 버튼 */}
            <button className="custom-tutor-btn" onClick={handleCustomTutorClick}>
              <Sparkles size={20} />
              <span>나만의 튜터 만들기</span>
            </button>
          </>
        )}

        {activeTab === 'schedule' && (
          <div className="schedule-section">
            {/* 월간 학습 캘린더 */}
            <LearningCalendar onDateSelect={handleCalendarDateSelect} />

            {/* 선택된 날짜 학습 내역 */}
            {selectedCalendarDate && (
              <div className="selected-date-card">
                <div className="selected-date-header">
                  <span className="selected-date-title">{formatSelectedDate(selectedCalendarDate)}</span>
                  <button
                    className="selected-date-close"
                    onClick={() => {
                      setSelectedCalendarDate(null)
                      setSelectedDateData(null)
                    }}
                  >
                    닫기
                  </button>
                </div>
                {selectedDateData ? (
                  <div className="selected-date-items">
                    <div className={`selected-date-item ${selectedDateData.quiz ? 'done' : ''}`}>
                      <span className="item-label">퀴즈</span>
                      <span className="item-status">{selectedDateData.quiz ? '완료' : '미완료'}</span>
                    </div>
                    <div className={`selected-date-item ${selectedDateData.call ? 'done' : ''}`}>
                      <span className="item-label">수업</span>
                      <span className="item-status">{selectedDateData.call ? '완료' : '미완료'}</span>
                    </div>
                    <div className={`selected-date-item ${selectedDateData.review ? 'done' : ''}`}>
                      <span className="item-label">복습</span>
                      <span className="item-status">{selectedDateData.review ? '완료' : '미완료'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="selected-date-empty">학습 기록이 없어요</p>
                )}
              </div>
            )}

            {/* 오늘의 일정 입력 */}
            <DailyScheduleInput />

            {/* 알림 설정 */}
            <div className="schedule-settings">
              <h3 className="schedule-settings-title">알림 설정</h3>

              {/* 모닝 퀴즈 */}
              <div className="schedule-item">
                <div className="schedule-item-left">
                  <span className="schedule-item-title">모닝 퀴즈</span>
                  {scheduleSettings.morningQuizEnabled && (
                    <input
                      type="time"
                      value={scheduleSettings.morningQuizTime}
                      onChange={(e) => handleScheduleChange('morningQuizTime', e.target.value)}
                      className="schedule-time"
                    />
                  )}
                </div>
                <label className="schedule-toggle">
                  <input
                    type="checkbox"
                    checked={scheduleSettings.morningQuizEnabled}
                    onChange={(e) => handleScheduleChange('morningQuizEnabled', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* 복습 전화 */}
              <div className="schedule-item">
                <div className="schedule-item-left">
                  <span className="schedule-item-title">복습 전화</span>
                  {scheduleSettings.reviewCallEnabled && (
                    <input
                      type="time"
                      value={scheduleSettings.reviewCallTime}
                      onChange={(e) => handleScheduleChange('reviewCallTime', e.target.value)}
                      className="schedule-time"
                    />
                  )}
                </div>
                <label className="schedule-toggle">
                  <input
                    type="checkbox"
                    checked={scheduleSettings.reviewCallEnabled}
                    onChange={(e) => handleScheduleChange('reviewCallEnabled', e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            {/* 바로가기 버튼 */}
            <div className="schedule-shortcuts">
              <button
                className="shortcut-btn"
                onClick={() => handleNavClick(() => navigate('/morning-quiz'))}
              >
                모닝 퀴즈 시작
              </button>
              <button
                className="shortcut-btn"
                onClick={() => handleNavClick(() => navigate('/review-call'))}
              >
                복습 전화 시작
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            {/* Weekly Progress Card - 게이미피케이션 */}
            <div className="weekly-progress-card">
              <div className="weekly-header">
                <div className="weekly-title">
                  <Flame size={18} color="#111" fill="#111" />
                  <span>이번 주 목표</span>
                </div>
                <span className="weekly-count">{weeklyProgress.completed}/{weeklyProgress.goal}회</span>
              </div>
              <div className="progress-bar-wrapper">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min((weeklyProgress.completed / weeklyProgress.goal) * 100, 100)}%` }}
                />
              </div>
              <div className="weekly-message">
                {weeklyProgress.completed >= weeklyProgress.goal ? (
                  <span className="achieved">이번 주 목표 달성!</span>
                ) : (
                  <span>{weeklyProgress.goal - weeklyProgress.completed}회 더 하면 목표 달성</span>
                )}
              </div>
            </div>

            {/* Stats Summary */}
            <div className="summary-card">
              <div className="summary-item">
                <span className="summary-value">{streak}일</span>
                <span className="summary-label">연속 학습</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <span className="summary-value">{completedCalls}회</span>
                <span className="summary-label">총 전화</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <span className="summary-value">{dbSessions.reduce((acc, s) => acc + (s.wordCount || 0), 0).toLocaleString()}</span>
                <span className="summary-label">말한 단어</span>
              </div>
            </div>

            {/* Month Navigator */}
            <div className="month-navigator">
              <h2 className="month-title">{currentMonth.getMonth() + 1}월</h2>
              <div className="month-arrows">
                <button onClick={() => changeMonth(-1)}>
                  <ChevronLeft size={24} />
                </button>
                <button onClick={() => changeMonth(1)}>
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>

            {/* Filter Checkbox */}
            <label className="filter-checkbox">
              <div
                className={`checkbox ${filterAnalysisOnly ? 'checked' : ''}`}
                onClick={() => setFilterAnalysisOnly(!filterAnalysisOnly)}
              >
                {filterAnalysisOnly && <Check size={14} />}
              </div>
              <span>AI 분석 있는 대화만 보기</span>
            </label>

            {/* DB Sessions - 개선된 UI */}
            {filteredDbSessions.length > 0 && (
              <>
                {filteredDbSessions.map((session) => {
                  const hasAnalysis = (session.wordCount || 0) >= 150
                  const words = session.wordCount || 0
                  const duration = session.duration ? Math.round(session.duration / 60) : 0
                  return (
                    <div key={session.sessionId} className="call-card-v2">
                      <div className="call-card-header">
                        <div className="call-card-info">
                          <p className="call-date-v2">{formatSessionDate(session.startedAt)}</p>
                          <div className="call-stats">
                            <span className="call-stat">{words}단어</span>
                            {duration > 0 && <span className="call-stat">{duration}분</span>}
                          </div>
                        </div>
                        {/* 원클릭 복습 버튼 */}
                        <button
                          className="quick-review-btn"
                          onClick={() => handleNavClick(() => navigate('/practice', {
                            state: {
                              sessionId: session.sessionId,
                              isDbSession: true,
                              sessionData: session
                            }
                          }))}
                        >
                          <RotateCcw size={16} />
                          <span>바로 복습</span>
                        </button>
                      </div>

                      <div className="call-card-actions">
                        <button
                          className="call-action-chip"
                          onClick={() => handleNavClick(() => navigate('/script', {
                            state: {
                              sessionId: session.sessionId,
                              isDbSession: true,
                              sessionData: session
                            }
                          }))}
                        >
                          <FileText size={14} />
                          <span>스크립트</span>
                        </button>

                        {hasAnalysis && (
                          <button
                            className="call-action-chip"
                            onClick={() => handleNavClick(() => navigate('/analysis', {
                              state: {
                                sessionId: session.sessionId,
                                isDbSession: true,
                                sessionData: session
                              }
                            }))}
                          >
                            <TrendingUp size={14} />
                            <span>AI 분석</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Empty State */}
            {filteredDbSessions.length === 0 && (
              <div className="empty-history">
                <div className="empty-icon">
                  <Phone size={32} color="#9ca3af" />
                </div>
                <p>이 달에는 전화 내역이 없어요</p>
                <p className="sub">AI와 대화를 시작해보세요!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 자동 팝업 오버레이 */}
      {showAutoPopup && (
        <IncomingCallOverlay
          type={autoPopupType}
          onAccept={handleAutoPopupAccept}
          onDismiss={handleAutoPopupDismiss}
        />
      )}

      {/* 나만의 AI 튜터 모달 */}
      <CustomTutorModal
        isOpen={showCustomTutorModal}
        onClose={() => setShowCustomTutorModal(false)}
        onSave={handleCustomTutorSave}
        existingTutor={customTutor}
      />
    </div>
  )
}

export default Home
