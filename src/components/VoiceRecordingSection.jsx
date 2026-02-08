/**
 * @file components/VoiceRecordingSection.jsx
 * @description 나만의 음성 녹음 섹션 (맞춤설정 페이지용)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Play, Pause, RotateCcw, Check, Loader2, Sparkles, User } from 'lucide-react'
import { haptic } from '../utils/capacitor'
import { cloneVoice } from '../utils/api'
import { getFromStorage, setToStorage } from '../utils/helpers'
import { STORAGE_KEYS } from '../constants'
import './VoiceRecordingSection.css'

// 음성 녹음용 샘플 문장
const VOICE_SAMPLE_SENTENCES = [
  "Hello, my name is your personal tutor. I'm excited to help you learn English today!",
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter.",
  "Would you like to practice speaking with me? Let's start our lesson together."
]

function VoiceRecordingSection() {
  // 음성 녹음 상태
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [voiceId, setVoiceId] = useState(null)
  const [isCloning, setIsCloning] = useState(false)
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0)
  const [error, setError] = useState(null)
  const [customTutor, setCustomTutor] = useState(null)
  const [selectedGender, setSelectedGender] = useState('male') // 성별 선택

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const audioRef = useRef(null)

  // 저장된 커스텀 튜터 및 음성 ID 로드
  useEffect(() => {
    const saved = getFromStorage(STORAGE_KEYS.CUSTOM_TUTOR, null)
    setCustomTutor(saved)
    if (saved?.voiceId) {
      setVoiceId(saved.voiceId)
    }
  }, [])

  // 녹음 시작
  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setRecordedAudio({ blob: audioBlob, url: audioUrl })
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      haptic.medium()

      // 녹음 타이머
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording()
            return 60
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      console.error('[Voice] Recording error:', err)
      setError('마이크 접근 권한이 필요합니다')
    }
  }

  // 녹음 중지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
      haptic.medium()
    }
  }, [isRecording])

  // 재녹음
  const resetRecording = () => {
    setRecordedAudio(null)
    setRecordingTime(0)
    setVoiceId(null)
    setError(null)
    setCurrentSentenceIdx((prev) => (prev + 1) % VOICE_SAMPLE_SENTENCES.length)
    haptic.light()

    // 저장된 voiceId도 제거
    const saved = getFromStorage(STORAGE_KEYS.CUSTOM_TUTOR, null)
    if (saved) {
      delete saved.voiceId
      delete saved.hasCustomVoice
      setToStorage(STORAGE_KEYS.CUSTOM_TUTOR, saved)
      setCustomTutor(saved)
    }
  }

  // 재생/일시정지
  const togglePlayback = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(recordedAudio.url)
      audioRef.current.onended = () => setIsPlaying(false)
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
    haptic.light()
  }

  // 음성 클로닝 요청
  const handleVoiceClone = async () => {
    if (!recordedAudio) {
      setError('먼저 음성을 녹음해주세요')
      return
    }

    setIsCloning(true)
    setError(null)
    haptic.medium()

    try {
      // Blob을 base64로 변환
      const reader = new FileReader()
      const base64Audio = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(recordedAudio.blob)
      })

      // 기존 커스텀 튜터 또는 새로 생성
      let tutor = getFromStorage(STORAGE_KEYS.CUSTOM_TUTOR, null)
      const voiceName = tutor?.name || '나만의 튜터'

      const response = await cloneVoice(base64Audio, voiceName)

      if (response.success && response.voiceId) {
        // 커스텀 튜터가 없으면 기본값으로 생성
        if (!tutor) {
          tutor = {
            id: 'custom-tutor',
            name: '나만의 튜터',
            image: null,
            conversationStyle: 'teacher',
            accent: 'us',
            gender: selectedGender,
            genderLabel: selectedGender === 'male' ? '남성' : '여성',
            nationality: '미국',
            tags: ['나만의', '음성'],
            isCustom: true,
            createdAt: new Date().toISOString()
          }
        } else {
          // 기존 튜터가 있어도 성별 업데이트
          tutor.gender = selectedGender
          tutor.genderLabel = selectedGender === 'male' ? '남성' : '여성'
        }

        // voiceId 저장
        tutor.voiceId = response.voiceId
        tutor.hasCustomVoice = true
        tutor.updatedAt = new Date().toISOString()

        setToStorage(STORAGE_KEYS.CUSTOM_TUTOR, tutor)
        setCustomTutor(tutor)
        setVoiceId(response.voiceId)
        haptic.success()
      } else {
        throw new Error(response.error || '음성 클로닝 실패')
      }
    } catch (err) {
      console.error('[Voice] Clone error:', err)
      setError('음성 클로닝 중 오류가 발생했습니다')
      haptic.error()
    } finally {
      setIsCloning(false)
    }
  }

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioRef.current) audioRef.current.pause()
    }
  }, [])

  // 녹음 시간 포맷
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <section className="voice-recording-section">
      <div className="section-header-row">
        <h2 className="section-title">
          <Mic size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          나만의 음성
        </h2>
        <span className="ai-badge">
          <Sparkles size={12} />
          AI Voice
        </span>
      </div>
      <p className="section-desc">
        AI 튜터가 나의 목소리로 말해요. 30초 이상 녹음하면 더 정확해요.
      </p>

      <div className="voice-content">
        {/* 연결된 튜터 상태 표시 */}
        {voiceId && (
          <div className="tutor-connection">
            <div className="tutor-avatar-small">
              {customTutor?.image ? (
                <img src={customTutor.image} alt="" />
              ) : (
                <User size={16} color="#888" />
              )}
            </div>
            <div className="tutor-connection-info">
              <span className="tutor-connection-name">{customTutor?.name || '나만의 튜터'}</span>
              <span className="tutor-connection-status">
                <Check size={12} /> 음성 연결됨
              </span>
            </div>
          </div>
        )}

        {/* 성별 선택 */}
        {!voiceId && (
          <div className="gender-selector">
            <span className="gender-label">내 목소리 성별:</span>
            <div className="gender-options">
              <button
                className={`gender-btn ${selectedGender === 'male' ? 'active' : ''}`}
                onClick={() => setSelectedGender('male')}
              >
                👨 남성
              </button>
              <button
                className={`gender-btn ${selectedGender === 'female' ? 'active' : ''}`}
                onClick={() => setSelectedGender('female')}
              >
                👩 여성
              </button>
            </div>
          </div>
        )}

        {/* 샘플 문장 */}
        <div className="sample-sentence">
          <span className="sample-label">아래 문장을 읽어주세요:</span>
          <p className="sample-text">"{VOICE_SAMPLE_SENTENCES[currentSentenceIdx]}"</p>
        </div>

        {/* 녹음 컨트롤 */}
        <div className="voice-controls">
          {!recordedAudio ? (
            <button
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <>
                  <Square size={20} />
                  <span>{formatTime(recordingTime)}</span>
                </>
              ) : (
                <>
                  <Mic size={20} />
                  <span>녹음 시작</span>
                </>
              )}
            </button>
          ) : (
            <div className="recorded-controls">
              <button className="playback-btn" onClick={togglePlayback}>
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span className="recorded-time">{formatTime(recordingTime)}</span>
              <button className="reset-btn" onClick={resetRecording}>
                <RotateCcw size={16} />
                <span>다시 녹음</span>
              </button>
            </div>
          )}
        </div>

        {/* 클로닝 버튼 */}
        {recordedAudio && !voiceId && (
          <button
            className="clone-btn"
            onClick={handleVoiceClone}
            disabled={isCloning}
          >
            {isCloning ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>음성 학습 중...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>이 음성으로 튜터 만들기</span>
              </>
            )}
          </button>
        )}

        {/* 클로닝 완료 */}
        {voiceId && (
          <div className="voice-success">
            <Check size={16} />
            <span>음성이 학습되었습니다!</span>
            <button className="reset-voice-btn" onClick={resetRecording}>
              다시 녹음
            </button>
          </div>
        )}

        {/* 사용 안내 */}
        {voiceId && (
          <p className="voice-guide">
            튜터 설정에서 <strong>나만의 튜터</strong>를 선택하면 이 음성이 적용됩니다.
          </p>
        )}

        {/* 에러 메시지 */}
        {error && <p className="error-message">{error}</p>}
      </div>
    </section>
  )
}

export default VoiceRecordingSection
