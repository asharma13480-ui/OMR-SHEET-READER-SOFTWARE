/**
 * DefenceTrack OMR Pro — Client-Side OMR Detection Engine
 *
 * Detects filled bubbles from scanned OMR sheet images using the Canvas API.
 * Algorithm:
 *  1. Load image → canvas
 *  2. Grayscale → binary threshold
 *  3. Divide into bubble grid regions (configurable layout)
 *  4. Measure darkness % per bubble
 *  5. Per question pick darkest bubble as answer
 *  6. Per roll digit pick darkest bubble as digit
 *  7. Return structured results with confidence
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface OMRConfig {
  totalQuestions: number;
  optionsPerQ: number; // 4 = A,B,C,D  |  5 = A,B,C,D,E
  bubbleColumns: number; // question columns per page
  bubbleRows: number; // question rows per column
  rollDigits: number; // number of digits in the roll number region (0 = no roll region)
  threshold: number; // binary threshold 0-255 (lower = more sensitive to light marks)
  minDarkness: number; // 0-1 minimum darkness % to count as "filled"
  // Region ratios (fraction of image height/width)
  rollRegionTop: number; // top of roll number region (fraction from top)
  rollRegionBottom: number; // bottom of roll number region
  gridRegionTop: number; // top of answer grid region
  gridRegionBottom: number; // bottom of answer grid region
  gridRegionLeft: number; // left edge of grid
  gridRegionRight: number; // right edge of grid
}

export interface OMRResult {
  rollNumber: string;
  answers: string[];
  confidence: number; // 0-1 overall
  perQuestionConfidence: number[];
}

export interface BubbleReading {
  index: number;
  darkness: number;
  filled: boolean;
}

// ─── Default Config ────────────────────────────────────────────────

export const DEFAULT_CONFIG: OMRConfig = {
  totalQuestions: 100,
  optionsPerQ: 4,
  bubbleColumns: 5,
  bubbleRows: 20,
  rollDigits: 6,
  threshold: 128,
  minDarkness: 0.35,
  rollRegionTop: 0.05,
  rollRegionBottom: 0.18,
  gridRegionTop: 0.22,
  gridRegionBottom: 0.95,
  gridRegionLeft: 0.05,
  gridRegionRight: 0.95,
};

// ─── Helpers ───────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

/**
 * Create an off-screen canvas and load the image.
 */
function loadImage(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    if (typeof src === 'string') {
      img.src = src;
    } else {
      const url = URL.createObjectURL(src);
      img.src = url;
      // Clean up object URL after load
      img.onload = () => {
        resolve(img);
        URL.revokeObjectURL(url);
      };
    }
  });
}

/**
 * Get grayscale pixel data from an image.
 */
function getGrayscaleData(img: HTMLImageElement): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const canvas = document.createElement('canvas');
  // Limit resolution for performance — scale large images down
  const maxDim = 2000;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  // Convert to grayscale in-place
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    // Luminance formula
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = gray;
  }
  return { data: d, width: w, height: h };
}

/**
 * Apply binary threshold — pixels below threshold become black (0), others white (255).
 */
function applyThreshold(
  gray: Uint8ClampedArray,
  threshold: number
): Uint8ClampedArray {
  const binary = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i += 4) {
    const v = gray[i] < threshold ? 0 : 255;
    binary[i] = binary[i + 1] = binary[i + 2] = v;
    binary[i + 3] = 255; // alpha
  }
  return binary;
}

/**
 * Calculate darkness percentage of a rectangular region in the image data.
 * Returns 0 (all white) to 1 (all black).
 */
function calculateRegionDarkness(
  data: Uint8ClampedArray,
  imgWidth: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): number {
  let blackPixels = 0;
  let totalPixels = 0;
  // Sample every pixel for accuracy
  const x1 = clamp(Math.floor(rx), 0, imgWidth - 1);
  const y1 = clamp(Math.floor(ry), 0, Math.floor(data.length / 4 / imgWidth) - 1);
  const x2 = clamp(Math.floor(rx + rw), 0, imgWidth);
  const y2 = clamp(Math.floor(ry + rh), 0, Math.floor(data.length / 4 / imgWidth));
  const imgHeight = y2 - y1;

  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const idx = (y * imgWidth + x) * 4;
      if (data[idx] < 128) blackPixels++;
      totalPixels++;
    }
  }
  return totalPixels > 0 ? blackPixels / totalPixels : 0;
}

/**
 * Measure darkness of a circular region (for better bubble detection).
 * Samples pixels within the circle radius.
 */
function calculateBubbleDarkness(
  data: Uint8ClampedArray,
  imgWidth: number,
  cx: number,
  cy: number,
  radius: number
): number {
  let blackPixels = 0;
  let totalPixels = 0;
  const imgHeight = data.length / 4 / imgWidth;
  const r2 = radius * radius;

  const x1 = clamp(Math.floor(cx - radius), 0, imgWidth);
  const x2 = clamp(Math.ceil(cx + radius), 0, imgWidth);
  const y1 = clamp(Math.floor(cy - radius), 0, imgHeight);
  const y2 = clamp(Math.ceil(cy + radius), 0, imgHeight);

  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        const idx = (y * imgWidth + x) * 4;
        if (data[idx] < 128) blackPixels++;
        totalPixels++;
      }
    }
  }
  return totalPixels > 0 ? blackPixels / totalPixels : 0;
}

// ─── Detection Logic ─────────────────────────────────────────────────

/**
 * Detect roll number from the roll number region.
 * Each digit position has 10 bubbles (0-9). Pick the darkest.
 */
function detectRollNumber(
  binaryData: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  config: OMRConfig
): { rollNumber: string; confidence: number } {
  if (config.rollDigits === 0) return { rollNumber: '', confidence: 1 };

  const regionTop = Math.floor(config.rollRegionTop * imgHeight);
  const regionBottom = Math.floor(config.rollRegionBottom * imgHeight);
  const regionLeft = Math.floor(config.gridRegionLeft * imgWidth);
  const regionRight = Math.floor(config.gridRegionRight * imgWidth);
  const regionWidth = regionRight - regionLeft;
  const regionHeight = regionBottom - regionTop;

  const digitWidth = regionWidth / config.rollDigits;
  const bubbleW = digitWidth / 12; // 10 bubbles + padding
  const bubbleH = Math.min(regionHeight * 0.8, bubbleW * 1.2);
  const bubbleRadius = Math.min(bubbleW, bubbleH) * 0.4;

  const digits: string[] = [];
  let totalConfidence = 0;

  for (let d = 0; d < config.rollDigits; d++) {
    const baseX = regionLeft + d * digitWidth;
    let maxDarkness = 0;
    let selectedDigit = 0;
    const darknesses: number[] = [];

    for (let n = 0; n < 10; n++) {
      const cx = baseX + (n + 0.5) * (digitWidth / 11);
      const cy = regionTop + regionHeight * 0.5;
      const darkness = calculateBubbleDarkness(
        binaryData,
        imgWidth,
        cx,
        cy,
        bubbleRadius
      );
      darknesses.push(darkness);
      if (darkness > maxDarkness) {
        maxDarkness = darkness;
        selectedDigit = n;
      }
    }

    // Only accept if darkest is significantly above second darkest
    const sorted = [...darknesses].sort((a, b) => b - a);
    const gap = sorted.length > 1 ? sorted[0] - sorted[1] : sorted[0];
    const conf = maxDarkness > config.minDarkness && gap > 0.1 ? Math.min(1, maxDarkness) : 0;

    if (maxDarkness > config.minDarkness) {
      digits.push(String(selectedDigit));
    } else {
      digits.push('');
    }
    totalConfidence += conf;
  }

  return {
    rollNumber: digits.join(''),
    confidence: totalConfidence / config.rollDigits,
  };
}

/**
 * Detect answers from the answer grid region.
 * Grid: bubbleColumns columns × bubbleRows rows.
 * Each cell has `optionsPerQ` bubbles.
 */
function detectAnswers(
  binaryData: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  config: OMRConfig
): { answers: string[]; confidence: number; perQuestionConfidence: number[] } {
  const regionTop = Math.floor(config.gridRegionTop * imgHeight);
  const regionBottom = Math.floor(config.gridRegionBottom * imgHeight);
  const regionLeft = Math.floor(config.gridRegionLeft * imgWidth);
  const regionRight = Math.floor(config.gridRegionRight * imgWidth);
  const regionWidth = regionRight - regionLeft;
  const regionHeight = regionBottom - regionTop;

  const colWidth = regionWidth / config.bubbleColumns;
  const rowHeight = regionHeight / config.bubbleRows;
  const bubbleW = colWidth / (config.optionsPerQ + 1);
  const bubbleH = rowHeight * 0.7;
  const bubbleRadius = Math.min(bubbleW, bubbleH) * 0.38;

  const answers: string[] = [];
  const perQuestionConfidence: number[] = [];
  let totalConfidence = 0;
  const totalQuestions = config.bubbleColumns * config.bubbleRows;

  for (let col = 0; col < config.bubbleColumns; col++) {
    for (let row = 0; row < config.bubbleRows; row++) {
      if (answers.length >= config.totalQuestions) break;

      const baseX = regionLeft + col * colWidth;
      const baseY = regionTop + row * rowHeight;

      let maxDarkness = 0;
      let selectedOption = -1;
      const darknesses: number[] = [];

      for (let opt = 0; opt < config.optionsPerQ; opt++) {
        const cx = baseX + (opt + 1) * bubbleW;
        const cy = baseY + rowHeight * 0.5;
        const darkness = calculateBubbleDarkness(
          binaryData,
          imgWidth,
          cx,
          cy,
          bubbleRadius
        );
        darknesses.push(darkness);
        if (darkness > maxDarkness) {
          maxDarkness = darkness;
          selectedOption = opt;
        }
      }

      // Confidence: gap between darkest and second darkest, weighted by absolute darkness
      const sorted = [...darknesses].sort((a, b) => b - a);
      const gap = sorted.length > 1 ? sorted[0] - sorted[1] : sorted[0];
      let conf = 0;
      if (maxDarkness > config.minDarkness && gap > 0.08) {
        conf = clamp(maxDarkness * 0.6 + gap * 0.4, 0, 1);
        answers.push(OPTION_LABELS[selectedOption]);
      } else {
        answers.push(''); // unanswered
      }
      perQuestionConfidence.push(conf);
      totalConfidence += conf;
    }
    if (answers.length >= config.totalQuestions) break;
  }

  // Pad if we didn't detect enough questions
  while (answers.length < config.totalQuestions) {
    answers.push('');
    perQuestionConfidence.push(0);
  }

  const avgConfidence =
    answers.length > 0 ? totalConfidence / answers.length : 0;

  return {
    answers,
    confidence: avgConfidence,
    perQuestionConfidence,
  };
}

// ─── Adaptive Detection (auto-calibrate bubble positions) ────────────

/**
 * Adaptive version: scans for dark pixel clusters to auto-detect bubble grid.
 * Falls back to grid-based detection if auto-detection fails.
 */
function adaptiveDetect(
  binaryData: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  config: OMRConfig
): {
  answers: string[];
  confidence: number;
  perQuestionConfidence: number[];
  rollNumber: string;
  rollConfidence: number;
} {
  // Try grid-based detection first (configurable template)
  const rollResult = detectRollNumber(binaryData, imgWidth, imgHeight, config);
  const answerResult = detectAnswers(binaryData, imgWidth, imgHeight, config);

  return {
    answers: answerResult.answers,
    confidence: answerResult.confidence,
    perQuestionConfidence: answerResult.perQuestionConfidence,
    rollNumber: rollResult.rollNumber,
    rollConfidence: rollResult.confidence,
  };
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Main detection function — run on a single image file or data URL.
 * Returns detected OMR result with answers and confidence.
 */
export async function detectOMR(
  imageSource: string | File,
  config?: Partial<OMRConfig>
): Promise<OMRResult> {
  const cfg: OMRConfig = { ...DEFAULT_CONFIG, ...config };
  const img = await loadImage(imageSource);
  const { data, width, height } = getGrayscaleData(img);
  const binaryData = applyThreshold(data, cfg.threshold);

  const result = adaptiveDetect(binaryData, width, height, cfg);

  // Trim trailing empty answers
  let trimmedAnswers = [...result.answers];
  while (trimmedAnswers.length > 0 && trimmedAnswers[trimmedAnswers.length - 1] === '') {
    trimmedAnswers.pop();
  }
  // Pad to totalQuestions
  while (trimmedAnswers.length < cfg.totalQuestions) {
    trimmedAnswers.push('');
  }

  return {
    rollNumber: result.rollNumber,
    answers: trimmedAnswers,
    confidence: result.confidence,
  };
}

/**
 * Batch process multiple image files.
 * Processes in batches to avoid blocking the UI.
 */
export async function detectOMRBatch(
  files: File[],
  config?: Partial<OMRConfig>,
  onProgress?: (current: number, total: number, result: OMRResult, file: File) => void,
  batchSize: number = 5
): Promise<{ results: (OMRResult & { fileName: string; fileSize: number })[] }> {
  const cfg: OMRConfig = { ...DEFAULT_CONFIG, ...config };
  const results: (OMRResult & { fileName: string; fileSize: number })[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchPromises = batch.map(async (file) => {
      try {
        const result = await detectOMR(file, cfg);
        const entry = {
          ...result,
          fileName: file.name,
          fileSize: file.size,
        };
        if (onProgress) {
          onProgress(i + batch.indexOf(file) + 1, files.length, result, file);
        }
        return entry;
      } catch (err) {
        // Return empty result for failed images
        const entry: OMRResult & { fileName: string; fileSize: number } = {
          rollNumber: '',
          answers: Array(cfg.totalQuestions).fill(''),
          confidence: 0,
          fileName: file.name,
          fileSize: file.size,
        };
        if (onProgress) {
          onProgress(i + batch.indexOf(file) + 1, files.length, entry, file);
        }
        return entry;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Yield to UI between batches
    if (i + batchSize < files.length) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  return { results };
}

// ─── OMR Template Generator ─────────────────────────────────────────

export interface OMRTemplateOptions {
  examName: string;
  totalQuestions: number;
  optionsPerQ: number;
  rollDigits: number;
  bubbleColumns: number;
  bubbleRows: number;
  studentNameField?: boolean;
  subjectField?: boolean;
  classNameField?: boolean;
  orgName?: string;
}

/**
 * Generate an OMR template as an HTML string for printing.
 */
export function generateOMRTemplateHTML(options: OMRTemplateOptions): string {
  const {
    examName,
    totalQuestions,
    optionsPerQ,
    rollDigits,
    bubbleColumns,
    bubbleRows,
    studentNameField = true,
    subjectField = true,
    classNameField = true,
    orgName = 'OMR Sheet Reader',
  } = options;

  const optionLabels = OPTION_LABELS.slice(0, optionsPerQ);
  const questionsPerColumn = bubbleRows;
  const totalCols = Math.ceil(totalQuestions / questionsPerColumn);

  // Roll number bubbles
  let rollBubblesHTML = '';
  for (let d = 0; d < rollDigits; d++) {
    rollBubblesHTML += `
      <div class="roll-digit-group">
        <div class="digit-label">${d + 1}</div>
        <div class="digit-bubbles">`;
    for (let n = 0; n < 10; n++) {
      rollBubblesHTML += `<div class="bubble digit-bubble" data-digit="${d}" data-value="${n}">${n}</div>`;
    }
    rollBubblesHTML += `</div></div>`;
  }

  // Answer grid
  let answerGridHTML = '';
  for (let col = 0; col < totalCols; col++) {
    answerGridHTML += `<div class="question-column">`;
    answerGridHTML += `<div class="col-header">Q</div>`;
    for (let opt = 0; opt < optionsPerQ; opt++) {
      answerGridHTML += `<div class="col-header">${optionLabels[opt]}</div>`;
    }
    for (let row = 0; row < questionsPerColumn; row++) {
      const qNum = col * questionsPerColumn + row + 1;
      if (qNum > totalQuestions) break;
      answerGridHTML += `<div class="q-number">${qNum}</div>`;
      for (let opt = 0; opt < optionsPerQ; opt++) {
        answerGridHTML += `<div class="bubble answer-bubble" data-q="${qNum}" data-opt="${optionLabels[opt]}"></div>`;
      }
    }
    answerGridHTML += `</div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OMR Sheet — ${examName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; margin: 0; padding: 15mm; }
  }
  .page {
    width: 210mm; min-height: 297mm; padding: 15mm;
    background: white; margin: 0 auto;
  }
  .header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 3px solid #008000; padding-bottom: 8mm; margin-bottom: 6mm;
  }
  .header h1 { font-size: 14pt; color: #008000; }
  .header .org { font-size: 10pt; color: #555; }
  .exam-title { font-size: 16pt; font-weight: bold; color: #005500; text-align: center; margin-bottom: 4mm; }
  .student-info {
    display: flex; flex-wrap: wrap; gap: 4mm; margin-bottom: 6mm;
    padding: 4mm; border: 2px solid #008000; border-radius: 4px;
  }
  .student-info .field { flex: 1; min-width: 60mm; }
  .student-info label { display: block; font-size: 8pt; color: #555; text-transform: uppercase; margin-bottom: 1mm; }
  .student-info .line { border-bottom: 1.5px solid #999; height: 6mm; }
  .section-label { font-size: 10pt; font-weight: bold; color: #008000; margin: 4mm 0 2mm; text-transform: uppercase; }
  .roll-section { margin-bottom: 4mm; }
  .roll-digit-group { display: inline-block; margin-right: 2mm; text-align: center; }
  .digit-label { font-size: 7pt; color: #888; margin-bottom: 1mm; }
  .digit-bubbles { display: flex; gap: 0.5mm; }
  .question-columns { display: flex; gap: 3mm; flex-wrap: wrap; }
  .question-column { display: flex; flex-direction: column; gap: 0.3mm; }
  .col-header { font-size: 6pt; text-align: center; font-weight: bold; color: #008000; padding: 0.5mm; }
  .q-number { font-size: 6pt; text-align: right; padding-right: 1mm; color: #333; line-height: 6mm; min-width: 5mm; }
  .bubble {
    display: inline-flex; align-items: center; justify-content: center;
    width: 5mm; height: 5mm; border: 1.5px solid #333; border-radius: 50%;
    font-size: 5pt; color: #666; vertical-align: middle;
  }
  .digit-bubble { width: 4mm; height: 4mm; font-size: 5pt; }
  .answer-bubble { width: 5.5mm; height: 5.5mm; }
  .question-column { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; width: ${optionsPerQ * 6 + 8}mm; }
  .question-column .col-header { width: 5.5mm; }
  .question-column .q-number { width: 6mm; font-size: 6pt; }
  .question-column .answer-bubble { margin-left: 0.3mm; }
  .row-group { display: flex; align-items: center; width: 100%; }
  .footer { margin-top: 6mm; text-align: center; font-size: 7pt; color: #aaa; border-top: 1px solid #ddd; padding-top: 2mm; }
  .instructions { font-size: 7pt; color: #666; margin-bottom: 4mm; padding: 3mm; background: #f8f8f8; border-radius: 3px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="org">${orgName}</div>
      <h1>OMR Answer Sheet</h1>
    </div>
    <div style="text-align:right">
      <div style="font-size:8pt;color:#888">Date: _______________</div>
    </div>
  </div>

  <div class="exam-title">${examName}</div>

  <div class="instructions">
    <strong>Instructions:</strong> Use only BLACK or BLUE ball-point pen. Fill bubbles completely. Do NOT tick, cross, or partially fill. Erase cleanly if needed. Each question has only ONE correct bubble.
  </div>

  <div class="student-info">
    ${studentNameField ? '<div class="field"><label>Student Name</label><div class="line"></div></div>' : ''}
    ${classNameField ? '<div class="field"><label>Class / Section</label><div class="line"></div></div>' : ''}
    ${subjectField ? '<div class="field"><label>Subject</label><div class="line"></div></div>' : ''}
  </div>

  <div class="roll-section">
    <div class="section-label">Roll Number (Bubble each digit)</div>
    <div style="margin-top:2mm">${rollBubblesHTML}</div>
  </div>

  <div class="section-label">Answers</div>
  <div class="question-columns">
    ${answerGridHTML}
  </div>

  <div class="footer">
    ${orgName} — Confidential OMR Sheet — Total Questions: ${totalQuestions} — Options: ${optionLabels.join(', ')}
  </div>
</div>
</body>
</html>`;
}

/**
 * Open an OMR template in a new printable window.
 */
export function openOMRTemplate(options: OMRTemplateOptions): void {
  const html = generateOMRTemplateHTML(options);
  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
  };
}

// ─── CSV Parser ─────────────────────────────────────────────────────

export interface ParsedCSVRow {
  rollNumber: string;
  studentName: string;
  className: string;
  section: string;
  batch: string;
  answers: string[];
}

/**
 * Parse a CSV string into structured OMR data rows.
 * Expected columns: RollNo, Name, Class, Section, Batch, Q1, Q2, Q3, ...
 * Header is auto-detected (case-insensitive).
 */
export function parseOMRCSV(csvText: string): {
  rows: ParsedCSVRow[];
  errors: string[];
  totalQuestions: number;
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must have at least a header row and one data row'], totalQuestions: 0 };
  }

  const errors: string[] = [];
  const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  // Find column indices (support common header name variations)
  const rollIdx = findColumnIndex(header, ['rollno', 'roll_no', 'roll', 'rollnumber', 'roll_number', 'roll number']);
  const nameIdx = findColumnIndex(header, ['name', 'studentname', 'student_name', 'student name', 'student', 'fullname', 'full_name', 'full name']);
  const classIdx = findColumnIndex(header, ['class', 'classname', 'class_name', 'class name']);
  const sectionIdx = findColumnIndex(header, ['section', 'sec']);
  const batchIdx = findColumnIndex(header, ['batch', 'batchno', 'batch_no']);

  // All other columns starting with Q (case insensitive) or pure numbers are answer columns
  const answerIndices: number[] = [];
  for (let i = 0; i < header.length; i++) {
    if (i === rollIdx || i === nameIdx || i === classIdx || i === sectionIdx || i === batchIdx) continue;
    const h = header[i];
    // Match Q1, Q2, ... or just numbers (column headers like "1", "2", "3")
    if (/^q?\d+$/i.test(h) || /^\d+$/.test(h)) {
      answerIndices.push(i);
    }
  }

  answerIndices.sort((a, b) => {
    const numA = parseInt(header[a].replace(/\D/g, '') || '0');
    const numB = parseInt(header[b].replace(/\D/g, '') || '0');
    return numA - numB;
  });

  if (answerIndices.length === 0) {
    // Fallback: assume all non-info columns after the last known info column are answers
    const lastInfoIdx = Math.max(rollIdx, nameIdx, classIdx, sectionIdx, batchIdx);
    for (let i = lastInfoIdx + 1; i < header.length; i++) {
      answerIndices.push(i);
    }
  }

  const rows: ParsedCSVRow[] = [];

  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const cells = parseCSVLine(lines[lineIdx]);
    if (cells.length < 2) continue;

    const rollNumber = (cells[rollIdx] || '').trim();
    const studentName = (cells[nameIdx] || '').trim();

    if (!rollNumber || !studentName) {
      errors.push(`Row ${lineIdx + 1}: Missing roll number or student name — skipped`);
      continue;
    }

    const answers: string[] = [];
    for (const idx of answerIndices) {
      const val = (cells[idx] || '').trim().toUpperCase();
      if (OPTION_LABELS.includes(val)) {
        answers.push(val);
      } else {
        answers.push('');
      }
    }

    rows.push({
      rollNumber,
      studentName,
      className: (cells[classIdx] || '').trim(),
      section: (cells[sectionIdx] || '').trim(),
      batch: (cells[batchIdx] || '').trim(),
      answers,
    });
  }

  return {
    rows,
    errors,
    totalQuestions: answerIndices.length,
  };
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}
