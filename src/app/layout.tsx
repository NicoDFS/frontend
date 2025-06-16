import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProviders } from '@/components/providers/WalletProviders';
import { ToastProvider } from '@/components/ui/toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KalySwap - Decentralized Exchange',
  description: 'Trade tokens on KalyChain with KalySwap DEX',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        <ToastProvider>
          <WalletProviders>
            {children}
          </WalletProviders>
        </ToastProvider>
      </body>
    </html>
  );
}
