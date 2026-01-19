/**
 * Protected Route Components
 * Guards routes based on authentication status
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * Protected Route - Requires authentication
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" />
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  return children
}

/**
 * Public Route - Redirects to home if already authenticated
 */
export function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" />
        <p>로딩 중...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  return children
}

export default ProtectedRoute
