'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { ProjectData } from '@/hooks/launchpad/useProjectDetails'

interface ProjectHeaderProps {
  projectData: ProjectData
  contractAddress: string
  onRefresh: () => void
  isRefreshing?: boolean
}

export default function ProjectHeader({ 
  projectData, 
  contractAddress, 
  onRefresh, 
  isRefreshing = false 
}: ProjectHeaderProps) {
  const router = useRouter()

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'Successful':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'Failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2 text-white hover:bg-gray-800/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{projectData.name}</h1>
              <Badge className={getStatusBadgeClass(projectData.status || 'Unknown')}>
                {projectData.status}
              </Badge>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                {projectData.type?.toUpperCase()}
              </Badge>
              {projectData.progress !== undefined && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {projectData.progress.toFixed(1)}% Complete
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Refresh Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={isRefreshing}
          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="text-sm text-gray-400">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/launchpad" className="hover:text-white">Launchpad</Link>
        <span className="mx-2">/</span>
        <span className="text-white">{projectData.name}</span>
      </div>

      {/* Contract Address */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Contract:</span>
        <code className="bg-gray-800/50 px-2 py-1 rounded font-mono text-gray-400">
          {contractAddress}
        </code>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-gray-400 hover:text-white"
          onClick={() => {
            navigator.clipboard.writeText(contractAddress)
            // You could add a toast notification here
          }}
        >
          Copy
        </Button>
      </div>
    </div>
  )
}
