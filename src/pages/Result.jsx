import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, CheckCircle, Loader, Flame, TrendingUp, BookOpen, Calendar, ChevronRight } from 'lucide-react'
import { analyzeConversation } from '../utils/api'
import { formatDuration, getFromStorage, setToStorage } from '../utils/helpers'
import { useLocalStorage } from '../hooks'
import { useUserSettings } from '../context'
import { STORAGE_KEYS } from '../constants'

function Result() {
  const navigate = useNavigate()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [toast, setToast] = useState(null)

  // 커스텀 훅으로 상태 관리
  const [result] = useLocalStorage(STORAGE_KEYS.LAST_CALL_RESULT, null)
  const { settings } = useUserSettings()

  // 스트릭 계산
  const [streak, setStreak] = useState(1)
  const [previousWordCount, setPreviousWordCount] = useState(0)

  useEffect(() => {
    // 스트릭 업데이트
    const savedStreak = getFromStorage('learningStreak', { count: 0, lastDate: null })
    const today = new Date().toDateString()

    if (savedStreak.lastDate !== today) {
      const newStreak = savedStreak.lastDate === new Date(Date.now() - 86400000).toDateString()
        ? savedStreak.count + 1
        : 1
      setStreak(newStreak)
      setToStorage('learningStreak', { count: newStreak, lastDate: today })
    } else {
      setStreak(savedStreak.count || 1)
    }

    // 이전 단어 수 가져오기
    const prevCount = getFromStorage('previousWordCount', 0)
    setPreviousWordCount(prevCount)

    // 현재 단어 수 저장 (다음 비교용)
    if (result?.wordCount) {
      setToStorage('previousWordCount', result.wordCount)
    }
  }, [result])

  const requestAnalysis = async () => {
    if (!result?.messages || result.messages.length === 0) return

    setIsAnalyzing(true)
    try {
      const response = await analyzeConversation(result.messages)
      if (response.analysis) {
        navigate('/analysis', {
          state: {
            callData: {
              ...result,
              analysis: response.analysis
            }
          }
        })
      }
    } catch (err) {
      console.error('Analysis failed:', err)
      const fallbackAnalysis = {
        cafp_scores: { complexity: 70, accuracy: 75, fluency: 72, pronunciation: 78 },
        fillers: { count: 0, words: [], percentage: 0 },
        grammar_corrections: [],
        vocabulary: { total_words: 0, unique_words: 0, advanced_words: [], suggested_words: [] },
        overall_feedback: '대화를 완료하셨습니다!',
        improvement_tips: []
      }
      navigate('/analysis', {
        state: {
          callData: {
            ...result,
            analysis: fallbackAnalysis
          }
        }
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 말한 단어 수
  const wordCount = result?.wordCount || result?.messages
    ?.filter(m => m.speaker === 'user' || m.role === 'user')
    .reduce((acc, m) => acc + (m.content?.split(' ').filter(w => w.length > 0).length || 0), 0) || 0

  // 성장 지표
  const wordGrowth = previousWordCount > 0 ? wordCount - previousWordCount : 0
  const growthPercentage = previousWordCount > 0 ? Math.round((wordGrowth / previousWordCount) * 100) : 0

  // 토스트 알림
  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  // AI 분석 요청
  const handleAnalysisRequest = () => {
    if (wordCount < 30) {
      showToast('AI 분석을 받으려면 최소 30단어가 필요해요.')
      return
    }
    requestAnalysis()
  }

  // 스크립트 보기
  const handleViewScript = () => {
    navigate('/script', { state: { callData: result } })
  }

  // 연습하기
  const handlePractice = () => {
    navigate('/practice', { state: { callData: result } })
  }

  return (
    <div className="result-page">
      {/* Header */}
      <header className="result-header">
        <button className="close-btn" onClick={() => navigate('/')}>
          <X size={24} color="#999" />
        </button>
      </header>

      {/* Success Section */}
      <div className="success-section">
        <div className="success-icon">
          <CheckCircle size={44} color="#fff" />
        </div>
        <h1>오늘도 해냈어요!</h1>

        {/* Streak Badge */}
        <div className="streak-badge">
          <Flame size={18} color="#fff" fill="#fff" />
          <span>{streak}일 연속 학습</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">말한 단어</span>
            <span className="stat-value">{wordCount}</span>
            {wordGrowth > 0 && (
              <div className="stat-growth">
                <TrendingUp size={14} />
                <span>+{wordGrowth} (+{growthPercentage}%)</span>
              </div>
            )}
          </div>
          <div className="stat-card">
            <span className="stat-label">대화 시간</span>
            <span className="stat-value">{result?.duration ? formatDuration(result.duration) : '-'}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>지금 바로 확인하기</h2>

        <button className="action-card" onClick={handleViewScript}>
          <div className="action-icon">
            <BookOpen size={20} />
          </div>
          <div className="action-content">
            <span className="action-title">대화 스크립트</span>
            <span className="action-desc">전체 대화 내용과 교정 확인</span>
          </div>
          <ChevronRight size={20} color="#ccc" />
        </button>

        <button className="action-card" onClick={handleAnalysisRequest} disabled={isAnalyzing}>
          <div className="action-icon analysis">
            {isAnalyzing ? <Loader size={20} className="spin" /> : <TrendingUp size={20} />}
          </div>
          <div className="action-content">
            <span className="action-title">AI 분석 리포트</span>
            <span className="action-desc">CAFP 점수, 개선점, 추천 학습</span>
          </div>
          <ChevronRight size={20} color="#ccc" />
        </button>

        <button className="action-card" onClick={handlePractice}>
          <div className="action-icon practice">
            <span className="practice-badge">3</span>
          </div>
          <div className="action-content">
            <span className="action-title">틀린 표현 바로 연습</span>
            <span className="action-desc">핵심 표현 3개 빠르게 복습</span>
          </div>
          <ChevronRight size={20} color="#ccc" />
        </button>
      </div>

      {/* Bottom CTA */}
      <div className="bottom-actions">
        <button className="secondary-btn" onClick={() => navigate('/settings/schedule')}>
          <Calendar size={18} />
          다음 전화 예약
        </button>
        <button className="primary-btn" onClick={() => navigate('/')}>
          완료
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast">{toast}</div>
      )}

      <style>{`
        .result-page {
          min-height: 100vh;
          background: #fafafa;
          padding-bottom: 120px;
        }

        .result-header {
          display: flex;
          justify-content: flex-end;
          padding: 16px 20px;
        }

        .close-btn {
          background: none;
          padding: 8px;
        }

        /* Success Section */
        .success-section {
          text-align: center;
          padding: 20px 20px 32px;
        }

        .success-icon {
          width: 72px;
          height: 72px;
          background: #111;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .success-section h1 {
          font-size: 24px;
          font-weight: 700;
          color: #111;
          margin-bottom: 12px;
        }

        .streak-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #111;
          color: #fff;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }

        /* Stats Section */
        .stats-section {
          padding: 0 20px;
          margin-bottom: 24px;
        }

        .stats-grid {
          display: flex;
          gap: 12px;
        }

        .stat-card {
          flex: 1;
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 13px;
          color: #888;
          margin-bottom: 8px;
        }

        .stat-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #111;
        }

        .stat-growth {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          padding: 4px 10px;
          background: #e8f5e9;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #2e7d32;
        }

        /* Quick Actions */
        .quick-actions {
          padding: 0 20px;
        }

        .quick-actions h2 {
          font-size: 12px;
          font-weight: 600;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          padding-left: 4px;
        }

        .action-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          background: #fff;
          border: none;
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 10px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .action-card:active {
          transform: scale(0.98);
          background: #f5f5f5;
        }

        .action-card:disabled {
          opacity: 0.6;
        }

        .action-icon {
          width: 44px;
          height: 44px;
          background: #f5f5f5;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111;
        }

        .action-icon.analysis {
          background: #e3f2fd;
          color: #1976d2;
        }

        .action-icon.practice {
          background: #fff3e0;
          position: relative;
        }

        .practice-badge {
          font-size: 18px;
          font-weight: 700;
          color: #e65100;
        }

        .action-content {
          flex: 1;
        }

        .action-title {
          display: block;
          font-size: 15px;
          font-weight: 600;
          color: #111;
          margin-bottom: 2px;
        }

        .action-desc {
          display: block;
          font-size: 13px;
          color: #888;
        }

        /* Bottom Actions */
        .bottom-actions {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          gap: 10px;
          padding: 16px 20px 32px;
          background: #fafafa;
          max-width: 480px;
          margin: 0 auto;
        }

        .secondary-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          background: #fff;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
        }

        .secondary-btn:active {
          background: #f5f5f5;
        }

        .primary-btn {
          flex: 1;
          padding: 16px;
          background: #111;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
        }

        .primary-btn:active {
          background: #333;
        }

        /* Toast */
        .toast {
          position: fixed;
          bottom: 140px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          color: #fff;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 14px;
          z-index: 1000;
          animation: fadeInUp 0.3s ease;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Result
