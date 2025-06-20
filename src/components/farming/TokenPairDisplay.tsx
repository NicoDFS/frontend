'use client'

import React from 'react'
import Image from 'next/image'
import { Token } from '@/types/farming'

interface TokenPairDisplayProps {
  token0: Token
  token1: Token
  size?: number
}

export default function TokenPairDisplay({ token0, token1, size = 24 }: TokenPairDisplayProps) {
  const getTokenIcon = (token: Token) => {
    // Map token symbols to icon paths
    const iconMap: { [key: string]: string } = {
      'KLC': '/tokens/klc.png',
      'WKLC': '/tokens/klc.png',
      'KSWAP': '/tokens/kswap.png',
      'USDT': '/tokens/usdt.png',
      'USDC': '/tokens/usdc.png',
      'BTC': '/tokens/btc.png',
      'WBTC': '/tokens/wbtc.png',
      'ETH': '/tokens/eth.png',
      'BNB': '/tokens/bnb.png',
      'POL': '/tokens/pol.png',
      'MATIC': '/tokens/pol.png',
      'DAI': '/tokens/dai.png',
    }

    return iconMap[token.symbol] || null // Return null instead of default.png
  }

  return (
    <div className="relative flex items-center">
      {/* First Token */}
      <div
        className="relative rounded-full border-2 border-slate-700 bg-slate-800 overflow-hidden flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {getTokenIcon(token0) ? (
          <Image
            src={getTokenIcon(token0)!}
            alt={token0.symbol}
            width={size}
            height={size}
            className="object-cover"
          />
        ) : (
          <div className="text-white font-bold text-xs">
            {token0.symbol.charAt(0)}
          </div>
        )}
      </div>

      {/* Second Token (overlapping) */}
      <div
        className="relative rounded-full border-2 border-slate-700 bg-slate-800 overflow-hidden -ml-2 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {getTokenIcon(token1) ? (
          <Image
            src={getTokenIcon(token1)!}
            alt={token1.symbol}
            width={size}
            height={size}
            className="object-cover"
          />
        ) : (
          <div className="text-white font-bold text-xs">
            {token1.symbol.charAt(0)}
          </div>
        )}
      </div>
    </div>
  )
}
