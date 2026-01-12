/**
 * @file pages/CurriculumSettings.jsx
 * @description 커리큘럼 설정 페이지 (링글 앱 스타일)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown, Check, X, PlaySquare, Plane, Puzzle, UtensilsCrossed, Briefcase, Cpu, GraduationCap, Heart, Palette, Newspaper } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'

const TOPICS = [
  {
    id: 'youtube',
    label: '유튜브',
    icon: 'PlaySquare',
    subtopics: ['유튜브 트렌드', '인기 영상 분석', '크리에이터 문화']
  },
  {
    id: 'travel',
    label: '여행',
    icon: 'Plane',
    subtopics: ['여행 계획', '공항 대화', '호텔 예약', '관광 안내']
  },
  {
    id: 'daily',
    label: '일상과 취미',
    icon: 'Puzzle',
    subtopics: ['주말 계획', '취미 소개', '일상 대화', '친구와 만남']
  },
  {
    id: 'food',
    label: '음식과 요리',
    icon: 'UtensilsCrossed',
    subtopics: ['레시피 설명', '식당 주문', '음식 리뷰', '요리 팁']
  },
  {
    id: 'career',
    label: '직장과 커리어',
    icon: 'Briefcase',
    subtopics: ['직장 생활', '이직 준비', '면접 연습', '업무 대화']
  },
  {
    id: 'tech',
    label: '기술과 트렌드',
    icon: 'Cpu',
    subtopics: ['AI 기술', '스마트폰', '앱 추천', '테크 뉴스']
  },
  {
    id: 'education',
    label: '교육과 자기계발',
    icon: 'GraduationCap',
    subtopics: ['학습 방법', '자격증', '온라인 강의', '목표 설정']
  },
  {
    id: 'health',
    label: '건강과 운동',
    icon: 'Heart',
    subtopics: ['운동 루틴', '건강 관리', '다이어트', '스트레스 해소']
  },
  {
    id: 'culture',
    label: '문화와 예술',
    icon: 'Palette',
    subtopics: ['영화 리뷰', '음악 추천', '전시회', '공연 감상']
  },
  {
    id: 'news',
    label: '시사와 뉴스',
    icon: 'Newspaper',
    subtopics: ['최신 뉴스', '경제 이슈', '사회 현상', '글로벌 트렌드']
  },
]

const ICON_MAP = {
  PlaySquare,
  Plane,
  Puzzle,
  UtensilsCrossed,
  Briefcase,
  Cpu,
  GraduationCap,
  Heart,
  Palette,
  Newspaper
}

function CurriculumSettings() {
  const navigate = useNavigate()

  const [selectedTopics, setSelectedTopics] = useState([])
  const [expandedTopics, setExpandedTopics] = useState([])

  useEffect(() => {
    const saved = getFromStorage('selectedCurriculum', [])
    setSelectedTopics(saved)
    setExpandedTopics(saved)
  }, [])

  const toggleTopic = (topicId) => {
    setSelectedTopics(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId)
      } else {
        return [...prev, topicId]
      }
    })
  }

  const toggleExpand = (topicId) => {
    setExpandedTopics(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId)
      } else {
        return [...prev, topicId]
      }
    })
  }

  const handleSave = () => {
    setToStorage('selectedCurriculum', selectedTopics)
    navigate(-1)
  }

  return (
    <div className="curriculum-settings-page">
      {/* 헤더 */}
      <header className="page-header">
        <h1>커리큘럼</h1>
        <button className="close-btn" onClick={() => navigate(-1)}>
          <X size={24} color="#1a1a1a" />
        </button>
      </header>

      {/* 설명 */}
      <div className="page-desc">
        <p>주제를 선택하고 나만의 커리큘럼을 만들어 보세요.</p>
        <p>선택한 주제에 맞춰 랜덤으로 상황이 제시됩니다.</p>
      </div>

      {/* 주제 목록 */}
      <div className="topic-list">
        {TOPICS.map((topic) => {
          const isSelected = selectedTopics.includes(topic.id)
          const isExpanded = expandedTopics.includes(topic.id)

          return (
            <div
              key={topic.id}
              className={`topic-card ${isSelected ? 'selected' : ''}`}
            >
              {/* 주제 헤더 */}
              <div className="topic-header" onClick={() => toggleExpand(topic.id)}>
                <div
                  className={`checkbox ${isSelected ? 'checked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTopic(topic.id)
                  }}
                >
                  {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                </div>
                <span className="topic-icon">
                  {(() => {
                    const IconComponent = ICON_MAP[topic.icon]
                    return IconComponent ? <IconComponent size={24} color={isSelected ? '#6366f1' : '#9ca3af'} /> : null
                  })()}
                </span>
                <span className="topic-label">{topic.label}</span>
                <span className="expand-icon">
                  {isExpanded ? (
                    <ChevronUp size={20} color="#888" />
                  ) : (
                    <ChevronDown size={20} color="#888" />
                  )}
                </span>
              </div>

              {/* 서브 주제 */}
              {isExpanded && (
                <div className="subtopic-list">
                  {topic.subtopics.map((subtopic, index) => (
                    <div key={index} className="subtopic-item">
                      <span className="bullet">•</span>
                      <span>{subtopic}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 저장 버튼 */}
      <div className="bottom-area">
        <button className="primary-btn" onClick={handleSave}>
          저장
        </button>
      </div>

      <style>{`
        .curriculum-settings-page {
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

        .page-desc {
          padding: 20px 20px 16px;
        }

        .page-desc p {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
          margin-bottom: 4px;
        }

        .topic-list {
          padding: 0 20px;
        }

        .topic-card {
          background: white;
          border-radius: 16px;
          margin-bottom: 12px;
          overflow: hidden;
          border: 2px solid transparent;
          transition: all 0.2s;
        }

        .topic-card.selected {
          border-color: #6366f1;
          background: #f5f3ff;
        }

        .topic-header {
          display: flex;
          align-items: center;
          padding: 18px 16px;
          cursor: pointer;
          gap: 12px;
        }

        .checkbox {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 2px solid #d0d0d0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .checkbox.checked {
          background: #6366f1;
          border-color: #6366f1;
        }

        .topic-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .topic-label {
          flex: 1;
          font-size: 16px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .expand-icon {
          display: flex;
          align-items: center;
        }

        .subtopic-list {
          padding: 0 16px 16px 56px;
        }

        .subtopic-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          font-size: 14px;
          color: #666;
        }

        .bullet {
          color: #6366f1;
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

export default CurriculumSettings
