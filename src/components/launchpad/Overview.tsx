'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Coins, 
  DollarSign, 
  Calendar,
  ExternalLink,
  Clock,
  Target
} from 'lucide-react';

interface LaunchpadProject {
  id: string;
  name: string;
  tokenAddress: string;
  startTime: string;
  endTime: string;
  hardCap: string;
  softCap: string;
  status: string;
  type: string;
  creator: string;
  saleToken: {
    id: string;
    name: string;
    symbol: string;
    address: string;
  };
  totalRaised: string;
  totalParticipants: number;
  createdAt: string;
}

interface LaunchpadOverview {
  totalProjects: number;
  activeProjects: number;
  totalTokensCreated: number;
  totalFundsRaised: string;
  totalParticipants: number;
  totalFeesCollected: string;
  recentProjects: LaunchpadProject[];
  lastUpdated: string;
  error?: string;
}

export default function Overview() {
  const [overview, setOverview] = useState<LaunchpadOverview | null>(null);
  const [projects, setProjects] = useState<LaunchpadProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLaunchpadData();
  }, []);

  const fetchLaunchpadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch overview data
      const overviewResponse = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query LaunchpadOverview {
              launchpadOverview {
                totalProjects
                activeProjects
                totalTokensCreated
                totalFundsRaised
                totalParticipants
                totalFeesCollected
                recentProjects {
                  id
                  name
                  tokenAddress
                  startTime
                  endTime
                  hardCap
                  softCap
                  status
                  type
                  creator
                  saleToken {
                    id
                    name
                    symbol
                    address
                  }
                  totalRaised
                  totalParticipants
                  createdAt
                }
                lastUpdated
                error
              }
            }
          `
        })
      });

      const overviewResult = await overviewResponse.json();
      if (overviewResult.errors) {
        throw new Error(overviewResult.errors[0].message);
      }

      // Fetch all projects
      const projectsResponse = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query LaunchpadProjects {
              launchpadProjects {
                id
                name
                tokenAddress
                startTime
                endTime
                hardCap
                softCap
                status
                type
                creator
                saleToken {
                  id
                  name
                  symbol
                  address
                }
                totalRaised
                totalParticipants
                createdAt
              }
            }
          `
        })
      });

      const projectsResult = await projectsResponse.json();
      if (projectsResult.errors) {
        throw new Error(projectsResult.errors[0].message);
      }

      setOverview(overviewResult.data.launchpadOverview);
      setProjects(projectsResult.data.launchpadProjects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch launchpad data');
      console.error('Error fetching launchpad data:', err);
      
      // Set mock data for development
      setOverview({
        totalProjects: 12,
        activeProjects: 3,
        totalTokensCreated: 45,
        totalFundsRaised: '2,450,000',
        totalParticipants: 1250,
        totalFeesCollected: '125,000',
        recentProjects: [],
        lastUpdated: new Date().toISOString()
      });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'badge-active';
      case 'upcoming':
        return 'badge-upcoming';
      case 'ended':
        return 'badge-ended';
      case 'successful':
        return 'badge-successful';
      case 'failed':
        return 'badge-failed';
      default:
        return 'badge-ended';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'presale':
        return 'badge-presale';
      case 'fairlaunch':
        return 'badge-fairlaunch';
      default:
        return 'badge-ended';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="loading-card animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 loading-skeleton rounded w-3/4 mb-2"></div>
                <div className="h-8 loading-skeleton rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="loading-card animate-pulse">
          <CardContent className="p-6">
            <div className="h-6 loading-skeleton rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 loading-skeleton rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 icon-bg-blue rounded-lg">
                <Coins className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Projects</p>
                <p className="text-2xl font-bold text-white">{overview?.totalProjects || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 icon-bg-green rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Active Projects</p>
                <p className="text-2xl font-bold text-white">{overview?.activeProjects || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 icon-bg-purple rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Raised</p>
                <p className="text-2xl font-bold text-white">${overview?.totalFundsRaised || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 icon-bg-orange rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Participants</p>
                <p className="text-2xl font-bold text-white">{overview?.totalParticipants || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <Card className="launchpad-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span>Recent Projects</span>
            <Button variant="outline" size="sm" className="border-blue-500/20 text-white hover:bg-blue-500/20">
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8">
              <p className="text-gray-300 mb-4">Unable to load projects data</p>
              <p className="text-sm text-gray-400">Using mock data for demonstration</p>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="empty-state">
              <Coins className="h-12 w-12 empty-state-icon" />
              <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
              <p className="text-gray-300 mb-6">Be the first to launch a project on our platform!</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Create Your First Project</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.slice(0, 5).map((project) => (
                <div key={project.id} className="project-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-white">{project.name}</h4>
                        <Badge className={getTypeColor(project.type)}>
                          {project.type}
                        </Badge>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>Hard Cap: ${project.hardCap}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Raised: ${project.totalRaised || '0'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{project.totalParticipants || 0} participants</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Created: {formatDate(project.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-blue-500/20 text-white hover:bg-blue-500/20">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
