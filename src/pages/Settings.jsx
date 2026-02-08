/**
 * @file pages/Settings.jsx
 * @description 맞춤설정 메인 페이지 (링글 앱 100% 동일 스타일)
 *
 * - 헤더: "AI 전화" + 탭 (전화/맞춤설정/전화내역)
 * - 동적 값 표시 (주 N회, 튜터명, 주제 N개)
 * - 하단 네비게이션 바 (6개 탭)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, X, Check, Flame, User, LogOut, Crown, PawPrint, Camera } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'
import { haptic } from '../utils/capacitor'
import { TUTORS, CONVERSATION_STYLES, STORAGE_KEYS } from '../constants'
import { useAuth } from '../auth'
import { useUsage } from '../context'
import { VoiceRecordingSection, GoogleCalendarSection, PetUploadModal } from '../components'
import { getPet } from '../utils/api'

function Settings() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { usage, limits } = useUsage()

  // 플랜 라벨
  const planLabels = { free: '무료', basic: '베이직', premium: '프리미엄' }

  // 설정 상태
  const [userName, setUserName] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [tempName, setTempName] = useState('')
  const [videoReviewAlert, setVideoReviewAlert] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // 동적 값 상태
  const [scheduleCount, setScheduleCount] = useState(0)
  const [tutorName, setTutorName] = useState('Gwen')
  const [topicCount, setTopicCount] = useState(0)
  const [conversationStyle, setConversationStyle] = useState('teacher')
  const [showStyleModal, setShowStyleModal] = useState(false)

  // 반려동물 상태
  const [petData, setPetData] = useState(null)
  const [showPetModal, setShowPetModal] = useState(false)
  const [usePetAsProfile, setUsePetAsProfile] = useState(() => getFromStorage('usePetAsProfile', false))

  // 토스트 표시 함수
  const displayToast = (message) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  // 초기 로드
  useEffect(() => {
    // 이름
    const savedName = getFromStorage('userName', '사용자')
    setUserName(savedName)

    // 알림 설정
    const savedVideoReviewAlert = getFromStorage('videoReviewAlert', true)
    setVideoReviewAlert(savedVideoReviewAlert)

    // 일정 카운트 (요일별 일정 합계)
    const schedules = getFromStorage('callSchedules', {})
    let totalSchedules = 0
    Object.values(schedules).forEach(daySchedules => {
      totalSchedules += daySchedules.length
    })
    setScheduleCount(totalSchedules)

    // 튜터 이름
    const savedTutor = getFromStorage('selectedTutor', 'gwen')
    const tutor = TUTORS.find(t => t.id === savedTutor)
    setTutorName(tutor?.name || 'Gwen')

    // 커리큘럼 카운트
    const curriculum = getFromStorage('selectedCurriculum', [])
    setTopicCount(curriculum.length)

    // 대화 스타일
    const savedStyle = getFromStorage('conversationStyle', 'teacher')
    setConversationStyle(savedStyle)

    // 반려동물 정보 로드
    loadPetData()
  }, [])

  // 반려동물 정보 로드
  const loadPetData = async () => {
    try {
      const response = await getPet()
      console.log('[Settings] getPet response:', response)
      if (response.success && response.pet) {
        setPetData({
          image: response.pet.imageUrl,
          name: response.pet.name
        })
        console.log('[Settings] Pet loaded from server:', response.pet.imageUrl)
      } else {
        // 로컬 스토리지 폴백
        const localPet = getFromStorage(STORAGE_KEYS.PET_CHARACTER, null)
        console.log('[Settings] Using local pet:', localPet)
        if (localPet) {
          setPetData(localPet)
        }
      }
    } catch (err) {
      console.error('[Settings] getPet error:', err)
      // 로컬 스토리지 폴백
      const localPet = getFromStorage(STORAGE_KEYS.PET_CHARACTER, null)
      if (localPet) {
        setPetData(localPet)
      }
    }
  }

  // 반려동물 저장 완료 핸들러
  const handlePetSave = (pet) => {
    setPetData(pet)
    displayToast('반려동물이 등록되었습니다')
  }

  // 펫을 프로필로 사용 토글
  const handlePetProfileToggle = () => {
    if (!petData?.image) {
      displayToast('먼저 반려동물을 등록해주세요')
      return
    }
    haptic.selection()
    const newValue = !usePetAsProfile
    setUsePetAsProfile(newValue)
    setToStorage('usePetAsProfile', newValue)
    displayToast(newValue ? '프로필이 변경되었습니다 🐾' : '기본 프로필로 변경되었습니다')
  }

  // 이름 저장
  const handleSaveName = () => {
    haptic.success()
    if (tempName.trim()) {
      setUserName(tempName.trim())
      setToStorage('userName', tempName.trim())
      displayToast('이름이 저장되었습니다')
    }
    setShowNameModal(false)
  }

  // 대화 스타일 선택 핸들러
  const handleStyleSelect = (styleId) => {
    haptic.success()
    setConversationStyle(styleId)
    setToStorage('conversationStyle', styleId)
    const style = CONVERSATION_STYLES.find(s => s.id === styleId)
    displayToast(`${style?.label || '선생님'} 스타일로 변경됐습니다`)
    setShowStyleModal(false)
  }

  // 현재 스타일 라벨 가져오기
  const getCurrentStyleLabel = () => {
    const style = CONVERSATION_STYLES.find(s => s.id === conversationStyle)
    return style?.label || '선생님'
  }

  // 토글 핸들러
  const handleVideoReviewToggle = () => {
    haptic.selection()
    const newValue = !videoReviewAlert
    setVideoReviewAlert(newValue)
    setToStorage('videoReviewAlert', newValue)
    displayToast(newValue ? '알림이 켜졌습니다' : '알림이 꺼졌습니다')
  }

  // 네비게이션 핸들러
  const handleNav = (action) => {
    haptic.light()
    action()
  }

  // 로그아웃 핸들러
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

  return (
    <div className="settings-page">
      {/* 상단 헤더 */}
      <header className="main-header">
        <h1>AI 전화</h1>
        <div className="header-icons">
          <button className="streak-badge">
            <Flame size={18} color="#fff" fill="#fff" />
            <span className="streak-count">3</span>
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

      {/* 탭 네비게이션 */}
      <nav className="tab-nav">
        <button
          className="tab-item"
          onClick={() => handleNav(() => navigate('/', { state: { activeTab: 'call' } }))}
        >
          전화
        </button>
        <button
          className="tab-item active"
        >
          맞춤설정
        </button>
        <button
          className="tab-item"
          onClick={() => handleNav(() => navigate('/', { state: { activeTab: 'schedule' } }))}
        >
          스케줄
        </button>
        <button
          className="tab-item"
          onClick={() => handleNav(() => navigate('/', { state: { activeTab: 'history' } }))}
        >
          내역
        </button>
      </nav>

      {/* 메인 콘텐츠 */}
      <div className="page-content">
        {/* 플랜 관리 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">구독 관리</h2>
          <div className="settings-list">
            <div className="settings-item" onClick={() => handleNav(() => navigate('/settings/plan'))}>
              <span className="item-label">
                <Crown size={16} style={{ marginRight: 6, color: usage.plan === 'premium' ? '#d97706' : '#7c3aed' }} />
                플랜 관리
              </span>
              <div className="item-right">
                <span className="item-value" style={{
                  color: usage.plan === 'premium' ? '#d97706' : usage.plan === 'basic' ? '#7c3aed' : '#6b7280'
                }}>
                  {planLabels[usage.plan] || '무료'}
                </span>
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
          </div>
        </section>

        {/* 공통 설정 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">공통 설정</h2>
          <div className="settings-list">
            <div className="settings-item" onClick={() => handleNav(() => navigate('/settings/schedule'))}>
              <span className="item-label">일정</span>
              <div className="item-right">
                <span className="item-value">주 {scheduleCount}회</span>
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
            <div className="settings-item" onClick={() => handleNav(() => navigate('/settings/tutor'))}>
              <span className="item-label">튜터</span>
              <div className="item-right">
                <span className="item-value">{tutorName}</span>
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
            <div
              className="settings-item"
              onClick={() => handleNav(() => {
                setTempName(userName)
                setShowNameModal(true)
              })}
            >
              <span className="item-label">내 이름</span>
              <div className="item-right">
                <span className="item-value">{userName}</span>
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
            <div
              className="settings-item"
              onClick={() => handleNav(() => setShowStyleModal(true))}
            >
              <span className="item-label">대화 스타일</span>
              <div className="item-right">
                <span className="item-value">{getCurrentStyleLabel()}</span>
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
          </div>
        </section>

        {/* 일반 전화 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">일반 전화</h2>
          <div className="settings-list">
            <div className="settings-item" onClick={() => handleNav(() => navigate('/settings/curriculum'))}>
              <span className="item-label">커리큘럼</span>
              <div className="item-right">
                <span className="item-value">주제 {topicCount}개</span>
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
          </div>
        </section>

        {/* 그 외 전화 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">그 외 전화</h2>
          <div className="settings-list">
            <div className="settings-item" onClick={() => handleNav(() => navigate('/settings/roleplay'))}>
              <span className="item-label">롤플레잉/디스커션 알림</span>
              <div className="item-right">
                <ChevronRight size={20} color="#c0c0c0" />
              </div>
            </div>
            <div className="settings-item">
              <span className="item-label">화상 수업 리뷰</span>
              <div className="toggle-switch" onClick={handleVideoReviewToggle}>
                <div className={`toggle-track ${videoReviewAlert ? 'active' : ''}`}>
                  <div className="toggle-thumb" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 나만의 음성 섹션 */}
        <VoiceRecordingSection />

        {/* 구글 캘린더 연동 섹션 */}
        <GoogleCalendarSection />

        {/* 반려동물 섹션 */}
        <section className="settings-section">
          <h2 className="section-label">반려동물</h2>
          <div className="settings-list">
            <div
              className="pet-character-card"
              onClick={() => {
                haptic.light()
                setShowPetModal(true)
              }}
            >
              {petData?.image ? (
                <>
                  <div className="pet-preview-circle">
                    <img src={petData.image} alt={petData.name || '반려동물'} />
                  </div>
                  <div className="pet-info">
                    <span className="pet-name">{petData.name || '나의 반려동물'}</span>
                    <span className="pet-hint">학습 알림에 함께 등장해요</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="pet-placeholder-circle">
                    <PawPrint size={28} color="#999" />
                  </div>
                  <div className="pet-info">
                    <span className="pet-name">반려동물 등록하기</span>
                    <span className="pet-hint">학습 알림이 더 즐거워져요</span>
                  </div>
                </>
              )}
              <ChevronRight size={20} color="#c0c0c0" />
            </div>

            {/* 프로필 사진으로 사용 토글 */}
            <div className="settings-item">
              <span className="item-label">프로필 사진으로 사용</span>
              <div className="toggle-switch" onClick={handlePetProfileToggle}>
                <div className={`toggle-track ${usePetAsProfile && petData?.image ? 'active' : ''}`}>
                  <div className="toggle-thumb" />
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="toast">
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 이름 수정 모달 */}
      {showNameModal && (
        <div className="modal-overlay" onClick={() => setShowNameModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>내 이름</h3>
              <button className="modal-close" onClick={() => setShowNameModal(false)}>
                <X size={24} color="#888" />
              </button>
            </div>
            <p className="modal-desc">AI 튜터가 부를 이름을 입력해주세요.</p>
            <input
              type="text"
              className="name-input"
              value={tempName}
              onChange={e => setTempName(e.target.value)}
              placeholder="이름 입력"
              autoFocus
            />
            <button className="primary-btn" onClick={handleSaveName}>
              저장
            </button>
          </div>
        </div>
      )}

      {/* 반려동물 등록 모달 */}
      <PetUploadModal
        isOpen={showPetModal}
        onClose={() => setShowPetModal(false)}
        onSave={handlePetSave}
      />

      {/* 대화 스타일 선택 모달 */}
      {showStyleModal && (
        <div className="modal-overlay" onClick={() => setShowStyleModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>대화 스타일</h3>
              <button className="modal-close" onClick={() => setShowStyleModal(false)}>
                <X size={24} color="#888" />
              </button>
            </div>
            <p className="modal-desc">AI 튜터와 어떤 분위기로 대화할까요?</p>
            <div className="style-options">
              {CONVERSATION_STYLES.map(style => (
                <button
                  key={style.id}
                  className={`style-option ${conversationStyle === style.id ? 'selected' : ''}`}
                  onClick={() => handleStyleSelect(style.id)}
                >
                  <div className="style-option-content">
                    <span className="style-label">{style.label}</span>
                    <span className="style-desc">{style.description}</span>
                  </div>
                  {conversationStyle === style.id && (
                    <Check size={20} color="#111" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .settings-page {
          min-height: 100vh;
          background: #fafafa;
          display: flex;
          flex-direction: column;
          padding-bottom: 24px;
        }

        /* 상단 헤더 */
        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 20px 16px;
          background: #fafafa;
        }

        .main-header h1 {
          font-size: 22px;
          font-weight: 700;
          color: #111;
          letter-spacing: -0.5px;
        }

        .header-icons {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .streak-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #111;
          padding: 6px 12px;
          border-radius: 20px;
          border: none;
        }

        .streak-count {
          font-size: 13px;
          font-weight: 600;
          color: white;
        }

        /* Profile Dropdown */
        .profile-wrapper {
          position: relative;
        }

        .profile-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f0f0f0;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
        }

        .profile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 99;
        }

        .profile-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
          min-width: 200px;
          z-index: 100;
          overflow: hidden;
          animation: profileFadeIn 0.15s ease;
        }

        @keyframes profileFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .profile-info {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
        }

        .profile-email {
          font-size: 13px;
          color: #666;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .logout-menu-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: none;
          border: none;
          font-size: 14px;
          color: #666;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .logout-menu-btn:active {
          background: #f5f5f5;
        }

        /* 탭 네비게이션 */
        .tab-nav {
          display: flex;
          background: #fff;
          margin: 0 16px;
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
        }

        .tab-item {
          flex: 1;
          padding: 10px 0;
          font-size: 14px;
          font-weight: 500;
          color: #888;
          background: none;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .tab-item.active {
          color: #111;
          background: #f0f0f0;
          font-weight: 600;
        }

        /* 페이지 콘텐츠 */
        .page-content {
          flex: 1;
          padding: 24px 20px;
          overflow-y: auto;
        }

        /* 설정 섹션 */
        .settings-section {
          margin-bottom: 32px;
        }

        .section-label {
          font-size: 12px;
          font-weight: 600;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          padding-left: 4px;
        }

        .settings-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          background: #fff;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .settings-item:active {
          background: #f5f5f5;
          transform: scale(0.99);
        }

        .item-label {
          font-size: 15px;
          font-weight: 500;
          color: #222;
        }

        .item-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .item-value {
          font-size: 14px;
          color: #888;
        }

        /* 토글 스위치 */
        .toggle-switch {
          cursor: pointer;
        }

        .toggle-track {
          width: 48px;
          height: 28px;
          background: #ddd;
          border-radius: 14px;
          position: relative;
          transition: background 0.2s ease;
        }

        .toggle-track.active {
          background: #111;
        }

        .toggle-thumb {
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        .toggle-track.active .toggle-thumb {
          transform: translateX(20px);
        }

        /* 토스트 메시지 */
        .toast {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          background: #1a1a1a;
          color: white;
          padding: 14px 24px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 500;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          animation: toastFadeIn 0.3s ease;
          z-index: 2000;
        }

        .toast svg {
          color: #22c55e;
        }

        @keyframes toastFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        /* 모달 */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1000;
        }

        .modal-sheet {
          background: white;
          border-radius: 20px 20px 0 0;
          width: 100%;
          max-width: 480px;
          padding: 24px 20px 32px;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .modal-close {
          background: none;
          padding: 4px;
        }

        .modal-desc {
          font-size: 14px;
          color: #888;
          margin-bottom: 20px;
        }

        .name-input {
          width: 100%;
          padding: 16px;
          border: 1.5px solid #e0e0e0;
          border-radius: 12px;
          font-size: 16px;
          margin-bottom: 24px;
          box-sizing: border-box;
        }

        .name-input:focus {
          border-color: #111;
          outline: none;
        }

        .primary-btn {
          width: 100%;
          padding: 16px;
          background: #111;
          color: white;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
        }

        .primary-btn:active {
          background: #333;
        }

        /* 대화 스타일 옵션 */
        .style-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .style-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: #fafafa;
          border-radius: 12px;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .style-option:active {
          transform: scale(0.98);
        }

        .style-option.selected {
          background: #fff;
          border-color: #111;
        }

        .style-option-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .style-label {
          font-size: 15px;
          font-weight: 600;
          color: #111;
        }

        .style-desc {
          font-size: 13px;
          color: #888;
        }

        /* 반려동물 카드 */
        .pet-character-card {
          display: flex;
          align-items: center;
          padding: 16px 18px;
          background: #fff;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
          gap: 14px;
        }

        .pet-character-card:active {
          background: #f5f5f5;
          transform: scale(0.99);
        }

        .pet-preview-circle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: #f5f5f5;
        }

        .pet-preview-circle img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pet-placeholder-circle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 2px dashed #ddd;
        }

        .pet-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pet-name {
          font-size: 15px;
          font-weight: 600;
          color: #222;
        }

        .pet-hint {
          font-size: 13px;
          color: #888;
        }

      `}</style>
    </div>
  )
}

export default Settings
