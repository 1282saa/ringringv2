/**
 * @file components/IncomingCallOverlay.jsx
 * @description 자동 팝업 오버레이 (모닝 퀴즈 / 복습 전화)
 */

import { Phone, X, Sun, BookOpen } from 'lucide-react'
import { haptic } from '../utils/capacitor'
import './IncomingCallOverlay.css'

function IncomingCallOverlay({ type, onAccept, onDismiss }) {
  const isMorningQuiz = type === 'morningQuiz'

  const handleAccept = () => {
    haptic.medium()
    onAccept()
  }

  const handleDismiss = () => {
    haptic.light()
    onDismiss()
  }

  return (
    <div className="incoming-overlay">
      <div className="incoming-backdrop" onClick={handleDismiss} />

      <div className="incoming-card">
        {/* 닫기 버튼 */}
        <button className="incoming-close" onClick={handleDismiss}>
          <X size={20} />
        </button>

        {/* 아이콘 */}
        <div className="incoming-icon">
          {isMorningQuiz ? (
            <Sun size={40} color="#111" />
          ) : (
            <BookOpen size={40} color="#111" />
          )}
        </div>

        {/* 제목 */}
        <h2 className="incoming-title">
          {isMorningQuiz ? '모닝 퀴즈 시간!' : '복습 시간이에요'}
        </h2>

        {/* 설명 */}
        <p className="incoming-desc">
          {isMorningQuiz
            ? '어제 배운 표현을 복습해볼까요?'
            : '오늘 배운 내용을 다시 한번 연습해요'}
        </p>

        {/* 버튼 */}
        <div className="incoming-buttons">
          <button className="incoming-accept" onClick={handleAccept}>
            <Phone size={18} />
            <span>{isMorningQuiz ? '퀴즈 시작' : '복습 시작'}</span>
          </button>
          <button className="incoming-later" onClick={handleDismiss}>
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}

export default IncomingCallOverlay
