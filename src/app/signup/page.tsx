'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import './signup.css';

// Signup form data
interface SignupFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  createWallet: boolean;
}

// GraphQL mutation for user registration
const REGISTER_MUTATION = `
  mutation Register($username: String!, $email: String, $password: String!) {
    register(username: $username, email: $email, password: $password) {
      token
      user {
        id
        username
        email
      }
    }
  }
`;

// GraphQL mutation for wallet creation
const CREATE_WALLET_MUTATION = `
  mutation CreateWallet($password: String!) {
    createWallet(password: $password) {
      id
      address
      chainId
    }
  }
`;

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignupFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    createWallet: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);

      // Register user
      const registerResponse = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: REGISTER_MUTATION,
          variables: {
            username: formData.username,
            email: formData.email || null,
            password: formData.password,
          },
        }),
      });

      const registerResult = await registerResponse.json();

      if (registerResult.errors) {
        throw new Error(registerResult.errors[0].message);
      }

      const { token } = registerResult.data.register;

      // Store token in localStorage
      localStorage.setItem('auth_token', token);

      // Create wallet if checkbox is checked
      if (formData.createWallet) {
        const walletResponse = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: CREATE_WALLET_MUTATION,
            variables: {
              password: formData.password,
            },
          }),
        });

        const walletResult = await walletResponse.json();

        if (walletResult.errors) {
          throw new Error(walletResult.errors[0].message);
        }
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* Main Content */}
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="signup-container">
            <h1 className="signup-title">Create your account</h1>
            <p className="signup-subtitle">Join KalySwap and start trading on KalyChain</p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username" className="form-label">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email (optional)</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                />
                <p className="form-helper">We'll never share your email with anyone else.</p>
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
                <p className="form-helper">Password must be at least 8 characters long.</p>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="wallet-info">
                <div className="flex items-start gap-3">
                  <input
                    id="createWallet"
                    name="createWallet"
                    type="checkbox"
                    checked={formData.createWallet}
                    onChange={(e) => setFormData(prev => ({ ...prev, createWallet: e.target.checked }))}
                    className="form-checkbox mt-1"
                  />
                  <div>
                    <label htmlFor="createWallet" className="wallet-info-title">
                      Create a KalyChain wallet
                    </label>
                    <p className="wallet-info-text">
                      Your password will be used to encrypt your wallet's private key. This allows you to:
                    </p>
                    <ul className="wallet-info-text mt-2 space-y-1 list-disc list-inside">
                      <li>Access your wallet directly from KalySwap</li>
                      <li>Trade without installing browser extensions</li>
                      <li>Export your wallet if needed</li>
                    </ul>
                    <p className="wallet-info-text mt-2 font-medium">
                      Make sure to use a strong password and keep it safe.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="divider">
              <span className="divider-text">Or continue with</span>
            </div>

            <div className="wallet-buttons">
              <button
                type="button"
                className="wallet-button"
                onClick={() => alert('MetaMask integration coming soon!')}
              >
                <svg className="h-5 w-5" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32.9582 1L19.8241 10.7183L22.2665 5.09082L32.9582 1Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.65881 1L15.6758 10.809L13.3529 5.09082L2.65881 1Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M28.2599 23.5363L24.7437 28.8899L32.3234 30.9315L34.5454 23.6501L28.2599 23.5363Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1.07227 23.6501L3.28277 30.9315L10.8539 28.8899L7.34619 23.5363L1.07227 23.6501Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                MetaMask
              </button>
              <button
                type="button"
                className="wallet-button"
                onClick={() => alert('WalletConnect integration coming soon!')}
              >
                <svg className="h-5 w-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.58818 11.8556C13.1293 8.31442 18.8706 8.31442 22.4117 11.8556L22.8379 12.2818C23.015 12.4589 23.015 12.7459 22.8379 12.9231L21.3801 14.3809C21.2915 14.4695 21.148 14.4695 21.0594 14.3809L20.473 13.7945C18.0026 11.3241 13.9973 11.3241 11.5269 13.7945L10.8989 14.4225C10.8103 14.5111 10.6668 14.5111 10.5782 14.4225L9.12041 12.9647C8.94331 12.7876 8.94331 12.5005 9.12041 12.3234L9.58818 11.8556ZM25.4268 14.8707L26.7243 16.1682C26.9014 16.3453 26.9014 16.6323 26.7243 16.8094L20.8737 22.66C20.6966 22.8371 20.4096 22.8371 20.2325 22.66L16.2918 18.7193C16.2475 18.675 16.1758 18.675 16.1315 18.7193L12.1908 22.66C12.0137 22.8371 11.7267 22.8371 11.5496 22.66L5.67568 16.7861C5.49858 16.609 5.49858 16.322 5.67568 16.1449L6.97318 14.8474C7.15028 14.6703 7.43729 14.6703 7.61439 14.8474L11.5551 18.7881C11.5994 18.8324 11.6711 18.8324 11.7154 18.7881L15.6561 14.8474C15.8332 14.6703 16.1202 14.6703 16.2973 14.8474L20.238 18.7881C20.2823 18.8324 20.354 18.8324 20.3983 18.7881L24.339 14.8474C24.5161 14.6703 24.8031 14.6703 24.9802 14.8474L25.4268 14.8707Z" fill="#3396FF"/>
                </svg>
                WalletConnect
              </button>
            </div>

            <div className="login-link">
              Already have an account?{' '}
              <Link href="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
