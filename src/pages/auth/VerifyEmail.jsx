/**
 * Email Verification Page
 */

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../auth'
import './auth.css'

export default function VerifyEmail() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const { confirmSignUp, resendCode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await confirmSignUp(email, code)
      navigate('/auth/login', {
        state: { message: '이메일 인증이 완료되었습니다. 로그인해주세요.' }
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setMessage('')
    setResending(true)

    try {
      await resendCode(email)
      setMessage('인증 코드가 재전송되었습니다.')
    } catch (err) {
      setError('코드 재전송에 실패했습니다.')
    } finally {
      setResending(false)
    }
  }

  const getErrorMessage = (err) => {
    switch (err.name) {
      case 'CodeMismatchException':
        return '인증 코드가 일치하지 않습니다.'
      case 'ExpiredCodeException':
        return '인증 코드가 만료되었습니다. 새 코드를 요청해주세요.'
      default:
        return err.message || '인증에 실패했습니다.'
    }
  }

  if (!email) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1>이메일 인증</h1>
            <p>이메일 정보가 없습니다.</p>
          </div>
          <Link to="/auth/signup" className="btn-primary">회원가입으로 돌아가기</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>이메일 인증</h1>
          <p><strong>{email}</strong>로 전송된<br/>인증 코드를 입력해주세요.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="code">인증 코드</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="6자리 코드 입력"
              maxLength={6}
              autoComplete="one-time-code"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '인증 중...' : '인증하기'}
          </button>
        </form>

        <div className="auth-links">
          <button
            onClick={handleResend}
            disabled={resending}
            className="btn-link"
          >
            {resending ? '전송 중...' : '인증 코드 재전송'}
          </button>
          <Link to="/auth/login">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}
