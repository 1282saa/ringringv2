/**
 * @file components/DailyScheduleInput.jsx
 * @description 오늘의 일정 입력 컴포넌트
 */

import { useState, useEffect } from 'react'
import { Plus, X, Calendar, Globe, Clock, Briefcase, Coffee, Users, Presentation, MessageSquare } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'
import { STORAGE_KEYS } from '../constants'
import { haptic } from '../utils/capacitor'
import './DailyScheduleInput.css'

// 일정 타입 프리셋
const EVENT_PRESETS = [
  { icon: Users, label: '회의', type: 'meeting' },
  { icon: Presentation, label: '발표', type: 'presentation' },
  { icon: MessageSquare, label: '통화', type: 'call' },
  { icon: Briefcase, label: '업무', type: 'work' },
  { icon: Coffee, label: '점심', type: 'lunch' },
]

function DailyScheduleInput({ onScheduleChange }) {
  const [events, setEvents] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEvent, setNewEvent] = useState({
    time: '09:00',
    title: '',
    type: 'meeting',
    isEnglish: false
  })

  // 오늘 날짜 키
  const getTodayKey = () => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }

  // 일정 로드
  useEffect(() => {
    loadTodayEvents()
  }, [])

  const loadTodayEvents = () => {
    const allEvents = getFromStorage(STORAGE_KEYS.DAILY_EVENTS, {})
    const todayKey = getTodayKey()
    const todayEvents = allEvents[todayKey] || []
    setEvents(todayEvents.sort((a, b) => a.time.localeCompare(b.time)))
  }

  // 일정 저장
  const saveEvents = (newEvents) => {
    const allEvents = getFromStorage(STORAGE_KEYS.DAILY_EVENTS, {})
    const todayKey = getTodayKey()
    allEvents[todayKey] = newEvents

    // 30일 이상 된 데이터 정리
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    Object.keys(allEvents).forEach(key => {
      if (new Date(key) < thirtyDaysAgo) {
        delete allEvents[key]
      }
    })

    setToStorage(STORAGE_KEYS.DAILY_EVENTS, allEvents)
    setEvents(newEvents.sort((a, b) => a.time.localeCompare(b.time)))

    if (onScheduleChange) {
      onScheduleChange(newEvents)
    }
  }

  // 일정 추가
  const handleAddEvent = () => {
    if (!newEvent.title.trim()) {
      haptic.warning()
      return
    }

    haptic.success()
    const event = {
      id: Date.now().toString(),
      ...newEvent,
      title: newEvent.title.trim()
    }

    const updatedEvents = [...events, event]
    saveEvents(updatedEvents)

    // 폼 초기화
    setNewEvent({
      time: '09:00',
      title: '',
      type: 'meeting',
      isEnglish: false
    })
    setShowAddForm(false)
  }

  // 일정 삭제
  const handleDeleteEvent = (eventId) => {
    haptic.light()
    const updatedEvents = events.filter(e => e.id !== eventId)
    saveEvents(updatedEvents)
  }

  // 영어 토글
  const toggleEnglish = (eventId) => {
    haptic.selection()
    const updatedEvents = events.map(e =>
      e.id === eventId ? { ...e, isEnglish: !e.isEnglish } : e
    )
    saveEvents(updatedEvents)
  }

  // 프리셋 선택
  const handlePresetSelect = (preset) => {
    haptic.selection()
    setNewEvent(prev => ({
      ...prev,
      type: preset.type,
      title: prev.title || preset.label
    }))
  }

  // 시간 포맷
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? '오후' : '오전'
    const hour12 = hour % 12 || 12
    return `${ampm} ${hour12}:${minutes}`
  }

  // 이벤트 타입 아이콘
  const getEventIcon = (type) => {
    const preset = EVENT_PRESETS.find(p => p.type === type)
    if (preset) {
      const Icon = preset.icon
      return <Icon size={16} />
    }
    return <Calendar size={16} />
  }

  const today = new Date()
  const todayLabel = `${today.getMonth() + 1}월 ${today.getDate()}일`

  return (
    <div className="daily-schedule">
      {/* 헤더 */}
      <div className="ds-header">
        <div className="ds-header-left">
          <Calendar size={18} color="#111" />
          <h3>오늘의 일정</h3>
          <span className="ds-date">{todayLabel}</span>
        </div>
        <button
          className="ds-add-btn"
          onClick={() => {
            haptic.light()
            setShowAddForm(!showAddForm)
          }}
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      {/* 일정 추가 폼 */}
      {showAddForm && (
        <div className="ds-add-form">
          {/* 프리셋 버튼 */}
          <div className="ds-presets">
            {EVENT_PRESETS.map(preset => {
              const Icon = preset.icon
              return (
                <button
                  key={preset.type}
                  className={`ds-preset ${newEvent.type === preset.type ? 'active' : ''}`}
                  onClick={() => handlePresetSelect(preset)}
                >
                  <Icon size={16} />
                  <span>{preset.label}</span>
                </button>
              )
            })}
          </div>

          {/* 시간 & 제목 입력 */}
          <div className="ds-input-row">
            <div className="ds-time-input">
              <Clock size={16} color="#888" />
              <input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
            <input
              type="text"
              className="ds-title-input"
              placeholder="일정 제목 입력"
              value={newEvent.title}
              onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && handleAddEvent()}
            />
          </div>

          {/* 영어 사용 여부 */}
          <label className="ds-english-toggle">
            <div className="ds-toggle-left">
              <Globe size={16} color={newEvent.isEnglish ? '#111' : '#888'} />
              <span>영어로 진행하는 일정</span>
            </div>
            <div className="ds-toggle-switch">
              <input
                type="checkbox"
                checked={newEvent.isEnglish}
                onChange={(e) => setNewEvent(prev => ({ ...prev, isEnglish: e.target.checked }))}
              />
              <span className="toggle-slider" />
            </div>
          </label>

          {/* 추가 버튼 */}
          <button className="ds-submit-btn" onClick={handleAddEvent}>
            일정 추가
          </button>
        </div>
      )}

      {/* 일정 목록 */}
      {events.length > 0 ? (
        <div className="ds-events">
          {events.map(event => (
            <div key={event.id} className={`ds-event ${event.isEnglish ? 'english' : ''}`}>
              <div className="ds-event-time">{formatTime(event.time)}</div>
              <div className="ds-event-content">
                <span className="ds-event-title">{event.title}</span>
                {event.isEnglish && (
                  <span className="ds-english-badge">EN</span>
                )}
              </div>
              <button
                className="ds-delete-btn"
                onClick={() => handleDeleteEvent(event.id)}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : !showAddForm && (
        <div className="ds-empty">
          <p>오늘 일정이 없어요</p>
        </div>
      )}
    </div>
  )
}

export default DailyScheduleInput
