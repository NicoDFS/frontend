'use client'

import React from 'react'
import Image from 'next/image'
import { useTokens } from '@/hooks/useTokens'

interface RewardTokensProps {
  rewardTokensAddress: string[]
  size?: number
}

export default function RewardTokens({ rewardTokensAddress, size = 20 }: RewardTokensProps) {
  const { getTokenByAddress, loading: isLoading } = useTokens()

  // Get tokens by their addresses
  const tokens = rewardTokensAddress.map(address => getTokenByAddress(address)).filter(Boolean)

  const getTokenIcon = (symbol: string) => {
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

    return iconMap[symbol] || null // Return null instead of default.png
  }

  if (isLoading) {
    return (
      <div className="flex items-center">
        <div 
          className="animate-pulse bg-slate-700 rounded-full"
          style={{ width: size, height: size }}
        />
      </div>
    )
  }

  if (!tokens || tokens.length === 0) {
    return null
  }

  return (
    <div className="flex items-center -space-x-1">
      {tokens.slice(0, 3).map((token, index) => token && (
        <div
          key={token.address}
          className="relative rounded-full border-2 border-slate-600 bg-slate-800 overflow-hidden"
          style={{
            width: size,
            height: size,
            zIndex: tokens.length - index
          }}
          title={`${token.symbol} rewards`}
        >
          {getTokenIcon(token.symbol) ? (
            <Image
              src={getTokenIcon(token.symbol)!}
              alt={token.symbol}
              width={size}
              height={size}
              className="object-cover"
            />
          ) : (
            <div className="text-white font-bold text-xs flex items-center justify-center w-full h-full">
              {token.symbol.charAt(0)}
            </div>
          )}
        </div>
      )).filter(Boolean)}
      
      {tokens.length > 3 && (
        <div
          className="flex items-center justify-center rounded-full border-2 border-slate-600 bg-slate-700 text-xs font-medium text-slate-300"
          style={{ width: size, height: size }}
          title={`+${tokens.length - 3} more reward tokens`}
        >
          +{tokens.length - 3}
        </div>
      )}
    </div>
  )
}
