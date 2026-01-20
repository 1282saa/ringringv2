/**
 * @file pages/PlanSettings.jsx
 * @description 플랜 관리 및 구독 페이지
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, Crown, Zap, Sparkles } from 'lucide-react'
import { useUsage } from '../context'
import { USAGE_LIMITS } from '../utils/api'
import { haptic } from '../utils/capacitor'
import { UsageCard } from '../components'

// 플랜 정보
const PLANS = [
  {
    id: 'free',
    name: '무료',
    price: 0,
    priceLabel: '무료',
    icon: Zap,
    color: '#6b7280',
    bgColor: '#f3f4f6',
    features: [
      '하루 3회 AI 대화',
      '하루 10회 음성 합성',
      '하루 1회 대화 분석',
      '기본 튜터 선택',
    ],
  },
  {
    id: 'basic',
    name: '베이직',
    price: 9900,
    priceLabel: '₩9,900/월',
    icon: Sparkles,
    color: '#7c3aed',
    bgColor: '#ddd6fe',
    recommended: true,
    features: [
      '하루 20회 AI 대화',
      '하루 100회 음성 합성',
      '하루 5회 대화 분석',
      '모든 튜터 선택',
      '대화 기록 무제한 저장',
    ],
  },
  {
    id: 'premium',
    name: '프리미엄',
    price: 19900,
    priceLabel: '₩19,900/월',
    icon: Crown,
    color: '#d97706',
    bgColor: '#fef3c7',
    features: [
      '무제한 AI 대화',
      '무제한 음성 합성',
      '무제한 대화 분석',
      '모든 튜터 선택',
      '대화 기록 무제한 저장',
      '우선 고객 지원',
    ],
  },
]

function PlanSettings() {
  const navigate = useNavigate()
  const { usage, limits } = useUsage()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const currentPlan = usage.plan || 'free'

  const handleSelectPlan = (planId) => {
    if (planId === currentPlan) return
    haptic.light()
    setSelectedPlan(planId)
  }

  const handleSubscribe = async () => {
    if (!selectedPlan || selectedPlan === currentPlan) return

    haptic.medium()
    setIsProcessing(true)

    // TODO: 인앱 결제 연동
    // Google Play Billing / Apple IAP 연동 필요

    setTimeout(() => {
      setIsProcessing(false)
      alert('인앱 결제 기능은 준비 중입니다.\n곧 서비스될 예정이에요!')
    }, 500)
  }

  return (
    <div className="plan-settings">
      {/* Header */}
      <header className="plan-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1>플랜 관리</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="plan-content">
        {/* 현재 사용량 */}
        <section className="current-usage-section">
          <h2 className="section-title">오늘의 사용량</h2>
          <UsageCard showTitle={false} />
        </section>

        {/* 플랜 목록 */}
        <section className="plans-section">
          <h2 className="section-title">플랜 선택</h2>

          <div className="plans-list">
            {PLANS.map((plan) => {
              const Icon = plan.icon
              const isCurrentPlan = currentPlan === plan.id
              const isSelected = selectedPlan === plan.id

              return (
                <div
                  key={plan.id}
                  className={`plan-card ${isCurrentPlan ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {plan.recommended && !isCurrentPlan && (
                    <div className="recommended-badge">추천</div>
                  )}

                  {isCurrentPlan && (
                    <div className="current-badge">현재 플랜</div>
                  )}

                  <div className="plan-card-header">
                    <div
                      className="plan-icon"
                      style={{ backgroundColor: plan.bgColor, color: plan.color }}
                    >
                      <Icon size={24} />
                    </div>
                    <div className="plan-info">
                      <h3 className="plan-name">{plan.name}</h3>
                      <p className="plan-price">{plan.priceLabel}</p>
                    </div>
                    {(isCurrentPlan || isSelected) && (
                      <div className={`check-icon ${isCurrentPlan ? 'current' : 'selected'}`}>
                        <Check size={20} />
                      </div>
                    )}
                  </div>

                  <ul className="plan-features">
                    {plan.features.map((feature, index) => (
                      <li key={index}>
                        <Check size={14} className="feature-check" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        {/* 구독 버튼 */}
        {selectedPlan && selectedPlan !== currentPlan && (
          <div className="subscribe-section">
            <button
              className="subscribe-btn"
              onClick={handleSubscribe}
              disabled={isProcessing}
            >
              {isProcessing ? '처리 중...' : `${PLANS.find(p => p.id === selectedPlan)?.name} 구독하기`}
            </button>
            <p className="subscribe-note">
              언제든지 구독을 취소할 수 있습니다
            </p>
          </div>
        )}

        {/* 안내 */}
        <section className="info-section">
          <h3>자주 묻는 질문</h3>
          <div className="faq-item">
            <p className="faq-q">Q. 사용량은 언제 초기화되나요?</p>
            <p className="faq-a">매일 자정(00:00)에 초기화됩니다.</p>
          </div>
          <div className="faq-item">
            <p className="faq-q">Q. 구독 취소는 어떻게 하나요?</p>
            <p className="faq-a">Google Play Store 또는 App Store의 구독 관리에서 취소할 수 있습니다.</p>
          </div>
          <div className="faq-item">
            <p className="faq-q">Q. 환불이 가능한가요?</p>
            <p className="faq-a">구독 후 7일 이내에 사용 이력이 없는 경우 전액 환불됩니다.</p>
          </div>
        </section>
      </div>

      <style>{`
        .plan-settings {
          min-height: 100vh;
          background: #f9fafb;
        }

        .plan-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .plan-header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .back-btn {
          background: none;
          border: none;
          padding: 8px;
          margin: -8px;
          cursor: pointer;
          color: #374151;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .plan-content {
          padding: 20px;
          padding-bottom: 100px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .current-usage-section {
          margin-bottom: 24px;
        }

        .plans-section {
          margin-bottom: 24px;
        }

        .plans-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .plan-card {
          position: relative;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .plan-card:hover:not(.current) {
          border-color: #d1d5db;
        }

        .plan-card.selected {
          border-color: #5046e4;
          background: #fafafe;
        }

        .plan-card.current {
          border-color: #22c55e;
          background: #f0fdf4;
          cursor: default;
        }

        .recommended-badge {
          position: absolute;
          top: -10px;
          right: 16px;
          background: #5046e4;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 10px;
        }

        .current-badge {
          position: absolute;
          top: -10px;
          right: 16px;
          background: #22c55e;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 10px;
        }

        .plan-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .plan-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .plan-info {
          flex: 1;
        }

        .plan-name {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 2px 0;
        }

        .plan-price {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .check-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .check-icon.current {
          background: #22c55e;
          color: white;
        }

        .check-icon.selected {
          background: #5046e4;
          color: white;
        }

        .plan-features {
          list-style: none;
          margin: 0;
          padding: 0;
          padding-left: 60px;
        }

        .plan-features li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #4b5563;
          margin-bottom: 6px;
        }

        .feature-check {
          color: #22c55e;
          flex-shrink: 0;
        }

        .subscribe-section {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px 20px;
          background: white;
          border-top: 1px solid #e5e7eb;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
        }

        .subscribe-btn {
          width: 100%;
          padding: 16px;
          background: #5046e4;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .subscribe-btn:hover:not(:disabled) {
          background: #4338ca;
        }

        .subscribe-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .subscribe-note {
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
          margin: 8px 0 0 0;
        }

        .info-section {
          background: white;
          border-radius: 16px;
          padding: 16px;
        }

        .info-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 16px 0;
        }

        .faq-item {
          margin-bottom: 16px;
        }

        .faq-item:last-child {
          margin-bottom: 0;
        }

        .faq-q {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          margin: 0 0 4px 0;
        }

        .faq-a {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }
      `}</style>
    </div>
  )
}

export default PlanSettings
