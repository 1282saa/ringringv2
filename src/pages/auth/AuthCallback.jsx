/**
 * OAuth Callback Handler
 * Handles redirect from Google/Apple OAuth
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth'
import './auth.css'

export default function AuthCallback() {
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const { handleOAuthCallback } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (errorParam) {
      setError(errorDescription || '로그인에 실패했습니다.')
      return
    }

    if (code) {
      processCallback(code)
    } else {
      setError('인증 코드가 없습니다.')
    }
  }, [searchParams])

  const processCallback = async (code) => {
    try {
      await handleOAuthCallback(code)
      navigate('/', { replace: true })
    } catch (err) {
      console.error('OAuth callback error:', err)
      setError(err.message || '로그인 처리에 실패했습니다.')
    }
  }

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1>로그인 오류</h1>
            <p>{error}</p>
          </div>
          <button onClick={() => navigate('/auth/login')} className="btn-primary">
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-loading">
          <div className="loading-spinner" />
          <p>로그인 처리 중...</p>
        </div>
      </div>
    </div>
  )
}
