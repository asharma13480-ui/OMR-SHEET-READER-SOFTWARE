'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TableProperties, Download, Eye, FileSpreadsheet, KeyRound,
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

interface StudentResult {
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

interface AnswerKeyItem {
  questionNo: number;
  correctAnswer: string;
  marks: number;
}

export function ExportExcelPage() {
  const { selectedExam, setSelectedExam } = useAppStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [answerKeys, setAnswerKeys] = useState<AnswerKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [exportType, setExportType] = useState<'results' | 'answer-key'>('results');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchData(selectedExam);
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

  const fetchData = async (examId: string) => {
    try {
      setLoading(true);
      const [resultsRes, akRes] = await Promise.all([
        fetch(`/api/results/merit?examId=${examId}`),
        fetch(`/api/answer-key?examId=${examId}`),
      ]);

      if (resultsRes.ok) {
        const data = await resultsRes.json();
        setResults(data.students || data.results || []);
      }

      if (akRes.ok) {
        const data = await akRes.json();
        setAnswerKeys(data.answerKeys || data || []);
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const escapeCSV = (value: string | number | boolean): string => {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const generateResultsCSV = (): string => {
    const headers = [
      'Rank', 'Roll Number', 'Student Name', 'Obtained Marks', 'Total Marks',
      'Percentage', 'Correct', 'Incorrect', 'Unanswered', 'Negative Marks', 'Status',
    ];
    const rows = results.map((s) => [
      s.rank,
      s.rollNumber,
      s.studentName,
      s.obtainedMarks,
      s.totalMarks,
      s.percentage.toFixed(2),
      s.correctCount,
      s.incorrectCount,
      s.unansweredCount,
      s.negativeMarks,
      s.status === 'pass' ? 'PASS' : 'FAIL',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    return csvContent;
  };

  const generateAnswerKeyCSV = (): string => {
    const headers = ['Question No', 'Correct Answer', 'Marks'];
    const rows = answerKeys.map((ak) => [
      ak.questionNo,
      ak.correctAnswer,
      ak.marks,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    return csvContent;
  };

  const handleDownload = () => {
    setDownloading(true);

    try {
      const exam = exams.find((e) => e.id === selectedExam);
      const examName = exam?.name || 'export';
      const dateStr = new Date().toISOString().split('T')[0];

      let csvContent: string;
      let fileName: string;

      if (exportType === 'results') {
        csvContent = generateResultsCSV();
        fileName = `${examName}_Results_${dateStr}.csv`;
      } else {
        csvContent = generateAnswerKeyCSV();
        fileName = `${examName}_AnswerKey_${dateStr}.csv`;
      }

      // Add BOM for Excel UTF-8 support
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${fileName}`);
    } catch {
      toast.error('Failed to generate CSV');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Export Excel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download results and data as CSV/Excel files
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
          <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Select an Exam</h3>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Choose an exam to export data
          </p>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Export Options */}
          <Card className="py-4 px-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-preview"
                    checked={showPreview}
                    onCheckedChange={setShowPreview}
                  />
                  <Label htmlFor="show-preview" className="text-sm font-medium cursor-pointer">
                    Show Preview
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium whitespace-nowrap">Export:</Label>
                  <div className="flex items-center bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setExportType('results')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        exportType === 'results'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <TableProperties className="h-3.5 w-3.5 inline mr-1.5" />
                      Results
                    </button>
                    <button
                      onClick={() => setExportType('answer-key')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        exportType === 'answer-key'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <KeyRound className="h-3.5 w-3.5 inline mr-1.5" />
                      Answer Key
                    </button>
                  </div>
                </div>
              </div>
              <Button size="sm" onClick={handleDownload} disabled={downloading}>
                <Download className="h-4 w-4 mr-2" />
                {downloading ? 'Generating...' : 'Download CSV'}
              </Button>
            </div>
          </Card>

          {/* Data Preview */}
          {showPreview && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-chart-1" />
                  Data Preview
                  <Badge variant="secondary" className="ml-auto">
                    {exportType === 'results'
                      ? `${results.length} records`
                      : `${answerKeys.length} questions`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  {exportType === 'results' ? (
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow className="bg-chart-1/5 hover:bg-chart-1/5">
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
                        {results.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                              No results data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          results.map((s) => (
                            <TableRow key={s.rollNumber}>
                              <TableCell className="font-bold">{s.rank}</TableCell>
                              <TableCell className="font-mono text-sm">{s.rollNumber}</TableCell>
                              <TableCell className="font-medium">{s.studentName}</TableCell>
                              <TableCell className="text-right font-semibold">{s.obtainedMarks}</TableCell>
                              <TableCell className="text-right">{s.percentage.toFixed(1)}%</TableCell>
                              <TableCell className="text-right text-chart-1">{s.correctCount}</TableCell>
                              <TableCell className="text-right text-destructive">{s.incorrectCount}</TableCell>
                              <TableCell className="text-right text-muted-foreground">{s.unansweredCount}</TableCell>
                              <TableCell className="text-right text-destructive">{s.negativeMarks.toFixed(1)}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={s.status === 'pass' ? 'default' : 'destructive'}
                                  className={s.status === 'pass' ? 'bg-chart-1 text-white hover:bg-chart-1' : ''}
                                >
                                  {s.status === 'pass' ? 'PASS' : 'FAIL'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow className="bg-chart-1/5 hover:bg-chart-1/5">
                          <TableHead>Question No</TableHead>
                          <TableHead>Correct Answer</TableHead>
                          <TableHead className="text-right">Marks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {answerKeys.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              No answer key data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          answerKeys.map((ak) => (
                            <TableRow key={ak.questionNo}>
                              <TableCell className="font-bold">{ak.questionNo}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono font-bold">
                                  {ak.correctAnswer}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{ak.marks}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
