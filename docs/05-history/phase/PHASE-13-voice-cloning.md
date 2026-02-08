# Phase 13: Voice Cloning (음성 클로닝)

**Timeline:** 2026-02-08
**Status:** Completed
**Branch:** `main`
**Impact:** ElevenLabs 연동으로 사용자 맞춤 음성 튜터 생성

---

## Overview

ElevenLabs Voice Cloning API를 통해 사용자가 원하는 음성으로 AI 튜터를 생성할 수 있는 기능을 구현했습니다. 녹음한 음성 샘플로 커스텀 튜터를 만들고, 해당 음성으로 TTS를 재생합니다.

**Key Objectives:**
- 음성 녹음 및 샘플 수집
- ElevenLabs Voice Cloning API 연동
- 커스텀 튜터 생성 (이름, 이미지, 음성)
- 성별 선택 기능
- TTS 시 커스텀 음성 사용

---

## Implementation Details

### 1. VoiceRecordingSection 컴포넌트

**파일:** `src/components/VoiceRecordingSection.jsx`

```jsx
function VoiceRecordingSection() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState([])
  const [isCloning, setIsCloning] = useState(false)
  const [selectedGender, setSelectedGender] = useState('male')

  // 녹음 시작/중지
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorder.stop()
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder = new MediaRecorder(stream)
      mediaRecorder.start()
    }
    setIsRecording(!isRecording)
  }

  // 음성 클로닝 실행
  const handleCloneVoice = async () => {
    const result = await cloneVoice(
      recordings,
      tutorName,
      `${tutorName}'s cloned voice`
    )

    if (result.success) {
      // 커스텀 튜터 자동 생성
      const tutor = {
        id: `custom_${Date.now()}`,
        name: tutorName,
        gender: selectedGender,
        genderLabel: selectedGender === 'male' ? '남성' : '여성',
        voiceId: result.voiceId,
        isCustomVoice: true
      }
      setToStorage(STORAGE_KEYS.CUSTOM_TUTOR, tutor)
    }
  }

  return (
    <div className="voice-recording-section">
      {/* 성별 선택 */}
      <div className="gender-selector">
        <button
          className={`gender-btn ${selectedGender === 'male' ? 'active' : ''}`}
          onClick={() => setSelectedGender('male')}
        >
          남성
        </button>
        <button
          className={`gender-btn ${selectedGender === 'female' ? 'active' : ''}`}
          onClick={() => setSelectedGender('female')}
        >
          여성
        </button>
      </div>

      {/* 녹음 버튼 */}
      <button onClick={toggleRecording}>
        {isRecording ? '녹음 중지' : '녹음 시작'}
      </button>

      {/* 녹음 목록 */}
      {recordings.map((rec, idx) => (
        <div key={idx}>
          <audio src={rec.url} controls />
          <span>{(rec.duration / 1000).toFixed(1)}초</span>
        </div>
      ))}

      {/* 클로닝 버튼 */}
      <button onClick={handleCloneVoice} disabled={recordings.length < 3}>
        음성 클로닝 시작
      </button>
    </div>
  )
}
```

---

### 2. API 함수 (api.js)

**파일:** `src/utils/api.js`

```javascript
/**
 * ElevenLabs 음성 클로닝
 */
export async function cloneVoice(audioBlobs, name, description) {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('description', description)

  audioBlobs.forEach((blob, idx) => {
    formData.append(`files`, blob, `sample_${idx}.webm`)
  })

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'clone_voice',
      name,
      description,
      audio_samples: audioBlobs.map(b => arrayBufferToBase64(b))
    })
  })

  return response.json()
}

/**
 * ElevenLabs TTS (커스텀 음성)
 */
export async function elevenLabsTTS(text, voiceId) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'elevenlabs_tts',
      text,
      voice_id: voiceId
    })
  })

  return response.json()
}
```

---

### 3. Lambda 백엔드 (lambda_function.py)

**파일:** `backend/lambda_function.py`

```python
import boto3
import requests

def handle_clone_voice(body):
    """ElevenLabs 음성 클로닝"""
    name = body.get('name', 'Custom Voice')
    description = body.get('description', '')
    audio_samples = body.get('audio_samples', [])

    # Secrets Manager에서 API 키 가져오기
    secrets = boto3.client('secretsmanager')
    api_key = secrets.get_secret_value(SecretId='ElevenLabs/ApiKey')['SecretString']

    # ElevenLabs API 호출
    url = 'https://api.elevenlabs.io/v1/voices/add'
    headers = {'xi-api-key': api_key}

    files = []
    for idx, sample in enumerate(audio_samples):
        audio_bytes = base64.b64decode(sample)
        files.append(('files', (f'sample_{idx}.webm', audio_bytes, 'audio/webm')))

    data = {'name': name, 'description': description}

    response = requests.post(url, headers=headers, data=data, files=files)
    result = response.json()

    return {
        'success': True,
        'voiceId': result.get('voice_id'),
        'name': result.get('name')
    }


def handle_elevenlabs_tts(body):
    """ElevenLabs TTS"""
    text = body.get('text', '')
    voice_id = body.get('voice_id')

    secrets = boto3.client('secretsmanager')
    api_key = secrets.get_secret_value(SecretId='ElevenLabs/ApiKey')['SecretString']

    url = f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}'
    headers = {
        'xi-api-key': api_key,
        'Content-Type': 'application/json'
    }
    data = {
        'text': text,
        'model_id': 'eleven_multilingual_v2',
        'voice_settings': {
            'stability': 0.5,
            'similarity_boost': 0.75
        }
    }

    response = requests.post(url, headers=headers, json=data)

    return {
        'audio': base64.b64encode(response.content).decode('utf-8'),
        'contentType': 'audio/mpeg'
    }
```

---

### 4. Settings.jsx 통합

**파일:** `src/pages/Settings.jsx`

```jsx
import VoiceRecordingSection from '../components/VoiceRecordingSection'

function Settings() {
  return (
    <div className="settings-page">
      {/* 다른 설정들... */}

      <section className="settings-section">
        <h2>나만의 음성 튜터</h2>
        <VoiceRecordingSection />
      </section>
    </div>
  )
}
```

---

### 5. TTS 호출 시 커스텀 음성 사용

**파일:** `src/utils/api.js` - `textToSpeech` 수정

```javascript
export async function textToSpeech(text, settings = {}) {
  // 커스텀 튜터 확인
  const customTutor = getFromStorage(STORAGE_KEYS.CUSTOM_TUTOR, null)

  if (customTutor?.isCustomVoice && customTutor?.voiceId) {
    // ElevenLabs TTS 사용
    return elevenLabsTTS(text, customTutor.voiceId)
  }

  // 기본 Amazon Polly TTS
  return fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'tts', text, settings })
  }).then(r => r.json())
}
```

---

## AWS Secrets Manager

**Secret Name:** `ElevenLabs/ApiKey`
**Region:** `us-east-1`

```bash
# API 키 저장
aws secretsmanager create-secret \
  --name ElevenLabs/ApiKey \
  --secret-string "sk-xxxxxxxxxxxxx" \
  --region us-east-1
```

---

## File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `src/components/VoiceRecordingSection.jsx` | New | 음성 녹음 및 클로닝 UI |
| `src/components/VoiceRecordingSection.css` | New | 녹음 섹션 스타일 |
| `src/utils/api.js` | Modified | cloneVoice, elevenLabsTTS 추가 |
| `src/pages/Settings.jsx` | Modified | VoiceRecordingSection 추가 |
| `backend/lambda_function.py` | Modified | clone_voice, elevenlabs_tts 핸들러 |
| `src/constants/index.js` | Modified | CUSTOM_TUTOR 키 추가 |

---

## 음성 클로닝 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                     Settings 페이지                          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  VoiceRecordingSection                                 │  │
│  │                                                        │  │
│  │  1. 성별 선택: [남성] [여성]                           │  │
│  │                                                        │  │
│  │  2. 음성 샘플 녹음 (최소 3개)                          │  │
│  │     ○ 샘플 1: 15초 ▶️                                  │  │
│  │     ○ 샘플 2: 12초 ▶️                                  │  │
│  │     ○ 샘플 3: 18초 ▶️                                  │  │
│  │                                                        │  │
│  │  3. [음성 클로닝 시작]                                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Lambda Backend                           │
│                                                              │
│  1. Secrets Manager에서 ElevenLabs API 키 조회              │
│  2. ElevenLabs Voice Cloning API 호출                       │
│  3. Voice ID 반환                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     커스텀 튜터 저장                          │
│                                                              │
│  localStorage: CUSTOM_TUTOR = {                             │
│    id: "custom_1707350400000",                              │
│    name: "My Tutor",                                        │
│    gender: "male",                                          │
│    voiceId: "abcd1234",                                     │
│    isCustomVoice: true                                      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     TTS 호출 시                              │
│                                                              │
│  textToSpeech(text) →                                       │
│    customTutor.isCustomVoice ?                              │
│      elevenLabsTTS(text, voiceId) :                         │
│      amazonPollyTTS(text)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## ElevenLabs 요금제

| Plan | Price | Voice Cloning | Characters/Month |
|------|-------|---------------|------------------|
| Free | $0 | ❌ | 10,000 |
| Starter | $5/mo | ✅ Instant | 30,000 |
| Creator | $22/mo | ✅ Pro | 100,000 |
| Pro | $99/mo | ✅ Pro | 500,000 |

**현재 사용:** Creator ($22/mo) - Pro Voice Cloning 포함

---

## Testing Checklist

- [x] 마이크 권한 요청
- [x] 음성 녹음 시작/중지
- [x] 녹음 파일 재생
- [x] 최소 3개 샘플 체크
- [x] ElevenLabs API 호출
- [x] Voice ID 저장
- [x] 커스텀 튜터 생성
- [x] 성별 선택 반영
- [x] TTS 시 커스텀 음성 사용

---

## Known Issues

### 1. 녹음 품질
- **문제:** 배경 소음이 있으면 클로닝 품질 저하
- **해결:** 조용한 환경에서 녹음 권장 안내

### 2. 클로닝 시간
- **문제:** 음성 클로닝에 10-30초 소요
- **해결:** 로딩 인디케이터 표시

---

## Next Steps

- Phase 14: 구글 캘린더 연동
- Phase 15: 세션 메모리

---

## References

- [ElevenLabs API Documentation](https://docs.elevenlabs.io/api-reference/voices-add)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Phase 12: Learning Cycle](PHASE-12-learning-cycle.md)

---

*Last Updated: 2026-02-08*
