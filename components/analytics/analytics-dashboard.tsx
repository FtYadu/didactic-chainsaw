'use client';

import { useEffect, useState } from 'react';
import { analytics } from '@/lib/analytics';
import { UsageStats } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, DollarSign, Clock } from 'lucide-react';

interface AnalyticsDashboardProps {
  timeRange?: 'hour' | 'day' | 'week' | 'all';
}

export function AnalyticsDashboard({ timeRange = 'all' }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    analytics.loadFromStorage();
    const loadStats = () => {
      const currentStats = analytics.getStats(timeRange);
      setStats(currentStats);
    };

    loadStats();
    const interval = setInterval(loadStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

  if (!stats) {
    return <div>Loading analytics...</div>;
  }

  const topProvider = Object.entries(stats.byProvider)
    .filter(([_, data]) => data.messages > 0)
    .sort((a, b) => b[1].messages - a[1].messages)[0];

  const topArtifactType = Object.entries(stats.byArtifactType)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Messages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              {topProvider ? `Top: ${topProvider[0]}` : 'No data'}
            </p>
          </CardContent>
        </Card>

        {/* Total Tokens */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {Math.round(stats.totalTokens / Math.max(stats.totalMessages, 1))} per message
            </p>
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalCost.toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: ${(stats.totalCost / Math.max(stats.totalMessages, 1)).toFixed(4)} per message
            </p>
          </CardContent>
        </Card>

        {/* Average Response Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.averageResponseTime / 1000).toFixed(2)}s
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.averageResponseTime < 3000 ? 'Fast' : 'Normal'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Usage</CardTitle>
          <CardDescription>Messages and cost by provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.byProvider)
              .filter(([_, data]) => data.messages > 0)
              .sort((a, b) => b[1].messages - a[1].messages)
              .map(([provider, data]) => (
                <div key={provider} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm font-medium capitalize">{provider}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{data.messages} msgs</span>
                    <span>{data.tokens.toLocaleString()} tokens</span>
                    <span className="font-medium">${data.cost.toFixed(4)}</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Artifact Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Artifact Types</CardTitle>
          <CardDescription>Generated artifacts by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.byArtifactType)
              .filter(([_, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                    <span className="text-sm font-medium capitalize">{type}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              ))}
            {Object.values(stats.byArtifactType).every((count) => count === 0) && (
              <p className="text-sm text-muted-foreground">No artifacts generated yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
