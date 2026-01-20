/**
 * @file components/UsageDisplay.jsx
 * @description 사용량 표시 컴포넌트
 */

import { useUsage } from '../context'
import { Zap, MessageCircle, Volume2, BarChart2 } from 'lucide-react'

/**
 * 사용량 진행 바
 */
function UsageBar({ current, max, color = '#5046e4' }) {
  const percentage = max === -1 ? 100 : Math.min((current / max) * 100, 100)
  const isUnlimited = max === -1

  return (
    <div className="usage-bar-container">
      <div className="usage-bar-bg">
        <div
          className="usage-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: isUnlimited ? '#22c55e' : color,
          }}
        />
      </div>
      <span className="usage-bar-text">
        {isUnlimited ? '무제한' : `${current} / ${max}`}
      </span>

      <style>{`
        .usage-bar-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .usage-bar-bg {
          flex: 1;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }
        .usage-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .usage-bar-text {
          font-size: 12px;
          color: #6b7280;
          min-width: 60px;
          text-align: right;
        }
      `}</style>
    </div>
  )
}

/**
 * 사용량 아이템
 */
function UsageItem({ icon: Icon, label, current, max, color }) {
  return (
    <div className="usage-item">
      <div className="usage-item-header">
        <div className="usage-item-label">
          <Icon size={16} className="usage-item-icon" style={{ color }} />
          <span>{label}</span>
        </div>
      </div>
      <UsageBar current={current} max={max} color={color} />

      <style>{`
        .usage-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .usage-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .usage-item-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #374151;
        }
        .usage-item-icon {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}

/**
 * 전체 사용량 표시 카드
 */
export function UsageCard({ showTitle = true, compact = false }) {
  const { usage, limits, isUnlimited } = useUsage()

  if (usage.loading) {
    return (
      <div className="usage-card loading">
        <div className="usage-skeleton" />
        <div className="usage-skeleton" />
        <div className="usage-skeleton" />
      </div>
    )
  }

  return (
    <div className={`usage-card ${compact ? 'compact' : ''}`}>
      {showTitle && (
        <div className="usage-card-header">
          <div className="usage-plan-badge" data-plan={usage.plan}>
            <Zap size={14} />
            <span>{limits.label} 플랜</span>
          </div>
          {usage.resetTime && (
            <span className="usage-reset-time">
              매일 자정 초기화
            </span>
          )}
        </div>
      )}

      <div className="usage-items">
        <UsageItem
          icon={MessageCircle}
          label="AI 대화"
          current={usage.chatCount}
          max={limits.dailyChatCount}
          color="#5046e4"
        />
        <UsageItem
          icon={Volume2}
          label="음성 합성"
          current={usage.ttsCount}
          max={limits.dailyTtsCount}
          color="#8b5cf6"
        />
        <UsageItem
          icon={BarChart2}
          label="대화 분석"
          current={usage.analyzeCount}
          max={limits.dailyAnalyzeCount}
          color="#f59e0b"
        />
      </div>

      {!isUnlimited && (
        <p className="usage-upgrade-hint">
          더 많은 기능이 필요하신가요? 플랜을 업그레이드하세요!
        </p>
      )}

      <style>{`
        .usage-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .usage-card.compact {
          padding: 12px;
        }
        .usage-card.loading {
          min-height: 150px;
        }
        .usage-skeleton {
          height: 24px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          margin-bottom: 12px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .usage-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .usage-plan-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .usage-plan-badge[data-plan="free"] {
          background: #f3f4f6;
          color: #6b7280;
        }
        .usage-plan-badge[data-plan="basic"] {
          background: #ddd6fe;
          color: #7c3aed;
        }
        .usage-plan-badge[data-plan="premium"] {
          background: #fef3c7;
          color: #d97706;
        }
        .usage-reset-time {
          font-size: 11px;
          color: #9ca3af;
        }
        .usage-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .usage-card.compact .usage-items {
          gap: 8px;
        }
        .usage-upgrade-hint {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #f3f4f6;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
        .usage-card.compact .usage-upgrade-hint {
          display: none;
        }
      `}</style>
    </div>
  )
}

/**
 * 홈 화면용 간단한 사용량 표시
 */
export function UsageBadge() {
  const { usage, limits, isUnlimited } = useUsage()

  if (usage.loading) return null

  const remaining = isUnlimited
    ? -1
    : limits.dailyChatCount - usage.chatCount

  return (
    <div className="usage-badge" data-low={remaining <= 1 && remaining !== -1}>
      <MessageCircle size={14} />
      <span>
        {isUnlimited
          ? '무제한'
          : `오늘 ${remaining}회 남음`}
      </span>

      <style>{`
        .usage-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: #f3f4f6;
          border-radius: 12px;
          font-size: 12px;
          color: #6b7280;
        }
        .usage-badge[data-low="true"] {
          background: #fef2f2;
          color: #ef4444;
        }
      `}</style>
    </div>
  )
}

export default UsageCard
