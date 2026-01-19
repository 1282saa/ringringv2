/**
 * Forgot Password Page
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth'
import './auth.css'

export default function ForgotPassword() {
  const [step, setStep] = useState('request') // 'request' or 'reset'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { forgotPassword, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleRequestCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await forgotPassword(email)
      setStep('reset')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)

    try {
      await resetPassword(email, code, newPassword)
      navigate('/auth/login', {
        state: { message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.' }
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = (err) => {
    switch (err.name) {
      case 'UserNotFoundException':
        return '등록되지 않은 이메일입니다.'
      case 'CodeMismatchException':
        return '인증 코드가 일치하지 않습니다.'
      case 'ExpiredCodeException':
        return '인증 코드가 만료되었습니다.'
      case 'InvalidPasswordException':
        return '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.'
      default:
        return err.message || '오류가 발생했습니다.'
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>비밀번호 찾기</h1>
          <p>
            {step === 'request'
              ? '가입한 이메일을 입력해주세요.'
              : '이메일로 전송된 코드와 새 비밀번호를 입력해주세요.'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {step === 'request' ? (
          <form onSubmit={handleRequestCode} className="auth-form">
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

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '전송 중...' : '인증 코드 전송'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
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
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">새 비밀번호</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="8자 이상, 대소문자+숫자+특수문자"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">비밀번호 확인</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="비밀번호 확인"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}

        <div className="auth-links">
          <Link to="/auth/login">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}
