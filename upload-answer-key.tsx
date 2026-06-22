'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KeyRound, ClipboardPaste, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  subject: string | null;
  totalQuestions: number;
  totalMarks: number;
  optionsPerQ: number;
  negativeMarking: number;
  passingPercent: number;
}

interface AnswerKeyEntry {
  questionNo: number;
  correctAnswer: string;
  marks: number;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export function UploadAnswerKeyPage() {
  const { setCurrentPage } = useAppStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<AnswerKeyEntry[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingKey, setExistingKey] = useState<AnswerKeyEntry[]>([]);
  const [activeTab, setActiveTab] = useState('individual');

  useEffect(() => {
    async function fetchExams() {
      try {
        const res = await fetch('/api/exam');
        const data = await res.json();
        setExams(data.exams || []);
      } catch {
        toast.error('Failed to load exams');
      } finally {
        setLoading(false);
      }
    }
    fetchExams();
  }, []);

  const loadAnswerKey = useCallback(async (examId: string) => {
    if (!examId) {
      setExistingKey([]);
      return;
    }
    try {
      const res = await fetch(`/api/answer-key?examId=${examId}`);
      const data = await res.json();
      setExistingKey(data.answerKey || []);
    } catch {
      setExistingKey([]);
    }
  }, []);

  const handleExamSelect = (examId: string) => {
    setSelectedExamId(examId);
    setSelectedExam(exams.find((e) => e.id === examId) || null);
    loadAnswerKey(examId);

    // Initialize answer entries
    const exam = exams.find((e) => e.id === examId);
    if (exam) {
      const newAnswers: AnswerKeyEntry[] = Array.from(
        { length: exam.totalQuestions },
        (_, i) => ({
          questionNo: i + 1,
          correctAnswer: '',
          marks: 1,
        })
      );
      setAnswers(newAnswers);
    }
  };

  const setAnswer = (questionNo: number, answer: string) => {
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionNo === questionNo ? { ...a, correctAnswer: answer } : a
      )
    );
  };

  const setMarks = (questionNo: number, marks: number) => {
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionNo === questionNo ? { ...a, marks } : a
      )
    );
  };

  const handleBulkFill = () => {
    if (!selectedExam) return;

    const text = bulkText.trim().toUpperCase();
    if (!text) {
      toast.error('Please enter answer string');
      return;
    }

    const newAnswers = [...answers];
    for (let i = 0; i < text.length && i < selectedExam.totalQuestions; i++) {
      const char = text[i];
      if (OPTION_LABELS.includes(char)) {
        newAnswers[i] = {
          ...newAnswers[i],
          correctAnswer: char,
        };
      }
    }
    setAnswers(newAnswers);
    setActiveTab('individual');
    toast.success(`Filled ${Math.min(text.length, selectedExam.totalQuestions)} answers from bulk string`);
  };

  const handleSave = async () => {
    if (!selectedExamId) {
      toast.error('Please select an exam');
      return;
    }

    const filledAnswers = answers.filter((a) => a.correctAnswer !== '');
    if (filledAnswers.length === 0) {
      toast.error('No answers to save');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/answer-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          answers: filledAnswers,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save answer key');
      }

      toast.success(`Answer key saved! ${filledAnswers.length} answers recorded.`);
      loadAnswerKey(selectedExamId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save answer key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Answer Key</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enter the correct answers for an examination
        </p>
      </div>

      {/* Exam Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Select Exam
          </CardTitle>
          <CardDescription>Choose the exam for which you want to set the answer key.</CardDescription>
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
            <Select value={selectedExamId} onValueChange={handleExamSelect}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select an exam..." />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name} ({exam.totalQuestions} Q, {exam.optionsPerQ} opts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedExam && (
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                Questions: {selectedExam.totalQuestions}
              </Badge>
              <Badge className="bg-defence-accent/10 text-defence-accent border-defence-accent/20">
                Options: {selectedExam.optionsPerQ}
              </Badge>
              <Badge className="bg-muted text-muted-foreground">
                Negative: {selectedExam.negativeMarking > 0 ? `${selectedExam.negativeMarking}/q` : 'None'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Answer Key */}
      {existingKey.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Existing Answer Key ({existingKey.length} answers)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {existingKey.map((entry) => (
                <span
                  key={entry.questionNo}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-primary text-primary-foreground rounded"
                >
                  {entry.questionNo}:{entry.correctAnswer}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answer Entry */}
      {selectedExam && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Enter Answers</CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="individual">Individual Entry</TabsTrigger>
                <TabsTrigger value="bulk">Bulk Entry</TabsTrigger>
              </TabsList>

              {/* Individual Entry */}
              <TabsContent value="individual">
                <ScrollArea className="max-h-[50vh] overflow-y-auto">
                  <div className="space-y-2 pr-4">
                    {answers.map((entry) => {
                      const existingEntry = existingKey.find(
                        (e) => e.questionNo === entry.questionNo
                      );
                      const isFilled = existingEntry || entry.correctAnswer !== '';

                      return (
                        <div
                          key={entry.questionNo}
                          className={`flex flex-wrap items-center gap-2 p-2.5 rounded-lg transition-colors min-h-[44px] ${
                            isFilled
                              ? 'bg-primary/5 border border-primary/20'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <span className="w-8 text-center text-sm font-mono font-medium text-muted-foreground shrink-0">
                            {entry.questionNo}
                          </span>
                          <div className="flex gap-1 flex-wrap">
                            {OPTION_LABELS.slice(0, selectedExam.optionsPerQ).map((opt) => (
                              <button
                                key={opt}
                                className={`w-8 h-8 rounded-md text-xs font-semibold transition-all shrink-0 ${
                                  entry.correctAnswer === opt
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary'
                                }`}
                                onClick={() => setAnswer(entry.questionNo, opt)}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                            <Label className="text-xs text-muted-foreground hidden sm:inline">Marks:</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              className="w-16 h-8 text-xs"
                              value={entry.marks}
                              onChange={(e) =>
                                setMarks(entry.questionNo, parseFloat(e.target.value) || 0)
                              }
                            />
                            {isFilled && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Bulk Entry */}
              <TabsContent value="bulk">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkAnswers">
                      Paste all answers as a continuous string (e.g., &quot;ABCDABCD...&quot;)
                    </Label>
                    <Textarea
                      id="bulkAnswers"
                      placeholder="ABCDABCDABCD..."
                      className="font-mono min-h-[100px]"
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Each character represents the answer for that question number.
                      Use A, B, C, D{selectedExam.optionsPerQ > 4 ? ', E' : ''} only.
                      Total questions: {selectedExam.totalQuestions}
                    </p>
                  </div>
                  <Button
                    onClick={handleBulkFill}
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <ClipboardPaste className="h-4 w-4 mr-2" />
                    Fill Answers
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Save */}
            <div className="relative z-10 mt-8 pt-6 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  {answers.filter((a) => a.correctAnswer !== '').length} of {answers.length}{' '}
                  questions answered
                </p>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Answer Key'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
