# Authentication System

This directory contains the enhanced authentication system for KalySwap, designed to handle JWT token expiration gracefully and provide a better user experience.

## Problem Solved

The original authentication system had a critical issue where expired JWT tokens would cause the frontend to receive HTML error pages instead of proper JSON responses, leading to parsing errors like:

```
Unexpected token '<', '<html>...' is not valid JSON
```

## Components

### 1. `AuthGuard.tsx`
A component that protects routes requiring authentication. Features:
- Automatic token validation and expiration checking
- User-friendly error messages for different error types
- Retry mechanisms for network errors
- Automatic redirect to login for authentication errors

```tsx
import { AuthGuard } from '@/components/auth';

<AuthGuard>
  <ProtectedContent />
</AuthGuard>
```

### 2. `TokenExpirationWarning.tsx`
Shows a warning when the user's token is about to expire. Features:
- Configurable warning threshold (default: 30 minutes)
- Real-time countdown display
- Session refresh functionality
- Automatic monitoring

```tsx
import { TokenExpirationWarning } from '@/components/auth';

<TokenExpirationWarning warningThresholdMinutes={15} />
```

### 3. `AuthErrorBoundary.tsx`
Error boundary specifically for authentication errors. Features:
- Catches and handles authentication-related errors
- Provides recovery options (retry, reload, go home)
- Automatic token cleanup on auth errors
- Development-friendly error details

```tsx
import { AuthErrorBoundary } from '@/components/auth';

<AuthErrorBoundary>
  <App />
</AuthErrorBoundary>
```

## Utilities (`/utils/auth.ts`)

### Token Management
- `getAuthToken()` - Get valid token from localStorage
- `setAuthToken(token)` - Store token securely
- `removeAuthToken()` - Clean up token
- `isTokenExpired(token)` - Check if token is expired

### Enhanced GraphQL Fetch
- `fetchGraphQLWithAuth(query, variables)` - GraphQL requests with proper error handling
- Automatic token attachment
- Proper error parsing and handling
- Content-type validation

### Error Handling
- `parseAuthError(error)` - Parse and classify authentication errors
- Distinguishes between network, auth, and other errors
- Provides user-friendly error messages

## Usage Examples

### Basic Route Protection
```tsx
import { AuthGuard } from '@/components/auth';

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
```

### Enhanced useAuth Hook
```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, error, login, logout, clearError } = useAuth();
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  // ... rest of component
}
```

### Manual GraphQL Requests
```tsx
import { fetchGraphQLWithAuth } from '@/utils/auth';

const fetchUserData = async () => {
  try {
    const result = await fetchGraphQLWithAuth(`
      query Me {
        me {
          id
          username
          email
        }
      }
    `);
    return result.data.me;
  } catch (error) {
    // Error is already parsed and user-friendly
    console.error('Failed to fetch user:', error.message);
  }
};
```

## Configuration

### JWT Token Settings (Backend)
```env
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"  # 7 days
```

### Warning Thresholds
- Token expiration warning: 30 minutes before expiry
- Critical warning: 5 minutes before expiry
- Automatic cleanup: When token is expired

## Error Types

1. **EXPIRED** - Token has expired, redirect to login
2. **INVALID** - Token is malformed or invalid
3. **MISSING** - No token found
4. **NETWORK** - Connection or server errors

## Best Practices

1. Always use `AuthGuard` for protected routes
2. Use `fetchGraphQLWithAuth` for authenticated requests
3. Include `TokenExpirationWarning` in main layouts
4. Wrap your app with `AuthErrorBoundary`
5. Handle errors gracefully with user-friendly messages

## Migration Guide

### Before
```tsx
// Old way - prone to parsing errors
const token = localStorage.getItem('auth_token');
const response = await fetch('/api/graphql', {
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ query })
});
const result = await response.json(); // Could fail with HTML
```

### After
```tsx
// New way - robust error handling
import { fetchGraphQLWithAuth } from '@/utils/auth';

const result = await fetchGraphQLWithAuth(query, variables);
// Automatically handles token validation, errors, and cleanup
```

## Testing

The authentication system includes comprehensive error handling for:
- Expired tokens
- Invalid tokens
- Network failures
- Server errors
- Malformed responses

All errors are properly classified and provide actionable user feedback.
