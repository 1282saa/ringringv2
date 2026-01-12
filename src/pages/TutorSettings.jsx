/**
 * @file pages/TutorSettings.jsx
 * @description 튜터 설정 페이지 (링글 앱 스타일)
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'
import { TUTORS, DIFFICULTIES, DURATIONS, SPEEDS } from '../constants'

function TutorSettings() {
  const navigate = useNavigate()
  const carouselRef = useRef(null)

  const [selectedTutor, setSelectedTutor] = useState('gwen')
  const [difficulty, setDifficulty] = useState('easy')
  const [speed, setSpeed] = useState('normal')
  const [duration, setDuration] = useState('5')
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    const saved = getFromStorage('tutorSettings', {})
    if (saved.tutor) setSelectedTutor(saved.tutor)
    if (saved.difficulty) setDifficulty(saved.difficulty)
    if (saved.speed) setSpeed(saved.speed)
    if (saved.duration) setDuration(saved.duration)

    // 선택된 튜터로 스크롤
    const tutorIndex = TUTORS.findIndex(t => t.id === (saved.tutor || 'gwen'))
    if (tutorIndex >= 0) {
      setCurrentPage(tutorIndex)
      setTimeout(() => scrollToTutor(tutorIndex, false), 100)
    }
  }, [])

  const handleSave = () => {
    const settings = {
      tutor: selectedTutor,
      difficulty,
      speed,
      duration,
    }
    setToStorage('tutorSettings', settings)
    setToStorage('selectedTutor', selectedTutor)
    navigate(-1)
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
    if (carouselRef.current) {
      const cardWidth = 260 + 16
      carouselRef.current.scrollTo({
        left: index * cardWidth,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
    setSelectedTutor(TUTORS[index].id)
    setCurrentPage(index)
  }

  return (
    <div className="tutor-settings-page">
      {/* 헤더 */}
      <header className="page-header">
        <h1>튜터</h1>
        <button className="close-btn" onClick={() => navigate(-1)}>
          <X size={24} color="#6b7280" />
        </button>
      </header>

      <div className="page-content">
        {/* 튜터 선택 */}
        <section className="settings-section">
          <h2 className="section-title">튜터 선택</h2>

          <div
            className="tutor-carousel"
            ref={carouselRef}
            onScroll={handleScroll}
          >
            {TUTORS.map((tutor, index) => (
              <div
                key={tutor.id}
                className={`tutor-card ${selectedTutor === tutor.id ? 'selected' : ''}`}
                onClick={() => scrollToTutor(index)}
              >
                <span className="tutor-meta">{tutor.nationality} {tutor.genderLabel}</span>
                <h3 className="tutor-name">{tutor.name}</h3>
                <div className="tutor-tags">
                  {tutor.tags.join('  ')}
                </div>
              </div>
            ))}
          </div>

          {/* 페이지 인디케이터 */}
          <div className="carousel-dots">
            {TUTORS.map((_, index) => (
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
          <h2 className="section-title">난이도 선택</h2>
          <div className="option-group">
            {DIFFICULTIES.map((item) => (
              <button
                key={item.id}
                className={`option-btn ${difficulty === item.id ? 'selected' : ''}`}
                onClick={() => setDifficulty(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* 속도 선택 */}
        <section className="settings-section">
          <h2 className="section-title">속도 선택</h2>
          <div className="option-group">
            {SPEEDS.map((item) => (
              <button
                key={item.id}
                className={`option-btn ${speed === item.id ? 'selected' : ''}`}
                onClick={() => setSpeed(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* 시간 선택 */}
        <section className="settings-section">
          <h2 className="section-title">시간 선택</h2>
          <p className="section-desc">종료 전 5분 단위로 연장할 수 있어요.</p>
          <div className="option-group">
            {DURATIONS.map((item) => (
              <button
                key={item.id}
                className={`option-btn ${duration === item.id ? 'selected' : ''}`}
                onClick={() => setDuration(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* 저장 버튼 */}
      <div className="bottom-area">
        <button className="primary-btn" onClick={handleSave}>
          저장
        </button>
      </div>

      <style>{`
        .tutor-settings-page {
          min-height: 100vh;
          background: #f7f7f8;
          display: flex;
          flex-direction: column;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: white;
        }

        .page-header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .close-btn {
          background: none;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .page-content {
          flex: 1;
          padding: 20px 0;
          overflow-y: auto;
          padding-bottom: 100px;
        }

        .settings-section {
          margin-bottom: 32px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #666;
          margin-bottom: 12px;
          padding: 0 20px;
          letter-spacing: -0.2px;
        }

        .section-desc {
          font-size: 13px;
          color: #888;
          margin-bottom: 12px;
          padding: 0 20px;
        }

        /* 튜터 캐러셀 */
        .tutor-carousel {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding: 0 20px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .tutor-carousel::-webkit-scrollbar {
          display: none;
        }

        .tutor-card {
          flex-shrink: 0;
          width: 260px;
          background: white;
          border-radius: 16px;
          padding: 24px 20px;
          scroll-snap-align: start;
          border: 2px solid transparent;
          transition: all 0.2s;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tutor-card.selected {
          border-color: #6366f1;
          background: #f5f3ff;
        }

        .tutor-meta {
          font-size: 13px;
          color: #888;
        }

        .tutor-name {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .tutor-tags {
          font-size: 13px;
          color: #888;
          margin-top: 4px;
        }

        .carousel-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d0d0d0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dot.active {
          background: #6366f1;
          width: 20px;
          border-radius: 4px;
        }

        /* 옵션 그룹 */
        .option-group {
          display: flex;
          gap: 10px;
          padding: 0 20px;
        }

        .option-btn {
          flex: 1;
          padding: 14px 20px;
          background: white;
          border: 1.5px solid #e0e0e0;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          color: #666;
          transition: all 0.2s;
        }

        .option-btn.selected {
          border-color: #6366f1;
          color: #6366f1;
          background: #f5f3ff;
        }

        /* 하단 버튼 */
        .bottom-area {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px 20px 24px;
          background: white;
          border-top: 1px solid #e8e8e8;
          max-width: 480px;
          margin: 0 auto;
        }

        .primary-btn {
          width: 100%;
          padding: 16px;
          background: #6366f1;
          color: white;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
        }

        .primary-btn:active {
          background: #4f46e5;
        }
      `}</style>
    </div>
  )
}

export default TutorSettings
