/**
 * AWS Cognito Configuration
 * TODO: AWS 콘솔에서 User Pool 생성 후 값 업데이트 필요
 */

export const COGNITO_CONFIG = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_hyDGIAuPL',
  userPoolWebClientId: '3afukmb67m1csajp7ruj9geoni',

  // OAuth configuration
  oauth: {
    domain: 'ringgle-ai-english.auth.us-east-1.amazoncognito.com',
    scope: ['openid', 'email', 'profile'],
    responseType: 'code',

    // Dynamic redirect URIs based on platform
    getRedirectSignIn: () => {
      if (typeof window !== 'undefined') {
        // Check Capacitor FIRST (WebView also uses localhost)
        if (window.Capacitor?.isNativePlatform()) {
          return 'com.aienglish.call://auth/callback'
        }
        // Local development
        if (window.location.hostname === 'localhost') {
          return `http://localhost:${window.location.port || 5173}/auth/callback`
        }
        // CloudFront or other web deployment
        return `${window.location.origin}/auth/callback`
      }
      return 'https://d3pw62uy753kuv.cloudfront.net/auth/callback'
    },

    getRedirectSignOut: () => {
      if (typeof window !== 'undefined') {
        // Check Capacitor FIRST (WebView also uses localhost)
        if (window.Capacitor?.isNativePlatform()) {
          return 'com.aienglish.call://'
        }
        // Local development
        if (window.location.hostname === 'localhost') {
          return `http://localhost:${window.location.port || 5173}`
        }
        // CloudFront or other web deployment
        return window.location.origin
      }
      return 'https://d3pw62uy753kuv.cloudfront.net'
    }
  }
}

// Storage keys for auth tokens
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'cognito_access_token',
  ID_TOKEN: 'cognito_id_token',
  REFRESH_TOKEN: 'cognito_refresh_token',
  USER: 'cognito_user',
  EXPIRES_AT: 'cognito_expires_at',
}

export default COGNITO_CONFIG
