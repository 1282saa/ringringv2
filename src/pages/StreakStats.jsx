/**
 * @file pages/StreakStats.jsx
 * @description 학습 통계 및 연속 학습 기록 페이지
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import { getSessions } from '../utils/api'
import { haptic } from '../utils/capacitor'
import './StreakStats.css'

function StreakStats() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)

  // 세션 데이터 로드
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await getSessions(100) // 최근 100개 세션
        if (response.sessions) {
          setSessions(response.sessions)
        }
      } catch (error) {
        console.error('[StreakStats] Failed to load sessions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSessions()
  }, [])

  // 날짜별 단어 수 계산
  const dailyWordCounts = useMemo(() => {
    const counts = {}
    sessions.forEach(session => {
      if (session.startedAt && session.wordCount) {
        const date = session.startedAt.split('T')[0]
        counts[date] = (counts[date] || 0) + (session.wordCount || 0)
      }
    })
    return counts
  }, [sessions])

  // 연속 학습 주 계산
  const streakWeeks = useMemo(() => {
    const today = new Date()
    let weeks = 0
    let currentWeekStart = new Date(today)
    currentWeekStart.setDate(today.getDate() - today.getDay() + 1) // 월요일

    while (weeks < 52) { // 최대 1년
      const weekStart = new Date(currentWeekStart)
      weekStart.setDate(weekStart.getDate() - (weeks * 7))

      // 해당 주에 학습 기록이 있는지 확인
      let hasActivity = false
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(weekStart)
        checkDate.setDate(checkDate.getDate() + i)
        const dateStr = checkDate.toISOString().split('T')[0]
        if (dailyWordCounts[dateStr] > 0) {
          hasActivity = true
          break
        }
      }

      if (!hasActivity && weeks > 0) break
      if (hasActivity) weeks++
      else break
    }
    return weeks
  }, [dailyWordCounts])

  // 총 단어 수 계산
  const totalWords = useMemo(() => {
    return Object.values(dailyWordCounts).reduce((sum, count) => sum + count, 0)
  }, [dailyWordCounts])

  // 지난 주 대비 계산
  const weekComparison = useMemo(() => {
    const today = new Date()
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay() + 1)

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    let thisWeekWords = 0
    let lastWeekWords = 0

    for (let i = 0; i < 7; i++) {
      const thisDate = new Date(thisWeekStart)
      thisDate.setDate(thisDate.getDate() + i)
      const thisDateStr = thisDate.toISOString().split('T')[0]
      thisWeekWords += dailyWordCounts[thisDateStr] || 0

      const lastDate = new Date(lastWeekStart)
      lastDate.setDate(lastDate.getDate() + i)
      const lastDateStr = lastDate.toISOString().split('T')[0]
      lastWeekWords += dailyWordCounts[lastDateStr] || 0
    }

    return thisWeekWords - lastWeekWords
  }, [dailyWordCounts])

  // 캘린더 데이터 생성
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // 월요일 시작으로 조정
    let startDay = firstDay.getDay() - 1
    if (startDay < 0) startDay = 6

    const days = []

    // 이전 달의 빈 칸
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, wordCount: 0, isCurrentMonth: false })
    }

    // 현재 달의 날짜
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const wordCount = dailyWordCounts[dateStr] || 0

      days.push({
        day,
        wordCount,
        isCurrentMonth: true,
        isToday: dateStr === new Date().toISOString().split('T')[0]
      })
    }

    return days
  }, [currentDate, dailyWordCounts])

  const handlePrevMonth = () => {
    haptic.light()
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    haptic.light()
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleBack = () => {
    haptic.light()
    navigate(-1)
  }

  const monthYear = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`
  const weekDays = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="streak-stats-page">
      {/* 헤더 */}
      <header className="streak-header">
        <button className="back-btn" onClick={handleBack}>
          <ChevronLeft size={24} />
        </button>
      </header>

      {/* 통계 요약 */}
      <div className="streak-summary">
        <p className="streak-label">연속 {streakWeeks}주 동안</p>
        <div className="total-words">
          <Flame size={48} className="flame-icon" />
          <span className="word-count">{totalWords.toLocaleString()}</span>
          <span className="word-unit">단어</span>
        </div>
        <div className="week-comparison">
          <span>지난 주 대비 </span>
          <span className={weekComparison >= 0 ? 'positive' : 'negative'}>
            {weekComparison >= 0 ? '+' : ''}{weekComparison.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 캘린더 */}
      <div className="streak-calendar">
        <div className="calendar-header">
          <button className="nav-btn" onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </button>
          <span className="month-year">{monthYear}</span>
          <button className="nav-btn" onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="weekday-labels">
          {weekDays.map(day => (
            <span key={day} className="weekday">{day}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarData.map((item, index) => (
            <div
              key={index}
              className={`calendar-day ${!item.isCurrentMonth ? 'empty' : ''} ${item.isToday ? 'today' : ''}`}
            >
              {item.day && (
                <>
                  <div className={`day-flame ${item.wordCount > 0 ? 'active' : 'inactive'}`}>
                    <Flame size={28} />
                    <span className="day-number">{item.day}</span>
                  </div>
                  {item.wordCount > 0 && (
                    <span className="day-words">{item.wordCount}</span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  )
}

export default StreakStats
