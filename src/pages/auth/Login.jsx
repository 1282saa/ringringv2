/**
 * Login Page
 */

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth'
import './auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn, signInWithGoogle, signInWithApple } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn(email, password)

      if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
        navigate('/auth/new-password', { state: { session: result.session } })
        return
      }

      navigate(from, { replace: true })
    } catch (err) {
      if (err.name === 'UserNotConfirmedException') {
        navigate('/auth/verify-email', { state: { email } })
        return
      }
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = (err) => {
    switch (err.name) {
      case 'NotAuthorizedException':
        return '이메일 또는 비밀번호가 올바르지 않습니다.'
      case 'UserNotFoundException':
        return '등록되지 않은 이메일입니다.'
      default:
        return err.message || '로그인에 실패했습니다.'
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>로그인</h1>
          <p>AI 영어 학습을 시작하세요</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="비밀번호"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="auth-divider">
          <span>또는</span>
        </div>

        <div className="social-buttons">
          <button onClick={signInWithGoogle} className="btn-social btn-google">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 계속하기
          </button>
        </div>

        <div className="auth-links">
          <Link to="/auth/forgot-password">비밀번호를 잊으셨나요?</Link>
          <Link to="/auth/signup">계정이 없으신가요? <strong>회원가입</strong></Link>
        </div>
      </div>
    </div>
  )
}
