import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check if user is authenticated on mount
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query Me {
              me {
                id
                username
                email
              }
            }
          `
        }),
      });

      const result = await response.json();
      
      if (result.errors || !result.data?.me) {
        // Token is invalid, remove it
        localStorage.removeItem('auth_token');
        setUser(null);
      } else {
        setUser(result.data.me);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation Login($username: String!, $password: String!) {
              login(username: $username, password: $password) {
                token
                user {
                  id
                  username
                  email
                }
              }
            }
          `,
          variables: { username, password }
        }),
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const { token, user: userData } = result.data.login;
      localStorage.setItem('auth_token', token);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  };
}
