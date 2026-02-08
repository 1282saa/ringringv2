/**
 * @file pages/ReviewCall.jsx
 * @description 복습 전화 페이지 - 3가지 모드 (문법 교정, 표현 바꿔말하기, 자유대화)
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Play, Pause, CheckCircle } from 'lucide-react'
import { sendMessage, textToSpeech, playAudioBase64, speakWithBrowserTTS } from '../utils/api'
import { haptic } from '../utils/capacitor'
import { saveReviewResult, generateReviewSettingsFromCall } from '../utils/learningCycle'
import './ReviewCall.css'

// 모드별 설정
const REVIEW_MODES = [
  {
    id: 'grammar',
    icon: '📝',
    title: '문법 교정 연습',
    description: 'AI가 제시한 문장의 문법 오류를 찾아 교정해보세요'
  },
  {
    id: 'expression',
    icon: '🔄',
    title: '표현 바꿔 말하기',
    description: '같은 의미를 다른 표현으로 말해보세요'
  },
  {
    id: 'free',
    icon: '💬',
    title: '자유 대화',
    description: 'AI 튜터와 자유롭게 대화하며 복습해요'
  }
]

function ReviewCall() {
  const navigate = useNavigate()
  const audioRef = useRef(null)

  // 모드 선택
  const [selectedMode, setSelectedMode] = useState(null)
  const [isSessionActive, setIsSessionActive] = useState(false)

  // 대화 상태
  const [messages, setMessages] = useState([])
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // 음성 녹음 상태
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  // 연습 진행 상태
  const [practiceCount, setPracticeCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  // 복습 설정 로드
  useEffect(() => {
    const settings = generateReviewSettingsFromCall()
    console.log('[ReviewCall] Review settings:', settings)
  }, [])

  // 음성 인식 초기화
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript)
        }
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // 모드 선택
  const handleSelectMode = (mode) => {
    haptic.light()
    setSelectedMode(mode)
  }

  // 세션 시작
  const handleStartSession = async () => {
    haptic.medium()
    setIsSessionActive(true)
    setMessages([])
    setPracticeCount(0)
    setCorrectCount(0)

    // 모드별 첫 메시지
    let systemMessage = ''
    switch (selectedMode.id) {
      case 'grammar':
        systemMessage = "Great! Let's practice grammar correction. I'll give you sentences with grammar errors, and you correct them. Ready?"
        break
      case 'expression':
        systemMessage = "Excellent! Let's practice paraphrasing. I'll give you a sentence, and you say the same thing in different words. Let's start!"
        break
      case 'free':
        systemMessage = "Hello! Let's have a free conversation to practice your English. What would you like to talk about today?"
        break
    }

    setMessages([{ role: 'assistant', content: systemMessage }])
    await playTTS(systemMessage)

    if (selectedMode.id !== 'free') {
      await getNextPrompt()
    }
  }

  // 다음 연습 문제 가져오기
  const getNextPrompt = async () => {
    setIsLoading(true)
    try {
      let prompt = ''
      if (selectedMode.id === 'grammar') {
        const grammarPrompts = [
          "She don't like coffee.",
          "He have been working here for five years.",
          "I am agree with you.",
          "They was very happy yesterday.",
          "She can sings very well.",
          "I have went to Paris last year.",
          "He don't speaks English.",
          "The informations is incorrect."
        ]
        prompt = grammarPrompts[Math.floor(Math.random() * grammarPrompts.length)]
      } else if (selectedMode.id === 'expression') {
        const expressionPrompts = [
          "I'm very tired today.",
          "This food is delicious.",
          "I need to go now.",
          "That's a great idea!",
          "I don't understand.",
          "Can you help me?",
          "I'm looking forward to it.",
          "That was really fun."
        ]
        prompt = expressionPrompts[Math.floor(Math.random() * expressionPrompts.length)]
      }

      setCurrentPrompt(prompt)

      const promptMessage = selectedMode.id === 'grammar'
        ? `Correct this sentence: "${prompt}"`
        : `Say this in different words: "${prompt}"`

      setMessages(prev => [...prev, { role: 'assistant', content: promptMessage }])
      await playTTS(promptMessage)
    } catch (error) {
      console.error('Error getting prompt:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // TTS 재생
  const playTTS = async (text) => {
    try {
      setIsPlaying(true)
      const response = await textToSpeech(text)
      if (response?.audio) {
        await playAudioBase64(response.audio, audioRef)
      } else {
        await speakWithBrowserTTS(text)
      }
    } catch (error) {
      console.error('TTS Error:', error)
      await speakWithBrowserTTS(text)
    } finally {
      setIsPlaying(false)
    }
  }

  // 녹음 토글
  const toggleRecording = () => {
    haptic.medium()

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      setTranscript('')
      recognitionRef.current?.start()
      setIsRecording(true)
    }
  }

  // 답변 제출
  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) return

    haptic.light()
    const userMessage = transcript.trim()
    setTranscript('')
    setPracticeCount(prev => prev + 1)

    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // AI 피드백 요청
      const feedbackMessages = [
        ...messages,
        { role: 'user', content: userMessage }
      ]

      let systemPrompt = ''
      if (selectedMode.id === 'grammar') {
        systemPrompt = `You are an English tutor. The student is correcting the grammar error in: "${currentPrompt}".
        Their answer: "${userMessage}".
        Give brief feedback (1-2 sentences). If correct, say "Great job!" and explain why. If incorrect, give the correct answer.`
      } else if (selectedMode.id === 'expression') {
        systemPrompt = `You are an English tutor. The student is paraphrasing: "${currentPrompt}".
        Their answer: "${userMessage}".
        Give brief feedback (1-2 sentences). Accept any reasonable paraphrase. Be encouraging.`
      } else {
        systemPrompt = `You are a friendly English conversation partner. Have a natural conversation with the student.
        Keep responses brief (1-2 sentences) and encourage them to speak more.`
      }

      const response = await sendMessage([
        { role: 'system', content: systemPrompt },
        ...feedbackMessages
      ])

      const aiResponse = response.message || "Good job! Let's continue practicing."

      // 정답 여부 판단 (간단한 휴리스틱)
      const isCorrect = aiResponse.toLowerCase().includes('great') ||
                        aiResponse.toLowerCase().includes('correct') ||
                        aiResponse.toLowerCase().includes('good job') ||
                        aiResponse.toLowerCase().includes('well done')

      if (isCorrect) {
        setCorrectCount(prev => prev + 1)
        haptic.success()
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
      await playTTS(aiResponse)

      // 다음 문제 (grammar/expression 모드)
      if (selectedMode.id !== 'free' && practiceCount < 4) {
        setTimeout(() => getNextPrompt(), 1000)
      }
    } catch (error) {
      console.error('AI Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't process that. Let's try again."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // 세션 종료
  const handleEndSession = () => {
    haptic.medium()

    // 결과 저장
    saveReviewResult({
      mode: selectedMode.id,
      practice_count: practiceCount,
      correct_count: correctCount,
      retention_rate: practiceCount > 0 ? (correctCount / practiceCount) * 100 : 0
    })

    navigate('/', { state: { activeTab: 'call' } })
  }

  // 뒤로가기
  const handleBack = () => {
    haptic.light()
    if (isSessionActive) {
      handleEndSession()
    } else {
      navigate(-1)
    }
  }

  // 모드 선택 화면
  if (!selectedMode) {
    return (
      <div className="review-call">
        <header className="rc-header">
          <button className="rc-back-btn" onClick={handleBack}>
            <ArrowLeft size={24} />
          </button>
          <h1>복습 모드 선택</h1>
          <div className="rc-header-spacer" />
        </header>

        <div className="rc-mode-selection">
          <p className="rc-mode-desc">오늘 배운 내용을 복습해봐요</p>

          <div className="rc-modes">
            {REVIEW_MODES.map(mode => (
              <button
                key={mode.id}
                className="rc-mode-card"
                onClick={() => handleSelectMode(mode)}
              >
                <span className="rc-mode-icon">{mode.icon}</span>
                <h3>{mode.title}</h3>
                <p>{mode.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 세션 시작 전
  if (!isSessionActive) {
    return (
      <div className="review-call">
        <header className="rc-header">
          <button className="rc-back-btn" onClick={() => setSelectedMode(null)}>
            <ArrowLeft size={24} />
          </button>
          <h1>{selectedMode.title}</h1>
          <div className="rc-header-spacer" />
        </header>

        <div className="rc-ready">
          <span className="rc-ready-icon">{selectedMode.icon}</span>
          <h2>{selectedMode.title}</h2>
          <p>{selectedMode.description}</p>

          <button className="rc-start-btn" onClick={handleStartSession}>
            복습 시작하기
          </button>
        </div>
      </div>
    )
  }

  // 세션 진행 중
  return (
    <div className="review-call">
      <header className="rc-header">
        <button className="rc-back-btn" onClick={handleBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>{selectedMode.title}</h1>
        <div className="rc-progress-badge">
          {practiceCount > 0 && `${correctCount}/${practiceCount}`}
        </div>
      </header>

      {/* 대화 영역 */}
      <div className="rc-chat">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`rc-message ${msg.role}`}
          >
            <p>{msg.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="rc-message assistant loading">
            <div className="rc-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="rc-input-area">
        {transcript && (
          <div className="rc-transcript">
            <p>{transcript}</p>
            <button className="rc-submit-btn" onClick={handleSubmitAnswer}>
              <CheckCircle size={20} />
            </button>
          </div>
        )}

        <div className="rc-controls">
          <button
            className={`rc-mic-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            disabled={isPlaying || isLoading}
          >
            {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
          </button>

          <button className="rc-end-btn" onClick={handleEndSession}>
            복습 종료
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReviewCall
