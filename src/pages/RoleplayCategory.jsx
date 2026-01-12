/**
 * @file pages/RoleplayCategory.jsx
 * @description 롤플레잉 카테고리/시나리오 선택 페이지 (링글 앱 스타일)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { setToStorage } from '../utils/helpers'

const CATEGORIES = [
  { id: 'travel', label: '해외여행 필수영어' },
  { id: 'work', label: '직장에서의 일상대화' },
]

const SCENARIOS = {
  travel: [
    {
      id: 'immigration',
      title: '출입국 관리소에서',
      description: '입국 심사대에서 입국 수속과 통관 절차를 밟고 있습니다.',
      level: 'Basic',
      image: '🛂',
      bgColor: '#e0e7ff',
    },
    {
      id: 'rental',
      title: '렌터카',
      description: '여행 목적지에 도착해서 렌터카를 빌리려고 합니다.',
      level: 'Basic',
      image: '🚗',
      bgColor: '#dbeafe',
    },
    {
      id: 'local',
      title: '로컬처럼 여행하기!',
      description: '여러분은 여행 목적지에서 현지인처럼 여행하고 싶습니다.',
      level: 'Basic',
      image: '🗺️',
      bgColor: '#e0e7ff',
    },
    {
      id: 'hotel',
      title: '호텔에서',
      description: '여러분은 며칠간 묵을 호텔에 체크인하려고 합니다.',
      level: 'Basic',
      image: '🏨',
      bgColor: '#dbeafe',
    },
    {
      id: 'restaurant',
      title: '레스토랑에서',
      description: '현지 레스토랑에서 음식을 주문하고 식사를 즐기려 합니다.',
      level: 'Basic',
      image: '🍽️',
      bgColor: '#e0e7ff',
    },
    {
      id: 'shopping',
      title: '쇼핑하기',
      description: '여행지에서 기념품이나 필요한 물건을 쇼핑하고 있습니다.',
      level: 'Basic',
      image: '🛍️',
      bgColor: '#dbeafe',
    },
  ],
  work: [
    {
      id: 'meeting',
      title: '미팅 참석하기',
      description: '팀 미팅에서 의견을 나누고 프로젝트를 논의합니다.',
      level: 'Basic',
      image: '📊',
      bgColor: '#fef3c7',
    },
    {
      id: 'email',
      title: '이메일 작성하기',
      description: '업무 관련 이메일을 영어로 작성해야 합니다.',
      level: 'Basic',
      image: '📧',
      bgColor: '#fce7f3',
    },
    {
      id: 'presentation',
      title: '프레젠테이션',
      description: '영어로 프레젠테이션을 진행해야 합니다.',
      level: 'Intermediate',
      image: '📈',
      bgColor: '#fef3c7',
    },
    {
      id: 'negotiation',
      title: '협상하기',
      description: '비즈니스 협상을 영어로 진행합니다.',
      level: 'Advanced',
      image: '🤝',
      bgColor: '#fce7f3',
    },
  ],
}

function RoleplayCategory() {
  const navigate = useNavigate()

  const [activeCategory, setActiveCategory] = useState('travel')
  const [selectedScenario, setSelectedScenario] = useState(null)

  const handleSelect = () => {
    if (!selectedScenario) return

    const categoryLabel = CATEGORIES.find(c => c.id === activeCategory)?.label
    setToStorage('selectedRoleplay', {
      ...selectedScenario,
      category: categoryLabel,
    })
    navigate(-1)
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'Basic':
        return { bg: '#dcfce7', text: '#16a34a' }
      case 'Intermediate':
        return { bg: '#fef3c7', text: '#d97706' }
      case 'Advanced':
        return { bg: '#fee2e2', text: '#dc2626' }
      default:
        return { bg: '#f3f4f6', text: '#6b7280' }
    }
  }

  return (
    <div className="roleplay-category-page">
      {/* 헤더 */}
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#1a1a1a" />
        </button>
        <h1>생활 필수영어</h1>
        <div className="header-spacer" />
      </header>

      {/* 카테고리 탭 */}
      <div className="category-tabs">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* 시나리오 그리드 */}
      <div className="scenario-grid">
        {SCENARIOS[activeCategory].map((scenario) => {
          const isSelected = selectedScenario?.id === scenario.id
          const levelStyle = getLevelColor(scenario.level)

          return (
            <div
              key={scenario.id}
              className={`scenario-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedScenario(scenario)}
            >
              <div
                className="scenario-image"
                style={{ backgroundColor: scenario.bgColor }}
              >
                <span className="scenario-emoji">{scenario.image}</span>
              </div>
              <div className="scenario-content">
                <span
                  className="level-badge"
                  style={{
                    backgroundColor: levelStyle.bg,
                    color: levelStyle.text,
                  }}
                >
                  {scenario.level}
                </span>
                <h3 className="scenario-title">{scenario.title}</h3>
                <p className="scenario-desc">{scenario.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단 버튼 */}
      <div className="bottom-area">
        <button
          className={`select-btn ${selectedScenario ? 'active' : ''}`}
          onClick={handleSelect}
          disabled={!selectedScenario}
        >
          선택 완료
        </button>
      </div>

      <style>{`
        .roleplay-category-page {
          min-height: 100vh;
          background: #f7f7f8;
          display: flex;
          flex-direction: column;
          padding-bottom: 100px;
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

        /* 카테고리 탭 */
        .category-tabs {
          display: flex;
          gap: 10px;
          padding: 16px 20px;
          background: white;
        }

        .category-tab {
          padding: 10px 18px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          background: white;
          border: 1px solid #e0e0e0;
          transition: all 0.2s;
        }

        .category-tab.active {
          background: #f5f3ff;
          border-color: #6366f1;
          color: #6366f1;
        }

        /* 시나리오 그리드 */
        .scenario-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 16px 20px;
        }

        .scenario-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scenario-card.selected {
          border-color: #6366f1;
        }

        .scenario-card:active {
          transform: scale(0.98);
        }

        .scenario-image {
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scenario-emoji {
          font-size: 48px;
        }

        .scenario-content {
          padding: 14px;
        }

        .level-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .scenario-title {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 6px;
        }

        .scenario-desc {
          font-size: 13px;
          color: #888;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
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

        .select-btn {
          width: 100%;
          padding: 16px;
          background: #e0e0e0;
          color: #a0a0a0;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .select-btn.active {
          background: #6366f1;
          color: white;
        }

        .select-btn.active:active {
          background: #4f46e5;
        }
      `}</style>
    </div>
  )
}

export default RoleplayCategory
