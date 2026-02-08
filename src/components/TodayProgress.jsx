/**
 * @file components/TodayProgress.jsx
 * @description 오늘의 학습 진행률 컴포넌트
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { getTodayProgress, calculateStreak } from '../utils/learningCycle'
import { haptic } from '../utils/capacitor'
import './TodayProgress.css'

function TodayProgress() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(null)
  const [streak, setStreak] = useState(0)

  // 진행 상황 업데이트 함수
  const updateProgress = () => {
    const data = getTodayProgress()
    setProgress(data)
    setStreak(calculateStreak())
  }

  useEffect(() => {
    updateProgress()

    // localStorage 변경 감시
    const handleStorageChange = () => {
      updateProgress()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('learning-session-updated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('learning-session-updated', handleStorageChange)
    }
  }, [])

  // 각 스텝별 클릭 핸들러
  const handleStepClick = (stepId) => {
    haptic.light()
    switch (stepId) {
      case 'quiz':
        navigate('/morning-quiz')
        break
      case 'call':
        navigate('/call')
        break
      case 'review':
        navigate('/review-call')
        break
      default:
        break
    }
  }

  // 스텝 상태 결정
  const getStepStatus = (stepId) => {
    switch (stepId) {
      case 'quiz':
        return progress?.quizDone ? 'completed' : 'available'
      case 'call':
        return progress?.callDone ? 'completed' : 'available'
      case 'review':
        return progress?.reviewDone ? 'completed' : 'available'
      default:
        return 'available'
    }
  }

  // 현재 추천 스텝 확인
  const getCurrentRecommended = () => {
    if (!progress?.quizDone) return 'quiz'
    if (!progress?.callDone) return 'call'
    if (!progress?.reviewDone) return 'review'
    return null
  }

  const recommendedStep = getCurrentRecommended()

  const steps = [
    {
      id: 'quiz',
      step: 1,
      label: '퀴즈',
      status: getStepStatus('quiz'),
      isRecommended: recommendedStep === 'quiz'
    },
    {
      id: 'call',
      step: 2,
      label: '수업',
      status: getStepStatus('call'),
      isRecommended: recommendedStep === 'call'
    },
    {
      id: 'review',
      step: 3,
      label: '복습',
      status: getStepStatus('review'),
      isRecommended: recommendedStep === 'review'
    }
  ]

  const completedCount = steps.filter(s => s.status === 'completed').length
  const allCompleted = completedCount === steps.length

  return (
    <div className="today-progress">
      {/* 오늘의 학습 카드 */}
      <div className="tp-card">
        <div className="tp-header">
          <h3 className="tp-title">오늘의 학습</h3>
          <span className="tp-count">{completedCount}/{steps.length}</span>
        </div>

        <div className="tp-steps">
          {steps.map((step, index) => (
            <div key={step.id} className="tp-step-wrapper">
              <button
                className={`tp-step ${step.status}`}
                onClick={() => handleStepClick(step.id)}
              >
                <div className={`tp-step-circle ${step.status}`}>
                  {step.status === 'completed' ? (
                    <Check size={16} strokeWidth={3} />
                  ) : (
                    <span>{step.step}</span>
                  )}
                </div>
                <span className="tp-step-label">{step.label}</span>
              </button>

              {index < steps.length - 1 && (
                <div className={`tp-connector ${step.status === 'completed' ? 'completed' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* 진행률 바 */}
        <div className="tp-progress-bar">
          <div
            className="tp-progress-fill"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default TodayProgress
