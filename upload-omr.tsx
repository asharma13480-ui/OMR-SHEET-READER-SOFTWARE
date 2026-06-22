'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Upload,
  ClipboardPaste,
  Save,
  RotateCcw,
  UserPlus,
  FileText,
  ScanLine,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Trash2,
  Settings2,
  Loader2,
  ImagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  openOMRTemplate,
  parseOMRCSV,
  OMRResult,
  ParsedCSVRow,
  type OMRConfig,
  DEFAULT_CONFIG,
} from '@/lib/omr-engine';

// ─── Types ─────────────────────────────────────────────────────────

interface Exam {
  id: string;
  name: string;
  subject: string | null;
  totalQuestions: number;
  optionsPerQ: number;
}

interface OMRSheet {
  id: string;
  studentName: string;
  rollNumber: string;
  className: string | null;
  section: string | null;
  batch: string | null;
  answers: string;
  status: string;
  createdAt: string;
}

interface StudentForm {
  studentName: string;
  rollNumber: string;
  className: string;
  section: string;
  batch: string;
}

interface DetectedSheet {
  fileName: string;
  fileSize: number;
  thumbnail: string;
  result: OMRResult;
  studentName: string;
  mobileNumber: string;
  className: string;
  section: string;
  batch: string;
  confidence: number;
  selected: boolean;
  error?: string;
  scanStatus: 'success' | 'error' | 'pending';
}

interface CSVPreviewRow {
  rollNumber: string;
  studentName: string;
  className: string;
  section: string;
  batch: string;
  answers: string[];
  selected: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];
const emptyStudentForm: StudentForm = {
  studentName: '',
  rollNumber: '',
  className: '',
  section: '',
  batch: '',
};

// ─── Component ──────────────────────────────────────────────────────

export function UploadOMRPage() {
  const { setCurrentPage } = useAppStore();

  // ── Common State ──
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [sheets, setSheets] = useState<OMRSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('manual');

  // ── Scan Tab State ──
  const [scanFiles, setScanFiles] = useState<File[]>([]);
  const [detectedSheets, setDetectedSheets] = useState<DetectedSheet[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [scanStatusText, setScanStatusText] = useState('');
  const [showScanConfig, setShowScanConfig] = useState(false);
  const [omrConfig, setOmrConfig] = useState<OMRConfig>({ ...DEFAULT_CONFIG });
  const [editingSheetIdx, setEditingSheetIdx] = useState<number | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ── Manual Tab State ──
  const [studentForm, setStudentForm] = useState<StudentForm>({ ...emptyStudentForm });
  const [answerGrid, setAnswerGrid] = useState<string[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [manualSubTab, setManualSubTab] = useState('individual');

  // ── CSV Tab State ──
  const [csvText, setCsvText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<CSVPreviewRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvParsed, setCsvParsed] = useState(false);
  const [csvSaving, setCsvSaving] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Data Fetching ──────────────────────────────────────────────

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/exam');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setExams(data.exams || []);
    } catch (err) {
      console.error('fetchExams error:', err);
      setExams([]);
      toast.error('Failed to load exams. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSheets = async (examId: string) => {
    try {
      const res = await fetch(`/api/omr?examId=${examId}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setSheets(data.sheets || []);
    } catch (err) {
      console.error('fetchSheets error:', err);
      setSheets([]);
    }
  };

  // Fetch exams on mount — component remounts when navigating back so this refreshes automatically
  useEffect(() => {
    fetchExams();
  }, []);

  const handleExamSelect = (examId: string) => {
    setSelectedExamId(examId);
    setSelectedExam(exams.find((e) => e.id === examId) || null);
    fetchSheets(examId);

    const exam = exams.find((e) => e.id === examId);
    if (exam) {
      setAnswerGrid(Array(exam.totalQuestions).fill(''));
      setBulkText('');
      setOmrConfig((prev) => ({
        ...prev,
        totalQuestions: exam.totalQuestions,
        optionsPerQ: exam.optionsPerQ,
      }));
    }
  };

  // ─── Manual Entry Handlers ──────────────────────────────────────

  const setGridAnswer = (index: number, answer: string) => {
    setAnswerGrid((prev) => {
      const newGrid = [...prev];
      newGrid[index] = newGrid[index] === answer ? '' : answer;
      return newGrid;
    });
  };

  const handleBulkFill = () => {
    if (!selectedExam) return;
    const text = bulkText.trim().toUpperCase();
    if (!text) {
      toast.error('Please enter answer string');
      return;
    }

    const newGrid = [...answerGrid];
    for (let i = 0; i < text.length && i < selectedExam.totalQuestions; i++) {
      const char = text[i];
      if (OPTION_LABELS.includes(char)) {
        newGrid[i] = char;
      }
    }
    setAnswerGrid(newGrid);
    setManualSubTab('individual');
    toast.success('Answers filled from bulk string');
  };

  const handleSave = async () => {
    if (!selectedExamId) {
      toast.error('Please select an exam');
      return;
    }
    if (!studentForm.studentName.trim()) {
      toast.error('Student name is required');
      return;
    }
    if (!studentForm.rollNumber.trim()) {
      toast.error('Roll number is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/omr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          ...studentForm,
          answers: answerGrid,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to save OMR sheet' }));
        throw new Error(errData.error || 'Failed to save OMR sheet');
      }

      const data = await res.json();
      toast.success(`OMR sheet saved for ${studentForm.studentName}`);
      resetForm();
      fetchSheets(selectedExamId);

      // Auto-trigger results processing so sheet doesn't stay 'pending'
      try {
        const processRes = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId: selectedExamId }),
        });
        if (processRes.ok) {
          const processData = await processRes.json();
          toast.success(processData.message || 'Results processed automatically!');
        }
      } catch {
        // Silently continue — user can process from check-omr page
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save OMR sheet');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStudentForm({ ...emptyStudentForm });
    if (selectedExam) {
      setAnswerGrid(Array(selectedExam.totalQuestions).fill(''));
      setBulkText('');
    }
  };

  // ─── Scan Tab Handlers ──────────────────────────────────────────

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter((f) =>
      /\.(jpe?g|png|webp|bmp|gif|tiff?)$/i.test(f.name)
    );
    if (newFiles.length === 0) {
      toast.error('No supported image files found. Use JPG, PNG, or WEBP.');
      return;
    }
    setScanFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} image file(s) added`);
  };

  const handleFileSelectRef = useRef(handleFileSelect);
  handleFileSelectRef.current = handleFileSelect;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      handleFileSelectRef.current(files);
    },
    []
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeScanFile = (index: number) => {
    setScanFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearScanFiles = () => {
    setScanFiles([]);
    setDetectedSheets([]);
    setScanProgress({ current: 0, total: 0 });
    setScanStatusText('');
  };

  const BATCH_SIZE = 5;

  const processAllSheets = async () => {
    if (!selectedExam) {
      toast.error('Please select an exam first');
      return;
    }
    if (scanFiles.length === 0) {
      toast.error('No files to process');
      return;
    }

    setScanning(true);
    setDetectedSheets([]);
    const total = scanFiles.length;
    setScanProgress({ current: 0, total });
    setScanStatusText(`Scanning 0 of ${total}...`);

    const allDetected: DetectedSheet[] = [];
    let processedCount = 0;

    try {
      // Process in batches of BATCH_SIZE
      for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, total);
        const batchFiles = scanFiles.slice(batchStart, batchEnd);
        const batchLabel =
          total <= BATCH_SIZE
            ? `Scanning ${batchStart + 1}–${batchEnd} of ${total}...`
            : `Scanning batch ${Math.floor(batchStart / BATCH_SIZE) + 1} of ${Math.ceil(total / BATCH_SIZE)} (${batchStart + 1}–${batchEnd} of ${total})...`;
        setScanStatusText(batchLabel);

        // Build FormData for this batch
        const formData = new FormData();
        formData.append('examId', selectedExamId);
        formData.append('totalQuestions', String(selectedExam.totalQuestions));
        formData.append('optionsPerQ', String(selectedExam.optionsPerQ));
        for (const file of batchFiles) {
          formData.append('images', file, file.name);
        }

        const res = await fetch('/api/omr/scan', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(errData.error || `Batch scan failed (HTTP ${res.status})`);
        }

        const data = await res.json();

        // Map API results to DetectedSheet
        for (const r of data.results) {
          const answeredCount = r.success
            ? r.answers.filter((a: string) => a !== '').length
            : 0;
          const conf = r.confidence ?? (r.success
            ? answeredCount / Math.max(r.totalQuestions, 1)
            : 0);

          allDetected.push({
            fileName: r.fileName,
            fileSize: r.fileSize,
            thumbnail: '',
            result: {
              rollNumber: r.rollNumber || '',
              answers: r.answers || [],
              confidence: conf,
              perQuestionConfidence: (r.answers || []).map((a: string) =>
                a !== '' ? conf : 0
              ),
            },
            studentName: r.studentName || '',
            mobileNumber: r.mobileNumber || '',
            className: r.className || '',
            section: r.section || '',
            batch: r.batch || '',
            confidence: conf,
            selected: r.success,
            error: r.error,
            scanStatus: r.success ? 'success' : 'error',
          });
        }

        processedCount += batchFiles.length;
        setScanProgress({ current: processedCount, total });
        setDetectedSheets([...allDetected]);

        // Generate thumbnails for this batch
        for (const sheet of allDetected.slice(batchStart)) {
          if (!sheet.thumbnail) {
            const file = scanFiles.find((f) => f.name === sheet.fileName);
            if (file) {
              try {
                sheet.thumbnail = await generateThumbnail(file);
              } catch {
                // thumbnail generation failed, skip
              }
            }
          }
        }
        setDetectedSheets([...allDetected]);
      }

      const successCount = allDetected.filter((s) => s.scanStatus === 'success').length;
      const failCount = allDetected.filter((s) => s.scanStatus === 'error').length;

      if (failCount === 0) {
        toast.success(`All ${successCount} sheets scanned successfully!`);
      } else {
        toast.warning(
          `Scanned ${successCount} sheets successfully, ${failCount} failed. Review results below.`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to scan sheets');

      // Still show whatever we have
      if (allDetected.length > 0) {
        setDetectedSheets(allDetected);
      }
    } finally {
      setScanning(false);
      setScanStatusText('');
    }
  };

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 120 / Math.max(img.width, img.height);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Thumbnail failed'));
      };
      img.src = url;
    });
  };

  const updateDetectedSheet = (idx: number, data: Partial<DetectedSheet>) => {
    setDetectedSheets((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...data } : s))
    );
  };

  const toggleDetectedSelection = (idx: number) => {
    setDetectedSheets((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, selected: !s.selected } : s))
    );
  };

  const selectAllDetected = (selected: boolean) => {
    setDetectedSheets((prev) => prev.map((s) => ({ ...s, selected })));
  };

  const saveAllDetected = async () => {
    if (!selectedExamId) {
      toast.error('Please select an exam');
      return;
    }

    const sheetsToSave = detectedSheets.filter((s) => s.selected);
    if (sheetsToSave.length === 0) {
      toast.error('No sheets selected');
      return;
    }

    // Validate that all selected sheets have at least a roll number or student name
    const invalidSheets = sheetsToSave.filter(
      (s) => !s.studentName.trim() && !s.result.rollNumber.trim()
    );
    if (invalidSheets.length > 0) {
      toast.error(
        `${invalidSheets.length} sheet(s) missing both name and roll number. Please fill in at least one.`
      );
      return;
    }

    setSavingBulk(true);
    try {
      const payload = sheetsToSave.map((s) => ({
        studentName: s.studentName.trim() || `Roll ${s.result.rollNumber || 'Unknown'}`,
        rollNumber: s.result.rollNumber.trim() || s.studentName.trim().substring(0, 10),
        className: s.className.trim() || null,
        section: s.section.trim() || null,
        batch: s.batch.trim() || null,
        answers: s.result.answers,
      }));

      const res = await fetch('/api/omr/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: selectedExamId, sheets: payload }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to save sheets' }));
        throw new Error(errData.error || 'Failed to save sheets');
      }

      const data = await res.json();
      toast.success(`${data.count} OMR sheets saved successfully!`);

      // Auto-trigger results processing so sheets don't stay 'pending'
      try {
        const processRes = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId: selectedExamId }),
        });
        if (processRes.ok) {
          const processData = await processRes.json();
          toast.success(processData.message || 'Results processed automatically!');
        } else {
          toast.info('Sheets saved. Process results from Check OMR page.');
        }
      } catch {
        toast.info('Sheets saved. Process results from Check OMR page.');
      }

      fetchSheets(selectedExamId);

      // Navigate to check-omr page
      setCurrentPage('check-omr');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save sheets');
    } finally {
      setSavingBulk(false);
    }
  };

  // ─── CSV Tab Handlers ───────────────────────────────────────────

  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Please upload a CSV or TXT file');
      return;
    }
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      toast.success('CSV file loaded');
    };
    reader.onerror = () => {
      toast.error('Failed to read the file');
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const parseCSV = () => {
    if (!csvText.trim()) {
      toast.error('No CSV data to parse');
      return;
    }
    try {
      const result = parseOMRCSV(csvText);
      setCsvErrors(result.errors);
      setCsvRows(
        result.rows.map((r) => ({ ...r, selected: true }))
      );
      setCsvParsed(true);
      if (result.rows.length === 0) {
        toast.error('No valid data rows found. Check your CSV format.');
        return;
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} row(s) had issues — see details below`);
      }
      toast.success(`Parsed ${result.rows.length} rows (${result.totalQuestions} questions detected)`);
    } catch (err) {
      toast.error('Failed to parse CSV: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const updateCSVRow = (idx: number, data: Partial<CSVPreviewRow>) => {
    setCsvRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...data } : r)));
  };

  const toggleCSVSelection = (idx: number) => {
    setCsvRows((prev) => prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)));
  };

  const selectAllCSV = (selected: boolean) => {
    setCsvRows((prev) => prev.map((r) => ({ ...r, selected })));
  };

  const saveAllCSV = async () => {
    if (!selectedExamId) {
      toast.error('Please select an exam');
      return;
    }

    const rowsToSave = csvRows.filter((r) => r.selected);
    if (rowsToSave.length === 0) {
      toast.error('No rows selected');
      return;
    }

    // Validate that all selected rows have name and roll number
    const invalidRows = rowsToSave.filter((r) => !r.rollNumber.trim() || !r.studentName.trim());
    if (invalidRows.length > 0) {
      toast.error(`${invalidRows.length} row(s) missing name or roll number`);
      return;
    }

    setCsvSaving(true);
    try {
      const payload = rowsToSave.map((r) => ({
        studentName: r.studentName.trim(),
        rollNumber: r.rollNumber.trim(),
        className: r.className || null,
        section: r.section || null,
        batch: r.batch || null,
        answers: r.answers,
      }));

      const res = await fetch('/api/omr/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: selectedExamId, sheets: payload }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to import CSV' }));
        throw new Error(errData.error || 'Failed to import CSV');
      }

      const data = await res.json();
      toast.success(`${data.count} students imported from CSV!`);

      // Auto-trigger results processing
      try {
        const processRes = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId: selectedExamId }),
        });
        if (processRes.ok) {
          const processData = await processRes.json();
          toast.success(processData.message || 'Results processed automatically!');
        }
      } catch {
        // Silently continue — user can process from check-omr page
      }

      fetchSheets(selectedExamId);
      setCurrentPage('check-omr');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setCsvSaving(false);
    }
  };

  // ─── Template Download ───────────────────────────────────────────

  const handleDownloadTemplate = () => {
    if (!selectedExam) {
      toast.error('Please select an exam first');
      return;
    }
    try {
      openOMRTemplate({
        examName: `${selectedExam.name}${selectedExam.subject ? ` — ${selectedExam.subject}` : ''}`,
        totalQuestions: selectedExam.totalQuestions,
        optionsPerQ: selectedExam.optionsPerQ,
        rollDigits: omrConfig.rollDigits,
        bubbleColumns: omrConfig.bubbleColumns,
        bubbleRows: omrConfig.bubbleRows,
        orgName: 'OMR Sheet Reader',
      });
      toast.success('OMR template opened for printing');
    } catch (err) {
      toast.error('Could not open template window. Please allow pop-ups.');
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30">Pending</Badge>;
      case 'processed':
        return <Badge className="bg-primary/15 text-primary border-primary/30">Processed</Badge>;
      case 'error':
        return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.7) return 'text-green-600';
    if (conf >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (conf: number) => {
    if (conf >= 0.7) return <CheckCircle2 className="h-3.5 w-3.5" />;
    if (conf >= 0.4) return <AlertTriangle className="h-3.5 w-3.5" />;
    return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Upload OMR Sheets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Scan, enter manually, or import CSV — all in one place
          </p>
        </div>
        {selectedExam && (
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/5 self-start"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            Download OMR Template
          </Button>
        )}
      </div>

      {/* Exam Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Select Exam
            {exams.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 w-7 p-0"
                onClick={() => fetchExams()}
                title="Refresh exam list"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardTitle>
          <CardDescription>Choose the exam for OMR data entry.</CardDescription>
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
        </CardContent>
      </Card>

      {/* Main Tabs — only show after exam selected */}
      {selectedExam && (
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="scan" className="text-xs sm:text-sm">
              <ScanLine className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Scan OMR
            </TabsTrigger>
            <TabsTrigger value="manual" className="text-xs sm:text-sm">
              <UserPlus className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="csv" className="text-xs sm:text-sm">
              <FileSpreadsheet className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              CSV Import
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* TAB 1: SCAN OMR SHEETS                                 */}
          {/* ═══════════════════════════════════════════════════════ */}
          <TabsContent value="scan" className="space-y-4">
            {/* Detection Config Toggle */}
            <Card>
              <CardContent className="pt-6">
                <button
                  onClick={() => setShowScanConfig(!showScanConfig)}
                  className="flex items-center gap-2 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings2 className="h-4 w-4" />
                  Detection Settings
                  {showScanConfig ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </button>
                {showScanConfig && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-xs">Bubble Columns: {omrConfig.bubbleColumns}</Label>
                      <Slider
                        value={[omrConfig.bubbleColumns]}
                        min={2}
                        max={10}
                        step={1}
                        onValueChange={([v]) =>
                          setOmrConfig((prev) => ({ ...prev, bubbleColumns: v }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Bubble Rows: {omrConfig.bubbleRows}</Label>
                      <Slider
                        value={[omrConfig.bubbleRows]}
                        min={5}
                        max={50}
                        step={1}
                        onValueChange={([v]) =>
                          setOmrConfig((prev) => ({ ...prev, bubbleRows: v }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Roll Digits: {omrConfig.rollDigits}</Label>
                      <Slider
                        value={[omrConfig.rollDigits]}
                        min={0}
                        max={10}
                        step={1}
                        onValueChange={([v]) =>
                          setOmrConfig((prev) => ({ ...prev, rollDigits: v }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Threshold: {omrConfig.threshold}</Label>
                      <Slider
                        value={[omrConfig.threshold]}
                        min={50}
                        max={200}
                        step={5}
                        onValueChange={([v]) =>
                          setOmrConfig((prev) => ({ ...prev, threshold: v }))
                        }
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Lower = more sensitive to light marks
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Drop Zone */}
            <Card>
              <CardContent className="pt-6">
                <div
                  ref={dropZoneRef}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                    scanning
                      ? 'border-muted bg-muted/20 cursor-not-allowed'
                      : 'border-primary/30 hover:border-primary/60 hover:bg-primary/5'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => !scanning && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFileSelect(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  {scanning ? (
                    <div className="space-y-3">
                      <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
                      <p className="text-sm font-medium">
                        {scanStatusText || `Scanning ${scanProgress.current} of ${scanProgress.total}...`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        AI is analyzing each OMR sheet for answers
                      </p>
                      <Progress
                        value={scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}
                        className="max-w-xs mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ImagePlus className="h-10 w-10 text-primary/50 mx-auto" />
                      <div>
                        <p className="text-sm font-medium">
                          Drop OMR sheet images here or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports JPG, PNG, WEBP — AI-powered detection (up to 500 files)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* File List */}
                {scanFiles.length > 0 && !scanning && (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline" className="font-normal">
                        {scanFiles.length} file(s) selected
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs"
                        >
                          Add More
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearScanFiles}
                          className="text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Clear All
                        </Button>
                      </div>
                    </div>

                    <ScrollArea className="max-h-48">
                      <div className="flex flex-wrap gap-2 pr-4">
                        {scanFiles.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-xs"
                          >
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <span className="text-muted-foreground">
                              {formatFileSize(file.size)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeScanFile(idx);
                              }}
                              className="text-muted-foreground hover:text-destructive ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <Button
                      onClick={processAllSheets}
                      className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                    >
                      <ScanLine className="h-4 w-4 mr-2" />
                      AI Scan {scanFiles.length} Sheet{scanFiles.length !== 1 ? 's' : ''}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detection Results */}
            {detectedSheets.length > 0 && (
              <>
                {/* Summary banner */}
                {detectedSheets.some((s) => s.scanStatus === 'error') && (
                  <Card className="border-yellow-500/40">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                        <span>
                          <strong>{detectedSheets.filter((s) => s.scanStatus === 'error').length}</strong>{' '}
                          of {detectedSheets.length} sheets had scanning errors. You can deselect or edit them below.
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-lg">
                        Scan Results ({detectedSheets.filter((s) => s.scanStatus === 'success').length} detected,{' '}
                        {detectedSheets.filter((s) => s.scanStatus === 'error').length} failed)
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectAllDetected(true)}
                          className="text-xs"
                        >
                          Select All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectAllDetected(false)}
                          className="text-xs"
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                    <ScrollArea className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 font-semibold">#</TableHead>
                            <TableHead className="font-semibold">File</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Roll No</TableHead>
                            <TableHead className="font-semibold hidden sm:table-cell">Name</TableHead>
                            <TableHead className="font-semibold text-center">Answered</TableHead>
                            <TableHead className="font-semibold text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detectedSheets.map((sheet, idx) => {
                            const answered = sheet.result.answers.filter((a) => a !== '').length;
                            const total = sheet.result.answers.length;
                            const isError = sheet.scanStatus === 'error';
                            return (
                              <TableRow
                                key={idx}
                                className={sheet.selected ? '' : 'opacity-40'}
                              >
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={sheet.selected}
                                    onChange={() => toggleDetectedSelection(idx)}
                                    className="rounded accent-primary"
                                    disabled={isError}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {sheet.thumbnail && (
                                      <img
                                        src={sheet.thumbnail}
                                        alt=""
                                        className="w-8 h-10 rounded object-cover border"
                                      />
                                    )}
                                    <div>
                                      <span className="text-xs font-medium block max-w-[120px] truncate">
                                        {sheet.fileName}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatFileSize(sheet.fileSize)}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {isError ? (
                                    <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
                                      <X className="h-2.5 w-2.5 mr-0.5" />
                                      Failed
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-green-500/15 text-green-700 border-green-500/30 text-[10px]">
                                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                      Detected
                                    </Badge>
                                  )}
                                  {isError && sheet.error && (
                                    <p className="text-[10px] text-destructive mt-0.5 max-w-[140px] truncate" title={sheet.error}>
                                      {sheet.error}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isError ? (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  ) : (
                                    <Input
                                      value={sheet.result.rollNumber}
                                      onChange={(e) =>
                                        updateDetectedSheet(idx, {
                                          result: { ...sheet.result, rollNumber: e.target.value },
                                        })
                                      }
                                      className="h-8 w-24 text-xs font-mono"
                                      placeholder="Roll No"
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  {isError ? (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  ) : (
                                    <Input
                                      value={sheet.studentName}
                                      onChange={(e) =>
                                        updateDetectedSheet(idx, { studentName: e.target.value })
                                      }
                                      className="h-8 w-32 text-xs"
                                      placeholder="Name"
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="text-center text-xs">
                                  {isError ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <Badge variant="outline" className="font-mono">
                                      {answered}/{total}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {!isError && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => setEditingSheetIdx(idx)}
                                      title="View/Edit answers"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    </div>
                  </CardContent>
                  <CardContent className="relative z-10 pt-5 pb-5 border-t">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                      <Button
                        onClick={saveAllDetected}
                        disabled={savingBulk}
                        className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                      >
                        {savingBulk ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save {detectedSheets.filter((s) => s.selected).length} Sheets
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Review detected names, roll numbers, and answers before saving. Only selected sheets will be saved.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Edit Sheet Dialog */}
                <Dialog
                  open={editingSheetIdx !== null}
                  onOpenChange={() => setEditingSheetIdx(null)}
                >
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Detected Answers</DialogTitle>
                      <DialogDescription>
                        Review and correct detected answers for this sheet
                      </DialogDescription>
                    </DialogHeader>
                    {editingSheetIdx !== null && detectedSheets[editingSheetIdx] && (
                      <EditSheetDialog
                        sheet={detectedSheets[editingSheetIdx]}
                        optionsPerQ={selectedExam.optionsPerQ}
                        onUpdate={(data) => updateDetectedSheet(editingSheetIdx, data)}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* TAB 2: MANUAL ENTRY                                     */}
          {/* ═══════════════════════════════════════════════════════ */}
          <TabsContent value="manual" className="space-y-4">
            {/* Student Info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="m-studentName">Student Name *</Label>
                    <Input
                      id="m-studentName"
                      placeholder="Full Name"
                      value={studentForm.studentName}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, studentName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="m-rollNumber">Roll Number *</Label>
                    <Input
                      id="m-rollNumber"
                      placeholder="e.g., 2025001"
                      value={studentForm.rollNumber}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, rollNumber: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="m-className">Class</Label>
                    <Input
                      id="m-className"
                      placeholder="e.g., 12th"
                      value={studentForm.className}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, className: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="m-section">Section</Label>
                    <Input
                      id="m-section"
                      placeholder="e.g., A"
                      value={studentForm.section}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, section: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="m-batch">Batch</Label>
                    <Input
                      id="m-batch"
                      placeholder="e.g., Morning"
                      value={studentForm.batch}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, batch: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Answer Entry */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Answer Entry
                  </span>
                  <Badge variant="outline" className="font-normal">
                    {answerGrid.filter((a) => a !== '').length} / {selectedExam.totalQuestions}{' '}
                    answered
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={manualSubTab} onValueChange={setManualSubTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="individual">Individual Entry</TabsTrigger>
                    <TabsTrigger value="bulk">Bulk Entry</TabsTrigger>
                  </TabsList>

                  <TabsContent value="individual">
                    <ScrollArea className="max-h-[500px]">
                      <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-1.5 pr-4">
                        {answerGrid.map((answer, idx) => (
                          <div key={idx} className="text-center">
                            <span className="block text-[10px] text-muted-foreground mb-0.5 font-mono">
                              {idx + 1}
                            </span>
                            {OPTION_LABELS.slice(0, selectedExam.optionsPerQ).map((opt) => (
                              <button
                                key={opt}
                                className={`w-full h-6 text-[10px] font-semibold rounded transition-all ${
                                  answer === opt
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50 hover:bg-primary/10 text-muted-foreground'
                                }`}
                                onClick={() => setGridAnswer(idx, opt)}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="bulk">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="m-bulkAnswers">
                          Paste all answers as a continuous string
                        </Label>
                        <Textarea
                          id="m-bulkAnswers"
                          placeholder="ABCDABCDABCD..."
                          className="font-mono min-h-[100px]"
                          value={bulkText}
                          onChange={(e) => setBulkText(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Each character = one question answer. Total: {selectedExam.totalQuestions}{' '}
                          questions
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

                <div className="relative z-10 mt-8 pt-6 border-t flex flex-wrap gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save & Add Next'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Form
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* TAB 3: CSV IMPORT                                       */}
          {/* ═══════════════════════════════════════════════════════ */}
          <TabsContent value="csv" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Bulk CSV Import
                </CardTitle>
                <CardDescription>
                  Import student answers from a CSV file or paste CSV text
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* CSV Drop Zone */}
                <div
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors"
                  onClick={() => csvFileInputRef.current?.click()}
                >
                  <input
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => handleCSVFileSelect(e)}
                  />
                  <FileSpreadsheet className="h-8 w-8 text-primary/50 mx-auto mb-2" />
                  <p className="text-sm font-medium">Upload CSV file</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click to browse or see expected format below
                  </p>
                </div>

                {csvFile && (
                  <Badge variant="outline" className="text-xs">
                    Loaded: {csvFile.name} ({formatFileSize(csvFile.size)})
                  </Badge>
                )}

                {/* Paste CSV */}
                <div className="space-y-2">
                  <Label>Or paste CSV text directly:</Label>
                  <Textarea
                    placeholder={`RollNo,Name,Class,Section,Batch,Q1,Q2,Q3,Q4,Q5\n2025001,Rahul Sharma,12-A,A,Morning,A,B,C,D,A\n2025002,Priya Patel,12-A,A,Morning,B,C,A,D,B`}
                    className="font-mono min-h-[120px] text-xs"
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                  />
                </div>

                <Button
                  onClick={parseCSV}
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/5"
                >
                  <ClipboardPaste className="h-4 w-4 mr-2" />
                  Parse CSV
                </Button>

                {/* Format Help */}
                <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Expected CSV Format:</p>
                  <code className="block font-mono whitespace-pre">
                    RollNo,Name,Class,Section,Batch,Q1,Q2,Q3,...Q100
                  </code>
                  <ul className="mt-2 list-disc list-inside space-y-0.5">
                    <li>Column headers are auto-detected (case-insensitive)</li>
                    <li>Answer columns: Q1, Q2, ... (or just 1, 2, ...)</li>
                    <li>Answer values: A, B, C, D, E (or blank for unanswered)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* CSV Errors */}
            {csvErrors.length > 0 && (
              <Card className="border-yellow-500/40">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-yellow-700 mb-2">
                    ⚠ {csvErrors.length} Issue(s) Found
                  </p>
                  <ScrollArea className="max-h-32">
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {csvErrors.map((err, idx) => (
                        <li key={idx}>• {err}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* CSV Preview */}
            {csvParsed && csvRows.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-lg">
                      Import Preview ({csvRows.length} students)
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectAllCSV(true)}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectAllCSV(false)}
                        className="text-xs"
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                  <ScrollArea className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 font-semibold">#</TableHead>
                          <TableHead className="font-semibold">Roll No</TableHead>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold hidden sm:table-cell">Class</TableHead>
                          <TableHead className="font-semibold hidden md:table-cell">Section</TableHead>
                          <TableHead className="font-semibold text-center">Answered</TableHead>
                          <TableHead className="font-semibold text-center">Answers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvRows.map((row, idx) => {
                          const answered = row.answers.filter((a) => a !== '').length;
                          const preview = row.answers.slice(0, 10).join('');
                          const suffix = row.answers.length > 10 ? '...' : '';
                          return (
                            <TableRow
                              key={idx}
                              className={row.selected ? '' : 'opacity-40'}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={row.selected}
                                  onChange={() => toggleCSVSelection(idx)}
                                  className="rounded accent-primary"
                                />
                              </TableCell>
                              <TableCell className="font-mono font-medium text-sm">
                                {row.rollNumber}
                              </TableCell>
                              <TableCell className="text-sm">{row.studentName}</TableCell>
                              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                                {row.className || '—'}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                {row.section || '—'}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs font-mono">
                                  {answered}/{row.answers.length}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-mono text-xs">
                                  {preview}
                                  {suffix && (
                                    <span className="text-muted-foreground">{suffix}</span>
                                  )}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  </div>
                </CardContent>
                <CardContent className="relative z-10 pt-5 pb-5 border-t">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <Button
                      onClick={saveAllCSV}
                      disabled={csvSaving}
                      className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                    >
                      {csvSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Import {csvRows.filter((r) => r.selected).length} Students
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Deselect rows to exclude from import
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Uploaded Sheets Table (visible in all tabs) */}
      {selectedExam && sheets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Uploaded OMR Sheets ({sheets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Roll No</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Class</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Section</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Batch</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheets.map((sheet, idx) => (
                    <TableRow key={sheet.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono font-medium">{sheet.rollNumber}</TableCell>
                      <TableCell>{sheet.studentName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {sheet.className || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {sheet.section || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {sheet.batch || '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(sheet.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Edit Sheet Dialog (Sub-component) ────────────────────────────

function EditSheetDialog({
  sheet,
  optionsPerQ,
  onUpdate,
}: {
  sheet: DetectedSheet;
  optionsPerQ: number;
  onUpdate: (data: Partial<DetectedSheet>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Student Info for this sheet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Student Name</Label>
          <Input
            value={sheet.studentName}
            onChange={(e) => onUpdate({ studentName: e.target.value })}
            placeholder="Enter name"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Roll Number</Label>
          <Input
            value={sheet.result.rollNumber}
            onChange={(e) =>
              onUpdate({
                result: { ...sheet.result, rollNumber: e.target.value },
              })
            }
            placeholder="Enter roll number"
            className="h-9 text-sm font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Mobile Number</Label>
          <Input
            value={sheet.mobileNumber}
            onChange={(e) => onUpdate({ mobileNumber: e.target.value })}
            placeholder="Enter mobile number"
            className="h-9 text-sm font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Class</Label>
          <Input
            value={sheet.className}
            onChange={(e) => onUpdate({ className: e.target.value })}
            placeholder="Enter class"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Section</Label>
          <Input
            value={sheet.section}
            onChange={(e) => onUpdate({ section: e.target.value })}
            placeholder="Enter section"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Batch</Label>
          <Input
            value={sheet.batch}
            onChange={(e) => onUpdate({ batch: e.target.value })}
            placeholder="Enter batch"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Answers Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            Answers ({sheet.result.answers.filter((a) => a !== '').length} /{' '}
            {sheet.result.answers.length})
          </Label>
          <span className="text-xs text-muted-foreground">
            Confidence: {(sheet.result.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <ScrollArea className="max-h-[400px]">
          <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-1.5 pr-4 py-2">
            {sheet.result.answers.map((answer, idx) => (
              <div key={idx} className="text-center">
                <span className="block text-[10px] text-muted-foreground mb-0.5 font-mono">
                  {idx + 1}
                </span>
                {OPTION_LABELS.slice(0, optionsPerQ).map((opt) => (
                  <button
                    key={opt}
                    className={`w-full h-6 text-[10px] font-semibold rounded transition-all ${
                      answer === opt
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 hover:bg-primary/10 text-muted-foreground'
                    }`}
                    onClick={() => {
                      const newAnswers = [...sheet.result.answers];
                      newAnswers[idx] = newAnswers[idx] === opt ? '' : opt;
                      onUpdate({
                        result: { ...sheet.result, answers: newAnswers },
                      });
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
