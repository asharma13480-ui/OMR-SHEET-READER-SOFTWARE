'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText, Download, FileDown, TableProperties,
  Users, Target, CheckCircle2, XCircle, MinusCircle,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  date?: string;
  totalMarks: number;
  totalQuestions: number;
  passingPercent: number;
}

interface ExamSummary {
  totalStudents: number;
  passCount: number;
  failCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  averagePercentage: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnanswered: number;
}

interface StudentReport {
  rank: number;
  studentName: string;
  rollNumber: string;
  obtainedMarks: number;
  totalMarks: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  negativeMarks: number;
  percentage: number;
  status: string;
}

interface QuestionAnalysis {
  questionNo: number;
  correctAnswer: string;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnanswered: number;
  difficulty: string;
}

interface ReportData {
  summary: ExamSummary;
  students: StudentReport[];
  questions: QuestionAnalysis[];
}

export function ReportsPage() {
  const { selectedExam, setSelectedExam, setCurrentPage } = useAppStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchReportData(selectedExam);
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

  const fetchReportData = async (examId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics?examId=${examId}`);
      if (!res.ok) throw new Error('Failed to fetch report data');
      const data = await res.json();
      setReportData(data);
    } catch {
      toast.error('Failed to load report data');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-chart-4 text-white';
      case 'medium': return 'bg-chart-2 text-white';
      case 'hard': return 'bg-destructive text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive exam reports and analysis
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Select an Exam</h3>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Choose an exam to view detailed reports
          </p>
        </Card>
      ) : loading ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : reportData ? (
        <>
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <TabsList>
                <TabsTrigger value="summary" className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Exam Summary
                </TabsTrigger>
                <TabsTrigger value="students" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Student-wise
                </TabsTrigger>
                <TabsTrigger value="questions" className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Question Analysis
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage('export-pdf')}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage('export-excel')}
                >
                  <TableProperties className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>

            {/* Exam Summary Tab */}
            <TabsContent value="summary" className="space-y-6 mt-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="gap-0 py-4 px-5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Students</span>
                  <p className="text-2xl font-bold mt-2">{reportData.summary.totalStudents}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-chart-1 text-white hover:bg-chart-1 text-[10px]">
                      {reportData.summary.passCount} Pass
                    </Badge>
                    <Badge variant="destructive" className="text-[10px]">
                      {reportData.summary.failCount} Fail
                    </Badge>
                  </div>
                </Card>

                <Card className="gap-0 py-4 px-5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Average Score</span>
                  <p className="text-2xl font-bold mt-2 text-chart-1">{reportData.summary.averageScore.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground mt-2">{reportData.summary.averagePercentage.toFixed(1)}% avg</p>
                </Card>

                <Card className="gap-0 py-4 px-5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score Range</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-xl font-bold text-chart-1">{reportData.summary.highestScore.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">to</span>
                    <span className="text-xl font-bold text-destructive">{reportData.summary.lowestScore.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Highest to Lowest</p>
                </Card>

                <Card className="gap-0 py-4 px-5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pass Rate</span>
                  <p className="text-2xl font-bold mt-2">{reportData.summary.passRate.toFixed(1)}%</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="bg-chart-1 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(reportData.summary.passRate, 100)}%` }}
                    />
                  </div>
                </Card>
              </div>

              {/* Answer Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Overall Answer Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="text-center p-4 rounded-lg bg-chart-1/5">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-chart-1 mb-2" />
                      <p className="text-2xl font-bold text-chart-1">{reportData.summary.totalCorrect}</p>
                      <p className="text-sm text-muted-foreground">Correct Answers</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-destructive/5">
                      <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
                      <p className="text-2xl font-bold text-destructive">{reportData.summary.totalIncorrect}</p>
                      <p className="text-sm text-muted-foreground">Incorrect Answers</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <MinusCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-2xl font-bold">{reportData.summary.totalUnanswered}</p>
                      <p className="text-sm text-muted-foreground">Unanswered</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Student-wise Report Tab */}
            <TabsContent value="students" className="space-y-4 mt-6">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-chart-1" />
                    Student-wise Performance
                    <Badge variant="secondary" className="ml-auto">
                      {reportData.students?.length || 0} students
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow className="bg-chart-1/5 hover:bg-chart-1/5">
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Rank</TableHead>
                          <TableHead>Roll No</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead className="text-right">%</TableHead>
                          <TableHead className="text-right">Correct</TableHead>
                          <TableHead className="text-right">Wrong</TableHead>
                          <TableHead className="text-right">Blank</TableHead>
                          <TableHead className="text-right">Neg</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reportData.students || []).map((student, idx) => (
                          <TableRow key={student.rollNumber}>
                            <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                            <TableCell className="font-bold">{student.rank}</TableCell>
                            <TableCell className="font-mono text-sm">{student.rollNumber}</TableCell>
                            <TableCell className="font-medium">{student.studentName}</TableCell>
                            <TableCell className="text-right font-semibold">{student.obtainedMarks}</TableCell>
                            <TableCell className="text-right">{student.percentage.toFixed(1)}%</TableCell>
                            <TableCell className="text-right text-chart-1">{student.correctCount}</TableCell>
                            <TableCell className="text-right text-destructive">{student.incorrectCount}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{student.unansweredCount}</TableCell>
                            <TableCell className="text-right text-destructive">{student.negativeMarks.toFixed(1)}</TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={student.status === 'pass' ? 'default' : 'destructive'}
                                className={student.status === 'pass' ? 'bg-chart-1 text-white hover:bg-chart-1' : ''}
                              >
                                {student.status === 'pass' ? 'PASS' : 'FAIL'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Question Analysis Tab */}
            <TabsContent value="questions" className="space-y-4 mt-6">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-chart-1" />
                    Question-wise Analysis
                    <Badge variant="secondary" className="ml-auto">
                      {reportData.questions?.length || 0} questions
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow className="bg-chart-1/5 hover:bg-chart-1/5">
                          <TableHead className="w-16">Q. No</TableHead>
                          <TableHead>Correct Answer</TableHead>
                          <TableHead className="text-right">Correct</TableHead>
                          <TableHead className="text-right">Incorrect</TableHead>
                          <TableHead className="text-right">Unanswered</TableHead>
                          <TableHead className="text-right">Accuracy %</TableHead>
                          <TableHead className="text-center">Difficulty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reportData.questions || []).map((q) => {
                          const total = q.totalCorrect + q.totalIncorrect + q.totalUnanswered;
                          const accuracy = total > 0 ? ((q.totalCorrect / total) * 100) : 0;
                          return (
                            <TableRow key={q.questionNo}>
                              <TableCell className="font-bold">{q.questionNo}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono font-bold">
                                  {q.correctAnswer}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-chart-1 font-medium">{q.totalCorrect}</TableCell>
                              <TableCell className="text-right text-destructive">{q.totalIncorrect}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{q.totalUnanswered}</TableCell>
                              <TableCell className="text-right font-medium">{accuracy.toFixed(1)}%</TableCell>
                              <TableCell className="text-center">
                                <Badge className={getDifficultyColor(q.difficulty)}>
                                  {q.difficulty || 'N/A'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No Report Data</h3>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Process OMR sheets first to generate reports
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
