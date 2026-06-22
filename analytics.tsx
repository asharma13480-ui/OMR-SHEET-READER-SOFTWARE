'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Award, Target,
  ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  date?: string;
  totalMarks: number;
  passingPercent: number;
}

interface AnalyticsData {
  summary: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    totalStudents: number;
    medianScore: number;
    standardDeviation: number;
  };
  scoreDistribution: { range: string; count: number }[];
  passFail: { status: string; count: number }[];
  performanceTrend: { index: string; score: number }[];
  detailedStats: {
    metric: string;
    value: number | string;
    description: string;
  }[];
}

const CHART_COLORS = ['#008000', '#b0d020', '#005500', '#40c040', '#80e080'];

export function AnalyticsPage() {
  const { selectedExam, setSelectedExam, setCurrentPage } = useAppStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchAnalytics(selectedExam);
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      setExamsLoading(true);
      const res = await fetch('/api/exam');
      if (!res.ok) throw new Error('Failed to fetch exams');
      const data = await res.json();
      setExams(data.exams || data || []);
    } catch {
      toast.error('Failed to load exams');
      setExams([]);
    } finally {
      setExamsLoading(false);
    }
  };

  const fetchAnalytics = async (examId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics?examId=${examId}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch {
      toast.error('Failed to load analytics data');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed performance analysis and statistics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {examsLoading ? (
            <Skeleton className="h-9 w-48" />
          ) : (
            <Select
              value={selectedExam || ''}
              onValueChange={(val) => setSelectedExam(val)}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.length === 0 && (
                  <SelectItem value="__none" disabled>
                    No exams available
                  </SelectItem>
                )}
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name} {exam.date ? `(${exam.date})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {!selectedExam ? (
        <Card className="p-12 text-center">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Select an Exam</h3>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Choose an exam from the dropdown to view detailed analytics
          </p>
          {exams.length > 0 && (
            <button
              onClick={() => {
                setSelectedExam(exams[0].id);
              }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              Use First Exam
            </button>
          )}
        </Card>
      ) : loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      ) : analytics ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="gap-0 py-4 px-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Average</span>
                <div className="p-1.5 rounded-md bg-chart-1/10">
                  <TrendingUp className="h-4 w-4 text-chart-1" />
                </div>
              </div>
              <p className="text-2xl font-bold">{analytics.summary.averageScore.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">out of {exams.find(e => e.id === selectedExam)?.totalMarks || 100}</p>
            </Card>

            <Card className="gap-0 py-4 px-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Highest</span>
                <div className="p-1.5 rounded-md bg-chart-2/10">
                  <ArrowUp className="h-4 w-4 text-chart-2" />
                </div>
              </div>
              <p className="text-2xl font-bold text-chart-1">{analytics.summary.highestScore.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">Top score</p>
            </Card>

            <Card className="gap-0 py-4 px-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lowest</span>
                <div className="p-1.5 rounded-md bg-destructive/10">
                  <ArrowDown className="h-4 w-4 text-destructive" />
                </div>
              </div>
              <p className="text-2xl font-bold text-destructive">{analytics.summary.lowestScore.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">Minimum score</p>
            </Card>

            <Card className="gap-0 py-4 px-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pass Rate</span>
                <div className="p-1.5 rounded-md bg-chart-4/10">
                  <Target className="h-4 w-4 text-chart-4" />
                </div>
              </div>
              <p className="text-2xl font-bold">{analytics.summary.passRate.toFixed(1)}%</p>
              <Badge variant={analytics.summary.passRate >= 50 ? 'default' : 'destructive'} className="mt-1 text-[10px]">
                {analytics.summary.passRate >= 50 ? 'Good' : 'Low'}
              </Badge>
            </Card>

            <Card className="gap-0 py-4 px-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Students</span>
                <div className="p-1.5 rounded-md bg-chart-1/10">
                  <Users className="h-4 w-4 text-chart-1" />
                </div>
              </div>
              <p className="text-2xl font-bold">{analytics.summary.totalStudents}</p>
              <p className="text-xs text-muted-foreground mt-1">Total evaluated</p>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.scoreDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.scoreDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8f5e8" />
                      <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #c8e0c8',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" fill="#008000" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                    No distribution data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pass vs Fail Pie Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pass vs Fail</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.passFail.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.passFail}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="count"
                        label={({ status, count, percent }) => `${status}: ${count} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {analytics.passFail.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                    No pass/fail data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Trend */}
          {analytics.performanceTrend.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Performance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.performanceTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#008000" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#008000" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8f5e8" />
                    <XAxis dataKey="index" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #c8e0c8',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#008000"
                      strokeWidth={2}
                      fill="url(#colorScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Detailed Statistics Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detailed Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-chart-1/5 hover:bg-chart-1/5">
                      <TableHead className="font-semibold">Metric</TableHead>
                      <TableHead className="font-semibold">Value</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.detailedStats.map((stat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{stat.metric}</TableCell>
                        <TableCell className="font-semibold text-chart-1">{stat.value}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{stat.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <Award className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No Analytics Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Process OMR sheets first to generate analytics for this exam
          </p>
          <button
            onClick={() => setCurrentPage('upload-omr')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            Upload OMR Sheets
          </button>
        </Card>
      )}
    </div>
  );
}
