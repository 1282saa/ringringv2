/**
 * @file pages/IncomingCall.jsx
 * @description 전화 수신 화면 - 실제 전화 오는 것처럼 보이는 UI
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Phone, PhoneOff } from 'lucide-react'
import { haptic } from '../utils/capacitor'
import { getFromStorage } from '../utils/helpers'
import { TUTORS } from '../constants'
import './IncomingCall.css'

function IncomingCall() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isRinging, setIsRinging] = useState(true)
  const [callDuration, setCallDuration] = useState(0)

  // 현재 선택된 튜터 정보 가져오기
  const selectedTutorId = getFromStorage('selectedTutor', 'sophia')
  const tutor = TUTORS.find(t => t.id === selectedTutorId) || TUTORS[0]
  const tutorName = getFromStorage('tutorName', tutor.name)

  // 진동 효과 (전화 벨 시뮬레이션)
  useEffect(() => {
    if (!isRinging) return

    const vibrateInterval = setInterval(() => {
      haptic.heavy()
    }, 1000)

    // 30초 후 자동 종료 (부재중)
    const timeout = setTimeout(() => {
      handleDecline()
    }, 30000)

    return () => {
      clearInterval(vibrateInterval)
      clearTimeout(timeout)
    }
  }, [isRinging])

  // 네이티브 브릿지 체크
  const isNativeIncomingCall = typeof window.AndroidBridge !== 'undefined'

  // 전화 받기
  const handleAnswer = () => {
    setIsRinging(false)
    haptic.success()

    // 네이티브 IncomingCallActivity에서 실행 중이면 브릿지 사용
    if (isNativeIncomingCall) {
      window.AndroidBridge.answerCall()
      return
    }

    // 전화 화면으로 이동
    navigate('/call', {
      state: {
        fromIncomingCall: true,
        tutorId: selectedTutorId
      }
    })
  }

  // 전화 거절
  const handleDecline = () => {
    setIsRinging(false)
    haptic.error()

    // 네이티브 IncomingCallActivity에서 실행 중이면 브릿지 사용
    if (isNativeIncomingCall) {
      window.AndroidBridge.declineCall()
      return
    }

    // 홈으로 이동
    navigate('/')
  }

  return (
    <div className="incoming-call">
      {/* 배경 그라데이션 애니메이션 */}
      <div className="incoming-call__background">
        <div className="incoming-call__pulse" />
        <div className="incoming-call__pulse incoming-call__pulse--delayed" />
      </div>

      {/* 튜터 정보 */}
      <div className="incoming-call__info">
        <div className="incoming-call__avatar">
          <div className="incoming-call__avatar-ring" />
          <div className="incoming-call__avatar-inner">
            {tutorName.charAt(0).toUpperCase()}
          </div>
        </div>

        <h1 className="incoming-call__name">{tutorName}</h1>
        <p className="incoming-call__subtitle">AI English Tutor</p>
        <p className="incoming-call__status">
          {isRinging ? '전화가 왔어요...' : '연결 중...'}
        </p>
      </div>

      {/* 액션 버튼 */}
      <div className="incoming-call__actions">
        {/* 거절 버튼 */}
        <button
          className="incoming-call__button incoming-call__button--decline"
          onClick={handleDecline}
        >
          <PhoneOff size={32} />
          <span>거절</span>
        </button>

        {/* 받기 버튼 */}
        <button
          className="incoming-call__button incoming-call__button--answer"
          onClick={handleAnswer}
        >
          <Phone size={32} />
          <span>받기</span>
        </button>
      </div>

      {/* 슬라이드 힌트 */}
      <p className="incoming-call__hint">
        버튼을 눌러 전화를 받거나 거절하세요
      </p>
    </div>
  )
}

export default IncomingCall
