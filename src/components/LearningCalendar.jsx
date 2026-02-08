/**
 * @file components/LearningCalendar.jsx
 * @description 월간 학습 캘린더 (투두메이트 스타일)
 */

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getFromStorage } from '../utils/helpers'
import { STORAGE_KEYS } from '../constants'
import { haptic } from '../utils/capacitor'
import './LearningCalendar.css'

// 학습 타입별 색상
const LEARNING_COLORS = {
  quiz: '#fbbf24',    // 노란색 (모닝 퀴즈)
  call: '#111111',    // 검정색 (AI 수업)
  review: '#6366f1'   // 보라색 (복습)
}

// 요일 라벨
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function LearningCalendar({ onDateSelect }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [learningData, setLearningData] = useState({})

  // 학습 데이터 로드
  useEffect(() => {
    loadLearningData()

    // 학습 세션 업데이트 이벤트 리스닝
    const handleUpdate = () => loadLearningData()
    window.addEventListener('learning-session-updated', handleUpdate)
    return () => window.removeEventListener('learning-session-updated', handleUpdate)
  }, [currentDate])

  const loadLearningData = () => {
    const sessions = getFromStorage(STORAGE_KEYS.LEARNING_SESSIONS, [])
    const dataByDate = {}

    sessions.forEach(session => {
      const dateKey = new Date(session.date).toDateString()
      if (!dataByDate[dateKey]) {
        dataByDate[dateKey] = { quiz: false, call: false, review: false }
      }
      if (session.type === 'quiz') dataByDate[dateKey].quiz = true
      if (session.type === 'call') dataByDate[dateKey].call = true
      if (session.type === 'review') dataByDate[dateKey].review = true
    })

    setLearningData(dataByDate)
  }

  // 월 변경
  const changeMonth = (delta) => {
    haptic.light()
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentDate(newDate)
  }

  // 날짜 선택
  const handleDateClick = (day) => {
    if (!day) return
    haptic.selection()

    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(date.toDateString())

    if (onDateSelect) {
      const dateKey = date.toDateString()
      onDateSelect(date, learningData[dateKey] || null)
    }
  }

  // 달력 날짜 생성
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []

    // 이전 달 빈 칸
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // 현재 달 날짜
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  // 날짜별 학습 상태 가져오기
  const getDayStatus = (day) => {
    if (!day) return null

    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dateKey = date.toDateString()
    return learningData[dateKey] || null
  }

  // 오늘 날짜 확인
  const isToday = (day) => {
    if (!day) return false
    const today = new Date()
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  // 미래 날짜 확인
  const isFutureDate = (day) => {
    if (!day) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return date > today
  }

  // 선택된 날짜 확인
  const isSelected = (day) => {
    if (!day || !selectedDate) return false
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return date.toDateString() === selectedDate
  }

  const days = generateCalendarDays()
  const monthYear = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`

  // 이번 달 통계 계산
  const getMonthStats = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    let completeDays = 0
    let partialDays = 0

    Object.entries(learningData).forEach(([dateKey, status]) => {
      const date = new Date(dateKey)
      if (date.getFullYear() === year && date.getMonth() === month) {
        const completed = [status.quiz, status.call, status.review].filter(Boolean).length
        if (completed === 3) completeDays++
        else if (completed > 0) partialDays++
      }
    })

    return { completeDays, partialDays }
  }

  const stats = getMonthStats()

  return (
    <div className="learning-calendar">
      {/* 헤더 */}
      <div className="lc-header">
        <button className="lc-nav-btn" onClick={() => changeMonth(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h3 className="lc-month">{monthYear}</h3>
        <button className="lc-nav-btn" onClick={() => changeMonth(1)}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="lc-weekdays">
        {WEEKDAYS.map(day => (
          <span key={day} className={`lc-weekday ${day === '일' ? 'sunday' : day === '토' ? 'saturday' : ''}`}>
            {day}
          </span>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="lc-days">
        {days.map((day, idx) => {
          const status = getDayStatus(day)
          const today = isToday(day)
          const future = isFutureDate(day)
          const selected = isSelected(day)
          const hasActivity = status && (status.quiz || status.call || status.review)

          return (
            <button
              key={idx}
              className={`lc-day ${!day ? 'empty' : ''} ${today ? 'today' : ''} ${future ? 'future' : ''} ${selected ? 'selected' : ''} ${hasActivity ? 'has-activity' : ''}`}
              onClick={() => handleDateClick(day)}
              disabled={!day}
            >
              {day && <span className="lc-day-number">{day}</span>}
            </button>
          )
        })}
      </div>

      {/* 간단한 통계 - 한 줄로 */}
      {(stats.completeDays + stats.partialDays) > 0 && (
        <div className="lc-summary">
          <span className="lc-summary-text">이번 달 {stats.completeDays + stats.partialDays}일 학습</span>
        </div>
      )}
    </div>
  )
}

export default LearningCalendar
