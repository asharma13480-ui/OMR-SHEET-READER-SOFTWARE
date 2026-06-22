'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit3, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  subject: string | null;
  date: string | null;
  duration: string | null;
  totalQuestions: number;
  totalMarks: number;
  passingPercent: number;
  negativeMarking: number;
  optionsPerQ: number;
  status: string;
  createdAt: string;
}

interface ExamForm {
  name: string;
  subject: string;
  date: string;
  duration: string;
  totalQuestions: number;
  totalMarks: number;
  passingPercent: number;
  negativeMarking: number;
  optionsPerQ: number;
}

const defaultForm: ExamForm = {
  name: '',
  subject: '',
  date: '',
  duration: '60',
  totalQuestions: 100,
  totalMarks: 100,
  passingPercent: 33,
  negativeMarking: 0,
  optionsPerQ: 4,
};

export function CreateExamPage() {
  const { setCurrentPage } = useAppStore();
  const [form, setForm] = useState<ExamForm>({ ...defaultForm });
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Exam name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create exam');
      }

      toast.success('Exam created successfully!');
      setForm({ ...defaultForm });
      fetchExams();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/exam', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Exam deleted');
      fetchExams();
    } catch {
      toast.error('Failed to delete exam');
    }
  };

  const handleEdit = (exam: Exam) => {
    setEditingId(exam.id);
    setForm({
      name: exam.name,
      subject: exam.subject || '',
      date: exam.date || '',
      duration: exam.duration || '60',
      totalQuestions: exam.totalQuestions,
      totalMarks: exam.totalMarks,
      passingPercent: exam.passingPercent,
      negativeMarking: exam.negativeMarking,
      optionsPerQ: exam.optionsPerQ,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/exam', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...form }),
      });

      if (!res.ok) throw new Error('Failed to update');
      toast.success('Exam updated');
      setEditingId(null);
      setForm({ ...defaultForm });
      fetchExams();
    } catch {
      toast.error('Failed to update exam');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
  };

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
      <div>
        <h1 className="text-2xl font-bold">Create Exam</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Set up a new examination with all required parameters
        </p>
      </div>

      {/* Exam Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            {editingId ? (
              <>
                <Edit3 className="h-5 w-5 text-primary" />
                Edit Exam
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-primary" />
                New Exam
              </>
            )}
          </CardTitle>
          <CardDescription>
            Fill in the exam details below. All fields marked with an asterisk are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Exam Name */}
            <div className="space-y-2">
              <Label htmlFor="examName">Exam Name *</Label>
              <Input
                id="examName"
                placeholder="e.g., NDA Mathematics 2025"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Mathematics"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="examDate">Date</Label>
              <Input
                id="examDate"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
            </div>

            {/* Total Questions */}
            <div className="space-y-2">
              <Label htmlFor="totalQuestions">Total Questions *</Label>
              <Input
                id="totalQuestions"
                type="number"
                min="1"
                value={form.totalQuestions}
                onChange={(e) =>
                  setForm({ ...form, totalQuestions: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            {/* Total Marks */}
            <div className="space-y-2">
              <Label htmlFor="totalMarks">Total Marks *</Label>
              <Input
                id="totalMarks"
                type="number"
                min="1"
                step="0.5"
                value={form.totalMarks}
                onChange={(e) =>
                  setForm({ ...form, totalMarks: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            {/* Passing Percentage */}
            <div className="space-y-2">
              <Label htmlFor="passingPercent">Passing Percentage (%)</Label>
              <Input
                id="passingPercent"
                type="number"
                min="0"
                max="100"
                value={form.passingPercent}
                onChange={(e) =>
                  setForm({ ...form, passingPercent: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            {/* Negative Marking */}
            <div className="space-y-2">
              <Label htmlFor="negativeMarking">Negative Marking (per question)</Label>
              <Input
                id="negativeMarking"
                type="number"
                min="0"
                step="0.25"
                value={form.negativeMarking}
                onChange={(e) =>
                  setForm({ ...form, negativeMarking: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            {/* Options Per Question */}
            <div className="space-y-2">
              <Label htmlFor="optionsPerQ">Options Per Question</Label>
              <Select
                value={String(form.optionsPerQ)}
                onValueChange={(val) =>
                  setForm({ ...form, optionsPerQ: parseInt(val) })
                }
              >
                <SelectTrigger id="optionsPerQ">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Options (True/False)</SelectItem>
                  <SelectItem value="4">4 Options (A, B, C, D)</SelectItem>
                  <SelectItem value="5">5 Options (A, B, C, D, E)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative z-10 flex flex-wrap gap-3 mt-8 pt-6 border-t">
            {editingId ? (
              <>
                <Button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Updating...' : 'Update Exam'}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                {saving ? 'Creating...' : 'Create Exam'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Exams Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Existing Exams</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No exams created yet. Create your first exam above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Subject</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Date</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Questions</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Marks</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {exam.subject || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {exam.date || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{exam.totalQuestions}</TableCell>
                      <TableCell className="hidden lg:table-cell">{exam.totalMarks}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {getStatusBadge(exam.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                            onClick={() => handleEdit(exam)}
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Exam</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{exam.name}&quot;? This will
                                  also delete all associated answer keys, OMR sheets, and results. This
                                  action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleDelete(exam.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
