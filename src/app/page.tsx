'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart2, Layers, Wallet, ArrowUpRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-violet-50 opacity-50"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Welcome to KalySwap
            </h1>
            <p className="text-lg md:text-xl text-slate-700 mb-8">
              The premier decentralized exchange on KalyChain. Trade tokens, provide liquidity, and earn rewards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="font-medium">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-slate-900">
            Everything you need to trade on KalyChain
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <BarChart2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Trade Tokens</h3>
                  <p className="text-slate-600">
                    Swap tokens instantly with low fees and high liquidity. Access the best rates on KalyChain.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 border-t border-slate-100">
                  <Link href="/swap" className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center">
                    Start trading <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
                    <Layers className="h-6 w-6 text-violet-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Provide Liquidity</h3>
                  <p className="text-slate-600">
                    Earn fees by providing liquidity to trading pairs. Put your assets to work and generate passive income.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 border-t border-slate-100">
                  <Link href="/pool" className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center">
                    Add liquidity <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <Wallet className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Stake & Earn</h3>
                  <p className="text-slate-600">
                    Stake KLC and earn rewards from the platform. Maximize your returns with our staking program.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 border-t border-slate-100">
                  <Link href="/stake" className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center">
                    Start staking <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-violet-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold mb-2">$10M+</p>
                <p className="text-lg opacity-90">Total Volume</p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold mb-2">5,000+</p>
                <p className="text-lg opacity-90">Active Users</p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold mb-2">100+</p>
                <p className="text-lg opacity-90">Trading Pairs</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-50 to-violet-50">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900">
                Ready to start trading on KalyChain?
              </h2>
              <p className="text-lg text-slate-700 mb-8 max-w-2xl mx-auto">
                Join thousands of users already trading on KalySwap. Create an account in seconds and start swapping tokens.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium">
                    Create Account
                  </Button>
                </Link>
                <Link href="/swap">
                  <Button size="lg" variant="outline" className="font-medium">
                    Start Trading
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}
