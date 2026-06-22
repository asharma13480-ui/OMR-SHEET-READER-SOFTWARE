'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ScanSearch,
  Play,
  CheckCircle2,
  XCircle,
  BarChart3,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  subject: string | null;
  totalQuestions: number;
}

interface OMRSheet {
  id: string;
  studentName: string;
  rollNumber: string;
  status: string;
}

interface ResultSummary {
  totalEvaluated: number;
  passed: number;
  failed: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

interface ResultRow {
  id: string;
  studentName: string;
  rollNumber: string;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  status: string;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
}

export function CheckOMRPage() {
  const { setCurrentPage } = useAppStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [pendingSheets, setPendingSheets] = useState<OMRSheet[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/exam');
      const data = await res.json();
      setExams(data.exams || []);
    } catch {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleExamSelect = async (examId: string) => {
    setSelectedExamId(examId);
    setResults([]);
    setSummary(null);

    try {
      const [omrRes, resultsRes] = await Promise.all([
        fetch(`/api/omr?examId=${examId}`),
        fetch(`/api/results?examId=${examId}`),
      ]);
      const omrData = await omrRes.json();
      const resultsData = await resultsRes.json();

      const sheets: OMRSheet[] = omrData.sheets || [];
      setPendingSheets(sheets.filter((s: OMRSheet) => s.status === 'pending'));

      if (resultsData.results && resultsData.results.length > 0) {
        setResults(resultsData.results);
        computeSummary(resultsData.results);
      }
    } catch {
      toast.error('Failed to load exam data');
    }
  };

  const computeSummary = (resultsList: ResultRow[]) => {
    const total = resultsList.length;
    const passed = resultsList.filter((r) => r.status === 'pass').length;
    const failed = total - passed;
    const avgScore =
      total > 0
        ? Math.round(
            (resultsList.reduce((sum, r) => sum + r.percentage, 0) / total) * 100
          ) / 100
        : 0;
    const scores = resultsList.map((r) => r.percentage);
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;

    setSummary({
      totalEvaluated: total,
      passed,
      failed,
      averageScore: avgScore,
      highestScore: Math.round(highest * 100) / 100,
      lowestScore: Math.round(lowest * 100) / 100,
    });
  };

  const handleProcessAll = async () => {
    if (!selectedExamId) return;
    if (pendingSheets.length === 0) {
      toast.info('No pending sheets to process');
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: selectedExamId }),
      });

      clearInterval(interval);
      setProgress(100);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to process OMR sheets');
      }

      const data = await res.json();
      toast.success(data.message || 'All OMR sheets processed successfully!');

      // Refresh data
      const [omrRes, resultsRes] = await Promise.all([
        fetch(`/api/omr?examId=${selectedExamId}`),
        fetch(`/api/results?examId=${selectedExamId}`),
      ]);
      const omrData = await omrRes.json();
      const resultsData = await resultsRes.json();
      setPendingSheets(
        (omrData.sheets || []).filter((s: OMRSheet) => s.status === 'pending')
      );
      if (resultsData.results) {
        setResults(resultsData.results);
        computeSummary(resultsData.results);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process OMR sheets');
    } finally {
      setTimeout(() => {
        setProcessing(false);
        setProgress(0);
      }, 1000);
    }
  };

  const statCards = summary
    ? [
        {
          label: 'Total Evaluated',
          value: summary.totalEvaluated,
          icon: Users,
          color: 'text-primary',
          bg: 'bg-primary/10',
        },
        {
          label: 'Passed',
          value: summary.passed,
          icon: CheckCircle2,
          color: 'text-emerald-600',
          bg: 'bg-emerald-600/10',
        },
        {
          label: 'Failed',
          value: summary.failed,
          icon: XCircle,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
        },
        {
          label: 'Average Score',
          value: `${summary.averageScore}%`,
          icon: TrendingUp,
          color: 'text-defence-accent',
          bg: 'bg-defence-accent/10',
        },
        {
          label: 'Highest',
          value: `${summary.highestScore}%`,
          icon: BarChart3,
          color: 'text-chart-4',
          bg: 'bg-chart-4/10',
        },
        {
          label: 'Lowest',
          value: `${summary.lowestScore}%`,
          icon: BarChart3,
          color: 'text-orange-500',
          bg: 'bg-orange-500/10',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Check &amp; Evaluate OMR</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Process pending OMR sheets and generate results
        </p>
      </div>

      {/* Exam Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ScanSearch className="h-5 w-5 text-primary" />
            Select Exam
          </CardTitle>
          <CardDescription>Choose the exam whose OMR sheets you want to evaluate.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : exams.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No exams found. Please create an exam first.</p>
              <Button
                variant="outline"
                className="mt-3 text-primary border-primary/30"
                onClick={() => setCurrentPage('create-exam')}
              >
                Create Exam
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="w-full max-w-md">
                <Select value={selectedExamId} onValueChange={handleExamSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exam..." />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name} ({exam.totalQuestions} Q)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedExamId && (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    className={`font-normal ${
                      pendingSheets.length > 0
                        ? 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30'
                        : 'bg-primary/15 text-primary border-primary/30'
                    }`}
                  >
                    {pendingSheets.length > 0 ? (
                      <AlertTriangle className="h-3 w-3 mr-1" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    {pendingSheets.length} Pending Sheets
                  </Badge>
                  <Button
                    onClick={handleProcessAll}
                    disabled={processing || pendingSheets.length === 0}
                    className="bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {processing ? 'Processing...' : 'Process All'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {processing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Processing OMR Sheets...</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {summary && summary.totalEvaluated > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {statCards.map((card) => (
              <Card key={card.label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`${card.bg} p-2 rounded-lg`}>
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground truncate">{card.label}</p>
                      <p className="text-lg font-bold">{card.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Results Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Evaluation Results</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">#</TableHead>
                      <TableHead className="font-semibold">Roll No</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">Score</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">Correct</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Wrong</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Unanswered</TableHead>
                      <TableHead className="font-semibold">Percentage</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, idx) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-mono font-medium">{r.rollNumber}</TableCell>
                        <TableCell>{r.studentName}</TableCell>
                        <TableCell className="hidden sm:table-cell font-medium">
                          {r.obtainedMarks}/{r.totalMarks}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-emerald-600 font-medium">
                          {r.correctCount}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-destructive">
                          {r.incorrectCount}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {r.unansweredCount}
                        </TableCell>
                        <TableCell className="font-medium">{r.percentage}%</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              r.status === 'pass'
                                ? 'bg-emerald-600/15 text-emerald-700 border-emerald-600/30'
                                : 'bg-destructive/15 text-destructive border-destructive/30'
                            }
                          >
                            {r.status === 'pass' ? 'Pass' : 'Fail'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* No results state */}
      {selectedExamId && !processing && results.length === 0 && pendingSheets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No pending sheets to evaluate.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
