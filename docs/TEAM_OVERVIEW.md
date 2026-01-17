# Ringle AI 영어 학습 MVP - 팀원 가이드

> **한 줄 요약**: 전화영어 튜터를 AI로 대체하여, 언제 어디서나 부담 없이 영어 회화를 연습할 수 있는 앱

---

## 1. WHY - 왜 만들었나?

### 목적
**"전화영어의 심리적 장벽을 낮추고, 학습 접근성을 높인다"**

| 기존 전화영어 | Ringle AI |
|--------------|-----------|
| 시간 제약 (튜터 스케줄) | 24시간 이용 가능 |
| 비용 부담 (월 10만원+) | 무료/저렴한 AI 비용 |
| 실수 창피함 | AI 상대로 부담 없음 |
| 피드백 지연 | 실시간 분석 & 교정 |

### 타겟 사용자
- 영어 회화 연습이 필요하지만 전화영어가 부담스러운 사람
- 출퇴근/자투리 시간에 영어 학습하고 싶은 직장인
- 면접/비즈니스 영어 준비가 필요한 취준생

---

## 2. WHAT - 무엇을 만들었나?

### 핵심 기능 3가지

```
┌─────────────────────────────────────────────────────────────┐
│  1. AI 음성 대화        2. 맞춤 설정          3. 실시간 분석  │
│  ─────────────────     ─────────────────     ─────────────── │
│  • 음성 인식 (STT)     • 튜터 선택 (8명)    • CAFP 점수     │
│  • AI 응답 (Claude)    • 악센트 (US/UK/AU)  • 문법 교정     │
│  • 음성 합성 (TTS)     • 난이도 (3단계)     • 필러워드 감지 │
│  • 자막 표시           • 주제 (4가지)       • 개선 피드백   │
└─────────────────────────────────────────────────────────────┘
```

### 사용자 플로우

```
홈 화면 → 튜터 선택 → 통화 시작 → AI 대화 → 통화 종료 → 분석 결과
   │                                                        │
   └──────────── 스케줄 예약 (전화 알림) ──────────────────────┘
```

---

## 3. HOW - 어떻게 만들었나?

### 기술 스택 (한눈에)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React 19 + Vite 7 + Capacitor 8 (iOS/Android)             │
├─────────────────────────────────────────────────────────────┤
│                        BACKEND                              │
│  AWS Lambda (Python) + API Gateway                          │
├─────────────────────────────────────────────────────────────┤
│                        AI / ML                              │
│  Claude Haiku (대화) + Amazon Polly (TTS) + Web Speech (STT)│
├─────────────────────────────────────────────────────────────┤
│                        MOBILE                               │
│  Android: AlarmManager + Foreground Service + FCM Push      │
│  iOS: (예정) CallKit                                        │
└─────────────────────────────────────────────────────────────┘
```

### 왜 이 기술을 선택했나?

| 기술 | 선택 이유 |
|------|----------|
| **React + Vite** | 빠른 개발 속도, HMR 지원, 팀 친숙도 |
| **Capacitor** | 하나의 코드베이스로 iOS/Android 동시 지원 |
| **Claude Haiku** | 빠른 응답 속도 (< 1초), 자연스러운 대화 |
| **Amazon Polly** | 다양한 악센트, 고품질 음성 |
| **Foreground Service** | 화면 꺼져도 예약 알림 보장 |

---

## 4. 프로젝트 구조

```
ringgle/
├── src/
│   ├── pages/
│   │   ├── Home.jsx          # 메인 화면 (학습 현황)
│   │   ├── Call.jsx          # 음성 통화 화면
│   │   ├── Result.jsx        # 통화 결과 분석
│   │   ├── Settings.jsx      # 설정 메인
│   │   ├── TutorSettings.jsx # 튜터 선택
│   │   └── ScheduleSettings.jsx # 예약 설정
│   ├── services/
│   │   ├── api.js            # API 호출
│   │   └── notificationService.js # 푸시 알림
│   └── constants/
│       └── index.js          # 상수 정의 (튜터, 주제 등)
├── backend/
│   └── lambda_function.py    # AWS Lambda 핸들러
├── android/
│   └── app/src/main/java/    # 네이티브 안드로이드 코드
└── docs/                     # 문서
```

---

## 5. 개발 진행 현황 (Phase)

| Phase | 내용 | 상태 |
|-------|------|------|
| 1-4 | 기본 기능 (음성대화, 분석) | ✅ 완료 |
| 5-8 | 설정 기능 (튜터, 스케줄) | ✅ 완료 |
| 9-10 | UI/UX 개선 | ✅ 완료 |
| **11** | **네이티브 전화 예약 + FCM 푸시** | ✅ **완료** |
| 12 | iOS CallKit 연동 | 📋 예정 |
| 15-16 | 스토어 배포 | 📋 예정 |

### Phase 11 주요 성과 (최신)
- **전화 예약 알림**: 설정한 시간에 실제 전화처럼 알림
- **잠금 화면 지원**: Full-Screen Intent로 화면 꺼져도 알림
- **동기부여 메시지**: 통화 10분 전 랜덤 응원 메시지
- **상태바 수정**: 흰색 배경으로 가시성 확보

---

## 6. 실행 방법

### 개발 서버
```bash
cd ringgle
npm install
npm run dev
# http://localhost:5173
```

### Android APK 빌드
```bash
npm run build
npx cap sync android
npx cap open android
# Android Studio에서 Build > Build Bundle(s) / APK(s)
```

### 배포 (Web)
```bash
npm run build
aws s3 sync dist/ s3://eng-call --delete
```

---

## 7. API 엔드포인트

**Base URL**: `https://n4o7d3c14c.execute-api.us-east-1.amazonaws.com/prod/chat`

| Action | 설명 | 사용처 |
|--------|------|--------|
| `chat` | AI 대화 | Call.jsx |
| `tts` | 음성 합성 | Call.jsx |
| `analyze` | 대화 분석 | Result.jsx |
| `save_settings` | 설정 저장 | Settings.jsx |
| `get_settings` | 설정 조회 | 앱 시작 시 |

---

## 8. 주요 파일 설명

| 파일 | 역할 | 핵심 로직 |
|------|------|----------|
| `Call.jsx` | 통화 화면 | Web Speech API 음성인식, Polly TTS 재생 |
| `Result.jsx` | 결과 화면 | CAFP 점수 시각화, 문법 교정 표시 |
| `TutorSettings.jsx` | 튜터 선택 | 캐러셀 UI, 악센트/성별/속도 설정 |
| `ScheduleSettings.jsx` | 예약 설정 | 요일별 시간 설정, 네이티브 연동 |
| `notificationService.js` | 알림 서비스 | FCM 푸시, 동기부여 메시지 |
| `CallSchedulerPlugin.java` | 안드로이드 플러그인 | AlarmManager 예약 |
| `IncomingCallActivity.java` | 전화 수신 화면 | 전화 UI, 수락/거절 버튼 |

---

## 9. 참고 문서

- [API 상세 스펙](./API_REFERENCE.md)
- [AWS 인프라 구성](./AWS_INFRASTRUCTURE.md)
- [UI/UX 명세](./UI_UX_SPECIFICATION.md)
- [Phase 11 상세](./05-history/phase/PHASE-11-native-call-scheduling.md)

---

## 10. 문의

- **GitHub**: https://github.com/1282saa/ringgle
- **이슈 등록**: https://github.com/1282saa/ringgle/issues

---

*마지막 업데이트: 2026-01-17*
