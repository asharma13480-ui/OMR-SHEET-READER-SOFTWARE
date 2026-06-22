'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Trophy, Medal, Award, Search, Download, Printer,
  Star, Crown, ChevronUp, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  date?: string;
  totalMarks: number;
  passingPercent: number;
}

interface MeritStudent {
  rank: number;
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

export function MeritListPage() {
  const { selectedExam, setSelectedExam, setCurrentPage } = useAppStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<MeritStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'rank' | 'percentage' | 'name'>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchMeritList(selectedExam);
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

  const fetchMeritList = async (examId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/results/merit?examId=${examId}`);
      if (!res.ok) throw new Error('Failed to fetch merit list');
      const data = await res.json();
      setStudents(data.students || data.results || []);
    } catch {
      toast.error('Failed to load merit list');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    let result = [...students];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.studentName.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (sortField === 'rank') { aVal = a.rank; bVal = b.rank; }
      else if (sortField === 'percentage') { aVal = a.percentage; bVal = b.percentage; }
      else { aVal = a.studentName; bVal = b.studentName; }
      if (sortDir === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });
    return result;
  }, [students, search, sortField, sortDir]);

  const handleSort = (field: 'rank' | 'percentage' | 'name') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'rank' ? 'asc' : 'desc');
    }
  };

  const top3 = filteredStudents.slice(0, 3);
  const topper = filteredStudents[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Merit List</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ranked student performance overview
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
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Select an Exam</h3>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Choose an exam to view the merit list
          </p>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : students.length === 0 ? (
        <Card className="p-12 text-center">
          <Award className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No Results Yet</h3>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Process OMR sheets first to generate the merit list
          </p>
          <button
            onClick={() => setCurrentPage('upload-omr')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            Upload OMR Sheets
          </button>
        </Card>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length >= 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 2nd Place */}
              <Card className="gap-0 py-5 px-6 border-2 border-gray-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-gray-300" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">🥈</span>
                  <Badge className="bg-gray-400 text-white hover:bg-gray-400">
                    <Medal className="h-3 w-3 mr-1" />
                    2nd
                  </Badge>
                </div>
                <h3 className="font-bold text-lg truncate">{top3[1].studentName}</h3>
                <p className="text-sm text-muted-foreground">{top3[1].rollNumber}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-600">{top3[1].obtainedMarks}</span>
                  <span className="text-sm text-muted-foreground">/ {top3[1].totalMarks}</span>
                </div>
                <p className="text-sm font-medium text-gray-500 mt-1">{top3[1].percentage.toFixed(1)}%</p>
              </Card>

              {/* 1st Place */}
              <Card className="gap-0 sm:py-8 py-5 px-6 border-2 border-yellow-400 relative overflow-hidden shadow-lg shadow-yellow-400/20">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-yellow-300" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">🥇</span>
                  <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400">
                    <Crown className="h-3 w-3 mr-1" />
                    1st
                  </Badge>
                </div>
                <h3 className="font-bold text-lg truncate">{top3[0].studentName}</h3>
                <p className="text-sm text-muted-foreground">{top3[0].rollNumber}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-yellow-600">{top3[0].obtainedMarks}</span>
                  <span className="text-sm text-muted-foreground">/ {top3[0].totalMarks}</span>
                </div>
                <p className="text-sm font-medium text-yellow-600 mt-1">{top3[0].percentage.toFixed(1)}%</p>
              </Card>

              {/* 3rd Place */}
              <Card className="gap-0 py-5 px-6 border-2 border-amber-600 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-500" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">🥉</span>
                  <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                    <Star className="h-3 w-3 mr-1" />
                    3rd
                  </Badge>
                </div>
                <h3 className="font-bold text-lg truncate">{top3[2].studentName}</h3>
                <p className="text-sm text-muted-foreground">{top3[2].rollNumber}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-amber-700">{top3[2].obtainedMarks}</span>
                  <span className="text-sm text-muted-foreground">/ {top3[2].totalMarks}</span>
                </div>
                <p className="text-sm font-medium text-amber-600 mt-1">{top3[2].percentage.toFixed(1)}%</p>
              </Card>
            </div>
          )}

          {/* Search + Actions */}
          <Card className="py-4 px-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll number..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage('export-pdf')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </Card>

          {/* Full Merit Table */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-chart-1" />
                Full Rankings
                <Badge variant="secondary" className="ml-auto">{filteredStudents.length} students</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow className="bg-chart-1/5 hover:bg-chart-1/5">
                      <TableHead className="w-16 cursor-pointer select-none" onClick={() => handleSort('rank')}>
                        <span className="flex items-center gap-1">Rank {sortField === 'rank' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                      </TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                        <span className="flex items-center gap-1">Name {sortField === 'name' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                      </TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('percentage')}>
                        <span className="flex items-center justify-end gap-1">% {sortField === 'percentage' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                      </TableHead>
                      <TableHead className="text-right">Correct</TableHead>
                      <TableHead className="text-right">Wrong</TableHead>
                      <TableHead className="text-right">Unanswered</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const isTopper = student.rank === 1;
                      return (
                        <TableRow
                          key={student.rollNumber}
                          className={
                            isTopper
                              ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 font-medium'
                              : ''
                          }
                        >
                          <TableCell className="font-bold">
                            {student.rank <= 3 ? (
                              <span className="flex items-center gap-1.5">
                                {student.rank === 1 && '🥇'}
                                {student.rank === 2 && '🥈'}
                                {student.rank === 3 && '🥉'}
                                <span>{student.rank}</span>
                              </span>
                            ) : (
                              student.rank
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{student.rollNumber}</TableCell>
                          <TableCell className="font-medium">{student.studentName}</TableCell>
                          <TableCell className="text-right font-semibold">{student.obtainedMarks}</TableCell>
                          <TableCell className="text-right">{student.percentage.toFixed(1)}%</TableCell>
                          <TableCell className="text-right text-chart-1 font-medium">{student.correctCount}</TableCell>
                          <TableCell className="text-right text-destructive">{student.incorrectCount}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{student.unansweredCount}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={student.status === 'pass' ? 'default' : 'destructive'}
                              className={
                                student.status === 'pass'
                                  ? 'bg-chart-1 text-white hover:bg-chart-1'
                                  : ''
                              }
                            >
                              {student.status === 'pass' ? 'PASS' : 'FAIL'}
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
        </>
      )}
    </div>
  );
}
