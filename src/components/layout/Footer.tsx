'use client';

import Link from 'next/link';
import { Twitter, Github, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <img
                src="/icons/KalySwapLogo.png"
                alt="KalySwap Logo"
                className="h-6 w-6 mr-2"
              />
              <h3 className="text-xl font-bold text-white drop-shadow-lg" style={{ textShadow: '0 0 20px rgba(245, 158, 11, 0.5), 0 0 40px rgba(245, 158, 11, 0.3)' }}>
                KalySwap
              </h3>
            </div>
            <p className="text-sm mb-4" style={{ color: '#566682' }}>
              The premier decentralized exchange on KalyChain. Trade tokens, provide liquidity, and earn rewards.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                style={{ color: '#566682' }}
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                style={{ color: '#566682' }}
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>
              <a
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                style={{ color: '#566682' }}
                aria-label="Telegram"
              >
                <MessageCircle size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Products
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/swaps" className="text-sm transition-colors hover:text-white" style={{ color: '#566682' }}>
                  Swap
                </Link>
              </li>
              <li>
                <Link href="/pools" className="text-sm transition-colors hover:text-white" style={{ color: '#566682' }}>
                  Pools
                </Link>
              </li>
              <li>
                <Link href="/bridge" className="text-sm transition-colors hover:text-white" style={{ color: '#566682' }}>
                  Bridge
                </Link>
              </li>
              <li>
                <Link href="/stake" className="text-sm transition-colors hover:text-white" style={{ color: '#566682' }}>
                  Stake
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/docs" className="text-sm transition-colors hover:text-white" style={{ color: '#566682' }}>
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm transition-colors hover:text-white" style={{ color: '#566682' }}>
                  FAQ
                </Link>
              </li>
              <li>
                <a
                  href="https://kalychain.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors hover:text-white"
                  style={{ color: '#566682' }}
                >
                  KalyChain
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Community
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors hover:text-white"
                  style={{ color: '#566682' }}
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors hover:text-white"
                  style={{ color: '#566682' }}
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="https://t.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors hover:text-white"
                  style={{ color: '#566682' }}
                >
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-700/50">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm mb-4 md:mb-0" style={{ color: '#566682' }}>
              &copy; {new Date().getFullYear()} KalySwap. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link href="/terms" className="text-sm transition-colors hover:text-white" style={{ color: '#566682' }}>
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm transition-colors hover:text-white" style={{ color: '#566682' }}>
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
