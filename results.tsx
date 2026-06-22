'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Minus,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  subject: string | null;
  totalQuestions: number;
  totalMarks: number;
  passingPercent: number;
}

interface ResultRow {
  id: string;
  studentName: string;
  rollNumber: string;
  totalMarks: number;
  obtainedMarks: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  negativeMarks: number;
  percentage: number;
  status: string;
  rank: number | null;
}

interface AnswerComparison {
  questionNo: number;
  correctAnswer: string;
  studentAnswer: string;
  marks: number;
  isCorrect: boolean;
  isUnanswered: boolean;
}

const ITEMS_PER_PAGE = 15;

export function ResultsPage() {
  const { setCurrentPage: navigateToPage } = useAppStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [selectedResult, setSelectedResult] = useState<ResultRow | null>(null);
  const [comparison, setComparison] = useState<AnswerComparison[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    setPageNum(1);
    setSearch('');

    try {
      const res = await fetch(`/api/results?examId=${examId}`);
      const data = await res.json();
      // Sort by rank, then by percentage desc
      const sorted = (data.results || []).sort((a: ResultRow, b: ResultRow) => {
        if (a.rank && b.rank) return a.rank - b.rank;
        return b.percentage - a.percentage;
      });
      setResults(sorted);
    } catch {
      toast.error('Failed to load results');
      setResults([]);
    }
  };

  const filteredResults = useMemo(() => {
    if (!search.trim()) return results;
    const q = search.toLowerCase();
    return results.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.rollNumber.toLowerCase().includes(q)
    );
  }, [results, search]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / ITEMS_PER_PAGE));
  const paginatedResults = filteredResults.slice(
    (pageNum - 1) * ITEMS_PER_PAGE,
    pageNum * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => {
    setPageNum(1);
  }, [search]);

  const handleViewDetail = async (result: ResultRow) => {
    setSelectedResult(result);
    setDialogOpen(true);

    try {
      const res = await fetch(
        `/api/results?examId=${selectedExamId}&omrSheetId=${result.id}`
      );
      const data = await res.json();
      setComparison(data.comparison || []);
    } catch {
      setComparison([]);
      toast.error('Failed to load answer comparison');
    }
  };

  const getPassBadge = (status: string) => (
    <Badge
      className={
        status === 'pass'
          ? 'bg-emerald-600/15 text-emerald-700 border-emerald-600/30'
          : 'bg-destructive/15 text-destructive border-destructive/30'
      }
    >
      {status === 'pass' ? 'Pass' : 'Fail'}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Results</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View detailed examination results with answer comparisons
        </p>
      </div>

      {/* Exam Selection + Search */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : exams.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No exams found.</p>
                  <Button
                    variant="outline"
                    className="mt-2 text-primary border-primary/30"
                    onClick={() => navigateToPage('create-exam')}
                  >
                    Create Exam
                  </Button>
                </div>
              ) : (
                <Select value={selectedExamId} onValueChange={handleExamSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exam to view results..." />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        <Trophy className="h-3 w-3 inline mr-1.5 text-defence-accent" />
                        {exam.name} ({exam.totalQuestions} Q)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {results.length > 0 && (
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll no..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {selectedExamId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">
              {filteredResults.length} Result{filteredResults.length !== 1 ? 's' : ''}
              {search && ` (filtered from ${results.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No results found for this exam.</p>
                <p className="text-xs mt-1">
                  Make sure you&apos;ve uploaded an answer key and processed OMR sheets.
                </p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No results match your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold w-16">Rank</TableHead>
                      <TableHead className="font-semibold">Roll No</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Score</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Correct</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Wrong</TableHead>
                      <TableHead className="font-semibold hidden lg:table-cell">Unanswered</TableHead>
                      <TableHead className="font-semibold">Percentage</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResults.map((r) => (
                      <TableRow
                        key={r.id}
                        className="hover:bg-primary/5 transition-colors"
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          {r.rank || '—'}
                        </TableCell>
                        <TableCell className="font-mono font-medium">{r.rollNumber}</TableCell>
                        <TableCell className="font-medium">{r.studentName}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {r.obtainedMarks}/{r.totalMarks}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-emerald-600 font-medium">
                          {r.correctCount}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-destructive">
                          {r.incorrectCount}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {r.unansweredCount}
                        </TableCell>
                        <TableCell className="font-bold">{r.percentage}%</TableCell>
                        <TableCell>{getPassBadge(r.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                            onClick={() => handleViewDetail(r)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(pageNum - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(pageNum * ITEMS_PER_PAGE, filteredResults.length)} of{' '}
                  {filteredResults.length}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={pageNum <= 1}
                    onClick={() => setPageNum((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (pageNum <= 3) {
                      page = i + 1;
                    } else if (pageNum >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = pageNum - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={pageNum === page ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 w-8 p-0 ${
                          pageNum === page
                            ? 'bg-primary hover:bg-primary/90'
                            : ''
                        }`}
                        onClick={() => setPageNum(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={pageNum >= totalPages}
                    onClick={() => setPageNum((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {selectedResult?.studentName} — Answer Comparison
            </DialogTitle>
            <DialogDescription>
              Roll: {selectedResult?.rollNumber} | Score: {selectedResult?.obtainedMarks}/
              {selectedResult?.totalMarks} ({selectedResult?.percentage}%)
            </DialogDescription>
          </DialogHeader>

          {/* Quick Summary */}
          {selectedResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg bg-emerald-600/10">
                <p className="text-xs text-muted-foreground">Correct</p>
                <p className="text-lg font-bold text-emerald-600">
                  {selectedResult.correctCount}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <p className="text-xs text-muted-foreground">Wrong</p>
                <p className="text-lg font-bold text-destructive">
                  {selectedResult.incorrectCount}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Unanswered</p>
                <p className="text-lg font-bold">{selectedResult.unansweredCount}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1">{getPassBadge(selectedResult.status)}</div>
              </div>
            </div>
          )}

          {/* Answer Comparison Grid */}
          {comparison.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-1 pr-4">
                {/* Header */}
                <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-2 p-2 text-xs font-semibold text-muted-foreground border-b">
                  <span>Q#</span>
                  <span>Correct</span>
                  <span>Student</span>
                  <span>Result</span>
                </div>
                {comparison.map((item) => (
                  <div
                    key={item.questionNo}
                    className={`grid grid-cols-[60px_1fr_1fr_1fr] gap-2 p-2 text-sm rounded ${
                      item.isCorrect
                        ? 'bg-emerald-600/5'
                        : item.isUnanswered
                        ? 'bg-muted/30'
                        : 'bg-destructive/5'
                    }`}
                  >
                    <span className="font-mono text-muted-foreground">
                      {item.questionNo}
                    </span>
                    <span className="font-mono font-medium text-primary">
                      {item.correctAnswer || '—'}
                    </span>
                    <span className="font-mono font-medium">
                      {item.studentAnswer || '—'}
                    </span>
                    <span>
                      {item.isCorrect ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : item.isUnanswered ? (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Skeleton className="h-4 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
