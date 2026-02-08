/**
 * @file pages/MorningQuiz.jsx
 * @description 아침 영어 듣기 퀴즈 페이지
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, CheckCircle, XCircle } from 'lucide-react'
import { textToSpeech, playAudioBase64, speakWithBrowserTTS } from '../utils/api'
import { haptic } from '../utils/capacitor'
import {
  buildPersonalizedQuiz,
  saveQuizResult,
  generateCallSettingsFromQuiz
} from '../utils/learningCycle'
import './MorningQuiz.css'

function MorningQuiz() {
  const navigate = useNavigate()

  // 퀴즈 데이터 생성
  const [quizData] = useState(() => buildPersonalizedQuiz())

  // 퀴즈 상태
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isAnswerChecked, setIsAnswerChecked] = useState(false)
  const [answers, setAnswers] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [responseTimes, setResponseTimes] = useState([])
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())

  // 오디오 상태
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [playCount, setPlayCount] = useState(0)
  const audioRef = useRef(null)

  const quiz = quizData.questions[currentQuestion]
  const totalQuestions = quizData.questions.length
  const correctAnswers = answers.filter(a => a).length

  // 오디오 재생
  const handlePlayAudio = async () => {
    if (isLoading) return

    haptic.light()

    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    const correctAnswer = quiz.options[quiz.correctIndex]

    try {
      setIsLoading(true)
      setIsPlaying(true)
      setPlayCount(prev => prev + 1)

      const ttsResponse = await textToSpeech(correctAnswer)

      if (ttsResponse?.audio) {
        await playAudioBase64(ttsResponse.audio, audioRef)
        setIsPlaying(false)
      } else {
        await speakWithBrowserTTS(correctAnswer)
        setIsPlaying(false)
      }
    } catch (error) {
      console.error('TTS Error:', error)
      try {
        await speakWithBrowserTTS(correctAnswer)
      } catch (e) {
        console.error('Browser TTS also failed:', e)
      }
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }

  // 답 선택
  const handleSelectAnswer = (index) => {
    if (isAnswerChecked) return
    haptic.selection()
    setSelectedAnswer(index)
  }

  // 정답 확인
  const handleCheckAnswer = () => {
    if (selectedAnswer === null) return

    haptic.medium()
    setIsAnswerChecked(true)

    const responseTime = Date.now() - questionStartTime
    setResponseTimes(prev => [...prev, responseTime])

    const isCorrect = selectedAnswer === quiz.correctIndex
    setAnswers(prev => [...prev, isCorrect])

    if (isCorrect) {
      haptic.success()
    } else {
      haptic.error()
    }
  }

  // 다음 문제
  const handleNextQuestion = () => {
    haptic.light()

    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }

    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1)
      setSelectedAnswer(null)
      setIsAnswerChecked(false)
      setPlayCount(0)
      setQuestionStartTime(Date.now())
    } else {
      setShowResult(true)
    }
  }

  // 본 수업 시작
  const handleStartLesson = () => {
    haptic.medium()
    const autoCallSettings = generateCallSettingsFromQuiz()

    navigate('/call', {
      state: {
        mode: 'main',
        fromQuiz: true,
        quizScore: correctAnswers,
        totalQuestions: totalQuestions,
        learningCycleSettings: autoCallSettings,
        focusAreas: autoCallSettings.focus_areas,
        focusIntensity: autoCallSettings.focus_intensity
      }
    })
  }

  // 다시 풀기
  const handleRetry = () => {
    haptic.medium()
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setIsAnswerChecked(false)
    setAnswers([])
    setShowResult(false)
    setPlayCount(0)
    setResponseTimes([])
    setQuestionStartTime(Date.now())
  }

  // 뒤로가기
  const handleBack = () => {
    haptic.light()
    navigate(-1)
  }

  // 결과 점수
  const scorePercent = totalQuestions > 0
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0

  // 학습 세션 저장
  useEffect(() => {
    if (showResult && totalQuestions > 0) {
      saveQuizResult({
        questions: quizData.questions,
        correct_answers: answers,
        correct_count: correctAnswers,
        total_count: totalQuestions,
        total_accuracy: scorePercent,
        response_times: responseTimes,
        avg_response_time: responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0
      })
    }
  }, [showResult, scorePercent, totalQuestions, answers, correctAnswers, responseTimes, quizData.questions])

  // 결과 화면
  if (showResult) {
    return (
      <div className="morning-quiz">
        <header className="mq-header">
          <button className="mq-back-btn" onClick={handleBack}>
            <ArrowLeft size={24} />
          </button>
          <h1>퀴즈 결과</h1>
          <div className="mq-header-spacer" />
        </header>

        <div className="mq-result">
          <div className="mq-result-card">
            <div className="mq-result-emoji">
              {scorePercent >= 80 ? '🎉' : scorePercent >= 60 ? '👍' : '💪'}
            </div>
            <h2 className="mq-result-title">
              {totalQuestions}문제 중 {correctAnswers}개 정답!
            </h2>
            <div className="mq-result-bar">
              <div
                className="mq-result-fill"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <p className="mq-result-percent">{scorePercent}%</p>
          </div>

          {answers.some((a, idx) => !a) && (
            <div className="mq-wrong-section">
              <h3>틀린 문제 복습</h3>
              {quizData.questions.map((q, index) => (
                !answers[index] && (
                  <div key={q.id} className="mq-wrong-card">
                    <div className="mq-wrong-header">
                      <span className="mq-wrong-badge">오답</span>
                      <span className="mq-wrong-number">Q{index + 1}</span>
                    </div>
                    <p className="mq-wrong-text">"{q.text}"</p>
                    <p className="mq-focus-tag">{q.focus}</p>
                  </div>
                )
              ))}
            </div>
          )}

          <div className="mq-result-actions">
            <button className="mq-start-btn" onClick={handleStartLesson}>
              본 수업 시작하기
            </button>
            <button className="mq-retry-btn" onClick={handleRetry}>
              다시 풀기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="morning-quiz">
      {/* 헤더 */}
      <header className="mq-header">
        <button className="mq-back-btn" onClick={handleBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>오늘의 영어 퀴즈</h1>
        <span className="mq-progress-text">{currentQuestion + 1}/{totalQuestions}</span>
      </header>

      {/* 진행률 바 */}
      <div className="mq-progress-bar">
        <div
          className="mq-progress-fill"
          style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* 문제 영역 */}
      <div className="mq-content">
        <div className="mq-question-section">
          <span className="mq-question-badge">Q{currentQuestion + 1}</span>

          {/* 오디오 플레이어 */}
          <div className="mq-audio-player">
            <button
              className={`mq-play-btn ${isPlaying ? 'playing' : ''} ${isLoading ? 'loading' : ''}`}
              onClick={handlePlayAudio}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="mq-loading-spinner" />
              ) : isPlaying ? (
                <Pause size={32} />
              ) : (
                <Play size={32} />
              )}
            </button>
            <div className="mq-audio-info">
              <Volume2 size={16} />
              <span>듣기 {playCount > 0 ? `(${playCount}회 재생됨)` : ''}</span>
            </div>
          </div>

          <button className="mq-replay-btn" onClick={handlePlayAudio} disabled={isLoading}>
            <RotateCcw size={16} />
            다시 듣기
          </button>

          <p className="mq-question-text">{quiz.question}</p>
        </div>

        {/* 보기 영역 */}
        <div className="mq-options-section">
          {quiz.options.map((option, index) => {
            let optionClass = 'mq-option-btn'

            if (isAnswerChecked) {
              if (index === quiz.correctIndex) {
                optionClass += ' correct'
              } else if (index === selectedAnswer && selectedAnswer !== quiz.correctIndex) {
                optionClass += ' wrong'
              }
            } else if (selectedAnswer === index) {
              optionClass += ' selected'
            }

            return (
              <button
                key={index}
                className={optionClass}
                onClick={() => handleSelectAnswer(index)}
                disabled={isAnswerChecked}
              >
                <span className="mq-option-number">{index + 1}</span>
                <span className="mq-option-text">{option}</span>
                {isAnswerChecked && index === quiz.correctIndex && (
                  <CheckCircle size={20} className="mq-option-icon correct" />
                )}
                {isAnswerChecked && index === selectedAnswer && selectedAnswer !== quiz.correctIndex && (
                  <XCircle size={20} className="mq-option-icon wrong" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="mq-footer">
        {!isAnswerChecked ? (
          <button
            className="mq-action-btn mq-check-btn"
            onClick={handleCheckAnswer}
            disabled={selectedAnswer === null}
          >
            정답 확인
          </button>
        ) : (
          <button
            className="mq-action-btn mq-next-btn"
            onClick={handleNextQuestion}
          >
            {currentQuestion < totalQuestions - 1 ? '다음 문제' : '결과 보기'}
          </button>
        )}
      </div>
    </div>
  )
}

export default MorningQuiz
