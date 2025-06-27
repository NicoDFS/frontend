'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useProjectDetails } from '@/hooks/launchpad/useProjectDetails'
import ProjectHeader from '@/components/launchpad/ProjectHeader'
import ProjectStats from '@/components/launchpad/ProjectStats'
import ProjectProgress from '@/components/launchpad/ProjectProgress'
import UserContributions from '@/components/launchpad/UserContributions'

import ProjectConfiguration from '@/components/launchpad/ProjectConfiguration'
import ProjectOwnerControls from '@/components/launchpad/ProjectOwnerControls'

export default function ProjectDetailPage() {
  const params = useParams()
  const contractAddress = params.address as string

  // Use the new hook for data fetching
  const { projectData, loading, error, refetch } = useProjectDetails(contractAddress)

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen py-8">
          <div className="max-w-4xl mx-auto px-4">
            {/* Loading Header */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 bg-gray-700 rounded animate-pulse"></div>
                <div>
                  <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-4 w-64 bg-gray-700 rounded animate-pulse"></div>
            </div>

            {/* Loading Cards */}
            <div className="space-y-6">
              <Card className="bg-stone-900/50 border-amber-500/30">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 w-3/4 bg-gray-700 rounded"></div>
                    <div className="h-4 w-full bg-gray-700 rounded"></div>
                    <div className="h-4 w-2/3 bg-gray-700 rounded"></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-stone-900/50 border-amber-500/30">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-32 w-full bg-gray-700 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen py-8">
          <div className="max-w-4xl mx-auto px-4">
            <Card className="bg-stone-900/50 border-red-500/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-white mb-1">Error Loading Project</h3>
                    <p className="text-sm text-gray-300">{error}</p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Main content
  if (!projectData) return null

  return (
    <MainLayout>
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Project Header */}
          <ProjectHeader
            projectData={projectData}
            contractAddress={contractAddress}
            onRefresh={refetch}
          />

          {/* Project Stats and Information */}
          <ProjectStats projectData={projectData} />

          {/* Project Configuration Details */}
          <ProjectConfiguration projectData={projectData} />

          {/* Project Owner Controls (only visible to owner) */}
          <ProjectOwnerControls
            projectData={projectData}
            onRefresh={refetch}
          />

          {/* Project Progress and Participation */}
          <ProjectProgress
            projectData={projectData}
            onRefresh={refetch}
          />

          {/* User Contributions */}
          <UserContributions
            projectData={projectData}
            onRefresh={refetch}
          />
        </div>
      </div>
    </MainLayout>
  )
}
