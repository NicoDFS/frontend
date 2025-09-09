/**
 * Authentication components and utilities
 * Centralized exports for all auth-related components
 */

export { AuthGuard, withAuthGuard } from './AuthGuard';
export { TokenExpirationWarning, useTokenExpiration } from './TokenExpirationWarning';
export { AuthErrorBoundary, useAuthErrorHandler } from './AuthErrorBoundary';

// Re-export auth utilities for convenience
export {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  isTokenExpired,
  decodeJWTPayload,
  parseAuthError,
  fetchGraphQLWithAuth,
  getTokenTimeToExpiry,
  formatTimeToExpiry,
} from '@/utils/auth';

// Re-export useAuth hook
export { useAuth } from '@/hooks/useAuth';
