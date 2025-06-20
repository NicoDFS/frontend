'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { testFarmingContracts } from '@/test-farming-contracts'

export default function TestContractsPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<string>('')

  const runTest = async () => {
    setIsRunning(true)
    setResults('')
    
    // Capture console output
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    
    let output = ''
    
    const captureLog = (...args: any[]) => {
      output += args.join(' ') + '\n'
      originalLog(...args)
    }
    
    const captureError = (...args: any[]) => {
      output += 'ERROR: ' + args.join(' ') + '\n'
      originalError(...args)
    }
    
    const captureWarn = (...args: any[]) => {
      output += 'WARN: ' + args.join(' ') + '\n'
      originalWarn(...args)
    }
    
    console.log = captureLog
    console.error = captureError
    console.warn = captureWarn
    
    try {
      await testFarmingContracts()
    } catch (error) {
      output += `FATAL ERROR: ${error}\n`
    }
    
    // Restore console
    console.log = originalLog
    console.error = originalError
    console.warn = originalWarn
    
    setResults(output)
    setIsRunning(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Contract Testing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runTest} 
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? 'Running Tests...' : 'Test Farming Contracts'}
            </Button>
            
            {results && (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Test Results:</h3>
                <pre className="text-green-400 text-sm whitespace-pre-wrap overflow-auto max-h-96">
                  {results}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
