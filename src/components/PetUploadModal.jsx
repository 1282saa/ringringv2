/**
 * @file components/PetUploadModal.jsx
 * @description 펫 캐릭터 사진 업로드 모달
 */

import { useState, useRef, useEffect } from 'react'
import { X, Camera, Trash2, Loader2 } from 'lucide-react'
import { getFromStorage, setToStorage } from '../utils/helpers'
import { STORAGE_KEYS } from '../constants'
import { haptic } from '../utils/capacitor'
import { uploadPetImage, savePet, getPet, deletePet } from '../utils/api'
import './PetUploadModal.css'

function PetUploadModal({ isOpen, onClose, onSave }) {
  const [petImage, setPetImage] = useState(null) // 로컬 미리보기 (base64)
  const [petImageUrl, setPetImageUrl] = useState(null) // 서버 URL
  const [petName, setPetName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  // 서버에서 펫 정보 로드
  useEffect(() => {
    if (isOpen) {
      loadPetFromServer()
    }
  }, [isOpen])

  const loadPetFromServer = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await getPet()
      if (response.success && response.pet) {
        setPetImageUrl(response.pet.imageUrl)
        setPetImage(response.pet.imageUrl) // URL을 미리보기로 사용
        setPetName(response.pet.name || '')
      } else {
        // 서버에 데이터 없으면 로컬 스토리지 확인 (마이그레이션용)
        const localPet = getFromStorage(STORAGE_KEYS.PET_CHARACTER, null)
        if (localPet) {
          setPetImage(localPet.image)
          setPetName(localPet.name || '')
        }
      }
    } catch (err) {
      console.error('[PetModal] Failed to load pet:', err)
      // 로컬 스토리지 폴백
      const localPet = getFromStorage(STORAGE_KEYS.PET_CHARACTER, null)
      if (localPet) {
        setPetImage(localPet.image)
        setPetName(localPet.name || '')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 리사이즈 및 Base64 변환
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
        setPetImage(resizedImage)
        setPetImageUrl(null) // 새 이미지 선택 시 기존 URL 초기화
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    haptic.medium()
    setIsLoading(true)
    setError(null)

    try {
      let finalImageUrl = petImageUrl

      // 새 이미지가 base64인 경우 S3에 업로드
      if (petImage && petImage.startsWith('data:')) {
        const uploadResponse = await uploadPetImage(petImage)
        if (!uploadResponse.success) {
          throw new Error('이미지 업로드에 실패했습니다')
        }
        finalImageUrl = uploadResponse.imageUrl
      }

      // DynamoDB에 펫 정보 저장
      const saveResponse = await savePet(
        petName.trim() || '나의 반려동물',
        finalImageUrl
      )

      if (saveResponse.success) {
        const petData = {
          image: finalImageUrl,
          name: petName.trim() || '나의 반려동물',
          updatedAt: new Date().toISOString()
        }
        // 로컬 스토리지에도 캐싱 (오프라인용)
        setToStorage(STORAGE_KEYS.PET_CHARACTER, petData)
        onSave?.(petData)
        onClose()
      } else {
        throw new Error('저장에 실패했습니다')
      }
    } catch (err) {
      console.error('[PetModal] Save error:', err)
      setError(err.message || '저장 중 오류가 발생했습니다')
      // 폴백: 로컬 스토리지에 저장
      const petData = {
        image: petImage,
        name: petName.trim() || '나의 반려동물',
        updatedAt: new Date().toISOString()
      }
      setToStorage(STORAGE_KEYS.PET_CHARACTER, petData)
      onSave?.(petData)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async () => {
    haptic.light()
    setIsLoading(true)
    setError(null)

    try {
      await deletePet()
    } catch (err) {
      console.error('[PetModal] Delete error:', err)
    }

    // 로컬도 초기화
    setPetImage(null)
    setPetImageUrl(null)
    setPetName('')
    setToStorage(STORAGE_KEYS.PET_CHARACTER, null)
    setIsLoading(false)
  }

  const handleClose = () => {
    haptic.light()
    onClose()
  }

  return (
    <div className="pet-modal-overlay">
      <div className="pet-modal-backdrop" onClick={handleClose} />

      <div className="pet-modal">
        {/* 헤더 */}
        <div className="pet-modal-header">
          <h2>반려동물 등록</h2>
          <button className="pet-modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="pet-modal-content">
          {/* 이미지 업로드 영역 */}
          <div
            className={`pet-upload-area ${petImage ? 'has-image' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {petImage ? (
              <img src={petImage} alt="반려동물" className="pet-preview" />
            ) : (
              <>
                <Camera size={32} color="#888" />
                <p>사진을 선택해주세요</p>
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
          <input
            type="text"
            className="pet-name-input"
            placeholder="이름을 입력해주세요"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            maxLength={20}
          />

          {/* 안내 문구 */}
          <p className="pet-modal-hint">
            학습을 완료하면 반려동물이 응원해줘요!
          </p>

          {/* 에러 메시지 */}
          {error && (
            <p className="pet-modal-error">{error}</p>
          )}
        </div>

        {/* 버튼 */}
        <div className="pet-modal-buttons">
          {petImage && !isLoading && (
            <button className="pet-remove-btn" onClick={handleRemove}>
              <Trash2 size={16} />
              <span>삭제</span>
            </button>
          )}
          <button
            className="pet-save-btn"
            onClick={handleSave}
            disabled={!petImage || isLoading}
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

export default PetUploadModal
