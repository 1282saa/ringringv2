/**
 * @file pages/RoleplaySettings.jsx
 * @description 롤플레잉/디스커션 알림 설정 페이지 (링글 앱 스타일)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import { getFromStorage } from '../utils/helpers'

function RoleplaySettings() {
  const navigate = useNavigate()

  const [scheduleCount, setScheduleCount] = useState(0)
  const [selectedRoleplay, setSelectedRoleplay] = useState(null)

  useEffect(() => {
    // 일정 카운트 (롤플레잉 타입만)
    const schedules = getFromStorage('callSchedules', {})
    let roleplayCount = 0
    Object.values(schedules).forEach(daySchedules => {
      daySchedules.forEach(schedule => {
        if (schedule.type === 'roleplay') {
          roleplayCount++
        }
      })
    })
    setScheduleCount(roleplayCount)

    // 선택된 롤플레잉 주제
    const saved = getFromStorage('selectedRoleplay', null)
    setSelectedRoleplay(saved)
  }, [])

  return (
    <div className="roleplay-settings-page">
      {/* 헤더 */}
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#1a1a1a" />
        </button>
        <h1>롤플레잉/디스커션 알림</h1>
        <div className="header-spacer" />
      </header>

      {/* 선택된 주제 표시 (있을 경우) */}
      {selectedRoleplay && (
        <div className="next-topic-card">
          <div className="topic-label">
            <MessageCircle size={18} color="#6366f1" />
            <span>다음 주제</span>
          </div>
          <h3 className="topic-title">{selectedRoleplay.title}</h3>
          <p className="topic-desc">{selectedRoleplay.description}</p>
        </div>
      )}

      {/* 메뉴 리스트 */}
      <div className="menu-list">
        <div
          className="menu-item"
          onClick={() => navigate('/settings/schedule')}
        >
          <span className="menu-label">일정</span>
          <div className="menu-right">
            <span className="menu-value">주 {scheduleCount}회</span>
            <ChevronRight size={20} color="#c0c0c0" />
          </div>
        </div>

        <div
          className="menu-item"
          onClick={() => navigate('/settings/roleplay/category')}
        >
          <span className="menu-label">롤플레잉</span>
          <div className="menu-right">
            {selectedRoleplay && (
              <span className="menu-value">{selectedRoleplay.category}</span>
            )}
            <ChevronRight size={20} color="#c0c0c0" />
          </div>
        </div>

        <div className="menu-item disabled">
          <span className="menu-label disabled-text">디스커션</span>
          <div className="menu-right">
            <span className="menu-value disabled-text">오픈 준비중</span>
          </div>
        </div>
      </div>

      {/* 설명 섹션 */}
      <div className="info-section">
        <div className="info-divider" />
        <h3 className="info-title">롤플레잉/디스커션 알림이란?</h3>
        <ul className="info-list">
          <li>AI 올인원 멤버십을 사용하는 고객님만 받을 수 있는 한정 서비스예요.</li>
          <li>설정한 시간에 맞추어 롤플레잉/디스커션 대화로 연결되는 전화를 드려요.</li>
          <li>일반 전화와는 달리, 전화를 받으면 링글 앱이 열려요. 롤플레잉/디스커션을 꾸준히 이어가 보세요!</li>
        </ul>
      </div>

      <style>{`
        .roleplay-settings-page {
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
          font-size: 17px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .back-btn {
          background: none;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .header-spacer {
          width: 32px;
        }

        /* 다음 주제 카드 */
        .next-topic-card {
          margin: 20px;
          padding: 20px;
          background: white;
          border-radius: 16px;
          border: 1px solid #e8e8e8;
        }

        .topic-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .topic-label span {
          font-size: 14px;
          color: #6366f1;
          font-weight: 500;
        }

        .topic-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .topic-desc {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
        }

        /* 메뉴 리스트 */
        .menu-list {
          margin: 0 20px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 20px;
          background: white;
          border-radius: 12px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .menu-item:active:not(.disabled) {
          background: #f9f9f9;
        }

        .menu-item.disabled {
          cursor: default;
        }

        .menu-label {
          font-size: 16px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .menu-label.disabled-text {
          color: #c0c0c0;
        }

        .menu-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .menu-value {
          font-size: 15px;
          color: #666;
        }

        .menu-value.disabled-text {
          color: #c0c0c0;
        }

        /* 설명 섹션 */
        .info-section {
          padding: 20px;
          margin-top: auto;
        }

        .info-divider {
          height: 6px;
          background: linear-gradient(90deg, #e0e7ff 0%, #dbeafe 50%, #e0e7ff 100%);
          margin: 0 -20px 24px;
        }

        .info-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 16px;
        }

        .info-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .info-list li {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
          margin-bottom: 12px;
          padding-left: 16px;
          position: relative;
        }

        .info-list li::before {
          content: '-';
          position: absolute;
          left: 0;
          color: #666;
        }
      `}</style>
    </div>
  )
}

export default RoleplaySettings
