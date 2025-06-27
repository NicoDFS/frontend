'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Globe, 
  FileText, 
  Github, 
  MessageCircle, 
  Send, 
  Twitter,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react'
import { ProjectData } from '@/hooks/launchpad/useProjectDetails'

interface ProjectSocialLinksProps {
  projectData: ProjectData
}

interface SocialLink {
  label: string
  url: string
  icon: React.ReactNode
  color: string
}

export default function ProjectSocialLinks({ projectData }: ProjectSocialLinksProps) {
  // Build social links array from project data
  const socialLinks: SocialLink[] = []

  if (projectData.websiteUrl) {
    socialLinks.push({
      label: 'Website',
      url: projectData.websiteUrl,
      icon: <Globe className="h-4 w-4" />,
      color: 'text-blue-400 hover:text-blue-300'
    })
  }

  if (projectData.whitepaperUrl) {
    socialLinks.push({
      label: 'Whitepaper',
      url: projectData.whitepaperUrl,
      icon: <FileText className="h-4 w-4" />,
      color: 'text-green-400 hover:text-green-300'
    })
  }

  if (projectData.githubUrl) {
    socialLinks.push({
      label: 'GitHub',
      url: projectData.githubUrl,
      icon: <Github className="h-4 w-4" />,
      color: 'text-gray-400 hover:text-gray-300'
    })
  }

  if (projectData.discordUrl) {
    socialLinks.push({
      label: 'Discord',
      url: projectData.discordUrl,
      icon: <MessageCircle className="h-4 w-4" />,
      color: 'text-indigo-400 hover:text-indigo-300'
    })
  }

  if (projectData.telegramUrl) {
    socialLinks.push({
      label: 'Telegram',
      url: projectData.telegramUrl,
      icon: <Send className="h-4 w-4" />,
      color: 'text-cyan-400 hover:text-cyan-300'
    })
  }

  if (projectData.twitterUrl) {
    socialLinks.push({
      label: 'Twitter',
      url: projectData.twitterUrl,
      icon: <Twitter className="h-4 w-4" />,
      color: 'text-sky-400 hover:text-sky-300'
    })
  }

  if (projectData.additionalSocialUrl) {
    socialLinks.push({
      label: 'Social',
      url: projectData.additionalSocialUrl,
      icon: <LinkIcon className="h-4 w-4" />,
      color: 'text-purple-400 hover:text-purple-300'
    })
  }

  // Don't render if no social links
  if (socialLinks.length === 0) {
    return null
  }

  return (
    <Card className="bg-stone-900/50 border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <LinkIcon className="h-5 w-5 mr-2" />
          Project Links
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {socialLinks.map((link, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className={`${link.color} border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200`}
              onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
            >
              {link.icon}
              <span className="ml-2 text-sm">{link.label}</span>
              <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
