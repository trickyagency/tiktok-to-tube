import { useMemo, useState, useEffect, useCallback } from 'react';
import { useCronJobs } from '@/hooks/useCronJobs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Clock, CheckCircle2, XCircle, Activity, Timer } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const AUTO_REFRESH_INTERVAL = 30; // seconds

const CronMonitor = () => {
  const { jobs, history, isLoading, refetch } = useCronJobs();
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_INTERVAL);

  // Auto-refresh countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          refetch();
          return AUTO_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refetch]);

  // Reset countdown on manual refresh
  const handleManualRefresh = useCallback(() => {
    refetch();
    setRefreshCountdown(AUTO_REFRESH_INTERVAL);
  }, [refetch]);

  // Memoized stats calculation
  const stats = useMemo(() => ({
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.active).length,
    successfulRuns: history.filter(h => h.status === 'succeeded').length,
    failedRuns: history.filter(h => h.status === 'failed').length,
    lastRun: history[0]?.start_time,
  }), [jobs, history]);

  // Get unique job names for filter
  const jobNames = useMemo(() => {
    const names = new Set<string>();
    history.forEach(h => {
      if (h.job_name) names.add(h.job_name);
    });
    return Array.from(names);
  }, [history]);

  // Filtered history based on selected job
  const filteredHistory = useMemo(() => {
    if (selectedJob === 'all') return history;
    return history.filter(h => h.job_name === selectedJob);
  }, [history, selectedJob]);

  const getDuration = useCallback((start: string, end: string | null) => {
    if (!end) return '-';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cron Monitor</h1>
          <p className="text-muted-foreground">Monitor scheduled jobs and execution history</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>Auto-refresh in {refreshCountdown}s</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.activeJobs}/{stats.totalJobs}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Runs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats.successfulRuns}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Runs</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{stats.failedRuns}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Run</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : stats.lastRun ? (
              <div className="text-2xl font-bold">
                {formatDistanceToNow(new Date(stats.lastRun), { addSuffix: true })}
              </div>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Jobs
          </CardTitle>
          <CardDescription>All configured cron jobs in the database</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No cron jobs configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.jobid}>
                    <TableCell className="font-medium">{job.jobname}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">{job.schedule}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={job.active ? 'default' : 'secondary'}>
                        {job.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Execution History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Execution History
              </CardTitle>
              <CardDescription>Recent job execution results (last 50 runs)</CardDescription>
            </div>
            {jobNames.length > 0 && (
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {selectedJob === 'all' ? 'No execution history yet' : `No history for ${selectedJob}`}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((entry) => (
                  <TableRow key={entry.runid}>
                    <TableCell>
                      {entry.status === 'succeeded' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{entry.job_name || `Job #${entry.jobid}`}</TableCell>
                    <TableCell>
                      <span title={format(new Date(entry.start_time), 'PPpp')}>
                        {formatDistanceToNow(new Date(entry.start_time), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>{getDuration(entry.start_time, entry.end_time)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.return_message && entry.status === 'failed' ? (
                        <span className="text-destructive text-sm" title={entry.return_message}>
                          {entry.return_message}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CronMonitor;
