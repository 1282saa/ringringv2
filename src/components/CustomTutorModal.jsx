/**
 * @file components/CustomTutorModal.jsx
 * @description 나만의 AI 튜터 생성 모달
 */

import { useState, useRef, useEffect } from 'react'
import { X, Camera, Check, Loader2, Trash2 } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'
import { STORAGE_KEYS, ACCENTS, GENDERS, CONVERSATION_STYLES } from '../constants'
import { haptic } from '../utils/capacitor'
import { uploadPetImage, saveCustomTutor, getCustomTutor, deleteCustomTutor } from '../utils/api'
import './CustomTutorModal.css'

// 성격 태그 옵션
const PERSONALITY_TAGS = [
  '밝은', '차분한', '친절한', '유쾌한', '따뜻한',
  '활발한', '전문적', '편안한', '다정한', '논리적'
]

function CustomTutorModal({ isOpen, onClose, onSave, onDelete, existingTutor = null }) {
  const [tutorImage, setTutorImage] = useState(null)
  const [tutorImageUrl, setTutorImageUrl] = useState(null)
  const [tutorName, setTutorName] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('teacher')
  const [selectedAccent, setSelectedAccent] = useState('us')
  const [selectedGender, setSelectedGender] = useState('female')
  const [selectedTags, setSelectedTags] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  // 기존 튜터 데이터 로드
  useEffect(() => {
    if (isOpen) {
      if (existingTutor) {
        setTutorImage(existingTutor.image)
        setTutorImageUrl(existingTutor.image)
        setTutorName(existingTutor.name || '')
        setSelectedStyle(existingTutor.conversationStyle || 'teacher')
        setSelectedAccent(existingTutor.accent || 'us')
        setSelectedGender(existingTutor.gender || 'female')
        setSelectedTags(existingTutor.tags || [])
      } else {
        // 새 튜터 생성 시 초기화
        loadCustomTutorFromStorage()
      }
    }
  }, [isOpen, existingTutor])

  const loadCustomTutorFromStorage = async () => {
    try {
      // 서버에서 먼저 로드 (presigned URL 포함)
      const response = await getCustomTutor()
      if (response.success && response.tutor) {
        setTutorImage(response.tutor.image)
        setTutorImageUrl(response.tutor.image)
        setTutorName(response.tutor.name || '')
        setSelectedStyle(response.tutor.conversationStyle || 'teacher')
        setSelectedAccent(response.tutor.accent || 'us')
        setSelectedGender(response.tutor.gender || 'female')
        setSelectedTags(response.tutor.tags || [])
        return
      }
    } catch (err) {
      console.warn('[CustomTutor] Server load failed, falling back to localStorage:', err)
    }

    // 로컬스토리지 폴백
    const saved = getFromStorage(STORAGE_KEYS.CUSTOM_TUTOR, null)
    if (saved) {
      setTutorImage(saved.image)
      setTutorImageUrl(saved.image)
      setTutorName(saved.name || '')
      setSelectedStyle(saved.conversationStyle || 'teacher')
      setSelectedAccent(saved.accent || 'us')
      setSelectedGender(saved.gender || 'female')
      setSelectedTags(saved.tags || [])
    }
  }

  if (!isOpen) return null

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 300
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const resizedImage = canvas.toDataURL('image/jpeg', 0.8)
        setTutorImage(resizedImage)
        setTutorImageUrl(null)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleTagToggle = (tag) => {
    haptic.selection()
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag)
      } else if (prev.length < 2) {
        return [...prev, tag]
      }
      return prev
    })
  }

  const handleSave = async () => {
    if (!tutorName.trim()) {
      setError('튜터 이름을 입력해주세요')
      return
    }

    haptic.medium()
    setIsLoading(true)
    setError(null)

    try {
      let finalImageUrl = tutorImageUrl

      // 새 이미지가 base64인 경우 S3에 업로드
      if (tutorImage && tutorImage.startsWith('data:')) {
        const uploadResponse = await uploadPetImage(tutorImage)
        if (uploadResponse.success) {
          finalImageUrl = uploadResponse.imageUrl
        }
      }

      // 기존 voiceId 유지 (맞춤설정에서 녹음한 경우)
      const existingData = getFromStorage(STORAGE_KEYS.CUSTOM_TUTOR, null)

      const tutorData = {
        id: 'custom-tutor',
        name: tutorName.trim(),
        image: finalImageUrl || tutorImage,
        conversationStyle: selectedStyle,
        accent: selectedAccent,
        gender: selectedGender,
        genderLabel: selectedGender === 'female' ? '여성' : '남성',
        nationality: ACCENTS.find(a => a.id === selectedAccent)?.label || '미국',
        tags: selectedTags.length > 0 ? selectedTags : ['나만의', '튜터'],
        isCustom: true,
        voiceId: existingData?.voiceId || null, // 기존 voiceId 유지
        hasCustomVoice: !!existingData?.voiceId,
        updatedAt: new Date().toISOString()
      }

      // 서버에 저장
      try {
        await saveCustomTutor(tutorData)

        // 저장 후 presigned URL을 포함한 데이터 다시 조회
        const response = await getCustomTutor()
        if (response.success && response.tutor) {
          const tutorWithPresignedUrl = {
            ...tutorData,
            image: response.tutor.image // presigned URL
          }
          setToStorage(STORAGE_KEYS.CUSTOM_TUTOR, tutorWithPresignedUrl)
          onSave?.(tutorWithPresignedUrl)
        } else {
          setToStorage(STORAGE_KEYS.CUSTOM_TUTOR, tutorData)
          onSave?.(tutorData)
        }
      } catch (serverErr) {
        console.warn('[CustomTutor] Server save failed:', serverErr)
        setToStorage(STORAGE_KEYS.CUSTOM_TUTOR, tutorData)
        onSave?.(tutorData)
      }

      onClose()
    } catch (err) {
      console.error('[CustomTutor] Save error:', err)
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    haptic.light()
    onClose()
  }

  const handleDelete = async () => {
    if (!tutorImage && !tutorName) {
      return
    }

    haptic.medium()
    setIsLoading(true)
    setError(null)

    try {
      // 서버에서 삭제
      await deleteCustomTutor()

      // 로컬 스토리지 삭제
      setToStorage(STORAGE_KEYS.CUSTOM_TUTOR, null)

      // 상태 초기화
      setTutorImage(null)
      setTutorImageUrl(null)
      setTutorName('')
      setSelectedStyle('teacher')
      setSelectedAccent('us')
      setSelectedGender('female')
      setSelectedTags([])

      onDelete?.()
      onClose()
    } catch (err) {
      console.error('[CustomTutor] Delete error:', err)
      setError('삭제 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="custom-tutor-overlay">
      <div className="custom-tutor-backdrop" onClick={handleClose} />

      <div className="custom-tutor-modal">
        {/* 헤더 */}
        <div className="custom-tutor-header">
          <h2>나만의 AI 튜터</h2>
          <button className="custom-tutor-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="custom-tutor-content">
          {/* 이미지 업로드 */}
          <div
            className={`tutor-upload-area ${tutorImage ? 'has-image' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {tutorImage ? (
              <img src={tutorImage} alt="튜터" className="tutor-preview" />
            ) : (
              <>
                <Camera size={32} color="#888" />
                <p>사진 선택</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              hidden
            />
          </div>

          {/* 이름 입력 */}
          <div className="form-group">
            <label className="form-label">튜터 이름</label>
            <input
              type="text"
              className="form-input"
              placeholder="예: Sarah, Mike..."
              value={tutorName}
              onChange={(e) => setTutorName(e.target.value)}
              maxLength={20}
            />
          </div>

          {/* 대화 스타일 */}
          <div className="form-group">
            <label className="form-label">대화 스타일</label>
            <div className="style-options">
              {CONVERSATION_STYLES.map((style) => (
                <button
                  key={style.id}
                  className={`style-option ${selectedStyle === style.id ? 'selected' : ''}`}
                  onClick={() => {
                    haptic.selection()
                    setSelectedStyle(style.id)
                  }}
                >
                  <span className="style-label">{style.label}</span>
                  <span className="style-desc">{style.description}</span>
                  {selectedStyle === style.id && (
                    <span className="style-check"><Check size={14} /></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 악센트 & 성별 */}
          <div className="form-row">
            <div className="form-group half">
              <label className="form-label">악센트</label>
              <div className="chip-options">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent.id}
                    className={`chip-option ${selectedAccent === accent.id ? 'selected' : ''}`}
                    onClick={() => {
                      haptic.selection()
                      setSelectedAccent(accent.id)
                    }}
                  >
                    {accent.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group half">
              <label className="form-label">성별</label>
              <div className="chip-options">
                {GENDERS.map((gender) => (
                  <button
                    key={gender.id}
                    className={`chip-option ${selectedGender === gender.id ? 'selected' : ''}`}
                    onClick={() => {
                      haptic.selection()
                      setSelectedGender(gender.id)
                    }}
                  >
                    {gender.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 성격 태그 */}
          <div className="form-group">
            <label className="form-label">성격 태그 (최대 2개)</label>
            <div className="tag-options">
              {PERSONALITY_TAGS.map((tag) => (
                <button
                  key={tag}
                  className={`tag-option ${selectedTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && <p className="error-message">{error}</p>}
        </div>

        {/* 버튼 */}
        <div className="custom-tutor-buttons">
          {(tutorImage || tutorName) && (
            <button
              className="delete-btn"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 size={16} />
              <span>삭제</span>
            </button>
          )}
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>저장 중...</span>
              </>
            ) : (
              '저장하기'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomTutorModal
