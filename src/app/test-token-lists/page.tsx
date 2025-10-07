/**
 * Token List Test Page
 * Simple page to test Phase 1 token list implementation
 */

'use client';

import { useState } from 'react';
import SimpleTokenListTest from '@/components/debug/SimpleTokenListTest';
import BackendApiTest from '@/components/debug/BackendApiTest';

export default function TestTokenListsPage() {
  const [activeTab, setActiveTab] = useState<'backend' | 'frontend'>('backend');

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Tab Navigation */}
      <div className="p-6 border-b border-slate-700">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">Token List System Tests</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('backend')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'backend'
                  ? 'bg-amber-500 text-black'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              1. Backend API Test
            </button>
            <button
              onClick={() => setActiveTab('frontend')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'frontend'
                  ? 'bg-amber-500 text-black'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              2. Frontend Service Test
            </button>
          </div>
          <p className="text-slate-400 mt-2">
            {activeTab === 'backend'
              ? 'Test the backend API endpoints that proxy token lists (fixes CORS issues)'
              : 'Test the frontend token list service and React hooks'
            }
          </p>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'backend' && <BackendApiTest />}
        {activeTab === 'frontend' && <SimpleTokenListTest />}
      </div>
    </div>
  );
}
