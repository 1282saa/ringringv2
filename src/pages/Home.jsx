import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Phone, ChevronLeft, ChevronRight, Menu, Flame, Home as HomeIcon, Monitor, Bot, BarChart2, User, Check } from 'lucide-react'
import { loadMockData } from '../data/mockCallHistory'

function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'call') // call, settings, history
  const [callHistory, setCallHistory] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [filterAnalysisOnly, setFilterAnalysisOnly] = useState(false)

  // 설정에서 저장된 값 로드
  const settings = JSON.parse(localStorage.getItem('tutorSettings') || '{}')
  const accent = settings.accent || 'us'
  const gender = settings.gender || 'female'

  const accentLabel = {
    us: '미국',
    uk: '영국',
    au: '호주',
    in: '인도'
  }[accent] || '미국'

  const genderLabel = gender === 'male' ? '남성' : '여성'

  // 튜터 이름 생성 (링글 스타일)
  const tutorNames = {
    female: ['Gwen', 'Emma', 'Olivia', 'Sophia'],
    male: ['James', 'Liam', 'Noah', 'Oliver']
  }
  const tutorName = settings.tutorName || tutorNames[gender][0]
  const tutorInitial = tutorName[0]

  // 성격 태그
  const personalityTags = ['밝은', '활기찬']

  // 네비게이션 상태로 탭 변경
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state])

  useEffect(() => {
    // 통화 기록 로드
    const saved = localStorage.getItem('callHistory')
    if (saved) {
      const history = JSON.parse(saved)
      if (history.length > 0) {
        setCallHistory(history)
        return
      }
    }
    // 통화 기록이 없으면 목업 데이터 로드
    console.log('[Home] Loading mock data...')
    const mockData = loadMockData()
    setCallHistory(mockData)
  }, [])

  // 월 변경
  const changeMonth = (delta) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentMonth(newDate)
  }

  // 현재 월의 통화 기록 필터링
  const filteredHistory = callHistory.filter(call => {
    const callDate = new Date(call.timestamp)
    const sameMonth = callDate.getMonth() === currentMonth.getMonth() &&
                      callDate.getFullYear() === currentMonth.getFullYear()
    if (!sameMonth) return false
    if (filterAnalysisOnly) return call.words >= 150
    return true
  })

  // 완료한 전화 개수
  const completedCalls = callHistory.length

  // 날짜 포맷팅 (링글 스타일)
  const formatCallDate = (timestamp) => {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const dayName = dayNames[date.getDay()]
    const hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? '오후' : '오전'
    const hour12 = hours % 12 || 12
    return `${year}. ${month}. ${day}(${dayName}) ${ampm} ${String(hour12).padStart(2, '0')}:${minutes}`
  }

  const handleCall = () => {
    navigate('/call')
  }

  return (
    <div className="ringle-home">
      {/* Header */}
      <header className="ringle-header">
        <h1>AI 전화</h1>
        <div className="header-icons">
          <button className="icon-btn">
            <Flame size={22} color="#22d3ee" fill="#22d3ee" />
          </button>
          <button className="icon-btn">
            <Menu size={22} color="#1f2937" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'call' ? 'active' : ''}`}
          onClick={() => setActiveTab('call')}
        >
          전화
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('settings')
            navigate('/settings')
          }}
        >
          맞춤설정
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          전화내역
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'call' && (
          <>
            {/* Tutor Card - 링글 스타일 (클릭 시 튜터 설정) */}
            <div className="tutor-card" onClick={() => navigate('/settings/tutor')}>
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

            {/* Call Button - 링글 스타일 */}
            <button className="call-btn" onClick={handleCall}>
              바로 전화하기
            </button>
          </>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            {/* Summary Card */}
            <div className="summary-card">
              <div className="summary-item">
                <span className="summary-value">{completedCalls}개</span>
                <span className="summary-label">완료한 전화</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-item">
                <span className="summary-value">무제한</span>
                <span className="summary-label">남은 AI 분석 이용권</span>
              </div>
            </div>

            {/* Notice Banner */}
            <div className="notice-banner">
              <div className="notice-icon">🚧</div>
              <div className="notice-text">
                <p className="notice-title">AI 분석 결과는 잠시 준비 중이에요.</p>
                <p className="notice-desc">곧 '성취' 메뉴에서 더 나은 모습으로 돌아올게요.</p>
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

            {/* Call Cards */}
            {filteredHistory.length > 0 ? (
              filteredHistory.map((call) => {
                const hasAnalysis = call.words >= 150
                return (
                  <div key={call.id} className="call-card">
                    <span className="call-type-tag">전화</span>
                    <p className="call-date">{formatCallDate(call.timestamp)}</p>
                    <p className="call-words">
                      <span className={hasAnalysis ? 'word-count-ok' : 'word-count-low'}>
                        {call.words}단어
                      </span>
                      <span className="word-threshold"> / 150단어</span>
                    </p>

                    <div className="call-buttons">
                      <button
                        className="call-btn-item"
                        onClick={() => navigate('/script', { state: { callId: call.id, callData: call } })}
                      >
                        대화 스크립트 확인
                      </button>

                      {hasAnalysis && (
                        <button
                          className="call-btn-item"
                          onClick={() => navigate('/analysis', { state: { callId: call.id, callData: call } })}
                        >
                          AI 분석 확인
                        </button>
                      )}

                      <button
                        className="call-btn-item"
                        onClick={() => navigate('/practice', { state: { callId: call.id, callData: call } })}
                      >
                        핵심 표현 연습하기
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
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

      {/* Bottom Navigation - 링글 6개 탭 */}
      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => setActiveTab('call')}>
          <HomeIcon size={22} />
          <span>홈</span>
        </button>
        <button className="nav-item" onClick={() => alert('1:1 수업 기능은 준비 중입니다.')}>
          <Monitor size={22} />
          <span>1:1 수업</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/call')}>
          <Bot size={22} />
          <span>AI 튜터</span>
        </button>
        <button className="nav-item active" onClick={() => setActiveTab('call')}>
          <Phone size={22} />
          <span>AI 전화</span>
        </button>
        <button className="nav-item" onClick={() => setActiveTab('history')}>
          <BarChart2 size={22} />
          <span>성취</span>
        </button>
        <button className="nav-item" onClick={() => navigate('/settings')}>
          <User size={22} />
          <span>마이링글</span>
        </button>
      </nav>

      <style>{`
        .ringle-home {
          min-height: 100vh;
          background: #f9fafb;
          padding-bottom: 80px;
        }

        .ringle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: white;
        }

        .ringle-header h1 {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }

        .header-icons {
          display: flex;
          gap: 16px;
        }

        .icon-btn {
          background: none;
          padding: 4px;
        }

        .tabs {
          display: flex;
          background: white;
          border-bottom: 1px solid #e8e8e8;
          padding: 0 20px;
          gap: 24px;
        }

        .tab {
          padding: 14px 0;
          font-size: 15px;
          font-weight: 500;
          color: #888;
          background: none;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab.active {
          color: #1a1a1a;
          font-weight: 600;
          border-bottom-color: #1a1a1a;
        }

        .main-content {
          padding: 20px;
        }

        /* Tutor Card - 링글 스타일 */
        .tutor-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 40px 32px;
          text-align: center;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tutor-card:active {
          background: #f9fafb;
        }

        .tutor-avatar-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .tutor-avatar {
          width: 140px;
          height: 140px;
          background: #8b5cf6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 6px solid #ddd6fe;
        }

        .tutor-avatar span {
          font-size: 56px;
          font-weight: 600;
          color: white;
        }

        .tutor-tags {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .personality-tag {
          padding: 6px 14px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 14px;
          color: #6b7280;
          border: 1px solid #e5e7eb;
        }

        .tutor-name {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .tutor-info-tags {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .info-tag {
          font-size: 15px;
          color: #6b7280;
        }

        /* Call Button - 링글 스타일 */
        .call-btn {
          width: 100%;
          padding: 18px;
          background: #5046e4;
          color: white;
          border-radius: 12px;
          font-size: 17px;
          font-weight: 600;
          margin-top: 4px;
        }

        .call-btn:active {
          background: #4338ca;
        }

        /* History Section - 링글 스타일 */
        .history-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Summary Card */
        .summary-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
        }

        .summary-item {
          flex: 1;
          text-align: center;
        }

        .summary-value {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #5046e4;
          margin-bottom: 4px;
        }

        .summary-label {
          font-size: 13px;
          color: #6b7280;
        }

        .summary-divider {
          width: 1px;
          height: 40px;
          background: #e5e7eb;
        }

        /* Notice Banner */
        .notice-banner {
          background: #f3f4f6;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .notice-icon {
          font-size: 20px;
        }

        .notice-text {
          flex: 1;
        }

        .notice-title {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .notice-desc {
          font-size: 13px;
          color: #6b7280;
        }

        /* Month Navigator */
        .month-navigator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
        }

        .month-title {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }

        .month-arrows {
          display: flex;
          gap: 8px;
        }

        .month-arrows button {
          background: none;
          padding: 4px;
          color: #6b7280;
        }

        /* Filter Checkbox */
        .filter-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 8px 0;
        }

        .checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .checkbox.checked {
          background: #5046e4;
          border-color: #5046e4;
          color: white;
        }

        .filter-checkbox span {
          font-size: 14px;
          color: #374151;
        }

        /* Call Card - 링글 스타일 */
        .call-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }

        .call-type-tag {
          display: inline-block;
          padding: 4px 10px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 12px;
        }

        .call-date {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .call-words {
          font-size: 14px;
          margin-bottom: 16px;
        }

        .word-count-ok {
          color: #1f2937;
        }

        .word-count-low {
          color: #9ca3af;
        }

        .word-threshold {
          color: #9ca3af;
        }

        .call-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .call-btn-item {
          width: 100%;
          padding: 14px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          text-align: center;
        }

        .call-btn-item:active {
          background: #f9fafb;
        }

        .empty-history {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .empty-history p {
          font-size: 16px;
          color: #374151;
          margin-bottom: 4px;
        }

        .empty-history .sub {
          font-size: 14px;
          color: #9ca3af;
        }

        /* Bottom Navigation - 링글 6개 탭 */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-around;
          padding: 8px 0 20px;
          max-width: 500px;
          margin: 0 auto;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: none;
          color: #9ca3af;
          min-width: 50px;
        }

        .nav-item.active {
          color: #1f2937;
        }

        .nav-item span {
          font-size: 10px;
          white-space: nowrap;
        }

        .nav-item svg {
          stroke-width: 1.5;
        }
      `}</style>
    </div>
  )
}

export default Home
