/**
 * AWS Cognito SDK Wrapper
 * Direct SDK usage without Amplify
 */

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
import { COGNITO_CONFIG, AUTH_STORAGE_KEYS } from './cognitoConfig'

const client = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region,
})

class CognitoService {
  /**
   * Sign up with email and password
   */
  async signUp(email, password, attributes = {}) {
    const command = new SignUpCommand({
      ClientId: COGNITO_CONFIG.userPoolWebClientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        ...Object.entries(attributes).map(([key, value]) => ({
          Name: key,
          Value: value,
        })),
      ],
    })

    const response = await client.send(command)
    return {
      userSub: response.UserSub,
      userConfirmed: response.UserConfirmed,
      codeDeliveryDetails: response.CodeDeliveryDetails,
    }
  }

  /**
   * Confirm email with verification code
   */
  async confirmSignUp(email, code) {
    const command = new ConfirmSignUpCommand({
      ClientId: COGNITO_CONFIG.userPoolWebClientId,
      Username: email,
      ConfirmationCode: code,
    })

    await client.send(command)
    return { success: true }
  }

  /**
   * Resend verification code
   */
  async resendConfirmationCode(email) {
    const command = new ResendConfirmationCodeCommand({
      ClientId: COGNITO_CONFIG.userPoolWebClientId,
      Username: email,
    })

    const response = await client.send(command)
    return response.CodeDeliveryDetails
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CONFIG.userPoolWebClientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })

    const response = await client.send(command)

    if (response.ChallengeName) {
      return {
        challengeName: response.ChallengeName,
        session: response.Session,
        challengeParameters: response.ChallengeParameters,
      }
    }

    const tokens = response.AuthenticationResult
    this.storeTokens(tokens)

    return {
      accessToken: tokens.AccessToken,
      idToken: tokens.IdToken,
      refreshToken: tokens.RefreshToken,
      expiresIn: tokens.ExpiresIn,
    }
  }

  /**
   * Refresh tokens
   */
  async refreshTokens() {
    const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const command = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: COGNITO_CONFIG.userPoolWebClientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    })

    const response = await client.send(command)
    const tokens = response.AuthenticationResult

    this.storeTokens({
      ...tokens,
      RefreshToken: refreshToken,
    })

    return tokens
  }

  /**
   * Store tokens in localStorage
   */
  storeTokens(tokens) {
    const expiresAt = Date.now() + (tokens.ExpiresIn * 1000)

    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, tokens.AccessToken)
    localStorage.setItem(AUTH_STORAGE_KEYS.ID_TOKEN, tokens.IdToken)
    if (tokens.RefreshToken) {
      localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, tokens.RefreshToken)
    }
    localStorage.setItem(AUTH_STORAGE_KEYS.EXPIRES_AT, expiresAt.toString())
  }

  /**
   * Get current access token (with auto-refresh)
   */
  async getAccessToken() {
    const expiresAt = parseInt(localStorage.getItem(AUTH_STORAGE_KEYS.EXPIRES_AT) || '0')
    const accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)

    // If token expires in less than 5 minutes, refresh
    if (Date.now() > expiresAt - 300000) {
      try {
        const newTokens = await this.refreshTokens()
        return newTokens.AccessToken
      } catch (error) {
        console.error('Token refresh failed:', error)
        this.clearTokens()
        throw error
      }
    }

    return accessToken
  }

  /**
   * Get current user info from ID token
   * (Works with both password auth and OAuth without requiring admin scope)
   */
  async getCurrentUser() {
    const idToken = localStorage.getItem(AUTH_STORAGE_KEYS.ID_TOKEN)

    if (!idToken) {
      return null
    }

    try {
      // Decode ID token payload (JWT)
      const payload = JSON.parse(atob(idToken.split('.')[1]))

      return {
        username: payload['cognito:username'] || payload.email || payload.sub,
        userId: payload.sub,
        email: payload.email || '',
        attributes: {
          sub: payload.sub,
          email: payload.email,
          email_verified: payload.email_verified,
          name: payload.name,
          picture: payload.picture,
          identities: payload.identities,
        },
      }
    } catch (e) {
      console.error('Failed to parse ID token:', e)
      return null
    }
  }

  /**
   * Forgot password - request reset code
   */
  async forgotPassword(email) {
    const command = new ForgotPasswordCommand({
      ClientId: COGNITO_CONFIG.userPoolWebClientId,
      Username: email,
    })

    const response = await client.send(command)
    return response.CodeDeliveryDetails
  }

  /**
   * Reset password with code
   */
  async confirmForgotPassword(email, code, newPassword) {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: COGNITO_CONFIG.userPoolWebClientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    })

    await client.send(command)
    return { success: true }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      const accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)

      if (accessToken) {
        const command = new GlobalSignOutCommand({
          AccessToken: accessToken,
        })
        await client.send(command)
      }
    } catch (error) {
      console.warn('Global sign out failed:', error)
    } finally {
      this.clearTokens()
    }
  }

  /**
   * Clear all stored tokens
   */
  clearTokens() {
    Object.values(AUTH_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
    const expiresAt = parseInt(localStorage.getItem(AUTH_STORAGE_KEYS.EXPIRES_AT) || '0')
    const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)

    return (accessToken && Date.now() < expiresAt) || !!refreshToken
  }

  /**
   * Get ID token for API calls
   */
  getIdToken() {
    return localStorage.getItem(AUTH_STORAGE_KEYS.ID_TOKEN)
  }

  /**
   * Get user ID from stored ID token
   */
  getUserIdFromToken() {
    const idToken = localStorage.getItem(AUTH_STORAGE_KEYS.ID_TOKEN)
    if (!idToken) return null

    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]))
      return payload.sub || null
    } catch (e) {
      return null
    }
  }
}

export const cognitoService = new CognitoService()
export default cognitoService
