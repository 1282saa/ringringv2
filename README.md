# Ringle AI English Learning MVP

AI-powered English conversation practice app with real-time voice interaction.

**Last Updated**: 2026-01-12
**Development Method**: AI-Assisted Development (Claude Code)
**Tech Stack**: React 19 + Vite 7 + Capacitor + AWS Lambda + Claude AI

---

## Project Overview

Ringle AI English Learning MVP is a mobile-first application that enables users to practice English speaking through real-time voice conversations with an AI tutor. The app provides personalized tutoring with customizable accents, difficulty levels, and topics, along with detailed post-conversation analysis.

**Target Platform**: iOS, Android, Web
**Primary Language**: Korean UI / English Conversation
**AI Model**: Claude Haiku via AWS Bedrock

---

## Key Features

### Voice Conversation
- Real-time speech recognition (Web Speech API)
- Natural AI responses (Claude Haiku)
- High-quality text-to-speech (Amazon Polly)
- Multiple accent support (US, UK, AU, IN)

### Customization
- Tutor gender selection
- Speaking speed control
- Difficulty levels (Beginner/Intermediate/Advanced)
- Topic selection (Business, Daily, Travel, Interview)

### Analysis & Feedback
- CAFP scoring (Complexity, Accuracy, Fluency, Pronunciation)
- Grammar correction with explanations
- Filler word detection
- Vocabulary analysis
- Personalized improvement tips

---

## Quick Start

### Prerequisites

```bash
Node.js >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
# Clone repository
git clone https://github.com/1282saa/ringgle.git
cd ringgle

# Install dependencies
npm install

# Start development server
npm run dev
# Opens http://localhost:5173
```

### Build & Deploy

```bash
# Build for production
npm run build

# Sync to mobile platforms
npx cap sync

# Open in Android Studio
npx cap open android

# Open in Xcode
npx cap open ios
```

### Web Deployment (AWS S3 + CloudFront)

**Live URL**: https://d3pw62uy753kuv.cloudfront.net

```bash
# Build & Deploy to S3
npm run build && aws s3 sync dist/ s3://eng-call --delete

# Invalidate CloudFront cache (for immediate updates)
aws cloudfront create-invalidation --distribution-id E2EPS9DBLFD0FM --paths "/*"
```

| Resource | Value |
|----------|-------|
| S3 Bucket | `eng-call` |
| CloudFront Distribution | `E2EPS9DBLFD0FM` |
| Region | `ap-northeast-2` |

---

## Project Structure

```
eng-learning/
├── src/
│   ├── pages/
│   │   ├── Home.jsx        # Main screen
│   │   ├── Call.jsx        # Voice conversation
│   │   ├── Result.jsx      # Analysis & feedback
│   │   └── Settings.jsx    # Tutor customization
│   ├── utils/
│   │   └── api.js          # API client
│   ├── App.jsx             # Routes
│   └── main.jsx            # Entry point
├── backend/
│   └── lambda_function.py  # AWS Lambda handler
├── android/                # Capacitor Android
├── ios/                    # Capacitor iOS
├── docs/
│   └── phase/              # Development documentation
└── package.json
```

---

## Documentation

### Quick Links

| Category | Document | Description |
|----------|----------|-------------|
| **Database** | [DATABASE_ERD.md](docs/DATABASE_ERD.md) | ERD, 테이블 구조, 관계도 |
| **API** | [API_REFERENCE.md](docs/API_REFERENCE.md) | API 엔드포인트 상세 |
| **API Spec** | [openapi.yaml](docs/openapi.yaml) | OpenAPI 3.0 스펙 |
| **AWS** | [AWS_INFRASTRUCTURE.md](docs/AWS_INFRASTRUCTURE.md) | AWS 인프라 구성도 |
| **AI Pipeline** | [AI_PIPELINE.md](docs/AI_PIPELINE.md) | Claude AI 통합 파이프라인 |
| **Frontend** | [FRONTEND_GUIDE.md](docs/FRONTEND_GUIDE.md) | 프론트엔드 개발 가이드 |
| **Backend** | [BACKEND-API.md](docs/BACKEND-API.md) | 백엔드 API 상세 |
| **Features** | [FEATURE_SPECS.md](docs/FEATURE_SPECS.md) | 기능 명세서 |
| **UI/UX** | [UI_UX_SPECIFICATION.md](docs/UI_UX_SPECIFICATION.md) | UI/UX 상세 스펙 |
| **Dev Log** | [DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md) | 개발 로그 |

### Development Phases

| Phase | Title | Status |
|-------|-------|--------|
| [Phase 1](docs/phase/PHASE-01-project-setup.md) | Project Setup | ✅ |
| [Phase 2](docs/phase/PHASE-02-voice-conversation.md) | Voice Conversation | ✅ |
| [Phase 3](docs/phase/PHASE-03-tutor-settings.md) | Tutor Settings | ✅ |
| [Phase 4](docs/phase/PHASE-04-call-analysis.md) | Call Analysis | ✅ |
| [Phase 5](docs/phase/PHASE-05-github-setup.md) | GitHub Setup | ✅ |
| [Phase 6](docs/phase/PHASE-06-ai-phone-tab.md) | AI Phone Tab | ✅ |
| [Phase 7](docs/phase/PHASE-07-home-tab-refactor.md) | Home Tab Refactor | ✅ |
| [Phase 8](docs/phase/PHASE-08-session-management.md) | Session Management | ✅ |
| [Phase 9](docs/phase/PHASE-09-ux-ui-improvements.md) | UX/UI Improvements | ✅ |
| [Phase 10](docs/phase/PHASE-10-call-tab-ui-refinement.md) | Call Tab UI Refinement | ✅ |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| Vite | 7.2.4 | Build Tool |
| React Router | 7.12.0 | Routing |
| Capacitor | 8.0.0 | Mobile Bridge |
| Framer Motion | 12.25.0 | Animations |
| Lucide React | 0.562.0 | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| AWS Lambda | Serverless Functions |
| AWS Bedrock | Claude AI |
| Amazon Polly | Text-to-Speech |
| AWS Transcribe | Speech-to-Text |
| Python 3.11 | Lambda Runtime |

---

## AWS Infrastructure

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client (Web/Mobile)                         │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Amazon CloudFront (CDN)                           │
│                     d3pw62uy753kuv.cloudfront.net                        │
└─────────────────────────────────────────────────────────────────────────┘
                          │                    │
                          ▼                    ▼
┌─────────────────────────────┐    ┌─────────────────────────────────────┐
│      Amazon S3              │    │        API Gateway                   │
│      eng-call               │    │   n4o7d3c14c.execute-api...          │
│   (Frontend Hosting)        │    │        /prod/chat                    │
└─────────────────────────────┘    └─────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AWS Lambda                                       │
│                      eng-learning-api                                    │
│                     (Python 3.11, 256MB)                                 │
└─────────────────────────────────────────────────────────────────────────┘
         │           │           │           │           │           │
         ▼           ▼           ▼           ▼           ▼           ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Bedrock   │ │  Transcribe │ │    Polly    │ │  Translate  │ │  DynamoDB   │
│  Claude AI  │ │    (STT)    │ │   (TTS)     │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
                                                                       │
                                                      ┌────────────────┴────────────────┐
                                                      │       Amazon S3                  │
                                                      │    eng-learning-audio            │
                                                      │  (Audio files, Voice samples)    │
                                                      └──────────────────────────────────┘
```

### AWS Services Detail

#### 1. Frontend Hosting

| Service | Resource | Region | Purpose |
|---------|----------|--------|---------|
| **S3** | `eng-call` | ap-northeast-2 | Static website hosting |
| **CloudFront** | `E2EPS9DBLFD0FM` | Global | CDN, HTTPS |

**URL**: https://d3pw62uy753kuv.cloudfront.net

#### 2. Backend API

| Service | Resource | Region | Purpose |
|---------|----------|--------|---------|
| **API Gateway** | REST API | us-east-1 | HTTP endpoint |
| **Lambda** | `eng-learning-api` | us-east-1 | Serverless backend |

**Endpoint**: `https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat`

**Lambda Configuration**:
- Runtime: Python 3.11
- Memory: 256 MB
- Timeout: 60 seconds
- Handler: `lambda_function.lambda_handler`

#### 3. AI & ML Services

| Service | Model/Feature | Purpose |
|---------|---------------|---------|
| **Amazon Bedrock** | Claude 3 Haiku | AI conversation, analysis, user info extraction |
| **Amazon Transcribe** | Streaming & Batch | Speech-to-Text (실시간 음성인식) |
| **Amazon Polly** | Neural voices | Text-to-Speech (AI 응답 음성화) |
| **Amazon Translate** | - | 실시간 번역 (영어↔한국어) |

#### 4. Database

| Service | Table | Purpose |
|---------|-------|---------|
| **DynamoDB** | `eng-learning-conversations` | 대화 기록, 세션, 사용자 메모리 |

**테이블 구조**:
```
PK (Partition Key)          SK (Sort Key)
─────────────────────────────────────────────────
DEVICE#{deviceId}           SESSION#{sessionId}#META      (세션 메타)
DEVICE#{deviceId}           SESSION#{sessionId}#MSG#{n}   (메시지)
DEVICE#{deviceId}           PET                           (펫 캐릭터)
USER#{userId}               MEMORY                        (사용자 메모리)
USER#{userId}               CUSTOM_VOICE                  (음성 클로닝)
```

**GSI (Global Secondary Index)**:
- `GSI1`: `GSI1PK` - 세션별 데이터 조회용

#### 5. Storage

| Service | Bucket | Purpose |
|---------|--------|---------|
| **S3** | `eng-learning-audio` | STT 오디오 파일, 음성 샘플 |

**폴더 구조**:
```
eng-learning-audio/
├── audio/              # STT용 임시 오디오 파일
├── pets/               # 펫 이미지
│   └── {deviceId}/
└── voice-samples/      # 음성 클로닝 샘플
    └── {userId}/
```

#### 6. Security

| Service | Resource | Purpose |
|---------|----------|---------|
| **Secrets Manager** | `ElevenLabs/ApiKey` | ElevenLabs API 키 저장 |
| **IAM** | `eng-learning-lambda-role` | Lambda 실행 역할 |
| **Cognito** | User Pool | 사용자 인증 |

### External APIs

| Service | Purpose | Integration |
|---------|---------|-------------|
| **ElevenLabs** | 고품질 TTS, 음성 클로닝 | REST API |
| **Google Calendar** | 학습 기록 캘린더 연동 | OAuth 2.0 |

### Cost Estimation (Monthly)

| Service | Estimated Cost | Notes |
|---------|----------------|-------|
| Lambda | ~$5-15 | 요청 수에 따라 변동 |
| Bedrock (Claude) | ~$10-30 | 토큰 사용량에 따라 변동 |
| DynamoDB | ~$1-5 | On-demand 모드 |
| S3 | ~$1-3 | 스토리지 + 요청 |
| CloudFront | ~$1-5 | 트래픽에 따라 변동 |
| Transcribe | ~$5-20 | 음성 시간에 따라 변동 |
| Polly | ~$3-10 | 문자 수에 따라 변동 |
| **Total** | **~$26-88** | 사용량에 따라 변동 |

### Deployment Commands

```bash
# Frontend: Build & Deploy
npm run build
aws s3 sync dist/ s3://eng-call --delete
aws cloudfront create-invalidation --distribution-id E2EPS9DBLFD0FM --paths "/*"

# Backend: Deploy Lambda
cd backend
zip -j lambda_function.zip lambda_function.py
aws lambda update-function-code \
  --function-name eng-learning-api \
  --zip-file fileb://lambda_function.zip \
  --region us-east-1
```

### Environment Variables

**Lambda Environment**:
```
AWS_REGION=us-east-1
S3_BUCKET=eng-learning-audio
DYNAMODB_TABLE=eng-learning-conversations
```

**Frontend (.env)**:
```
VITE_API_URL=https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat
VITE_GOOGLE_CLIENT_ID=408302746123-xxx.apps.googleusercontent.com
```

---

## API Reference

**Endpoint:** `https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat`

### Actions

| Action | Description | Request Body |
|--------|-------------|--------------|
| `chat` | AI conversation | `{ messages, settings }` |
| `tts` | Text-to-speech | `{ text, settings }` |
| `stt` | Speech-to-text | `{ audio, language }` |
| `analyze` | Analysis | `{ messages }` |

### Example Request

```bash
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "action": "chat",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "settings": {
      "accent": "us",
      "level": "intermediate",
      "topic": "daily"
    }
  }'
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npx cap sync` | Sync to mobile |

---

## Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Speech Recognition | ✅ | ⚠️ | ❌ | ✅ |
| Audio Playback | ✅ | ✅ | ✅ | ✅ |
| Microphone | ✅ | ✅ | ✅ | ✅ |

**Note:** HTTPS required for microphone access.

---

## Environment Variables

### Frontend (`.env.local`)
```env
VITE_API_URL=https://your-api-gateway-url/prod/chat
```

### Backend (Lambda Environment)
```env
AWS_REGION=us-east-1
S3_BUCKET=eng-learning-audio
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

Proprietary - All Rights Reserved

---

## Contact

- **Repository**: https://github.com/1282saa/ringgle
- **Issues**: https://github.com/1282saa/ringgle/issues

---

Copyright 2026 Ringle AI English Learning Project.
