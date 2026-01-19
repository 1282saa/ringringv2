/**
 * Authentication Context
 * Provides auth state and methods throughout the app
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { cognitoService } from './cognitoService'
import { COGNITO_CONFIG } from './cognitoConfig'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      setLoading(true)

      if (cognitoService.isAuthenticated()) {
        const currentUser = await cognitoService.getCurrentUser()
        setUser(currentUser)
      }
    } catch (err) {
      console.error('Auth initialization failed:', err)
      cognitoService.clearTokens()
    } finally {
      setLoading(false)
    }
  }

  // Sign up
  const signUp = useCallback(async (email, password) => {
    setError(null)
    try {
      const result = await cognitoService.signUp(email, password)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  // Confirm sign up (email verification)
  const confirmSignUp = useCallback(async (email, code) => {
    setError(null)
    try {
      return await cognitoService.confirmSignUp(email, code)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  // Resend confirmation code
  const resendCode = useCallback(async (email) => {
    setError(null)
    try {
      return await cognitoService.resendConfirmationCode(email)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  // Sign in with email/password
  const signIn = useCallback(async (email, password) => {
    setError(null)
    try {
      const result = await cognitoService.signIn(email, password)

      if (!result.challengeName) {
        const currentUser = await cognitoService.getCurrentUser()
        setUser(currentUser)
      }

      return result
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  // Sign in with Google
  const signInWithGoogle = useCallback(() => {
    const { oauth, userPoolWebClientId } = COGNITO_CONFIG
    const redirectUri = encodeURIComponent(oauth.getRedirectSignIn())
    const scope = encodeURIComponent(oauth.scope.join(' '))

    const url = `https://${oauth.domain}/oauth2/authorize?` +
      `client_id=${userPoolWebClientId}&` +
      `response_type=${oauth.responseType}&` +
      `scope=${scope}&` +
      `redirect_uri=${redirectUri}&` +
      `identity_provider=Google`

    window.location.href = url
  }, [])

  // Sign in with Apple
  const signInWithApple = useCallback(() => {
    const { oauth, userPoolWebClientId } = COGNITO_CONFIG
    const redirectUri = encodeURIComponent(oauth.getRedirectSignIn())
    const scope = encodeURIComponent(oauth.scope.join(' '))

    const url = `https://${oauth.domain}/oauth2/authorize?` +
      `client_id=${userPoolWebClientId}&` +
      `response_type=${oauth.responseType}&` +
      `scope=${scope}&` +
      `redirect_uri=${redirectUri}&` +
      `identity_provider=SignInWithApple`

    window.location.href = url
  }, [])

  // Handle OAuth callback
  const handleOAuthCallback = useCallback(async (code) => {
    setError(null)
    try {
      const { oauth, userPoolWebClientId } = COGNITO_CONFIG
      const redirectUri = oauth.getRedirectSignIn()

      const tokenUrl = `https://${oauth.domain}/oauth2/token`

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: userPoolWebClientId,
          code,
          redirect_uri: redirectUri,
        }),
      })

      if (!response.ok) {
        throw new Error('Token exchange failed')
      }

      const tokens = await response.json()

      cognitoService.storeTokens({
        AccessToken: tokens.access_token,
        IdToken: tokens.id_token,
        RefreshToken: tokens.refresh_token,
        ExpiresIn: tokens.expires_in,
      })

      const currentUser = await cognitoService.getCurrentUser()
      setUser(currentUser)

      return { success: true }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await cognitoService.signOut()
      setUser(null)
    } catch (err) {
      console.error('Sign out error:', err)
      setUser(null)
    }
  }, [])

  // Forgot password
  const forgotPassword = useCallback(async (email) => {
    setError(null)
    try {
      return await cognitoService.forgotPassword(email)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  // Reset password
  const resetPassword = useCallback(async (email, code, newPassword) => {
    setError(null)
    try {
      return await cognitoService.confirmForgotPassword(email, code, newPassword)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  // Get access token for API calls
  const getAccessToken = useCallback(async () => {
    try {
      return await cognitoService.getAccessToken()
    } catch (err) {
      await signOut()
      throw err
    }
  }, [signOut])

  // Get user ID (Cognito sub)
  const getUserId = useCallback(() => {
    return user?.userId || cognitoService.getUserIdFromToken() || null
  }, [user])

  const value = useMemo(() => ({
    // State
    user,
    loading,
    error,
    isAuthenticated: !!user,

    // Methods
    signUp,
    confirmSignUp,
    resendCode,
    signIn,
    signInWithGoogle,
    signInWithApple,
    handleOAuthCallback,
    signOut,
    forgotPassword,
    resetPassword,
    getAccessToken,
    getUserId,

    // Utilities
    clearError: () => setError(null),
  }), [
    user, loading, error,
    signUp, confirmSignUp, resendCode, signIn,
    signInWithGoogle, signInWithApple, handleOAuthCallback,
    signOut, forgotPassword, resetPassword,
    getAccessToken, getUserId,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
