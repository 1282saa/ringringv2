/**
 * @file pages/TutorSettings.jsx
 * @description 튜터 설정 페이지 - 프리셋, 필터, 난이도 설명 추가
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Sparkles, Check, Plus, Trash2 } from 'lucide-react'
import { TUTORS, DIFFICULTIES, DURATIONS, SPEEDS, ACCENTS, PRESETS, STORAGE_KEYS } from '../constants'
import { useUserSettings } from '../context'
import { haptic } from '../utils/capacitor'
import { getFromStorage, setToStorage } from '../utils/helpers'
import { getCustomTutor, deleteCustomTutor } from '../utils/api'
import { CustomTutorModal, VoiceRecordingSection } from '../components'

function TutorSettings() {
  const navigate = useNavigate()
  const carouselRef = useRef(null)

  // Context에서 설정 가져오기
  const { settings, updateSettings } = useUserSettings()

  const [selectedTutor, setSelectedTutor] = useState('gwen')
  const [difficulty, setDifficulty] = useState('easy')
  const [speed, setSpeed] = useState('normal')
  const [duration, setDuration] = useState('5')
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [accentFilter, setAccentFilter] = useState('all')
  const [showCustomTutorModal, setShowCustomTutorModal] = useState(false)
  const [customTutor, setCustomTutor] = useState(null)

  useEffect(() => {
    // Context에서 저장된 값 로드
    if (settings.tutor) setSelectedTutor(settings.tutor)
    if (settings.difficulty) setDifficulty(settings.difficulty)
    if (settings.speed) setSpeed(settings.speed)
    if (settings.duration) setDuration(settings.duration)

    // 커스텀 튜터 로드 (서버 우선, 로컬 폴백)
    const loadCustomTutor = async () => {
      try {
        const response = await getCustomTutor()
        if (response.success && response.tutor) {
          setCustomTutor(response.tutor)
          // 로컬에도 캐싱 (오프라인용)
          setToStorage(STORAGE_KEYS.CUSTOM_TUTOR, response.tutor)
          return
        }
      } catch (err) {
        console.warn('[TutorSettings] Server load failed:', err)
      }
      // 로컬 폴백
      const savedCustomTutor = getFromStorage(STORAGE_KEYS.CUSTOM_TUTOR, null)
      if (savedCustomTutor) {
        setCustomTutor(savedCustomTutor)
      }
    }
    loadCustomTutor()

    // 선택된 튜터로 스크롤
    const tutorIndex = TUTORS.findIndex(t => t.id === (settings.tutor || 'gwen'))
    if (tutorIndex >= 0) {
      setCurrentPage(tutorIndex)
      setTimeout(() => scrollToTutor(tutorIndex, false), 100)
    }
  }, [])

  // 필터링된 튜터 목록 (커스텀 튜터 포함)
  const allTutors = customTutor ? [customTutor, ...TUTORS] : TUTORS
  const filteredTutors = accentFilter === 'all'
    ? allTutors
    : allTutors.filter(t => t.accent === accentFilter)

  // 프리셋 선택 시 설정 자동 적용
  const handlePresetSelect = (preset) => {
    haptic.medium()
    setSelectedPreset(preset.id)
    setDifficulty(preset.settings.difficulty)
    setSpeed(preset.settings.speed)
    setDuration(preset.settings.duration)
  }

  const handleSave = () => {
    haptic.success()

    // 커스텀 튜터가 선택된 경우 명시적으로 처리
    let tutor
    if (selectedTutor === 'custom-tutor' && customTutor) {
      tutor = customTutor
      console.log('[TutorSettings] Using custom tutor:', customTutor.name, customTutor.image)
    } else {
      tutor = TUTORS.find(t => t.id === selectedTutor) || TUTORS[0]
      console.log('[TutorSettings] Using default tutor:', tutor.name)
    }

    // Context를 통해 설정 저장 (튜터 정보 포함)
    updateSettings({
      tutor: selectedTutor,
      tutorId: selectedTutor,
      tutorName: tutor.name,
      tutorImage: tutor.image,
      accent: tutor.accent,
      gender: tutor.gender,
      conversationStyle: tutor.conversationStyle || 'teacher',
      isCustomTutor: tutor.isCustom || false,
      personalityTags: tutor.tags || [],
      difficulty,
      speed,
      duration,
      preset: selectedPreset,
    })
    navigate(-1)
  }

  // 커스텀 튜터 저장 핸들러
  const handleCustomTutorSave = (tutorData) => {
    setCustomTutor(tutorData)
    setSelectedTutor(tutorData.id)
    setCurrentPage(0)
    setTimeout(() => {
      if (carouselRef.current) {
        carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' })
      }
    }, 100)
  }

  // 커스텀 튜터 삭제 핸들러
  const handleCustomTutorDelete = () => {
    setCustomTutor(null)
    setSelectedTutor('gwen') // 기본 튜터로 변경
    setCurrentPage(0)
  }

  // 카드에서 직접 삭제
  const handleDirectDelete = async (e) => {
    e.stopPropagation()
    haptic.medium()

    try {
      await deleteCustomTutor()
      setToStorage(STORAGE_KEYS.CUSTOM_TUTOR, null)
      setCustomTutor(null)
      setSelectedTutor('gwen')
      setCurrentPage(0)
    } catch (err) {
      console.error('[TutorSettings] Delete error:', err)
    }
  }

  const handleScroll = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft
      const cardWidth = 260 + 16
      const page = Math.round(scrollLeft / cardWidth)
      setCurrentPage(page)
    }
  }

  const scrollToTutor = (index, smooth = true) => {
    haptic.selection()
    if (carouselRef.current) {
      const cardWidth = 260 + 16
      carouselRef.current.scrollTo({
        left: index * cardWidth,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
    const tutor = filteredTutors[index]
    if (tutor) {
      setSelectedTutor(tutor.id)
      setCurrentPage(index)
    }
  }

  // 필터 변경 핸들러
  const handleFilterChange = (accent) => {
    haptic.selection()
    setAccentFilter(accent)
    // 필터 변경 시 첫 번째 튜터 선택
    const filtered = accent === 'all' ? TUTORS : TUTORS.filter(t => t.accent === accent)
    if (filtered.length > 0) {
      setSelectedTutor(filtered[0].id)
      setCurrentPage(0)
      setTimeout(() => {
        if (carouselRef.current) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' })
        }
      }, 100)
    }
  }

  // 옵션 선택 핸들러 (햅틱 포함)
  const handleOptionSelect = (setter, value) => {
    haptic.selection()
    setter(value)
    // 수동 설정 시 프리셋 해제
    setSelectedPreset(null)
  }

  return (
    <div className="tutor-settings-page">
      {/* 헤더 */}
      <header className="page-header">
        <h1>튜터 설정</h1>
        <button className="close-btn" onClick={() => navigate(-1)}>
          <X size={24} color="#6b7280" />
        </button>
      </header>

      <div className="page-content">
        {/* 프리셋 추천 섹션 */}
        <section className="settings-section">
          <div className="section-header">
            <Sparkles size={16} color="#111" />
            <h2 className="section-title-inline">추천 프리셋</h2>
          </div>
          <p className="section-desc">목적에 맞는 설정을 한 번에 적용해요</p>

          <div className="preset-grid">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''}`}
                onClick={() => handlePresetSelect(preset)}
              >
                <span className="preset-label">{preset.label}</span>
                <span className="preset-desc">{preset.description}</span>
                {selectedPreset === preset.id && (
                  <span className="preset-check">
                    <Check size={14} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 튜터 선택 */}
        <section className="settings-section">
          <h2 className="section-title">튜터 선택</h2>

          {/* 악센트 필터 */}
          <div className="filter-chips">
            <button
              className={`filter-chip ${accentFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              전체
            </button>
            {ACCENTS.map((accent) => (
              <button
                key={accent.id}
                className={`filter-chip ${accentFilter === accent.id ? 'active' : ''}`}
                onClick={() => handleFilterChange(accent.id)}
              >
                {accent.label}
              </button>
            ))}
          </div>

          <div
            className="tutor-carousel"
            ref={carouselRef}
            onScroll={handleScroll}
          >
            {/* 나만의 튜터 만들기 카드 */}
            <div
              className="tutor-card create-card"
              onClick={() => {
                haptic.medium()
                setShowCustomTutorModal(true)
              }}
            >
              <div className="tutor-avatar create-avatar">
                <Plus size={28} color="#888" />
              </div>
              <div className="tutor-info">
                <span className="tutor-meta">직접 만들기</span>
                <h3 className="tutor-name">나만의 튜터</h3>
                <div className="tutor-tags">
                  <span className="tutor-tag">커스텀</span>
                </div>
              </div>
            </div>

            {filteredTutors.map((tutor, index) => (
              <div
                key={tutor.id}
                className={`tutor-card ${selectedTutor === tutor.id ? 'selected' : ''} ${tutor.isCustom ? 'custom' : ''}`}
                onClick={() => {
                  if (tutor.isCustom) {
                    // 커스텀 튜터 클릭 시 선택 + 편집 모달 열기
                    haptic.medium()
                    setSelectedTutor(tutor.id)
                    setCurrentPage(index)
                    setShowCustomTutorModal(true)
                  } else {
                    scrollToTutor(index)
                  }
                }}
              >
                <div className="tutor-avatar">
                  {tutor.image ? (
                    <img src={tutor.image} alt={tutor.name} className="tutor-avatar-img" />
                  ) : (
                    <span>{tutor.name.charAt(0)}</span>
                  )}
                </div>
                <div className="tutor-info">
                  <span className="tutor-meta">{tutor.nationality} {tutor.genderLabel}</span>
                  <h3 className="tutor-name">{tutor.name}</h3>
                  <div className="tutor-tags">
                    {tutor.tags.map(tag => (
                      <span key={tag} className="tutor-tag">{tag}</span>
                    ))}
                  </div>
                </div>
                {tutor.isCustom && (
                  <>
                    <span className="custom-badge">MY</span>
                    <button
                      className="tutor-delete-btn"
                      onClick={handleDirectDelete}
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* 페이지 인디케이터 */}
          <div className="carousel-dots">
            {filteredTutors.map((_, index) => (
              <span
                key={index}
                className={`dot ${currentPage === index ? 'active' : ''}`}
                onClick={() => scrollToTutor(index)}
              />
            ))}
          </div>
        </section>

        {/* 난이도 선택 */}
        <section className="settings-section">
          <h2 className="section-title">난이도</h2>
          <div className="difficulty-cards">
            {DIFFICULTIES.map((item) => (
              <button
                key={item.id}
                className={`difficulty-card ${difficulty === item.id ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(setDifficulty, item.id)}
              >
                <div className="difficulty-header">
                  <span className="difficulty-label">{item.label}</span>
                  {difficulty === item.id && (
                    <span className="difficulty-check">
                      <Check size={14} />
                    </span>
                  )}
                </div>
                <p className="difficulty-desc">{item.description}</p>
                <p className="difficulty-detail">{item.detail}</p>
              </button>
            ))}
          </div>
        </section>

        {/* 속도 선택 */}
        <section className="settings-section">
          <h2 className="section-title">말하기 속도</h2>
          <div className="option-group">
            {SPEEDS.map((item) => (
              <button
                key={item.id}
                className={`option-btn ${speed === item.id ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(setSpeed, item.id)}
              >
                {item.label}
                <span className="option-sublabel">{item.sublabel}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 시간 선택 */}
        <section className="settings-section">
          <h2 className="section-title">대화 시간</h2>
          <p className="section-desc">종료 5분 전에 연장할 수 있어요</p>
          <div className="option-group">
            {DURATIONS.map((item) => (
              <button
                key={item.id}
                className={`option-btn ${duration === item.id ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(setDuration, item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* 나만의 음성 섹션 */}
        <VoiceRecordingSection />
      </div>

      {/* 저장 버튼 */}
      <div className="bottom-area">
        <button className="primary-btn" onClick={handleSave}>
          저장
        </button>
      </div>

      {/* 커스텀 튜터 모달 */}
      <CustomTutorModal
        isOpen={showCustomTutorModal}
        onClose={() => setShowCustomTutorModal(false)}
        onSave={handleCustomTutorSave}
        onDelete={handleCustomTutorDelete}
        existingTutor={customTutor}
      />

      <style>{`
        .tutor-settings-page {
          min-height: 100vh;
          background: #fafafa;
          display: flex;
          flex-direction: column;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          background: #fafafa;
        }

        .page-header h1 {
          font-size: 18px;
          font-weight: 700;
          color: #111;
        }

        .close-btn {
          background: none;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .page-content {
          flex: 1;
          padding: 8px 0 120px;
          overflow-y: auto;
        }

        .settings-section {
          margin-bottom: 28px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 20px;
          margin-bottom: 4px;
        }

        .section-title-inline {
          font-size: 14px;
          font-weight: 700;
          color: #111;
        }

        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          padding: 0 20px;
        }

        .section-desc {
          font-size: 13px;
          color: #888;
          margin-bottom: 12px;
          padding: 0 20px;
        }

        /* 프리셋 그리드 */
        .preset-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          padding: 0 20px;
        }

        .preset-card {
          position: relative;
          background: #fff;
          border: 1.5px solid #eee;
          border-radius: 14px;
          padding: 16px 14px;
          text-align: left;
          transition: all 0.15s ease;
        }

        .preset-card.selected {
          border-color: #111;
          background: #fafafa;
        }

        .preset-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #111;
          margin-bottom: 4px;
        }

        .preset-desc {
          display: block;
          font-size: 12px;
          color: #888;
          line-height: 1.4;
        }

        .preset-check {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 20px;
          height: 20px;
          background: #111;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }

        /* 필터 칩 */
        .filter-chips {
          display: flex;
          gap: 8px;
          padding: 0 20px;
          margin-bottom: 12px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .filter-chips::-webkit-scrollbar {
          display: none;
        }

        .filter-chip {
          padding: 8px 16px;
          background: #fff;
          border: 1.5px solid #eee;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          color: #666;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .filter-chip.active {
          background: #111;
          border-color: #111;
          color: #fff;
        }

        /* 튜터 캐러셀 */
        .tutor-carousel {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding: 8px 20px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .tutor-carousel::-webkit-scrollbar {
          display: none;
        }

        .tutor-card {
          flex-shrink: 0;
          width: 200px;
          background: #fff;
          border-radius: 16px;
          padding: 20px 16px;
          scroll-snap-align: start;
          border: 2px solid transparent;
          transition: all 0.15s ease;
          cursor: pointer;
          text-align: center;
        }

        .tutor-card.selected {
          border-color: #111;
        }

        .tutor-card.custom {
          position: relative;
        }

        .tutor-card.create-card {
          border: 2px dashed #ddd;
          background: #fafafa;
        }

        .tutor-card.create-card:active {
          background: #f0f0f0;
        }

        .create-avatar {
          background: #f0f0f0 !important;
          border: 2px dashed #ccc !important;
        }

        .custom-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: #111;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 10px;
        }

        .tutor-delete-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          background: #fff;
          border: 1px solid #eee;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          cursor: pointer;
          transition: all 0.15s ease;
          z-index: 10;
        }

        .tutor-delete-btn:active {
          background: #fee;
          color: #e74c3c;
          border-color: #e74c3c;
        }

        .tutor-avatar {
          width: 64px;
          height: 64px;
          background: #111;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          overflow: hidden;
          border: 2px solid #eee;
        }

        .tutor-avatar span {
          font-size: 24px;
          font-weight: 600;
          color: #fff;
        }

        .tutor-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .tutor-info {
          text-align: center;
        }

        .tutor-meta {
          font-size: 11px;
          color: #999;
          display: block;
          margin-bottom: 2px;
        }

        .tutor-name {
          font-size: 16px;
          font-weight: 700;
          color: #111;
          margin-bottom: 8px;
        }

        .tutor-tags {
          display: flex;
          justify-content: center;
          gap: 4px;
        }

        .tutor-tag {
          font-size: 11px;
          color: #888;
          background: #f5f5f5;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .carousel-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 16px;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ddd;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dot.active {
          background: #111;
          width: 18px;
          border-radius: 3px;
        }

        /* 난이도 카드 */
        .difficulty-cards {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0 20px;
        }

        .difficulty-card {
          background: #fff;
          border: 1.5px solid #eee;
          border-radius: 14px;
          padding: 16px;
          text-align: left;
          transition: all 0.15s ease;
        }

        .difficulty-card.selected {
          border-color: #111;
        }

        .difficulty-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .difficulty-label {
          font-size: 15px;
          font-weight: 600;
          color: #111;
        }

        .difficulty-check {
          width: 20px;
          height: 20px;
          background: #111;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }

        .difficulty-desc {
          font-size: 13px;
          color: #666;
          margin-bottom: 4px;
        }

        .difficulty-detail {
          font-size: 12px;
          color: #999;
        }

        /* 옵션 그룹 */
        .option-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 0 20px;
        }

        .option-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 12px 20px;
          background: #fff;
          border: 1.5px solid #eee;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .option-btn.selected {
          border-color: #111;
          color: #111;
        }

        .option-sublabel {
          font-size: 11px;
          color: #999;
          font-weight: 400;
        }

        /* 하단 버튼 */
        .bottom-area {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px 20px 24px;
          background: #fafafa;
          max-width: 480px;
          margin: 0 auto;
        }

        .primary-btn {
          width: 100%;
          padding: 16px;
          background: #111;
          color: white;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.15s ease;
        }

        .primary-btn:active {
          background: #333;
        }
      `}</style>
    </div>
  )
}

export default TutorSettings
