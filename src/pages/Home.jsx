import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Phone, ChevronLeft, ChevronRight, Flame, Check, User, LogOut, RotateCcw, FileText, TrendingUp } from 'lucide-react'
import { LoadingSpinner, UsageCard } from '../components'
import { getSessions } from '../utils/api'
import { formatDuration, getFromStorage, setToStorage } from '../utils/helpers'
import { haptic } from '../utils/capacitor'
import { useApiCall } from '../hooks'
import { useUserSettings } from '../context'
import { useAuth } from '../auth'
import { notificationService } from '../services/notificationService'
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
    accentLabel,
    genderLabel,
    personalityTags
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
          <button className="streak-badge" onClick={() => handleTabChange('history')}>
            <Flame size={18} color="#fff" fill="#fff" />
            <span className="streak-count">{streak}</span>
          </button>
          <div className="profile-wrapper">
            <button
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {user?.attributes?.picture ? (
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
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          전화내역
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'call' && (
          <>
            {/* Tutor Card - 링글 스타일 (클릭 시 튜터 설정) */}
            <div className="tutor-card" onClick={() => handleNavClick(() => navigate('/settings/tutor'))}>
              <div className="tutor-avatar-wrapper">
                <div className="tutor-avatar">
                  <span>{tutorInitial}</span>
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
          </>
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

    </div>
  )
}

export default Home
