'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Server, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface HealthData {
  status: string
  timestamp: string
  uptime_seconds: number
  system?: {
    python_version: string
    cpu_percent: number
    memory: {
      total_mb: number
      available_mb: number
      percent_used: number
    }
    disk: {
      total_gb: number
      free_gb: number
      percent_used: number
    }
  }
}

export function MonitoringDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  async function fetchHealth() {
    try {
      const response = await fetch('http://localhost:8000/api/health/detailed')
      if (!response.ok) throw new Error('Health check failed')
      const data = await response.json()
      setHealth(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !health) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-900">Service Offline</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error || 'Unable to connect to backend service'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Service Status</CardTitle>
            </div>
            <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'} className="gap-1">
              {health.status === 'healthy' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {health.status}
            </Badge>
          </div>
          <CardDescription>Backend service health metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Uptime: {formatUptime(health.uptime_seconds)}</span>
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      {health.system && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CPU */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm">CPU Usage</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold mb-2">{health.system.cpu_percent.toFixed(1)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${health.system.cpu_percent}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Memory */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm">Memory Usage</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold mb-2">{health.system.memory.percent_used.toFixed(1)}%</div>
              <div className="text-sm text-gray-600 mb-2">
                {health.system.memory.available_mb.toFixed(0)} MB available
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${health.system.memory.percent_used}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Disk */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm">Disk Usage</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold mb-2">{health.system.disk.percent_used.toFixed(1)}%</div>
              <div className="text-sm text-gray-600 mb-2">
                {health.system.disk.free_gb.toFixed(1)} GB free
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${health.system.disk.percent_used}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Python Version */}
      {health.system && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Runtime Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              <strong>Python:</strong> {health.system.python_version.split(' ')[0]}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
