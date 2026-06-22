'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  FileDown,
  Eye,
  Download,
  FileText,
  Users,
  Trophy,
  BookOpen,
  Loader2,
  Settings2,
  ImageIcon,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Interfaces                                                         */
/* ------------------------------------------------------------------ */

interface ExamDetail {
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
  _count: { answerKeys: number; omrSheets: number; results: number };
}

interface StudentResult {
  id: string;
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
  omrSheetId: string;
}

interface AnswerKeyEntry {
  questionNo: number;
  correctAnswer: string;
  marks: number;
}

interface OMRSheetData {
  id: string;
  studentName: string;
  rollNumber: string;
  className: string | null;
  section: string | null;
  batch: string | null;
  answers: string;
}

interface ExportOptions {
  includeCover: boolean;
  includeIndividualReports: boolean;
  highlightTopper: boolean;
  includeLogo: boolean;
  includeSummary: boolean;
  paperSize: 'A4' | 'LEGAL';
}

/* ------------------------------------------------------------------ */
/*  Helper: format date                                                */
/* ------------------------------------------------------------------ */

function formatDate(d: string | null): string {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getPerformanceLabel(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: 'Outstanding', color: '#008000' };
  if (pct >= 75) return { label: 'Excellent', color: '#2e8b57' };
  if (pct >= 60) return { label: 'Good', color: '#b0d020' };
  if (pct >= 40) return { label: 'Average', color: '#cc8800' };
  return { label: 'Needs Improvement', color: '#cc0000' };
}

/* ------------------------------------------------------------------ */
/*  HTML Generation                                                    */
/* ------------------------------------------------------------------ */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateCoverPage(exam: ExamDetail, orgName: string, logoUrl: string, generatedAt: string): string {
  return `
    <div class="cover-page">
      <div class="cover-border">
        <div class="cover-inner">
          <img src="${escapeHtml(logoUrl)}" class="cover-logo" alt="OMR Logo" />
          <div class="cover-org-name">${escapeHtml(orgName)}</div>
          <div class="cover-divider"></div>
          <div class="cover-heading">EXAMINATION RESULT REPORT</div>
          <div class="cover-exam-name">${escapeHtml(exam.name)}</div>
          <div class="cover-divider"></div>
          <table class="cover-details-table">
            <tr><td class="detail-label">Subject</td><td class="detail-value">${escapeHtml(exam.subject || 'N/A')}</td></tr>
            <tr><td class="detail-label">Date of Examination</td><td class="detail-value">${formatDate(exam.date)}</td></tr>
            <tr><td class="detail-label">Duration</td><td class="detail-value">${escapeHtml(exam.duration || 'N/A')}</td></tr>
            <tr><td class="detail-label">Total Questions</td><td class="detail-value">${exam.totalQuestions}</td></tr>
            <tr><td class="detail-label">Total Marks</td><td class="detail-value">${exam.totalMarks}</td></tr>
            <tr><td class="detail-label">Passing Percentage</td><td class="detail-value">${exam.passingPercent}%</td></tr>
            <tr><td class="detail-label">Negative Marking</td><td class="detail-value">${exam.negativeMarking > 0 ? exam.negativeMarking + ' per wrong answer' : 'None'}</td></tr>
          </table>
          <div class="cover-divider"></div>
          <div class="cover-generated">Report Generated: ${escapeHtml(generatedAt)}</div>
          <div class="cover-confidential">CONFIDENTIAL — For Authorised Personnel Only</div>
        </div>
      </div>
    </div>`;
}

function generateResultsPage(
  exam: ExamDetail,
  results: StudentResult[],
  summary: Record<string, number>,
  options: ExportOptions,
  logoUrl: string,
  orgName: string,
  generatedAt: string
): string {
  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;
  const topperId = options.highlightTopper && results.length > 0 ? results[0].omrSheetId : null;
  const totalStudents = results.length;
  const avgScore = totalStudents > 0 ? (results.reduce((s, r) => s + r.percentage, 0) / totalStudents).toFixed(2) : '0';
  const highestScore = totalStudents > 0 ? results[0].obtainedMarks : 0;
  const lowestScore = totalStudents > 0 ? results[results.length - 1].obtainedMarks : 0;
  const passRate = totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(1) : '0';

  const rows = results
    .map((r) => {
      const isTopper = r.omrSheetId === topperId;
      const rowClass = isTopper ? 'topper-row' : r.status === 'pass' ? 'pass-row' : 'fail-row';
      const rankDisplay = options.highlightTopper
        ? r.rank === 1
          ? '🥇 1'
          : r.rank === 2
            ? '🥈 2'
            : r.rank === 3
              ? '🥉 3'
              : String(r.rank)
        : String(r.rank);

      const statusHtml =
        r.status === 'pass'
          ? '<span class="status-pass">PASS</span>'
          : '<span class="status-fail">FAIL</span>';

      return `
        <tr class="${rowClass}">
          <td class="td-rank">${rankDisplay}</td>
          <td class="td-roll">${escapeHtml(r.rollNumber)}</td>
          <td class="td-name">${escapeHtml(r.studentName)}</td>
          <td class="td-marks">${r.obtainedMarks} / ${r.totalMarks}</td>
          <td class="td-num">${r.correctCount}</td>
          <td class="td-num">${r.incorrectCount}</td>
          <td class="td-num">${r.unansweredCount}</td>
          <td class="td-num">${r.negativeMarks > 0 ? '-' + r.negativeMarks : '0.00'}</td>
          <td class="td-num">${r.percentage.toFixed(2)}%</td>
          <td class="td-status">${statusHtml}</td>
        </tr>`;
    })
    .join('');

  return `
    <div class="results-section">
      <!-- Page Header -->
      <div class="page-header">
        <img src="${escapeHtml(logoUrl)}" class="header-logo" alt="Logo" />
        <div class="header-text">
          <div class="header-org">${escapeHtml(orgName)}</div>
          <div class="header-title">Examination Result Report</div>
          <div class="header-exam">${escapeHtml(exam.name)} ${exam.subject ? '— ' + escapeHtml(exam.subject) : ''}</div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-value">${totalStudents}</div>
          <div class="summary-label">Total Students</div>
        </div>
        <div class="summary-card card-pass">
          <div class="summary-value">${passCount}</div>
          <div class="summary-label">Passed</div>
        </div>
        <div class="summary-card card-fail">
          <div class="summary-value">${failCount}</div>
          <div class="summary-label">Failed</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${avgScore}%</div>
          <div class="summary-label">Average Score</div>
        </div>
        <div class="summary-card card-high">
          <div class="summary-value">${highestScore}</div>
          <div class="summary-label">Highest Score</div>
        </div>
        <div class="summary-card card-low">
          <div class="summary-value">${lowestScore}</div>
          <div class="summary-label">Lowest Score</div>
        </div>
      </div>

      <!-- Results Table -->
      <div class="table-container">
        <table class="results-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Roll No.</th>
              <th>Student Name</th>
              <th>Marks Obtained / Total</th>
              <th>Correct</th>
              <th>Wrong</th>
              <th>Unanswered</th>
              <th>Negative Marks</th>
              <th>Percentage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr class="footer-row">
              <td colspan="2"><strong>TOTAL STUDENTS: ${totalStudents}</strong></td>
              <td><strong>Pass: ${passCount} | Fail: ${failCount}</strong></td>
              <td colspan="2"><strong>Avg: ${avgScore}%</strong></td>
              <td colspan="2"><strong>Pass Rate: ${passRate}%</strong></td>
              <td colspan="2"><strong>Highest: ${highestScore} | Lowest: ${lowestScore}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

function generateStudentReportCard(
  student: StudentResult,
  omrSheet: OMRSheetData | undefined,
  answerKey: AnswerKeyEntry[],
  exam: ExamDetail,
  rank: number,
  totalStudents: number,
  logoUrl: string,
  orgName: string
): string {
  const perf = getPerformanceLabel(student.percentage);
  const studentAnswers: string[] = omrSheet ? JSON.parse(omrSheet.answers || '[]') : [];

  const answerRows = answerKey
    .map((ak) => {
      const studentAns = studentAnswers[ak.questionNo - 1] || '—';
      const isCorrect = studentAns.toUpperCase() === ak.correctAnswer.toUpperCase();
      const isUnanswered = !studentAns || studentAns === '';
      const markClass = isCorrect ? 'mark-correct' : isUnanswered ? 'mark-unanswered' : 'mark-wrong';
      const symbol = isCorrect ? '&#10003;' : isUnanswered ? '—' : '&#10007;';

      return `
        <tr>
          <td class="q-num">${ak.questionNo}</td>
          <td class="q-answer">${escapeHtml(ak.correctAnswer)}</td>
          <td class="q-answer ${markClass}">${escapeHtml(studentAns === '' ? '—' : studentAns)}</td>
          <td class="q-symbol ${markClass}">${symbol}</td>
          <td class="q-marks ${markClass}">${isCorrect ? '+' + ak.marks : isUnanswered ? '0' : '-' + exam.negativeMarking}</td>
        </tr>`;
    })
    .join('');

  return `
    <div class="student-card page-break">
      <div class="card-header">
        <img src="${escapeHtml(logoUrl)}" class="card-logo" alt="Logo" />
        <div>
          <div class="card-org">${escapeHtml(orgName)}</div>
          <div class="card-title">INDIVIDUAL STUDENT REPORT CARD</div>
        </div>
      </div>

      <div class="card-exam-info">
        <strong>Exam:</strong> ${escapeHtml(exam.name)}
        ${exam.subject ? ' | <strong>Subject:</strong> ' + escapeHtml(exam.subject) : ''}
        | <strong>Date:</strong> ${formatDate(exam.date)}
      </div>

      <div class="student-info-grid">
        <div class="si-row"><span class="si-label">Student Name</span><span class="si-value"><strong>${escapeHtml(student.studentName)}</strong></span></div>
        <div class="si-row"><span class="si-label">Roll Number</span><span class="si-value">${escapeHtml(student.rollNumber)}</span></div>
        <div class="si-row"><span class="si-label">Class / Batch</span><span class="si-value">${escapeHtml(omrSheet?.className || omrSheet?.batch || 'N/A')}</span></div>
        <div class="si-row"><span class="si-label">Section</span><span class="si-value">${escapeHtml(omrSheet?.section || 'N/A')}</span></div>
      </div>

      <div class="score-summary">
        <div class="score-box score-obtained">
          <div class="score-big">${student.obtainedMarks} <small>/ ${student.totalMarks}</small></div>
          <div>Marks Obtained</div>
        </div>
        <div class="score-box score-pct">
          <div class="score-big">${student.percentage.toFixed(2)}%</div>
          <div>Percentage</div>
        </div>
        <div class="score-box score-rank">
          <div class="score-big">${getOrdinal(student.rank)}</div>
          <div>Rank (of ${totalStudents})</div>
        </div>
        <div class="score-box ${student.status === 'pass' ? 'score-pass' : 'score-fail'}">
          <div class="score-big">${student.status.toUpperCase()}</div>
          <div>Status</div>
        </div>
      </div>

      <div class="detailed-stats">
        <span><strong>Correct:</strong> ${student.correctCount}</span>
        <span><strong>Wrong:</strong> ${student.incorrectCount}</span>
        <span><strong>Unanswered:</strong> ${student.unansweredCount}</span>
        <span><strong>Negative Marks:</strong> ${student.negativeMarks > 0 ? '-' + student.negativeMarks : '0.00'}</span>
      </div>

      <!-- Answer Comparison Table -->
      <div class="answer-table-container">
        <table class="answer-table">
          <thead>
            <tr>
              <th>Q. No.</th>
              <th>Correct Answer</th>
              <th>Student Answer</th>
              <th>Result</th>
              <th>Marks</th>
            </tr>
          </thead>
          <tbody>
            ${answerRows}
          </tbody>
        </table>
      </div>

      <div class="performance-section">
        <div class="perf-label">Overall Performance:</div>
        <div class="perf-value" style="color: ${perf.color}; font-weight: 700; font-size: 16px;">
          ${perf.label}
        </div>
      </div>

      <div class="signature-section">
        <div class="sig-line">
          <div class="sig-underline"></div>
          <div class="sig-text">Class Teacher</div>
        </div>
        <div class="sig-line">
          <div class="sig-underline"></div>
          <div class="sig-text">Principal / Director</div>
        </div>
        <div class="sig-line">
          <div class="sig-underline"></div>
          <div class="sig-text">Parent's / Guardian's Signature</div>
        </div>
      </div>

      <div class="card-footer-text">
        Generated by ${escapeHtml(orgName)} | ${new Date().toLocaleString('en-IN')}
      </div>
    </div>`;
}

function generateFullPDFHtml(
  exam: ExamDetail,
  results: StudentResult[],
  answerKey: AnswerKeyEntry[],
  omrSheets: OMRSheetData[],
  options: ExportOptions,
  orgName: string,
  logoUrl: string
): string {
  const generatedAt = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(exam.name)} - Result Report</title>
  <style>
    @page {
      size: ${options.paperSize} portrait;
      margin: 12mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif;
      color: #1a2e1a;
      font-size: 11px;
      line-height: 1.4;
    }

    /* ============ COVER PAGE ============ */
    .cover-page {
      page-break-after: always;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f0f8f0 0%, #e0f0e0 100%);
    }

    .cover-border {
      border: 3px solid #008000;
      padding: 6px;
      background: white;
      width: 100%;
      max-width: 700px;
    }

    .cover-inner {
      border: 1px solid #b0d020;
      padding: 50px 40px;
      text-align: center;
    }

    .cover-logo {
      width: 110px;
      height: 110px;
      margin-bottom: 20px;
    }

    .cover-org-name {
      font-size: 22px;
      font-weight: 700;
      color: #008000;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .cover-divider {
      width: 80%;
      height: 2px;
      background: linear-gradient(to right, transparent, #008000, #b0d020, #008000, transparent);
      margin: 18px auto;
    }

    .cover-heading {
      font-size: 18px;
      font-weight: 600;
      color: #005500;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 8px;
    }

    .cover-exam-name {
      font-size: 26px;
      font-weight: 800;
      color: #002200;
      margin-bottom: 8px;
    }

    .cover-details-table {
      width: 70%;
      margin: 0 auto;
      border-collapse: collapse;
    }

    .cover-details-table td {
      padding: 5px 10px;
      text-align: left;
      font-size: 12px;
      border-bottom: 1px dotted #c0d8c0;
    }

    .detail-label {
      font-weight: 600;
      color: #005500;
      width: 50%;
      text-align: right;
      padding-right: 15px;
    }

    .detail-value {
      color: #1a2e1a;
      text-align: left;
    }

    .cover-generated {
      font-size: 11px;
      color: #555;
      margin-top: 5px;
    }

    .cover-confidential {
      margin-top: 20px;
      font-size: 10px;
      color: #cc0000;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      border: 1px solid #cc0000;
      display: inline-block;
      padding: 3px 12px;
    }

    /* ============ RESULTS PAGE ============ */
    .page-header {
      display: flex;
      align-items: center;
      gap: 14px;
      border-bottom: 2px solid #008000;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }

    .header-logo {
      width: 48px;
      height: 48px;
    }

    .header-text {
      flex: 1;
    }

    .header-org {
      font-size: 14px;
      font-weight: 700;
      color: #008000;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .header-title {
      font-size: 11px;
      color: #005500;
      font-weight: 600;
    }

    .header-exam {
      font-size: 10px;
      color: #666;
    }

    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    .summary-card {
      background: #f4f9f4;
      border: 1px solid #d0e8d0;
      border-radius: 4px;
      padding: 10px 6px;
      text-align: center;
    }

    .summary-card.card-pass {
      background: #e8f5e8;
      border-color: #80c080;
    }

    .summary-card.card-fail {
      background: #fde8e8;
      border-color: #e0a0a0;
    }

    .summary-card.card-high {
      background: #fff8e0;
      border-color: #d4c060;
    }

    .summary-card.card-low {
      background: #f0e8e8;
      border-color: #d0a0a0;
    }

    .summary-value {
      font-size: 20px;
      font-weight: 800;
      color: #005500;
    }

    .card-pass .summary-value { color: #006600; }
    .card-fail .summary-value { color: #cc0000; }
    .card-high .summary-value { color: #996600; }
    .card-low .summary-value { color: #993333; }

    .summary-label {
      font-size: 9px;
      color: #555;
      text-transform: uppercase;
      margin-top: 2px;
      letter-spacing: 0.5px;
    }

    /* Results Table */
    .table-container {
      overflow-x: auto;
    }

    .results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .results-table thead th {
      background: #008000;
      color: white;
      padding: 8px 6px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      white-space: nowrap;
    }

    .results-table tbody td {
      padding: 5px 6px;
      border-bottom: 1px solid #ddeedd;
      vertical-align: middle;
    }

    .results-table tbody tr:nth-child(even) {
      background: #f8fcf8;
    }

    .pass-row {
      background: #e8f5e8 !important;
    }

    .fail-row {
      background: #fde8e8 !important;
    }

    .topper-row {
      background: #fffde0 !important;
      border: 2px solid #ffd700 !important;
      box-shadow: 0 0 6px rgba(255, 215, 0, 0.4);
    }

    .td-rank {
      font-weight: 700;
      text-align: center;
      width: 50px;
    }

    .td-roll {
      text-align: center;
      width: 70px;
    }

    .td-name {
      font-weight: 700;
      min-width: 130px;
    }

    .td-marks {
      text-align: center;
      font-weight: 600;
      width: 100px;
    }

    .td-num {
      text-align: center;
      width: 60px;
    }

    .td-status {
      text-align: center;
      width: 55px;
    }

    .status-pass {
      color: #006600;
      font-weight: 800;
      font-size: 11px;
    }

    .status-fail {
      color: #cc0000;
      font-weight: 800;
      font-size: 11px;
    }

    .results-table tfoot td {
      background: #e8f0e8;
      padding: 8px 6px;
      font-size: 10px;
      border-top: 2px solid #008000;
    }

    .footer-row td {
      font-size: 10px !important;
    }

    /* ============ STUDENT REPORT CARD ============ */
    .page-break {
      page-break-before: always;
    }

    .student-card {
      border: 1px solid #c8e0c8;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 10px;
      position: relative;
    }

    .student-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(to right, #008000, #b0d020);
      border-radius: 6px 6px 0 0;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid #008000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }

    .card-logo {
      width: 50px;
      height: 50px;
    }

    .card-org {
      font-size: 13px;
      font-weight: 700;
      color: #008000;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .card-title {
      font-size: 11px;
      color: #005500;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .card-exam-info {
      font-size: 10px;
      color: #444;
      margin-bottom: 12px;
      padding: 6px 10px;
      background: #f4f9f4;
      border-radius: 3px;
    }

    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 16px;
      margin-bottom: 12px;
      padding: 8px 10px;
      background: #fafcfa;
      border: 1px solid #e0ece0;
      border-radius: 3px;
    }

    .si-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
    }

    .si-label {
      color: #555;
      font-weight: 500;
    }

    .si-value {
      color: #1a2e1a;
      font-weight: 600;
    }

    .score-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .score-box {
      text-align: center;
      padding: 10px 6px;
      border-radius: 4px;
      border: 1px solid #d0e8d0;
      background: #f4f9f4;
    }

    .score-box small {
      font-size: 12px;
      color: #666;
    }

    .score-big {
      font-size: 18px;
      font-weight: 800;
      color: #005500;
    }

    .score-obtained .score-big { color: #005500; }
    .score-pct .score-big { color: #006600; }
    .score-rank .score-big { color: #996600; }
    .score-pass { background: #e8f5e8 !important; border-color: #80c080 !important; }
    .score-pass .score-big { color: #006600 !important; }
    .score-fail { background: #fde8e8 !important; border-color: #e0a0a0 !important; }
    .score-fail .score-big { color: #cc0000 !important; }

    .detailed-stats {
      display: flex;
      gap: 16px;
      font-size: 10px;
      color: #555;
      margin-bottom: 14px;
      padding: 6px 10px;
      background: #f8fcf8;
      border-radius: 3px;
    }

    .detailed-stats strong {
      color: #005500;
    }

    /* Answer Table */
    .answer-table-container {
      overflow-x: auto;
      margin-bottom: 14px;
    }

    .answer-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .answer-table thead th {
      background: #008000;
      color: white;
      padding: 6px 4px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
    }

    .answer-table tbody td {
      padding: 4px;
      text-align: center;
      border-bottom: 1px solid #ddeedd;
    }

    .answer-table tbody tr:nth-child(even) {
      background: #f8fcf8;
    }

    .q-num {
      font-weight: 600;
      width: 40px;
    }

    .q-answer {
      font-weight: 600;
      width: 50px;
    }

    .q-symbol {
      font-weight: 700;
      font-size: 12px;
      width: 40px;
    }

    .q-marks {
      font-weight: 600;
      width: 50px;
    }

    .mark-correct {
      color: #006600;
      background: #e8f5e8;
    }

    .mark-wrong {
      color: #cc0000;
      background: #fde8e8;
    }

    .mark-unanswered {
      color: #888;
    }

    .performance-section {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: #f4f9f4;
      border: 1px solid #d0e8d0;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .perf-label {
      font-size: 11px;
      font-weight: 600;
      color: #555;
    }

    .signature-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 30px;
      margin-bottom: 15px;
    }

    .sig-line {
      text-align: center;
    }

    .sig-underline {
      width: 100%;
      border-bottom: 1px solid #333;
      margin-bottom: 4px;
      height: 30px;
    }

    .sig-text {
      font-size: 10px;
      color: #555;
    }

    .card-footer-text {
      text-align: center;
      font-size: 8px;
      color: #999;
      border-top: 1px solid #e0e0e0;
      padding-top: 8px;
    }

    /* ============ PRINT RULES ============ */
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .no-print {
        display: none !important;
      }

      .page-break {
        page-break-before: always;
      }

      .cover-page {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
`;

  // Cover page
  if (options.includeCover) {
    html += generateCoverPage(exam, orgName, logoUrl, generatedAt);
  }

  // Results pages
  html += generateResultsPage(exam, results, {}, options, logoUrl, orgName, generatedAt);

  // Individual student report cards
  if (options.includeIndividualReports && results.length > 0) {
    html += `
    <div class="page-break"></div>
    <div class="page-header" style="margin-bottom: 12px;">
      <img src="${escapeHtml(logoUrl)}" class="header-logo" alt="Logo" />
      <div class="header-text">
        <div class="header-org">${escapeHtml(orgName)}</div>
        <div class="header-title">Individual Student Report Cards</div>
        <div class="header-exam">${escapeHtml(exam.name)} — ${results.length} Students</div>
      </div>
    </div>`;

    for (const student of results) {
      const omrSheet = omrSheets.find((s) => s.id === student.omrSheetId);
      html += generateStudentReportCard(
        student,
        omrSheet,
        answerKey,
        exam,
        student.rank,
        results.length,
        logoUrl,
        orgName
      );
    }
  }

  html += `
</body>
</html>`;

  return html;
}

/* ------------------------------------------------------------------ */
/*  React Component                                                    */
/* ------------------------------------------------------------------ */

export function ExportPDFPage() {
  const { selectedExam, setSelectedExam } = useAppStore();

  const [exams, setExams] = useState<ExamDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [orgName, setOrgName] = useState('OMR Sheet Reader');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [examData, setExamData] = useState<ExamDetail | null>(null);

  const [options, setOptions] = useState<ExportOptions>({
    includeCover: true,
    includeIndividualReports: false,
    highlightTopper: true,
    includeLogo: true,
    includeSummary: true,
    paperSize: 'A4',
  });

  // Fetch exams list on mount
  useEffect(() => {
    async function fetchExams() {
      try {
        const res = await fetch('/api/exam?status=completed&limit=200');
        const json = await res.json();
        if (json.exams) {
          setExams(json.exams);
          // Auto-select first exam if store is empty
          if (!selectedExam && json.exams.length > 0) {
            setSelectedExam(json.exams[0].id);
          }
        }
      } catch {
        // silent
      }
    }
    fetchExams();
  }, [setSelectedExam]);

  // Fetch settings for org name
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        if (settings.organizationName) {
          setOrgName(settings.organizationName);
        }
      } catch {
        // silent
      }
    }
    fetchSettings();
  }, []);

  // Fetch exam details when selected
  useEffect(() => {
    if (!selectedExam) {
      setExamData(null);
      setPreviewHtml(null);
      return;
    }
    async function fetchExamDetail() {
      setLoading(true);
      try {
        const res = await fetch(`/api/exam/${selectedExam}`);
        const json = await res.json();
        if (json.data) {
          setExamData(json.data);
        }
      } catch {
        toast.error('Failed to load exam details');
      } finally {
        setLoading(false);
      }
    }
    fetchExamDetail();
  }, [selectedExam]);

  // Generate HTML preview (print-based approach)
  const handleGenerate = useCallback(
    async () => {
      if (!selectedExam) {
        toast.error('Please select an exam');
        return;
      }

      setGenerating(true);
      try {
        const [meritRes, examRes, answerKeyRes, omrRes] = await Promise.all([
          fetch(`/api/results/merit?examId=${selectedExam}`),
          fetch(`/api/exam/${selectedExam}`),
          fetch(`/api/answer-key?examId=${selectedExam}`),
          fetch(`/api/omr?examId=${selectedExam}`),
        ]);

        const meritData = await meritRes.json();
        const examJson = await examRes.json();
        const answerKeyJson = await answerKeyRes.json();
        const omrJson = await omrRes.json();

        const exam = examJson.data;
        const results: StudentResult[] = meritData.students || [];
        const answerKey: AnswerKeyEntry[] = (answerKeyJson.answerKey || []).map(
          (ak: { questionNo: number; correctAnswer: string; marks: number }) => ({
            questionNo: ak.questionNo,
            correctAnswer: ak.correctAnswer.toUpperCase(),
            marks: Number(ak.marks),
          })
        );
        const omrSheets: OMRSheetData[] = omrJson.sheets || [];

        if (results.length === 0) {
          toast.error('No results found for this exam. Make sure OMR sheets have been processed.');
          setGenerating(false);
          return;
        }

        const logoUrl = window.location.origin + '/logo.png';
        const html = generateFullPDFHtml(exam, results, answerKey, omrSheets, options, orgName, logoUrl);
        setPreviewHtml(html);
        toast.success('PDF preview generated successfully');
      } catch (err) {
        console.error('PDF generation error:', err);
        toast.error('Failed to generate PDF preview. Please try again.');
      } finally {
        setGenerating(false);
      }
    },
    [selectedExam, options, orgName]
  );

  // Download real PDF from server
  const handleDownloadPDF = useCallback(async () => {
    if (!selectedExam) {
      toast.error('Please select an exam');
      return;
    }

    setDownloading(true);
    try {
      const params = new URLSearchParams({
        examId: selectedExam,
        includeLogo: String(options.includeLogo),
        includeSummary: String(options.includeSummary),
        paperSize: options.paperSize,
      });

      const res = await fetch(`/api/export/pdf?${params.toString()}`);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Download failed' }));
        toast.error(errData.error || 'Failed to generate PDF');
        return;
      }

      const blob = await res.blob();
      const filename = res.headers
        .get('Content-Disposition')
        ?.match(/filename="?(.+?)"?(;|$)/)?.[1] || 'Results.pdf';

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [selectedExam, options]);

  const hasResults = examData ? (examData._count?.results ?? 0) > 0 : false;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Export PDF Report</h2>
          <p className="text-sm text-muted-foreground">
            Generate professional PDF result reports with server-side rendering
          </p>
        </div>
      </div>

      {/* Controls Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Export Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Exam Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Examination</Label>
            <Select
              value={selectedExam || ''}
              onValueChange={(val) => setSelectedExam(val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an exam..." />
              </SelectTrigger>
              <SelectContent>
                {exams.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No completed exams found
                  </SelectItem>
                ) : (
                  exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{exam.name}</span>
                        {exam.subject && (
                          <span className="text-muted-foreground">— {exam.subject}</span>
                        )}
                        <Badge
                          variant={(exam._count?.results ?? 0) > 0 ? 'default' : 'secondary'}
                          className="ml-1 text-xs"
                        >
                          {exam._count?.results ?? 0} results
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Exam Info */}
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {examData && !loading && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">Subject:</span>{' '}
                  <span className="font-medium">{examData.subject || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  <span className="font-medium">{formatDate(examData.date)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Questions:</span>{' '}
                  <span className="font-medium">{examData.totalQuestions}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Marks:</span>{' '}
                  <span className="font-medium">{examData.totalMarks}</span>
                </div>
              </div>
              {(examData._count?.results ?? 0) === 0 && (
                <div className="mt-2 rounded bg-yellow-50 px-3 py-2 text-sm text-yellow-800 border border-yellow-200">
                  ⚠ No results yet. Please process OMR sheets first before exporting.
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Report Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Report Options</Label>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Include Cover Page */}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Cover Page</div>
                    <div className="text-xs text-muted-foreground">Decorative title page</div>
                  </div>
                </div>
                <Switch
                  checked={options.includeCover}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeCover: checked }))
                  }
                />
              </div>

              {/* Include Individual Reports */}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Individual Report Cards</div>
                    <div className="text-xs text-muted-foreground">Per-student cards with answer comparison</div>
                  </div>
                </div>
                <Switch
                  checked={options.includeIndividualReports}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({
                      ...prev,
                      includeIndividualReports: checked,
                    }))
                  }
                />
              </div>

              {/* Highlight Topper */}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Highlight Topper</div>
                    <div className="text-xs text-muted-foreground">Gold border for rank 1</div>
                  </div>
                </div>
                <Switch
                  checked={options.highlightTopper}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, highlightTopper: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* PDF Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">PDF Generation Options</Label>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Include Logo */}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Include Logo</div>
                    <div className="text-xs text-muted-foreground">OMR branding</div>
                  </div>
                </div>
                <Switch
                  checked={options.includeLogo}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeLogo: checked }))
                  }
                />
              </div>

              {/* Include Summary */}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Include Summary Stats</div>
                    <div className="text-xs text-muted-foreground">Total, pass rate, avg, etc.</div>
                  </div>
                </div>
                <Switch
                  checked={options.includeSummary}
                  onCheckedChange={(checked) =>
                    setOptions((prev) => ({ ...prev, includeSummary: checked }))
                  }
                />
              </div>

              {/* Paper Size */}
              <div className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div className="text-sm font-medium">Paper Size</div>
                </div>
                <RadioGroup
                  value={options.paperSize}
                  onValueChange={(val) =>
                    setOptions((prev) => ({
                      ...prev,
                      paperSize: val as 'A4' | 'LEGAL',
                    }))
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="A4" id="a4" />
                    <Label htmlFor="a4" className="text-xs cursor-pointer">A4</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="LEGAL" id="legal" />
                    <Label htmlFor="legal" className="text-xs cursor-pointer">Legal</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleDownloadPDF}
              disabled={!hasResults || downloading}
              className="flex-1"
              size="lg"
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF File
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!hasResults || generating}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Preview (HTML)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Area */}
      {previewHtml && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-primary" />
                HTML Preview
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewHtml(null)}
                >
                  Close Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(previewHtml);
                      w.document.close();
                    }
                  }}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open Full View
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-hidden rounded-b-lg border border-border bg-white">
              <iframe
                srcDoc={previewHtml}
                className="h-[700px] w-full border-0"
                title="PDF Preview"
                sandbox="allow-same-origin"
              />
            </div>
            <div className="p-3 text-center text-xs text-muted-foreground">
              This is an HTML preview. For best results, use the &quot;Download PDF File&quot; button above
              to generate a proper PDF document.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      {!previewHtml && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">Professional PDF Reports</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Select a completed exam and download a professionally formatted PDF result report.
              The PDF includes a branded cover page, summary statistics, ranked results table,
              and optional individual student report cards.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 text-left text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                <FileDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="font-medium">Server-Side PDF</div>
                  <div className="text-xs text-muted-foreground">
                    Generated using pdf-lib with proper fonts, tables, and branding
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="font-medium">Merit Table</div>
                  <div className="text-xs text-muted-foreground">
                    Color-coded results with rank, marks, percentage, and pass/fail status
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="font-medium">Summary Statistics</div>
                  <div className="text-xs text-muted-foreground">
                    Total students, pass rate, average score, highest/lowest marks
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ExternalLink icon needed for the Open Full View button */
function ExternalLink({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
