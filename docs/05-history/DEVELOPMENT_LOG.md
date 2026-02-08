# Development Log

> Ringle AI English Learning MVP - Consolidated Development Record

---

## Overview

| Item | Description |
|------|-------------|
| **Project** | Ringle AI English Learning MVP |
| **Duration** | 2026-01-12 ~ Ongoing |
| **Total Phases** | 16 Completed |
| **Platforms** | Web, iOS, Android |

---

## Phase Summary

| Phase | Title | Date | Status | Key Deliverables |
|:-----:|-------|:----:|:------:|------------------|
| 1 | Project Setup | 01-12 | Done | React 19 + Vite 7 + Capacitor 8 initial setup |
| 2 | Voice Conversation | 01-12 | Done | Real-time voice chat (STT/TTS/AI) |
| 3 | Tutor Settings | 01-12 | Done | Accent/Gender/Level/Topic configuration |
| 4 | Call Analysis | 01-12 | Done | CAFP scoring + feedback system |
| 5 | GitHub Setup | 01-12 | Done | Git repository initialization |
| 6 | Settings Backend | 01-12 | Done | DynamoDB settings save/load |
| 7 | Settings UI | 01-12 | Done | Ringle-style settings screen |
| 8 | Code Refactoring | 01-12 | Done | Constants centralization, deduplication |
| 9 | UX/UI Improvements | 01-12 | Done | Subtitles, speaker toggle, accuracy calc |
| 10 | Call Tab UI | 01-12 | Done | Call tab UI refinement |
| 11 | Native Call Scheduling | 01-17 | Done | Android 전화 예약, Firebase 푸시 알림 |
| 12 | Learning Cycle | 02-06 | Done | 모닝 퀴즈 → AI 수업 → 복습 전화 사이클 |
| 13 | Voice Cloning | 02-08 | Done | ElevenLabs 음성 클로닝, 커스텀 튜터 |
| 14 | Google Calendar | 02-08 | Done | 학습 완료 시 캘린더 자동 기록 |
| 15 | Session Memory | 02-08 | Done | 크로스 세션 AI 메모리 (사용자 정보 기억) |
| 16 | Claude API 비용 최적화 | 02-08 | Done | Claude 3 Haiku 사용 (최저 비용 모델) |

---

## Phase Details

### Phase 1: Project Setup
```
Project Structure
├── Frontend: React 19, Vite 7, React Router 7
├── Mobile: Capacitor 8 (iOS/Android)
├── Backend: AWS Lambda (Python 3.11)
└── Result: dist/ build, mobile sync complete
```

### Phase 2: Voice Conversation
```
Voice Chat Implementation
├── STT: Web Speech API → AWS Transcribe
├── AI: AWS Bedrock (Claude Haiku)
├── TTS: Amazon Polly (Neural/Standard)
└── Result: Real-time English conversation
```

### Phase 3: Tutor Settings
```
Tutor Customization
├── Accent: US, UK, AU, IN
├── Gender: Male, Female
├── Level: Beginner, Intermediate, Advanced
├── Topic: Business, Daily, Travel, Interview
└── Result: Personalized learning experience
```

### Phase 4: Call Analysis
```
Call Analysis System
├── CAFP Score: Confidence, Accuracy, Fluency, Pronunciation
├── Grammar: Error detection and correction
├── Filler Words: um, uh, like analysis
└── Result: Detailed feedback + improvement suggestions
```

### Phase 5: GitHub Setup
```
Version Control
├── Repository: github.com/1282saa/ringgle.git
├── Branch: main
└── Result: Source code version control initiated
```

### Phase 6: Settings Backend
```
Settings Backend Integration
├── Storage: DynamoDB (eng-learning-conversations)
├── API: save_settings, get_settings
├── Fallback: localStorage
└── Result: Cross-device settings sync
```

### Phase 7: Settings UI Refinement
```
Settings UI Improvement
├── Settings.jsx: Section list style
├── ScheduleSettings.jsx: Day-by-day scheduling
├── TutorSettings.jsx: Tutor carousel
├── CurriculumSettings.jsx: Topic accordion
└── Result: Ringle app-style UI
```

### Phase 8: Code Refactoring
```
Code Cleanup
├── constants.js: TUTORS, DIFFICULTIES, DURATIONS centralized
├── Deduplication: TutorSettings.jsx constants
├── Emoji removal: ACCENTS, GENDERS, TOPICS
└── Result: Improved maintainability
```

### Phase 9: UX/UI Improvements
```
User Experience Enhancement
├── Call.jsx: Subtitle toggle, speaker toggle, interim results
├── Practice.jsx: Levenshtein distance accuracy calculation
├── Result.jsx: Feedback modal improvements
├── Analysis.jsx: Audio playback, progress bar
├── Home.jsx: 150-word target UI
└── Result: Intuitive interface
```

### Phase 10: Call Tab UI Refinement
```
Call Tab UI
├── Layout improvements
├── Button style unification
└── Result: Clean call screen
```

### Phase 11: Native Call Scheduling
```
Native Android Call
├── AlarmManager + Foreground Service
├── Full-Screen Intent (화면 꺼진 상태 대응)
├── Firebase Cloud Messaging
├── 10분 전 동기부여 메시지 알림
└── Result: 실제 전화처럼 AI 튜터 전화 수신
```

### Phase 12: Learning Cycle
```
학습 사이클
├── 모닝 퀴즈: 듣기 4지선다 (TTS 기반)
├── AI 수업: 퀴즈 약점 반영 집중 학습
├── 복습 전화: 문법 교정, 표현 바꿔말하기, 자유대화
├── TodayProgress: 오늘의 학습 진행률 (3단계)
├── 자동 팝업: 설정 시간에 모닝퀴즈/복습 알림
└── Result: 완전한 학습 파이프라인
```

### Phase 13: Voice Cloning
```
음성 클로닝
├── 음성 샘플 녹음 (최소 3개)
├── ElevenLabs Voice Cloning API 연동
├── 커스텀 튜터 생성 (이름, 성별, 음성)
├── TTS 시 커스텀 음성 사용
└── Result: 나만의 음성 AI 튜터
```

### Phase 14: Google Calendar Integration
```
구글 캘린더 연동
├── Google OAuth 2.0 인증
├── Google Calendar API 연동
├── 학습 완료 시 자동 일정 추가
├── Settings에서 연결 관리
└── Result: 학습 기록 캘린더 동기화
```

### Phase 15: Session Memory
```
크로스 세션 메모리
├── 대화 종료 시 사용자 정보 자동 추출
├── DynamoDB에 사용자 메모리 저장
├── 다음 대화 시 메모리 불러오기
├── 시스템 프롬프트에 메모리 주입
└── Result: AI가 사용자 기억 (이름, 직업, 관심사)
```

### Phase 16: Claude API 비용 최적화
```
Claude 3 Haiku 사용
├── AWS Bedrock 통합
├── Claude 3 Haiku (최저 비용 모델)
├── Input: $0.25/1M, Output: $1.25/1M
├── Opus 대비 60배 저렴
└── Result: 비용 효율적인 AI 대화
```

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Frontend | React | 19.2.0 |
| Build | Vite | 7.2.4 |
| Mobile | Capacitor | 8.0.0 |
| Backend | AWS Lambda | Python 3.11 |
| AI | Claude Haiku | Bedrock |
| TTS | Amazon Polly | Neural |
| STT | AWS Transcribe | Streaming |
| Database | DynamoDB | - |
| Animation | Framer Motion | 12.25.0 |

---

## Deployment

| Resource | Value |
|----------|-------|
| **Live URL** | https://d3pw62uy753kuv.cloudfront.net |
| **CloudFront ID** | `E2EPS9DBLFD0FM` |
| **S3 Bucket** | `eng-call` (ap-northeast-2) |
| **API Gateway** | us-east-1 |

**Deploy Commands:**
```bash
npm run build
aws s3 sync dist/ s3://eng-call --delete --region ap-northeast-2
aws cloudfront create-invalidation --distribution-id E2EPS9DBLFD0FM --paths "/*"
```

---

## API Endpoints

**Base URL:** `https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat`

| Action | Description |
|--------|-------------|
| `chat` | AI conversation |
| `tts` | Text-to-speech |
| `stt` | Speech-to-text |
| `analyze` | Conversation analysis |
| `save_settings` | Save user settings |
| `get_settings` | Retrieve user settings |
| `start_session` | Start conversation session |
| `end_session` | End conversation session |
| `save_message` | Save chat message |
| `get_sessions` | List user sessions |
| `get_session_detail` | Get session with messages |
| `delete_session` | Delete session |

---

## Roadmap (Future)

| Phase | Title | Description | Priority |
|:-----:|-------|-------------|:--------:|
| 17 | iOS Call Scheduling | iOS CallKit 연동 | High |
| 18 | App Store / Play Store | 스토어 배포 | High |
| 19 | Analytics Dashboard | 사용량 및 성능 모니터링 | Medium |
| 20 | Hybrid AI Model | Haiku/Opus 하이브리드 비용 최적화 | Medium |
| 21 | Memory Management UI | Settings에서 메모리 조회/삭제 | Low |

---

## File Structure

```
eng-learning/
├── src/
│   ├── pages/
│   │   ├── Home.jsx          # Main screen
│   │   ├── Call.jsx          # Voice call
│   │   ├── Result.jsx        # Result analysis
│   │   └── Settings.jsx      # Settings
│   └── utils/
│       └── api.js            # API client
├── backend/
│   └── lambda_function.py    # Lambda handler
├── docs/
│   ├── phase/                # Detailed phase docs
│   ├── AWS_INFRASTRUCTURE.md
│   ├── AI_PIPELINE.md
│   ├── DATABASE_ERD.md
│   ├── API_REFERENCE.md
│   └── DEVELOPMENT_LOG.md    # This document
└── android/ & ios/           # Mobile projects
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [AWS Infrastructure](./AWS_INFRASTRUCTURE.md) | AWS service architecture |
| [AI Pipeline](./AI_PIPELINE.md) | AI/voice pipeline details |
| [Database ERD](./DATABASE_ERD.md) | DynamoDB schema design |
| [API Reference](./API_REFERENCE.md) | API specification |
| [OpenAPI Spec](./openapi.yaml) | Swagger/OpenAPI spec |

---

*Last Updated: 2026-02-08*
