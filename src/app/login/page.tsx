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

// Login form data
interface LoginFormData {
  username: string;
  password: string;
}

// GraphQL mutation for user login
const LOGIN_MUTATION = `
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
`;

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
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

    try {
      setLoading(true);

      // Login user
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: LOGIN_MUTATION,
          variables: {
            username: formData.username,
            password: formData.password,
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const { token } = result.data.login;

      // Store token in localStorage
      localStorage.setItem('auth_token', token);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* Main Content */}
      <main className="flex-grow py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card className="shadow-md">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h1>
                  <p className="text-slate-600">Sign in to your KalySwap account</p>
                </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username" className="text-sm font-medium text-slate-700 block mb-1.5">
                      Username
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className="h-11 w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                        Password
                      </Label>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="h-11 w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="remember" className="text-sm font-medium text-slate-700">
                      Remember me
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-slate-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-12 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium shadow-sm"
                  onClick={() => alert('MetaMask integration coming soon!')}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32.9582 1L19.8241 10.7183L22.2665 5.09082L32.9582 1Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.65881 1L15.6758 10.809L13.3529 5.09082L2.65881 1Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M28.2599 23.5363L24.7437 28.8899L32.3234 30.9315L34.5454 23.6501L28.2599 23.5363Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1.07227 23.6501L3.28277 30.9315L10.8539 28.8899L7.34619 23.5363L1.07227 23.6501Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  MetaMask
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium shadow-sm"
                  onClick={() => alert('WalletConnect integration coming soon!')}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.58818 11.8556C13.1293 8.31442 18.8706 8.31442 22.4117 11.8556L22.8379 12.2818C23.015 12.4589 23.015 12.7459 22.8379 12.9231L21.3801 14.3809C21.2915 14.4695 21.148 14.4695 21.0594 14.3809L20.473 13.7945C18.0026 11.3241 13.9973 11.3241 11.5269 13.7945L10.8989 14.4225C10.8103 14.5111 10.6668 14.5111 10.5782 14.4225L9.12041 12.9647C8.94331 12.7876 8.94331 12.5005 9.12041 12.3234L9.58818 11.8556ZM25.4268 14.8707L26.7243 16.1682C26.9014 16.3453 26.9014 16.6323 26.7243 16.8094L20.8737 22.66C20.6966 22.8371 20.4096 22.8371 20.2325 22.66L16.2918 18.7193C16.2475 18.675 16.1758 18.675 16.1315 18.7193L12.1908 22.66C12.0137 22.8371 11.7267 22.8371 11.5496 22.66L5.67568 16.7861C5.49858 16.609 5.49858 16.322 5.67568 16.1449L6.97318 14.8474C7.15028 14.6703 7.43729 14.6703 7.61439 14.8474L11.5551 18.7881C11.5994 18.8324 11.6711 18.8324 11.7154 18.7881L15.6561 14.8474C15.8332 14.6703 16.1202 14.6703 16.2973 14.8474L20.238 18.7881C20.2823 18.8324 20.354 18.8324 20.3983 18.7881L24.339 14.8474C24.5161 14.6703 24.8031 14.6703 24.9802 14.8474L25.4268 14.8707Z" fill="#3396FF"/>
                  </svg>
                  WalletConnect
                </Button>
              </div>

              <CardFooter className="flex justify-center border-t mt-8 pt-6">
                <p className="text-slate-600">
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
                    Sign up
                  </Link>
                </p>
              </CardFooter>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
