# 프로젝트 개발 일정표 (Timeline)

> **프로젝트**: Ringle AI 영어 학습 MVP
> **기간**: 2026-01-12 ~ 2026-01-17 (6일)
> **개발 방식**: AI-Assisted Development (Claude Code)

---

## 전체 일정 요약

```
1/12 ████████████████████████████ Phase 1-8 (기본 기능 + 설정)
1/13 ████████████████             Phase 9 (스크립트 UI + 스트리밍)
1/14 ████                         문서 정리 (프라이버시 정책)
1/15 ████                         문서 구조화
1/17 ████████████████████████████ Phase 10-11 (UI 개선 + 네이티브 알림)
```

---

## 날짜별 상세 진행 내역

### 📅 2026-01-12 (Day 1) - 핵심 기능 구현

| 시간대 | 작업 내용 | Phase |
|--------|----------|-------|
| 오전 | 프로젝트 초기 설정 (React 19 + Vite 7 + Capacitor 8) | Phase 1 |
| 오전 | 음성 대화 기능 (Web Speech API + Claude Haiku + Polly TTS) | Phase 2 |
| 오후 | 튜터 설정 기능 (악센트, 성별, 속도, 난이도) | Phase 3 |
| 오후 | 통화 분석 기능 (CAFP 점수, 문법 교정) | Phase 4 |
| 오후 | GitHub 레포지토리 설정 | Phase 5 |
| 저녁 | DynamoDB 설정 저장 API | Phase 6 |
| 저녁 | 설정 UI/UX 개선 (링글 스타일) | Phase 7 |
| 밤 | 상수 중앙화 리팩토링 | Phase 8 |

**주요 성과**:
- 전체 앱 골격 완성 (홈, 통화, 결과, 설정)
- AI 음성 대화 파이프라인 구축
- 백엔드 API 6개 완성 (chat, tts, stt, analyze, save_settings, get_settings)

---

### 📅 2026-01-13 (Day 2) - 스크립트 UI & 안정화

| 시간대 | 작업 내용 | 비고 |
|--------|----------|------|
| 오전 | 링글 스타일 스크립트 UI 구현 | 말풍선 형태 대화 |
| 오전 | 스트리밍 STT 통합 | 실시간 자막 |
| 오후 | 단어 수/턴 수 정확도 개선 | useRef 활용 |
| 오후 | 통화 기록 DynamoDB 연동 | 목업 데이터 제거 |
| 저녁 | 번역 기능 추가 (영→한) | 결과 화면 |
| 저녁 | 결과→분석 페이지 연결 | 상세 분석 확인 |

**주요 성과**:
- 실시간 자막 기능 완성
- 통화 기록 영구 저장
- 결과 분석 플로우 연결

---

### 📅 2026-01-14 (Day 3) - 문서화

| 작업 내용 | 비고 |
|----------|------|
| 프라이버시 정책 작성 | Play Store 제출용 |

---

### 📅 2026-01-15 (Day 4) - 문서 구조화

| 작업 내용 | 비고 |
|----------|------|
| 문서 폴더 재구성 | 카테고리별 정리 |

---

### 📅 2026-01-17 (Day 5) - UI 완성 & 네이티브 기능

| 시간대 | 작업 내용 | Phase |
|--------|----------|-------|
| 오전 | 프론트엔드 UI 전면 개선 (링글 100% 재현) | Phase 10 |
| 오전 | Capacitor 모바일 플러그인 추가 | - |
| 오후 | **네이티브 전화 예약 시스템** | Phase 11 |
| 오후 | - IncomingCallActivity.java (전화 수신 화면) | |
| 오후 | - CallSchedulerPlugin.java (Capacitor 브릿지) | |
| 오후 | - CallSchedulerService.java (Foreground Service) | |
| 오후 | - CallAlarmReceiver.java (알람 수신) | |
| 저녁 | **Firebase Cloud Messaging 연동** | Phase 11 |
| 저녁 | 동기부여 메시지 기능 (10분 전 알림) | Phase 11 |
| 저녁 | 상태바 색상 수정 (흰색 배경) | Phase 11 |
| 밤 | Phase 11 문서 작성 (573줄) | - |
| 밤 | 팀원 가이드 문서 작성 | - |

**주요 성과**:
- 안드로이드 네이티브 전화 알림 완성
- 잠금화면에서도 전화 수신 UI 표시
- FCM 푸시 알림 연동
- 동기부여 메시지 15종

---

## Phase별 완료 현황

| Phase | 제목 | 완료일 | 소요 시간 |
|-------|------|--------|----------|
| 1 | Project Setup | 01-12 | 2h |
| 2 | Voice Conversation | 01-12 | 3h |
| 3 | Tutor Settings | 01-12 | 2h |
| 4 | Call Analysis | 01-12 | 2h |
| 5 | GitHub Setup | 01-12 | 0.5h |
| 6 | Settings Backend | 01-12 | 2h |
| 7 | Settings UI/UX | 01-12 | 2h |
| 8 | Constant Refactoring | 01-12 | 1h |
| 9 | UX/UI Improvements | 01-13 | 4h |
| 10 | Call Tab UI Refinement | 01-17 | 3h |
| 11 | Native Call Scheduling | 01-17 | 6h |

**총 개발 시간**: 약 27.5시간 (실제 코딩 시간)

---

## 산출물 목록

### 코드
| 구분 | 파일 수 | 주요 파일 |
|------|--------|----------|
| Frontend (React) | 15+ | Call.jsx, Result.jsx, TutorSettings.jsx |
| Backend (Python) | 1 | lambda_function.py (800줄+) |
| Android Native | 5 | IncomingCallActivity, CallSchedulerPlugin 등 |

### 문서
| 문서 | 설명 |
|------|------|
| TEAM_OVERVIEW.md | 팀원용 프로젝트 가이드 |
| TIMELINE.md | 개발 일정표 (이 문서) |
| Phase 1-11 문서 | 단계별 상세 구현 기록 |
| API_REFERENCE.md | API 엔드포인트 상세 |
| AWS_INFRASTRUCTURE.md | 인프라 구성도 |

### APK (Android)
| 버전 | 내용 |
|------|------|
| v7 | 스케줄 설정 연동 |
| v8 | Firebase 푸시 활성화 |
| v9 | 동기부여 메시지 |
| v10 | 상태바 수정 |

---

## 향후 일정 (예정)

| Phase | 제목 | 예상 작업 |
|-------|------|----------|
| 12 | iOS Call Scheduling | CallKit 연동 |
| 13 | Auto Re-scheduling | 통화 후 자동 재예약 |
| 14 | Missed Call Notification | 부재중 전화 알림 |
| 15 | Play Store Deployment | Google Play 배포 |
| 16 | App Store Deployment | Apple App Store 배포 |

---

## 커밋 히스토리

```
2026-01-17 dc140fa docs: 팀원용 프로젝트 가이드 문서 추가
2026-01-17 1d59e08 docs: Phase 11 문서 추가
2026-01-17 xxxxxxx feat: 네이티브 전화 예약 시스템 및 Firebase 푸시 알림 구현
2026-01-17 xxxxxxx feat: 프론트엔드 UI 전면 개선
2026-01-15 xxxxxxx docs: Restructure documentation
2026-01-14 xxxxxxx docs: Add privacy policy
2026-01-13 xxxxxxx feat: Connect Result to Analysis
2026-01-13 xxxxxxx feat: Ringle-style Script UI
2026-01-12 xxxxxxx feat: Initial commit - MVP
```

---

*마지막 업데이트: 2026-01-17*
