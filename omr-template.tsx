'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileDown, Printer, RotateCcw, Settings2,
  Eye, ImagePlus, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface OMRConfig {
  totalQuestions: number;
  optionsPerQuestion: number;
  rollNumberDigits: number;
  includeStudentName: boolean;
  includeClassSection: boolean;
  examName: string;
  institutionName: string;
  logoUrl: string;
}

interface OMRSection {
  name: string;
  startQ: number;
  endQ: number;
}

const DEFAULT_CONFIG: OMRConfig = {
  totalQuestions: 200,
  optionsPerQuestion: 4,
  rollNumberDigits: 10,
  includeStudentName: true,
  includeClassSection: true,
  examName: 'SAMPLE EXAMINATION',
  institutionName: '',
  logoUrl: '',
};

const OPTION_LABELS = ['1', '2', '3', '4', '5'];
const DIGIT_LABELS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const SECTION_NAMES_1 = ['SECTION A'];
const SECTION_NAMES_2 = ['SECTION A', 'SECTION B'];
const SECTION_NAMES_3 = ['SECTION A', 'SECTION B', 'SECTION C'];
const SECTION_NAMES_4 = ['PHYSICS', 'CHEMISTRY', 'BOTANY', 'ZOOLOGY'];
const SECTION_NAMES_5 = ['PHYSICS', 'CHEMISTRY', 'BOTANY', 'ZOOLOGY', 'GENERAL'];

function buildSections(totalQuestions: number): OMRSection[] {
  const questionsPerSection = 50;
  const numSections = Math.ceil(totalQuestions / questionsPerSection);
  const sectionNames =
    numSections === 1 ? SECTION_NAMES_1 :
    numSections === 2 ? SECTION_NAMES_2 :
    numSections === 3 ? SECTION_NAMES_3 :
    numSections === 4 ? SECTION_NAMES_4 :
    numSections === 5 ? SECTION_NAMES_5 :
    Array.from({ length: numSections }, (_, i) => `SECTION ${String.fromCharCode(65 + i)}`);

  const sections: OMRSection[] = [];
  for (let i = 0; i < numSections; i++) {
    const startQ = i * questionsPerSection + 1;
    const endQ = Math.min(startQ + questionsPerSection - 1, totalQuestions);
    sections.push({ name: sectionNames[i], startQ, endQ });
  }
  return sections;
}

/* ═══════════════════════════════════════════════════════════════
   NEET-STYLE OMR SHEET — EXACT REPLICA
   4–5 main columns side by side, each with 2 sub-columns of 25Q
   Pink bubbles with numbers, Q.No + 4 options, A4 portrait
   ═══════════════════════════════════════════════════════════════ */

function OMRSheetPreview({ config }: { config: OMRConfig }) {
  const options = OPTION_LABELS.slice(0, config.optionsPerQuestion);
  const sections = useMemo(() => buildSections(config.totalQuestions), [config.totalQuestions]);
  const questionsPerSection = 50;
  const questionsPerSubCol = 25; // 2 sub-columns × 25 = 50 per section

  // Colors
  const pinkFill = '#fce4ec';
  const pinkBorder = '#c2185b';
  const pinkText = '#c2185b';
  const headerBg = '#424242';
  const headerText = '#ffffff';

  return (
    <div
      id="omr-sheet-preview"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '5mm',
        background: '#ffffff',
        color: '#000000',
        fontFamily: '"Arial", "Helvetica", sans-serif',
        fontSize: '7pt',
        boxSizing: 'border-box',
        border: '1px solid #ccc',
      }}
    >
      {/* ─── HEADER ─── */}
      <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
        {config.logoUrl && (
          <div style={{ marginBottom: '1mm' }}>
            <img src={config.logoUrl} alt="" style={{ height: '8mm', objectFit: 'contain' }} />
          </div>
        )}
        {config.institutionName && (
          <p style={{ fontSize: '8pt', fontWeight: 600, margin: '0 0 0.5mm', letterSpacing: '0.5px' }}>
            {config.institutionName.toUpperCase()}
          </p>
        )}
        <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 0.5mm', letterSpacing: '1px' }}>
          {config.examName || 'OMR ANSWER SHEET'}
        </h2>
        <p style={{ fontSize: '5.5pt', margin: 0, color: '#555', lineHeight: 1.3 }}>
          Ensure that Roll No. has been filled and marked correctly. Use HB Pencil or Black/Blue Ball Pen to darken the appropriate bubble.
        </p>
      </div>

      {/* ─── ROLL NUMBER + STUDENT INFO ─── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${pinkBorder}`, marginBottom: '2mm' }}>
        <tbody>
          {/* Roll Number */}
          <tr>
            <td style={{ border: `1px solid ${pinkBorder}`, padding: '1mm 2mm', fontWeight: 700, fontSize: '7pt', background: pinkFill, width: '16mm', textAlign: 'center', verticalAlign: 'middle' }}>
              ROLL NO.
            </td>
            <td style={{ border: `1px solid ${pinkBorder}`, padding: '0.8mm', verticalAlign: 'middle' }}>
              {config.rollNumberDigits > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3mm', flexWrap: 'wrap' }}>
                  {Array.from({ length: config.rollNumberDigits }).map((_, di) => (
                    <div key={di} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.2mm' }}>
                      {DIGIT_LABELS.map((d) => (
                        <div
                          key={d}
                          style={{
                            width: '5.5px', height: '5.5px', borderRadius: '50%',
                            border: `0.4px solid ${pinkBorder}`, background: pinkFill,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <span style={{ fontSize: '3pt', color: pinkText, lineHeight: 1 }}>{d}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </td>
          </tr>
          {/* Student Name */}
          {config.includeStudentName && (
            <tr>
              <td style={{ border: `1px solid ${pinkBorder}`, padding: '1mm 2mm', fontWeight: 700, fontSize: '7pt', background: pinkFill, textAlign: 'center', verticalAlign: 'middle' }}>
                STUDENT NAME
              </td>
              <td style={{ border: `1px solid ${pinkBorder}`, padding: '0.5mm 2mm', verticalAlign: 'middle' }}>
                <div style={{ borderBottom: '0.5px solid #aaa', height: '5mm' }} />
              </td>
            </tr>
          )}
          {/* Class / Section */}
          {config.includeClassSection && (
            <tr>
              <td style={{ border: `1px solid ${pinkBorder}`, padding: '1mm 2mm', fontWeight: 700, fontSize: '7pt', background: pinkFill, textAlign: 'center', verticalAlign: 'middle' }}>
                CLASS / SEC
              </td>
              <td style={{ border: `1px solid ${pinkBorder}`, padding: '0.5mm 2mm', verticalAlign: 'middle' }}>
                <div style={{ borderBottom: '0.5px solid #aaa', height: '5mm' }} />
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ─── ANSWER GRID — NEET EXACT LAYOUT ─── */}
      {/* All sections side-by-side as columns. Each section has 2 sub-columns of 25 questions */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${pinkBorder}` }}>
        {/* Section Headers */}
        <thead>
          <tr>
            {sections.map((section, si) => (
              <th key={si} style={{ border: `1px solid ${pinkBorder}`, padding: '1mm 0', background: headerBg, color: headerText, fontSize: '6.5pt', fontWeight: 700, letterSpacing: '1.5px' }}>
                {section.name}
              </th>
            ))}
          </tr>
          {/* Q.No. + Option Headers for each section */}
          <tr>
            {sections.map((section, si) => (
              <th key={si} style={{ border: `0.5px solid #aaa`, padding: 0, background: '#f5f5f5' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {Array.from({ length: 2 }).map((_, sci) => (
                        <th key={sci} style={{ border: sci === 0 ? 'none' : '0.5px solid #aaa', padding: 0 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ border: '0.5px solid #aaa', padding: '0.4mm 0', fontSize: '5.5pt', fontWeight: 600, width: '7mm', background: '#f5f5f5' }}>Q. No.</th>
                                {options.map(o => (
                                  <th key={o} style={{ border: '0.5px solid #aaa', padding: '0.4mm 0', fontSize: '5.5pt', fontWeight: 600, width: '3.8mm', background: '#f5f5f5' }}>{o}</th>
                                ))}
                              </tr>
                            </thead>
                          </table>
                        </th>
                      ))}
                    </tr>
                  </thead>
                </table>
              </th>
            ))}
          </tr>
        </thead>

        {/* Answer Rows — 25 rows, each row has all sections */}
        <tbody>
          {Array.from({ length: questionsPerSubCol }).map((_, ri) => (
            <tr key={ri}>
              {sections.map((section, si) => (
                <td key={si} style={{ border: `0.5px solid #ccc`, padding: 0, verticalAlign: 'middle' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        {/* Sub-column 1: questions ri+1 and ri+26 */}
                        {[ri, ri + questionsPerSubCol].map((qOffset, sci) => {
                          const qNum = section.startQ + qOffset;
                          if (qNum > section.endQ) {
                            // Empty cell for questions beyond section end
                            return (
                              <td key={sci} style={{ border: sci === 0 ? 'none' : '0.5px solid #ddd', padding: '0.3mm 0' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ border: '0.3px solid #eee', padding: '0.2mm 0', width: '7mm', height: '6mm' }} />
                                      {options.map(o => (
                                        <td key={o} style={{ border: '0.3px solid #eee', padding: '0.2mm 0', width: '3.8mm' }} />
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            );
                          }
                          return (
                            <td key={sci} style={{ border: sci === 0 ? 'none' : '0.5px solid #ddd', padding: '0.3mm 0' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                  <tr>
                                    {/* Question Number */}
                                    <td style={{
                                      border: '0.3px solid #ddd', padding: '0.2mm 0',
                                      width: '7mm', height: '6mm',
                                      textAlign: 'center', fontSize: '5.5pt', fontWeight: 600,
                                    }}>
                                      {String(qNum).padStart(3, '0')}
                                    </td>
                                    {/* Option Bubbles */}
                                    {options.map(o => (
                                      <td key={o} style={{
                                        border: '0.3px solid #ddd', padding: '0.2mm 0',
                                        width: '3.8mm', textAlign: 'center',
                                      }}>
                                        <div style={{
                                          width: '10px', height: '10px', borderRadius: '50%',
                                          border: `0.6px solid ${pinkBorder}`, background: pinkFill,
                                          margin: '0 auto', display: 'flex',
                                          alignItems: 'center', justifyContent: 'center',
                                        }}>
                                          <span style={{ fontSize: '4pt', color: pinkText, lineHeight: 1, fontWeight: 600 }}>{o}</span>
                                        </div>
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ─── DECLARATION / FOOTER ─── */}
      <div style={{ borderTop: `1px solid ${pinkBorder}`, marginTop: '2mm', paddingTop: '1.5mm' }}>
        <p style={{ fontSize: '5.5pt', fontWeight: 700, textAlign: 'center', margin: '0 0 0.5mm', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Declaration by the Candidate
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: `0.5px solid ${pinkBorder}` }}>
          <tbody>
            <tr>
              <td style={{ border: `0.5px solid ${pinkBorder}`, padding: '0.5mm 1mm', fontSize: '5pt', width: '50%', verticalAlign: 'top' }}>
                <strong style={{ fontSize: '5pt' }}>I have verified the above details.</strong>
              </td>
              <td style={{ border: `0.5px solid ${pinkBorder}`, padding: '0.5mm 1mm', fontSize: '5pt', width: '50%', verticalAlign: 'top' }}>
                <div style={{ borderBottom: '0.5px dashed #999', height: '5mm', width: '80%' }} />
                <span style={{ fontSize: '4pt', color: '#777' }}>Signature of Candidate</span>
              </td>
            </tr>
            <tr>
              <td style={{ border: `0.5px solid ${pinkBorder}`, padding: '0.5mm 1mm', fontSize: '5pt', verticalAlign: 'top' }}>
                <div style={{ borderBottom: '0.5px dashed #999', height: '4mm', width: '90%' }} />
                <span style={{ fontSize: '4pt', color: '#777' }}>Parent&apos;s / Guardian&apos;s Name</span>
              </td>
              <td style={{ border: `0.5px solid ${pinkBorder}`, padding: '0.5mm 1mm', fontSize: '5pt', verticalAlign: 'top' }}>
                <div style={{ borderBottom: '0.5px dashed #999', height: '5mm', width: '80%' }} />
                <span style={{ fontSize: '4pt', color: '#777' }}>Invigilator Signature</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── BOTTOM BAR ─── */}
      <div style={{ textAlign: 'center', marginTop: '1mm', fontSize: '4.5pt', color: '#999', letterSpacing: '0.5px' }}>
        PRO OMR READER — Generated OMR Sheet — Total Questions: {config.totalQuestions} — Page 1 of 1
      </div>
    </div>
  );
}

export function OMRTemplatePage() {
  const [config, setConfig] = useState<OMRConfig>(DEFAULT_CONFIG);

  const handlePrint = () => {
    const previewEl = document.getElementById('omr-sheet-preview');
    if (!previewEl) { toast.error('Preview not found'); return; }
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Please allow popups to print'); return; }
    printWindow.document.write(`<!DOCTYPE html><html><head><title>OMR Sheet - ${config.examName}</title><style>@page{margin:0;size:A4;}body{margin:0;padding:0;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>${previewEl.outerHTML}<script>window.onload=function(){window.print();window.close();}</script></body></html>`);
    printWindow.document.close();
    toast.success('Print dialog opened');
  };

  const resetConfig = () => { setConfig(DEFAULT_CONFIG); toast.info('Configuration reset'); };

  const applyPreset = (name: string, questions: number) => {
    setConfig((prev) => ({ ...prev, totalQuestions: questions }));
    toast.success(`${name} preset applied (${questions} questions)`);
  };

  const sections = useMemo(() => buildSections(config.totalQuestions), [config.totalQuestions]);
  const questionsPerSubCol = 25;

  const estimatedHeight = useMemo(() => {
    const headerArea = 22; // title + institution + roll number + student info + instructions
    const gridHeader = 8; // section headers + column headers
    const gridRows = questionsPerSubCol * 7.2; // 25 rows × 7.2mm per row
    const footer = 22; // declaration + bottom bar
    return Math.round(headerArea + gridHeader + gridRows + footer);
  }, []);

  const fitsOnOnePage = estimatedHeight <= 287;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <FileDown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">OMR Sheet Template</h1>
            <p className="text-sm text-muted-foreground">
              Generate NEET-style OMR answer sheets — up to 250 questions on a single A4 page
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="xl:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                Template Configuration
              </CardTitle>
              <CardDescription>Customize the OMR sheet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="institution-name" className="text-sm">Institution Name</Label>
                <Input id="institution-name" value={config.institutionName} onChange={(e) => setConfig(p => ({ ...p, institutionName: e.target.value }))} placeholder="e.g. Delhi Public School" />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm">Sheet Logo (Optional)</Label>
                {config.logoUrl ? (
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <img src={config.logoUrl} alt="Logo" className="h-10 w-10 rounded object-contain border" />
                    <div className="flex-1"><p className="text-xs font-medium">Logo uploaded</p></div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setConfig(p => ({ ...p, logoUrl: '' }))}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Click to upload logo</span>
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB'); return; }
                      const reader = new FileReader();
                      reader.onload = () => { setConfig(p => ({ ...p, logoUrl: reader.result as string })); toast.success('Logo added'); };
                      reader.readAsDataURL(file); e.target.value = '';
                    }} />
                  </label>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="exam-name" className="text-sm">Exam Name</Label>
                <Input id="exam-name" value={config.examName} onChange={(e) => setConfig(p => ({ ...p, examName: e.target.value }))} placeholder="Enter exam name..." />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm">Quick Presets</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => applyPreset('NEET', 180)}>NEET (180)</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => applyPreset('NEET Full', 200)}>NEET (200)</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => applyPreset('JEE', 90)}>JEE (90)</Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="total-questions" className="text-sm">Total Questions</Label>
                <Input id="total-questions" type="number" min={1} max={250} value={config.totalQuestions} onChange={(e) => {
                  const val = Math.max(1, Math.min(250, parseInt(e.target.value) || 1));
                  setConfig(p => ({ ...p, totalQuestions: val }));
                }} />
                <p className="text-xs text-muted-foreground">1–250 questions. Auto-divided into sections of 50.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Options per Question</Label>
                <Select value={String(config.optionsPerQuestion)} onValueChange={(val) => setConfig(p => ({ ...p, optionsPerQuestion: parseInt(val) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 Options (1, 2, 3, 4)</SelectItem>
                    <SelectItem value="5">5 Options (1, 2, 3, 4, 5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="roll-digits" className="text-sm">Roll Number Digits</Label>
                <Select value={String(config.rollNumberDigits)} onValueChange={(val) => setConfig(p => ({ ...p, rollNumberDigits: parseInt(val) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="6">6 Digits</SelectItem>
                    <SelectItem value="8">8 Digits</SelectItem>
                    <SelectItem value="10">10 Digits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div><Label className="text-sm">Student Name</Label><p className="text-xs text-muted-foreground">Name writing area</p></div>
                  <Switch checked={config.includeStudentName} onCheckedChange={(c) => setConfig(p => ({ ...p, includeStudentName: c }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label className="text-sm">Class / Section</Label><p className="text-xs text-muted-foreground">Class &amp; section area</p></div>
                  <Switch checked={config.includeClassSection} onCheckedChange={(c) => setConfig(p => ({ ...p, includeClassSection: c }))} />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-2">
            <Button onClick={handlePrint} className="w-full gap-2"><Printer className="h-4 w-4" /> Print Template</Button>
            <Button variant="outline" onClick={handlePrint} className="w-full gap-2"><FileDown className="h-4 w-4" /> Download as PDF</Button>
            <Button variant="ghost" onClick={resetConfig} className="w-full gap-2"><RotateCcw className="h-4 w-4" /> Reset Defaults</Button>
          </div>
          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Questions</span><span className="font-medium">{config.totalQuestions}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Options</span><span className="font-medium">{config.optionsPerQuestion}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sections</span><span className="font-medium">{sections.length} (50 Q each)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Columns</span><span className="font-medium">{sections.length} (side by side)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sub-columns</span><span className="font-medium">2 per section</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Q per sub-column</span><span className="font-medium">{questionsPerSubCol}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total bubbles</span><span className="font-medium">{config.totalQuestions * config.optionsPerQuestion}</span></div>
              <Separator className="my-1" />
              <div className="flex justify-between"><span className="text-muted-foreground">Est. height</span><span className="font-medium">{estimatedHeight}mm</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fits on 1 page?</span>
                <span className={`font-medium ${fitsOnOnePage ? 'text-green-600' : 'text-amber-600'}`}>
                  {fitsOnOnePage ? '✓ Yes (A4)' : '⚠ Tight'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Live Preview — NEET Style
              </CardTitle>
              <CardDescription>
                {sections.length} sections side-by-side × 2 sub-columns × {questionsPerSubCol} rows = {config.totalQuestions} questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-gray-200 overflow-auto" style={{ maxHeight: '85vh' }}>
                <OMRSheetPreview config={config} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
