# Phase 12: AWS Cognito Authentication & Play Store Deployment

**Timeline:** 2026-01-18 ~ 2026-01-19
**Status:** In Progress
**Branch:** `main`
**Commit:** `52da751`
**Impact:** 사용자 인증 시스템 구현 및 Google Play Store 배포 준비

---

## Overview

AWS Cognito 기반 사용자 인증 시스템 구현 및 Google Play Store 배포를 위한 모든 준비 작업 완료.

**Key Objectives:**
- AWS Cognito 이메일/비밀번호 인증
- 이메일 인증 코드 검증 (6자리)
- Google OAuth 연동
- Protected Routes 구현
- Play Store 에셋 생성 (아이콘, 스크린샷, Feature Graphic)
- AAB 빌드 및 서명

---

## Implementation Details

### 1. AWS Cognito 인증 서비스

**파일:** `src/auth/cognitoService.js`

```javascript
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
  ResendConfirmationCodeCommand,
} from '@aws-sdk/client-cognito-identity-provider'

class CognitoService {
  // 회원가입
  async signUp(email, password, attributes = {}) {
    const command = new SignUpCommand({
      ClientId: COGNITO_CONFIG.userPoolWebClientId,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
    })
    return await client.send(command)
  }

  // 이메일 인증
  async confirmSignUp(email, code) {
    const command = new ConfirmSignUpCommand({
      ClientId: COGNITO_CONFIG.userPoolWebClientId,
      Username: email,
      ConfirmationCode: code,
    })
    await client.send(command)
  }

  // 로그인
  async signIn(email, password) {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CONFIG.userPoolWebClientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    })
    return await client.send(command)
  }

  // 토큰 자동 갱신
  async refreshTokens() { ... }

  // 로그아웃
  async signOut() { ... }
}
```

---

### 2. Cognito 설정

**파일:** `src/auth/cognitoConfig.js`

```javascript
export const COGNITO_CONFIG = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_hyDGIAuPL',
  userPoolWebClientId: '3afukmb67m1csajp7ruj9geoni',
  oauth: {
    domain: 'ringgle-ai-english.auth.us-east-1.amazoncognito.com',
    scope: ['openid', 'email', 'profile'],
    responseType: 'code',
  }
}
```

**AWS CLI로 인증 플로우 활성화:**
```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_hyDGIAuPL \
  --client-id 3afukmb67m1csajp7ruj9geoni \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
  --region us-east-1
```

---

### 3. 인증 Context & Protected Routes

**파일:** `src/auth/AuthContext.jsx`

```javascript
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 페이지 로드 시 인증 상태 확인
  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    if (cognitoService.isAuthenticated()) {
      const currentUser = await cognitoService.getCurrentUser()
      setUser(currentUser)
    }
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, ... }}>
      {children}
    </AuthContext.Provider>
  )
}
```

**파일:** `src/auth/ProtectedRoute.jsx`

```javascript
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/auth/login" replace />

  return children
}
```

---

### 4. 인증 UI 페이지

| 페이지 | 파일 | 기능 |
|--------|------|------|
| 로그인 | `src/pages/auth/Login.jsx` | 이메일/비밀번호 로그인, Google OAuth |
| 회원가입 | `src/pages/auth/Signup.jsx` | 이메일/비밀번호 가입 |
| 이메일 인증 | `src/pages/auth/VerifyEmail.jsx` | 6자리 코드 입력, 재전송 |
| 비밀번호 찾기 | `src/pages/auth/ForgotPassword.jsx` | 비밀번호 재설정 |
| OAuth 콜백 | `src/pages/auth/AuthCallback.jsx` | Google OAuth 처리 |

---

### 5. deviceId 하드코딩 수정

**파일:** `src/utils/helpers.js`

```javascript
// Before (하드코딩)
export function getDeviceId() {
  return 'test-device-001'
}

// After (동적 UUID 생성)
export function getDeviceId() {
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId)
  }
  return deviceId
}
```

**파일:** `src/constants/index.js`

```javascript
export const STORAGE_KEYS = {
  TUTOR_SETTINGS: 'tutorSettings',
  CALL_HISTORY: 'callHistory',
  LAST_CALL_RESULT: 'lastCallResult',
  LAST_FEEDBACK: 'lastFeedback',
  DEVICE_ID: 'deviceId',  // 추가
}
```

---

### 6. Play Store 에셋

| 에셋 | 크기 | 파일 |
|------|------|------|
| App Icon | 512x512 | `app-icon-512.png` |
| Feature Graphic | 1024x500 | `feature-graphic.png` |
| Screenshot 1 | 1080x2340 | `screenshot-01-home.png` |
| Screenshot 2 | 1080x2340 | `screenshot-02-call.png` |
| Screenshot 3 | 1080x2340 | `screenshot-03-result.png` |
| Screenshot 4 | 1080x2340 | `screenshot-04-settings.png` |

**스크린샷 HTML 템플릿:** `screenshots/*.html`

---

### 7. Android 빌드 버전 관리

**파일:** `android/app/build.gradle`

```gradle
defaultConfig {
    applicationId "com.aienglish.call"
    versionCode 3
    versionName "1.0.2"
}
```

| 버전 | versionCode | 상태 |
|------|-------------|------|
| 1.0.0 | 1 | 이미 업로드됨 |
| 1.0.1 | 2 | 이미 업로드됨 |
| 1.0.2 | 3 | 현재 버전 |

---

## API 테스트 결과

| API | 엔드포인트 | 상태 |
|-----|-----------|------|
| Chat | `/prod/chat?action=chat` | ✅ 정상 |
| TTS | `/prod/chat?action=tts` | ✅ 정상 |
| Translate | `/prod/chat?action=translate` | ✅ 정상 |
| Analyze | `/prod/chat?action=analyze` | ❌ JSON 파싱 오류 |
| Sessions | `/prod/chat?action=*_session` | ⚠️ 확인 필요 |

---

## File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `src/auth/cognitoService.js` | New | Cognito SDK 래퍼 |
| `src/auth/cognitoConfig.js` | New | Cognito 설정 |
| `src/auth/AuthContext.jsx` | New | 인증 Context Provider |
| `src/auth/ProtectedRoute.jsx` | New | 인증 필요 라우트 래퍼 |
| `src/pages/auth/Login.jsx` | New | 로그인 페이지 |
| `src/pages/auth/Signup.jsx` | New | 회원가입 페이지 |
| `src/pages/auth/VerifyEmail.jsx` | New | 이메일 인증 페이지 |
| `src/pages/auth/ForgotPassword.jsx` | New | 비밀번호 찾기 페이지 |
| `src/pages/auth/AuthCallback.jsx` | New | OAuth 콜백 페이지 |
| `src/pages/auth/auth.css` | New | 인증 UI 스타일 |
| `src/utils/helpers.js` | Modified | deviceId 동적 생성 |
| `src/constants/index.js` | Modified | DEVICE_ID 키 추가 |
| `src/App.jsx` | Modified | 인증 라우트 추가 |
| `android/app/build.gradle` | Modified | versionCode 3 |
| `PLAY_STORE_LISTING.md` | New | 스토어 등록 정보 |
| `privacy-policy.html` | New | 개인정보 처리방침 |
| `feature-graphic.html` | New | Feature Graphic 템플릿 |
| `screenshots/*.html` | New | 스크린샷 템플릿 |

---

## Play Store 배포 체크리스트

- [x] AAB 빌드 (versionCode 3)
- [x] 앱 아이콘 512x512
- [x] Feature Graphic 1024x500
- [x] 스크린샷 4장 (1080x2340)
- [x] 개인정보 처리방침 페이지
- [x] 콘텐츠 등급 설문지 완료
- [ ] 비공개 테스트 (12명 이상, 14일)
- [ ] 프로덕션 출시

---

## Known Issues

### 1. USER_PASSWORD_AUTH flow not enabled
- **문제:** Cognito App Client에서 인증 플로우 미활성화
- **해결:** AWS CLI로 `ALLOW_USER_PASSWORD_AUTH` 활성화

### 2. Analyze API JSON 파싱 오류
- **문제:** Lambda에서 AI 응답 JSON 파싱 시 이스케이프 문자 오류
- **상태:** 미해결 (Lambda 수정 필요)

### 3. versionCode 중복
- **문제:** 이미 사용된 versionCode로 업로드 시도
- **해결:** versionCode를 순차적으로 증가 (1 → 2 → 3)

---

## Next Steps

- Phase 13: iOS 빌드 및 App Store 배포
- Phase 14: Analyze API Lambda 수정
- Phase 15: 비공개 테스트 14일 완료 후 프로덕션 출시

---

## References

- [AWS Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Google Play Console](https://play.google.com/console)
- [Phase 11: Native Call Scheduling](PHASE-11-native-call-scheduling.md)
