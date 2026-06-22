'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Users,
  BarChart3,
  CheckCircle,
  Plus,
  Upload,
  ScanSearch,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  subject: string | null;
  date: string | null;
  totalQuestions: number;
  totalMarks: number;
  passingPercent: number;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  totalExams: number;
  totalStudents: number;
  avgScore: number;
  passRate: number;
}

const quickActions = [
  { label: 'Create Exam', icon: Plus, page: 'create-exam' as const },
  { label: 'Upload OMR', icon: Upload, page: 'upload-omr' as const },
  { label: 'Check OMR', icon: ScanSearch, page: 'check-omr' as const },
  { label: 'View Results', icon: Trophy, page: 'results' as const },
];

export function DashboardPage() {
  const { setCurrentPage } = useAppStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalExams: 0,
    totalStudents: 0,
    avgScore: 0,
    passRate: 0,
  });
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [examRes, omrRes, resultsRes] = await Promise.all([
          fetch('/api/exam'),
          fetch('/api/omr'),
          fetch('/api/results'),
        ]);

        const examData = await examRes.json();
        const omrData = await omrRes.json();
        const resultsData = await resultsRes.json();

        const examList: Exam[] = examData.exams || [];
        const omrList = omrData.sheets || [];
        const resultsList = resultsData.results || [];

        const passed = resultsList.filter(
          (r: { status: string }) => r.status === 'pass'
        ).length;
        const totalResults = resultsList.length;
        const avgScore =
          totalResults > 0
            ? Math.round(
                (resultsList.reduce(
                  (sum: number, r: { percentage: number }) =>
                    sum + r.percentage,
                  0
                ) /
                  totalResults) *
                  100
              ) / 100
            : 0;

        setStats({
          totalExams: examList.length,
          totalStudents: omrList.length,
          avgScore,
          passRate: totalResults > 0 ? Math.round((passed / totalResults) * 100) : 0,
        });
        setExams(examList);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    {
      title: 'Total Exams',
      value: stats.totalExams,
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'text-defence-accent',
      bg: 'bg-defence-accent/10',
    },
    {
      title: 'Avg Score',
      value: `${stats.avgScore}%`,
      icon: BarChart3,
      color: 'text-chart-4',
      bg: 'bg-chart-4/10',
    },
    {
      title: 'Pass Rate',
      value: `${stats.passRate}%`,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-600/10',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-primary/15 text-primary border-primary/30">Active</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-600/15 text-emerald-700 border-emerald-600/30">Completed</Badge>;
      case 'archived':
        return <Badge className="bg-muted text-muted-foreground border-border">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : statCards.map((card) => (
              <Card key={card.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`${card.bg} p-2.5 md:p-3 rounded-lg`}>
                      <card.icon className={`h-5 w-5 md:h-6 md:w-6 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {card.title}
                      </p>
                      <p className="text-lg md:text-2xl font-bold">{card.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.page}
              variant="outline"
              className="h-auto p-4 md:p-5 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-colors"
              onClick={() => setCurrentPage(action.page)}
            >
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Recent Exams */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold">Recent Exams</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
            onClick={() => setCurrentPage('create-exam')}
          >
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No exams created yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-primary border-primary/30 hover:bg-primary/5"
                onClick={() => setCurrentPage('create-exam')}
              >
                Create Your First Exam
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Exam Name</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Subject</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Date</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Questions</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.slice(0, 5).map((exam) => (
                    <TableRow
                      key={exam.id}
                      className="cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => {
                        useAppStore.getState().setSelectedExam(exam.id);
                        setCurrentPage('results');
                      }}
                    >
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {exam.subject || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {exam.date || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {exam.totalQuestions}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {getStatusBadge(exam.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
