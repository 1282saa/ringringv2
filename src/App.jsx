import { useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Settings from './pages/Settings'
import TutorSettings from './pages/TutorSettings'
import ScheduleSettings from './pages/ScheduleSettings'
import CurriculumSettings from './pages/CurriculumSettings'
import RoleplaySettings from './pages/RoleplaySettings'
import RoleplayCategory from './pages/RoleplayCategory'
import NotificationSettings from './pages/NotificationSettings'
import Call from './pages/Call'
import Result from './pages/Result'
import Script from './pages/Script'
import Analysis from './pages/Analysis'
import Practice from './pages/Practice'
import IncomingCall from './pages/IncomingCall'
import { notificationService } from './services/notificationService'
import { UserSettingsProvider } from './context'
import { initializeApp, setupBackButton } from './utils/capacitor'
// Auth imports
import { AuthProvider, ProtectedRoute, PublicRoute } from './auth'
import { Login, Signup, VerifyEmail, ForgotPassword, AuthCallback } from './pages/auth'
import './App.css'

// 뒤로가기 핸들링을 위한 내부 컴포넌트
function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()

  // 네이티브에서 전화 수신 후 /call로 이동 처리
  useEffect(() => {
    const shouldNavigateToCall = localStorage.getItem('navigateToCall')
    if (shouldNavigateToCall === 'true') {
      localStorage.removeItem('navigateToCall')
      console.log('[App] Navigating to /call from incoming call')
      navigate('/call', { state: { fromIncomingCall: true } })
    }
  }, [navigate])

  // Android 뒤로가기 버튼 핸들링
  useEffect(() => {
    const cleanup = setupBackButton((canGoBack) => {
      // 홈 화면에서는 앱 종료 허용 (false 반환)
      if (location.pathname === '/') {
        return false
      }

      // 통화 중에는 뒤로가기 방지
      if (location.pathname === '/call') {
        // 통화 종료 확인 모달 표시 등 처리 가능
        // 일단은 뒤로가기 허용
        navigate(-1)
        return true
      }

      // 다른 페이지에서는 뒤로가기
      if (canGoBack) {
        navigate(-1)
        return true
      }

      return false
    })

    return cleanup
  }, [location.pathname, navigate])

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/auth/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/auth/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/auth/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
      <Route path="/auth/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/settings/tutor" element={<ProtectedRoute><TutorSettings /></ProtectedRoute>} />
      <Route path="/settings/schedule" element={<ProtectedRoute><ScheduleSettings /></ProtectedRoute>} />
      <Route path="/settings/curriculum" element={<ProtectedRoute><CurriculumSettings /></ProtectedRoute>} />
      <Route path="/settings/roleplay" element={<ProtectedRoute><RoleplaySettings /></ProtectedRoute>} />
      <Route path="/settings/roleplay/category" element={<ProtectedRoute><RoleplayCategory /></ProtectedRoute>} />
      <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
      <Route path="/call" element={<ProtectedRoute><Call /></ProtectedRoute>} />
      <Route path="/result" element={<ProtectedRoute><Result /></ProtectedRoute>} />
      <Route path="/script" element={<ProtectedRoute><Script /></ProtectedRoute>} />
      <Route path="/analysis" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
      <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
      <Route path="/incoming-call" element={<ProtectedRoute><IncomingCall /></ProtectedRoute>} />
    </Routes>
  )
}

function App() {
  // 앱 초기화 (Capacitor 플러그인 + 알림 서비스)
  useEffect(() => {
    // Capacitor 네이티브 초기화
    initializeApp()

    // 알림 서비스 초기화
    notificationService.initialize()
  }, [])

  return (
    <AuthProvider>
      <UserSettingsProvider>
        <div className="app">
          <AppContent />
        </div>
      </UserSettingsProvider>
    </AuthProvider>
  )
}

export default App
