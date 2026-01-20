/**
 * @file components/UpgradeModal.jsx
 * @description 사용량 초과 시 업그레이드 안내 모달
 */

import { Modal } from './Modal'
import { useUsage } from '../context'
import { USAGE_LIMITS } from '../utils/api'
import { Zap, Check, Crown, Sparkles, AlertCircle } from 'lucide-react'

/**
 * 제한 타입별 메시지
 */
const LIMIT_MESSAGES = {
  chat: {
    title: 'AI 대화 횟수를 모두 사용했어요',
    description: '오늘의 무료 AI 대화 횟수를 모두 사용했습니다.',
  },
  tts: {
    title: '음성 합성 횟수를 모두 사용했어요',
    description: '오늘의 무료 음성 합성 횟수를 모두 사용했습니다.',
  },
  analyze: {
    title: '대화 분석 횟수를 모두 사용했어요',
    description: '오늘의 무료 대화 분석 횟수를 모두 사용했습니다.',
  },
}

/**
 * 플랜 카드
 */
function PlanCard({ plan, planKey, currentPlan, onSelect, recommended = false }) {
  const isCurrentPlan = currentPlan === planKey
  const features = getPlanFeatures(planKey)

  return (
    <div
      className={`plan-card ${recommended ? 'recommended' : ''} ${isCurrentPlan ? 'current' : ''}`}
      onClick={() => !isCurrentPlan && onSelect(planKey)}
    >
      {recommended && (
        <div className="plan-recommended-badge">
          <Sparkles size={12} />
          추천
        </div>
      )}

      <div className="plan-header">
        <div className="plan-icon" data-plan={planKey}>
          {planKey === 'premium' ? <Crown size={20} /> : <Zap size={20} />}
        </div>
        <h3 className="plan-name">{plan.label}</h3>
      </div>

      <div className="plan-price">
        {planKey === 'free' ? (
          <span className="price-free">무료</span>
        ) : planKey === 'basic' ? (
          <>
            <span className="price-amount">9,900</span>
            <span className="price-unit">원/월</span>
          </>
        ) : (
          <>
            <span className="price-amount">19,900</span>
            <span className="price-unit">원/월</span>
          </>
        )}
      </div>

      <ul className="plan-features">
        {features.map((feature, index) => (
          <li key={index} className="plan-feature">
            <Check size={14} className="feature-check" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <button className="plan-button current" disabled>
          현재 플랜
        </button>
      ) : (
        <button className="plan-button">
          {planKey === 'free' ? '무료로 시작' : '업그레이드'}
        </button>
      )}

      <style>{`
        .plan-card {
          position: relative;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .plan-card:hover:not(.current) {
          border-color: #5046e4;
          transform: translateY(-2px);
        }
        .plan-card.recommended {
          border-color: #5046e4;
        }
        .plan-card.current {
          cursor: default;
          opacity: 0.7;
        }
        .plan-recommended-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background: #5046e4;
          color: white;
          font-size: 11px;
          font-weight: 600;
          border-radius: 10px;
        }
        .plan-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .plan-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .plan-icon[data-plan="free"] {
          background: #f3f4f6;
          color: #6b7280;
        }
        .plan-icon[data-plan="basic"] {
          background: #ddd6fe;
          color: #7c3aed;
        }
        .plan-icon[data-plan="premium"] {
          background: #fef3c7;
          color: #d97706;
        }
        .plan-name {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }
        .plan-price {
          margin-bottom: 16px;
        }
        .price-free {
          font-size: 24px;
          font-weight: 700;
          color: #6b7280;
        }
        .price-amount {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
        }
        .price-unit {
          font-size: 14px;
          color: #6b7280;
          margin-left: 2px;
        }
        .plan-features {
          list-style: none;
          margin: 0 0 16px 0;
          padding: 0;
        }
        .plan-feature {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #374151;
          margin-bottom: 8px;
        }
        .feature-check {
          color: #22c55e;
          flex-shrink: 0;
        }
        .plan-button {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: #5046e4;
          color: white;
          transition: background 0.2s;
        }
        .plan-button:hover:not(:disabled) {
          background: #4338ca;
        }
        .plan-button.current {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: default;
        }
      `}</style>
    </div>
  )
}

/**
 * 플랜별 기능 목록
 */
function getPlanFeatures(planKey) {
  const limits = USAGE_LIMITS[planKey]

  if (planKey === 'free') {
    return [
      `하루 ${limits.dailyChatCount}회 AI 대화`,
      `하루 ${limits.dailyTtsCount}회 음성 합성`,
      `하루 ${limits.dailyAnalyzeCount}회 대화 분석`,
      '기본 튜터 선택',
    ]
  }

  if (planKey === 'basic') {
    return [
      `하루 ${limits.dailyChatCount}회 AI 대화`,
      `하루 ${limits.dailyTtsCount}회 음성 합성`,
      `하루 ${limits.dailyAnalyzeCount}회 대화 분석`,
      '모든 튜터 선택',
      '대화 기록 저장',
    ]
  }

  return [
    '무제한 AI 대화',
    '무제한 음성 합성',
    '무제한 대화 분석',
    '모든 튜터 선택',
    '대화 기록 저장',
    '우선 지원',
  ]
}

/**
 * 업그레이드 모달
 */
export function UpgradeModal() {
  const { showUpgradeModal, limitType, usage, closeUpgradeModal } = useUsage()

  const message = limitType ? LIMIT_MESSAGES[limitType] : {
    title: '플랜 업그레이드',
    description: '더 많은 기능을 이용하세요.',
  }

  const handleSelectPlan = (planKey) => {
    if (planKey === 'free') {
      closeUpgradeModal()
      return
    }

    // TODO: 인앱 결제 연동
    // 현재는 안내 메시지만 표시
    alert(`${USAGE_LIMITS[planKey].label} 플랜 결제 기능은 준비 중입니다.`)
  }

  return (
    <Modal
      isOpen={showUpgradeModal}
      onClose={closeUpgradeModal}
      title=""
      size="lg"
    >
      <div className="upgrade-modal">
        <div className="upgrade-header">
          <div className="upgrade-icon">
            <AlertCircle size={32} />
          </div>
          <h2 className="upgrade-title">{message.title}</h2>
          <p className="upgrade-description">{message.description}</p>
          <p className="upgrade-reset-hint">
            내일 자정에 사용량이 초기화됩니다.
          </p>
        </div>

        <div className="plans-grid">
          <PlanCard
            plan={USAGE_LIMITS.basic}
            planKey="basic"
            currentPlan={usage.plan}
            onSelect={handleSelectPlan}
            recommended
          />
          <PlanCard
            plan={USAGE_LIMITS.premium}
            planKey="premium"
            currentPlan={usage.plan}
            onSelect={handleSelectPlan}
          />
        </div>

        <button className="upgrade-later-btn" onClick={closeUpgradeModal}>
          나중에 할게요
        </button>
      </div>

      <style>{`
        .upgrade-modal {
          text-align: center;
        }
        .upgrade-header {
          margin-bottom: 24px;
        }
        .upgrade-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          background: #fef3c7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d97706;
        }
        .upgrade-title {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }
        .upgrade-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }
        .upgrade-reset-hint {
          font-size: 12px;
          color: #9ca3af;
          margin: 8px 0 0 0;
        }
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (max-width: 500px) {
          .plans-grid {
            grid-template-columns: 1fr;
          }
        }
        .upgrade-later-btn {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 14px;
          cursor: pointer;
          padding: 8px 16px;
        }
        .upgrade-later-btn:hover {
          color: #374151;
        }
      `}</style>
    </Modal>
  )
}

export default UpgradeModal
