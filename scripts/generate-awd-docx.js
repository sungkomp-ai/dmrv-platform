/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Generate AWD Carbon Credit Assessment Model Documentation (Word)
 * Recipe: R1 + Palette FG-1 (Forest Mint - ESG/environmental/sustainability/agriculture)
 * Language: Thai + English technical terms
 */

const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, PageBreak,
  Table, TableRow, TableCell, TableLayoutType, WidthType,
  BorderStyle, ShadingType, SectionType, PageOrientation,
  TableOfContents, LevelFormat, NumberFormat,
} = require('docx');
const fs = require('fs');

// ─── Palette: FG-1 Forest Mint (ESG / environmental / sustainability / agriculture) ───
const P = {
  bg: '0C1F1A',
  primary: 'FFFFFF',
  accent: '3DDBB5',
  cover: { titleColor: 'FFFFFF', subtitleColor: 'B0B8C0', metaColor: '90989F', footerColor: '687078' },
  table: { headerBg: '2A7A65', headerText: 'FFFFFF', accentLine: '2A7A65', innerLine: 'C5D8D0', surface: 'EDF5F2' },
};

// ─── Cover constants ───
const NB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ─── Helpers ───
function calcTitleLayout(title, maxWidthTwips, preferredPt = 36, minPt = 22) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    const cpl = charsPerLine(minPt);
    lines = splitTitleLines(title, cpl);
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([...'\uFF0C\u3002\u3001\uFF1B\uFF1A\uFF01\uFF1F', ...' \t', ...'-_\u2014\u2013\u00B7/']);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838,
    marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

// ─── Recipe R1: Pure Paragraph Cover (Left-Aligned) ───
function buildCoverR1(config) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 36, 22);
  const titleSize = titlePt * 2;

  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length,
    fixedHeight: 400,
  });

  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];

  // 1. Top whitespace
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));

  // 2. English label
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({
        text: config.englishLabel.split('').join('  '),
        size: 18, color: P.accent,
        font: { ascii: 'Calibri', eastAsia: 'SimHei' },
        characterSpacing: 40,
      })],
    }));
  }

  // 3. Title
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: 'atLeast' },
      children: [new TextRun({
        text: titleLines[i], size: titleSize, bold: true,
        color: P.cover.titleColor,
        font: { eastAsia: 'SimHei', ascii: 'Arial' },
      })],
    }));
  }

  // 4. Subtitle
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({
        text: config.subtitle, size: 24, color: P.cover.subtitleColor,
        font: { eastAsia: 'Microsoft YaHei', ascii: 'Arial' },
      })],
    }));
  }

  // 5. Meta info lines
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({
        text: line, size: 24, color: P.cover.metaColor,
        font: { eastAsia: 'Microsoft YaHei', ascii: 'Arial' },
      })],
    }));
  }

  // 6. Bottom whitespace
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  // 7. Footer
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || '', size: 16, color: P.cover.footerColor, font: { ascii: 'Arial' } }),
      new TextRun({ text: '                                        ' }),
      new TextRun({ text: config.footerRight || '', size: 16, color: P.cover.footerColor, font: { ascii: 'Arial' } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: 'exact' },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg },
        borders: noBorders,
        children,
      })],
    })],
  })];
}

// ─── Body element builders ───
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.LEFT,
    spacing: { before: 480, after: 240, line: 360 },
    keepNext: true,
    children: [new TextRun({
      text, bold: true, size: 32, color: '0C1F1A',
      font: { ascii: 'Calibri', eastAsia: 'SimHei' },
    })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 180, line: 340 },
    keepNext: true,
    children: [new TextRun({
      text, bold: true, size: 28, color: '0C1F1A',
      font: { ascii: 'Calibri', eastAsia: 'SimHei' },
    })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 280, after: 140, line: 320 },
    keepNext: true,
    children: [new TextRun({
      text, bold: true, size: 26, color: '2A7A65',
      font: { ascii: 'Calibri', eastAsia: 'SimHei' },
    })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: opts.noIndent ? {} : { firstLine: 480 },
    spacing: { line: 312, after: 80 },
    children: [new TextRun({
      text, size: 24, color: '000000',
      font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' },
    })],
  });
}

function bodyMixed(runs, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: opts.noIndent ? {} : { firstLine: 480 },
    spacing: { line: 312, after: 80 },
    children: runs.map(r => new TextRun({
      text: r.text, size: 24, bold: r.bold, italics: r.italics,
      color: r.color || '000000',
      font: r.mono ? { ascii: 'Consolas', eastAsia: 'Consolas' } : { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' },
    })),
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { line: 312, after: 60 },
    children: [new TextRun({
      text, size: 24, color: '000000',
      font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' },
    })],
  });
}

function codeBlock(text) {
  const lines = text.split('\n');
  return new Paragraph({
    spacing: { before: 120, after: 120, line: 280 },
    shading: { type: ShadingType.CLEAR, fill: 'F0F4F2' },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '2A7A65', space: 4 },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '2A7A65', space: 4 },
      left: { style: BorderStyle.SINGLE, size: 12, color: '2A7A65', space: 6 },
      right: { style: BorderStyle.SINGLE, size: 4, color: '2A7A65', space: 4 },
    },
    children: lines.flatMap((line, i) => {
      const runs = [new TextRun({
        text: line, size: 20, color: '0C1F1A',
        font: { ascii: 'Consolas', eastAsia: 'Consolas' },
      })];
      if (i < lines.length - 1) runs.push(new TextRun({ break: 1 }));
      return runs;
    }),
  });
}

// ─── Table builder (Horizontal-Only style) ───
function buildTable(headers, rows, opts = {}) {
  const colWidths = opts.colWidths || headers.map(() => Math.floor(100 / headers.length));

  const headerCells = headers.map((text, i) => new TableCell({
    width: { size: colWidths[i], type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 280 },
      children: [new TextRun({
        text, bold: true, size: 22, color: P.table.headerText,
        font: { ascii: 'Calibri', eastAsia: 'SimHei' },
      })],
    })],
  }));

  const dataRows = rows.map((row, idx) => new TableRow({
    cantSplit: true,
    children: row.map((cell, i) => new TableCell({
      width: { size: colWidths[i], type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? P.table.surface : 'FFFFFF' },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
      },
      children: [new Paragraph({
        alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
        spacing: { line: 280 },
        children: [new TextRun({
          text: String(cell ?? ''), size: 20, color: '000000',
          font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' },
        })],
      })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: P.table.accentLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headerCells }),
      ...dataRows,
    ],
  });
}

function tableCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 180, after: 80 },
    keepNext: true,
    children: [new TextRun({
      text, italics: true, size: 20, color: '506070',
      font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' },
    })],
  });
}

// ─── Document Body ───
const bodyChildren = [];

// ===== 1. ภาพรวมโมเดล =====
bodyChildren.push(h1('1. ภาพรวมโมเดลการประเมินคาร์บอนเครดิต AWD'));
bodyChildren.push(body(
  'เอกสารฉบับนี้อธิบายโมเดลการประเมินคาร์บอนเครดิตสำหรับการปลูกข้าวด้วยวิธี AWD (Alternate Wetting and Drying) ซึ่งเป็นระบบจำลองการทำงานของแปลงนาข้าวในประเทศไทยจำนวน 3 แปลง ครอบคลุมสภาพแวดล้อมที่แตกต่างกัน ได้แก่ นาชลประทาน นาน้ำฝน และนาแล้ง โดยใช้มาตรฐาน T-VER-P-AG-001 ขององค์การแก๊สเรือนกระจก (TGO) เป็นเกณฑ์หลักในการคำนวณ'
));
bodyChildren.push(body(
  'AWD เป็นเทคนิคการปลูกข้าวที่สลับระหว่างช่วงน้ำท่วมและช่วงแห้ง เพื่อลดการปล่อยก๊าซมีเทน (CH4) จากนาข้าว ซึ่งเป็นก๊าซเรือนกระจกที่มีศักยภาพในการทำให้โลกร้อนสูง (GWP = 28 เท่าของ CO2) การประเมินเครดิตคาร์บอนจะคำนวณโดยเปรียบเทียบก๊าซที่ปล่อยจริงในโครงการ AWD กับ baseline ที่สมมติว่าปลูกข้าวแบบท่วมตลอด (Continuous Flooding) ความแตกต่างที่ลดลงคือเครดิตคาร์บอนที่ได้รับ'
));
bodyChildren.push(body(
  'ไฟล์หลักของระบบ: mini-services/awd-simulator/index.ts (1,187 บรรทัด) ทำงานบนพอร์ต 3032 ให้บริการผ่าน Socket.IO สำหรับ dashboard แบบเรียลไทม์ และ MQTT สำหรับส่งข้อมูลไปยัง broker ภายนอกที่ 35.213.186.240:1883'
));

// ===== 2. มาตรฐานและข้อมูลอ้างอิง =====
bodyChildren.push(h1('2. มาตรฐานและข้อมูลอ้างอิง'));

bodyChildren.push(h2('2.1 มาตรฐานหลักที่ใช้'));
bodyChildren.push(body('โมเดลอ้างอิงมาตรฐานและแนวทางปฏิบัติดังต่อไปนี้:'));
bodyChildren.push(buildTable(
  ['มาตรฐาน', 'องค์กรผู้ออก', 'การใช้งานในโมเดล'],
  [
    ['T-VER-P-AG-001', 'TGO (องค์การแก๊สเรือนกระจก)', 'วิธีการคำนวณหลักสำหรับโครงการ AWD ในไทย'],
    ['TGO Guidelines for Rice Cultivation MRV (2566)', 'TGO', 'แนวทางการวัด รายงาน และตรวจสอบ (MRV)'],
    ['IPCC AR5', 'IPCC (Intergovernmental Panel on Climate Change)', 'ค่า Global Warming Potential (GWP)'],
    ['IPCC 2006 GL Vol. 4 Ch. 11', 'IPCC', 'การปล่อย N2O จากดินที่ถูกจัดการ'],
  ],
  { colWidths: [35, 30, 35] }
));
bodyChildren.push(tableCaption('ตารางที่ 1: มาตรฐานอ้างอิงหลักของโมเดล AWD'));

bodyChildren.push(h2('2.2 ค่า Global Warming Potential (GWP)'));
bodyChildren.push(body('โมเดลใช้ค่า GWP ตาม IPCC AR5 ซึ่งเป็นค่าที่ TGO ประกาศใช้ในปี 2566:'));
bodyChildren.push(codeBlock(
  'const GWP_CH4 = 28;     // 1 kg CH4 = 28 kg CO2e (100-year horizon)\n' +
  'const GWP_N2O = 265;    // 1 kg N2O = 265 kg CO2e'
));
bodyChildren.push(body(
  'ค่าเดิมใน IPCC AR4 ใช้ CH4 = 25 และ N2O = 298 แต่ TGO ปรับมาใช้ค่า AR5 ในปี 2566'
));

bodyChildren.push(h2('2.3 Baseline Emission Factor (EF) — Continuous Flooding'));
bodyChildren.push(body(
  'ค่าพื้นฐานกรณีปลูกข้าวแบบท่วมตลอด (baseline เพื่อเปรียบเทียบ) แบ่งตามประเภทนาข้าว 3 แบบ:'
));
bodyChildren.push(buildTable(
  ['ประเภทนา', 'EF (kg CH4/ha/day)', 'ค่าคงที่ในโค้ด'],
  [
    ['นาชลประทาน', '1.30', 'TVER_EF_CF_IRRIGATED'],
    ['นาน้ำฝน', '1.00', 'TVER_EF_CF_RAINFED'],
    ['นาแล้ง', '0.70', 'TVER_EF_CF_DRY'],
  ],
  { colWidths: [40, 30, 30] }
));
bodyChildren.push(tableCaption('ตารางที่ 2: Baseline Emission Factor สำหรับ Continuous Flooding'));

bodyChildren.push(h2('2.4 ค่าแปลงหน่วย (Unit Conversion Constants)'));
bodyChildren.push(codeBlock(
  '// 1 mg/m2/hr x 10000 m2/ha / 1e6 mg/kg x 24 hr/day = 0.24 kg/ha/day\n' +
  'const MG_M2_HR_TO_KG_HA_DAY = 0.24;\n\n' +
  '// kg CH4 -> tCO2e: kg x GWP / 1000\n' +
  'const KG_CH4_TO_TCO2E = GWP_CH4 / 1000;   // 0.028\n' +
  'const KG_N2O_TO_TCO2E = GWP_N2O / 1000;   // 0.265'
));

// ===== 3. พื้นที่ทดลอง 3 แปลง =====
bodyChildren.push(h1('3. พื้นที่ทดลอง 3 แปลง'));
bodyChildren.push(body(
  'ระบบจำลอง 3 แปลงนาข้าว AWD ในประเทศไทยที่มีสภาพแวดล้อมต่างกัน เพื่อให้ครอบคลุมกรณีศึกษาหลากหลาย ตั้งแต่นาชลประทานที่มีน้ำอุดมสมบูรณ์ ไปจนถึงนาแล้งที่ต้องพึ่งพาฝนธรรมชาติ'
));

bodyChildren.push(h2('3.1 ข้อมูลพื้นฐานของแต่ละแปลง'));
bodyChildren.push(buildTable(
  ['รหัส', 'จังหวัด', 'พื้นที่ (ha)', 'ดิน', 'แหล่งน้ำ', 'พันธุ์ข้าว', 'ฤดูกาล (วัน)'],
  [
    ['awd-korat', 'นครราชสีมา', '48', 'ร่วนปนทราย', 'ชลประทาน (ลำตะคอง)', 'หอมมะลิ 105', '120'],
    ['awd-suphan', 'สุพรรณบุรี', '32', 'เหนียว', 'ฝน + สูบสำรอง', 'ปทุมธานี 1', '105'],
    ['awd-ubon', 'อุบลราชธานี', '25', 'ทราย', 'ฝนเท่านั้น', 'กข 43', '95'],
  ],
  { colWidths: [13, 15, 10, 13, 19, 15, 15] }
));
bodyChildren.push(tableCaption('ตารางที่ 3: ข้อมูลพื้นฐานของ 3 แปลงนาข้าว AWD'));

bodyChildren.push(h2('3.2 พารามิเตอร์ AWD ของแต่ละแปลง'));
bodyChildren.push(body('พารามิเตอร์การจัดการน้ำแตกต่างกันตามสภาพแวดล้อมและแหล่งน้ำ:'));
bodyChildren.push(buildTable(
  ['พารามิเตอร์', 'นครราชสีมา', 'สุพรรณบุรี', 'อุบลราชธานี'],
  [
    ['floodTargetCm (cm)', '10', '12', '8'],
    ['dryThresholdCm (cm)', '-15', '-12', '-18'],
    ['floodDays (วัน)', '7', '6', '5'],
    ['dryDays (วัน)', '5', '4', '6'],
    ['annualRainfallMm (mm)', '1,100', '1,400', '800'],
    ['baseTempMin/Max (C)', '22 / 34', '24 / 35', '23 / 36'],
  ],
  { colWidths: [28, 24, 24, 24] }
));
bodyChildren.push(tableCaption('ตารางที่ 4: พารามิเตอร์ AWD ของ 3 แปลง'));

// ===== 4. วงจร AWD =====
bodyChildren.push(h1('4. วงจร AWD (4 Phases)'));
bodyChildren.push(body(
  'วงจร AWD ประกอบด้วย 4 ระยะที่สลับกันไปตลอดฤดูกาลปลูกข้าว การเปลี่ยนระยะขึ้นอยู่กับระดับน้ำและจำนวนวันที่กำหนดไว้สำหรับแต่ละระยะ'
));

bodyChildren.push(h2('4.1 ลำดับการเปลี่ยนระยะ (Phase Transitions)'));
bodyChildren.push(bullet('FLOODED -> DRAINING: เมื่อครบ floodDays (เช่น 7 วัน)'));
bodyChildren.push(bullet('DRAINING -> DRY: เมื่อ waterLevel <= dryThresholdCm (เช่น -15 cm)'));
bodyChildren.push(bullet('DRY -> REFLOODING: เมื่อครบ dryDays (เช่น 5 วัน) หรือฝนตกหนัก > 5 mm/hr'));
bodyChildren.push(bullet('REFLOODING -> FLOODED: เมื่อ waterLevel >= floodTargetCm -> นับเป็น 1 AWD cycle'));

bodyChildren.push(h2('4.2 คำอธิบายแต่ละระยะ'));
bodyChildren.push(buildTable(
  ['ระยะ', 'สถานะระดับน้ำ', 'ผลต่อการปล่อยก๊าซ'],
  [
    ['FLOODED', 'ท่วมขัง (+10 cm)', 'CH4 สูงสุด (anaerobic), N2O ต่ำ'],
    ['DRAINING', 'ลดลงเรื่อยๆ', 'CH4 ลดลง, N2O เริ่ม spike'],
    ['DRY', 'แห้ง (-15 cm)', 'CH4 ต่ำสุด (aerobic), N2O กลาง'],
    ['REFLOODING', 'เพิ่มขึ้นกลับ', 'CH4 กลับมา, N2O spike สูงสุด!'],
  ],
  { colWidths: [20, 30, 50] }
));
bodyChildren.push(tableCaption('ตารางที่ 5: ระยะต่างๆ ของวงจร AWD และผลกระทบต่อการปล่อยก๊าซ'));

bodyChildren.push(body(
  'Trade-off สำคัญ: AWD ลด CH4 ได้มาก แต่จะเพิ่ม N2O ในช่วง DRAIN และ REFLOOD เนื่องจากกระบวนการ nitrification-denitrification ดังนั้นโมเดลต้องคำนวณทั้งสองก๊าซเพื่อให้ได้ค่า net GHG ที่ถูกต้อง'
));

// ===== 5. โมเดลการปล่อยก๊าซ =====
bodyChildren.push(h1('5. โมเดลการปล่อยก๊าซ (Emission Models)'));

bodyChildren.push(h2('5.1 โมเดล CH4 (มีเทน)'));
bodyChildren.push(body(
  'CH4 ปล่อยมากตอนน้ำท่วมและลดลงมากตอนแห้ง ซึ่งเป็นกลไกหลักที่ AWD ช่วยลดการปล่อยมีเทน โมเดลคำนวณ flux ของ CH4 เป็น mg/m2/hr จากปัจจัย 4 ตัว:'
));
bodyChildren.push(codeBlock(
  'CH4_flux (mg/m2/hr) = baseFlux(stage) x waterFactor(phase) x tempFactor x soilFactor'
));

bodyChildren.push(h3('5.1.1 baseFlux ตาม Growth Stage'));
bodyChildren.push(buildTable(
  ['Stage', '% ของฤดูกาล', 'baseFlux (mg/m2/hr)'],
  [
    ['GERMINATION', '0-5%', '2'],
    ['TILLERING', '5-20%', '15'],
    ['STEM_ELONGATION', '20-40%', '25'],
    ['BOOTING', '40-55%', '30 (peak)'],
    ['FLOWERING', '55-65%', '28'],
    ['GRAIN_FILLING', '65-85%', '18'],
    ['MATURITY', '85-100%', '8'],
    ['HARVESTED', '>100%', '1'],
  ],
  { colWidths: [35, 30, 35] }
));
bodyChildren.push(tableCaption('ตารางที่ 6: baseFlux ของ CH4 ตามช่วงเจริญเติบโตของข้าว'));

bodyChildren.push(h3('5.1.2 waterFactor ตาม AWD Phase'));
bodyChildren.push(buildTable(
  ['Phase', 'waterFactor', 'คำอธิบาย'],
  [
    ['FLOODED', '1.0', 'สภาพพื้นฐาน (anaerobic)'],
    ['DRAINING', '0.6', 'เริ่มลด'],
    ['DRY', '0.15', 'ลดมากที่สุด (aerobic) — ประโยชน์หลักของ AWD'],
    ['REFLOODING', '0.7', 'กลับมาเพิ่ม'],
  ],
  { colWidths: [20, 20, 60] }
));
bodyChildren.push(tableCaption('ตารางที่ 7: waterFactor ของ CH4 ตามระยะ AWD'));

bodyChildren.push(h3('5.1.3 tempFactor และ soilFactor'));
bodyChildren.push(codeBlock(
  'tempFactor = 1 + (temp - 28) x 0.03   // 28C = baseline, อุณหภูมิสูงขึ้น 1C -> CH4 เพิ่ม 3%'
));
bodyChildren.push(buildTable(
  ['ดิน', 'soilFactor', 'หมายเหตุ'],
  [
    ['Clay (เหนียว)', '1.3', 'ปล่อย CH4 มากกว่า'],
    ['Loam (ร่วน)', '1.0', 'ค่ามาตรฐาน'],
    ['Sandy (ทราย)', '0.7', 'ปล่อย CH4 น้อยกว่า'],
  ],
  { colWidths: [30, 20, 50] }
));
bodyChildren.push(tableCaption('ตารางที่ 8: soilFactor ของ CH4 ตามชนิดดิน'));

bodyChildren.push(h2('5.2 โมเดล N2O (ไนตรัสออกไซด์)'));
bodyChildren.push(body(
  'N2O เพิ่มตอน DRAIN และ REFLOOD เนื่องจากกระบวนการ nitrification-denitrification ที่เกิดขึ้นในช่วงที่ดินมีความชื้นเปลี่ยนแปลง โมเดลคำนวณดังนี้:'
));
bodyChildren.push(codeBlock(
  'N2O_flux = baseFlux(stage) x phaseFactor x soilFactor'
));

bodyChildren.push(h3('5.2.1 baseFlux ของ N2O ตาม Growth Stage'));
bodyChildren.push(buildTable(
  ['Stage', 'baseFlux (mg/m2/hr)'],
  [
    ['GERMINATION', '0.3'],
    ['TILLERING', '1.2'],
    ['STEM_ELONGATION', '1.5'],
    ['BOOTING', '1.8 (peak)'],
    ['FLOWERING', '1.5'],
    ['GRAIN_FILLING', '1.0'],
    ['MATURITY', '0.5'],
    ['HARVESTED', '0.1'],
  ],
  { colWidths: [50, 50] }
));
bodyChildren.push(tableCaption('ตารางที่ 9: baseFlux ของ N2O ตามช่วงเจริญเติบโต'));

bodyChildren.push(h3('5.2.2 phaseFactor — N2O Spike!'));
bodyChildren.push(buildTable(
  ['Phase', 'phaseFactor', 'คำอธิบาย'],
  [
    ['FLOODED', '0.5', 'ต่ำ (anaerobic)'],
    ['DRAINING', '2.5', 'spike! (nitrification)'],
    ['DRY', '1.2', 'กลาง'],
    ['REFLOODING', '2.8', 'spike สูงสุด! (denitrification)'],
  ],
  { colWidths: [25, 20, 55] }
));
bodyChildren.push(tableCaption('ตารางที่ 10: phaseFactor ของ N2O แสดง spike ในช่วง DRAIN/REFLOOD'));

bodyChildren.push(h2('5.3 โมเดล CO2 (Soil Respiration)'));
bodyChildren.push(body('CO2 จากการหายใจของจุลินทรีย์ในดิน คำนวณด้วย Q10 model:'));
bodyChildren.push(codeBlock(
  'CO2_flux = baseFlux(stage) x exp(0.05 x (temp - 25)) x moistureFactor'
));
bodyChildren.push(body(
  'moistureFactor: 1.2 (>60% moisture), 1.0 (30-60%), 0.7 (<30%)'
));

// ===== 6. การคำนวณเครดิตคาร์บอน =====
bodyChildren.push(h1('6. การคำนวณเครดิตคาร์บอน (Carbon Credit Calculation)'));

bodyChildren.push(h2('6.1 Step 1: แปลง Flux -> kg/ha รายชั่วโมง'));
bodyChildren.push(codeBlock(
  'ch4KgPerHaThisHour = ch4Flux x 0.24 / 24    // mg/m2/hr -> kg/ha for 1 hr\n' +
  'n2oKgPerHaThisHour = n2oFlux x 0.24 / 24'
));

bodyChildren.push(h2('6.2 Step 2: คูณด้วยพื้นที่ -> kg รวมต่อชั่วโมง'));
bodyChildren.push(codeBlock(
  'ch4KgThisHour = ch4KgPerHaThisHour x areaHa\n' +
  'n2oKgThisHour = n2oKgPerHaThisHour x areaHa'
));

bodyChildren.push(h2('6.3 Step 3: สะสม -> kg รวมตลอดฤดูกาล'));
bodyChildren.push(codeBlock(
  'field.totalCH4kg += ch4KgThisHour\n' +
  'field.totalN2Okg += n2oKgThisHour'
));

bodyChildren.push(h2('6.4 Step 4: แปลง -> tCO2e (หน่วยเครดิต T-VER)'));
bodyChildren.push(codeBlock(
  'field.totalCH4tCO2e = totalCH4kg x GWP_CH4 / 1000   // x 28 / 1000\n' +
  'field.totalN2OtCO2e = totalN2Okg x GWP_N2O / 1000   // x 265 / 1000'
));

bodyChildren.push(h2('6.5 Step 5: คำนวณ Net GHG (รวม CO2 offset)'));
bodyChildren.push(body(
  '30% ของ CO2 จาก soil respiration ถูกดูดซับโดยพืช (offset) จึงต้องหักออกจาก net emission:'
));
bodyChildren.push(codeBlock(
  'co2KgThisHour = co2Flux x areaM2 / 1e6\n' +
  'field.totalNettCO2e = totalCH4tCO2e + totalN2OtCO2e - (co2KgThisHour / 1000 x 0.3)'
));

bodyChildren.push(h2('6.6 Step 6: Baseline (ถ้าปลูกแบบท่วมตลอด)'));
bodyChildren.push(codeBlock(
  'baselineEF = waterSource.includes("ชลประทาน") ? 1.30 :   // นาชลประทาน\n' +
  '             waterSource.includes("ฝนเท่านั้น") ? 0.70 :   // นาแล้ง\n' +
  '             1.00;                                            // นาน้ำฝน\n\n' +
  'baselineCH4KgPerDay = baselineEF x areaHa\n' +
  'baselineCH4KgThisHour = baselineCH4KgPerDay / 24\n' +
  'field.baselineEmissiontCO2e += baselineCH4KgThisHour x KG_CH4_TO_TCO2E'
));

bodyChildren.push(h2('6.7 Step 7: Emission Reduction = Carbon Credit'));
bodyChildren.push(codeBlock(
  'field.emissionReductiontCO2e = Math.max(0,\n' +
  '  field.baselineEmissiontCO2e - field.totalNettCO2e\n' +
  ')'
));
bodyChildren.push(bodyMixed([
  { text: 'นี่คือ "เครดิตคาร์บอน" ที่ขายได้ ', bold: false },
  { text: '= ก๊าซที่ลดได้เมื่อเทียบกับการปลูกแบบท่วมตลอด', bold: true, color: '2A7A65' },
]));

// ===== 7. โมเดลสิ่งแวดล้อม =====
bodyChildren.push(h1('7. โมเดลสิ่งแวดล้อม (Environmental Models)'));

bodyChildren.push(h2('7.1 อุณหภูมิ (Temperature)'));
bodyChildren.push(body('อุณหภูมิตามช่วงเวลาในรอบ 24 ชั่วโมง ใช้ sin curve:'));
bodyChildren.push(codeBlock(
  'temp = avgTemp + amplitude x sin(((hour - 5) / 24) x 2pi - pi/2) + noise\n' +
  '// Peak ที่ 14:00, ต่ำสุดที่ 05:00\n' +
  '// Amplitude = (max - min) / 2'
));

bodyChildren.push(h2('7.2 ฝนตก (Rainfall)'));
bodyChildren.push(body('ฝนตกเฉพาะช่วง 12:00-18:00 ของวัน ปริมาณขึ้นกับช่วงฤดูกาล:'));
bodyChildren.push(buildTable(
  ['ช่วง DAP', 'โอกาสฝนตก', 'คำอธิบาย'],
  [
    ['0-30 (ต้นฤดู)', '15%', 'ฝนเริ่มตก'],
    ['30-80 (กลางฤดู)', '40%', 'ฝนชุก'],
    ['80+ (ปลายฤดู)', '20%', 'ฝนลดลง'],
  ],
  { colWidths: [30, 25, 45] }
));
bodyChildren.push(tableCaption('ตารางที่ 11: โอกาสฝนตกตามช่วงวันหลังปลูก (DAP)'));
bodyChildren.push(body('ปริมาณฝน: 0.5-8 mm/hr คูณด้วย rainFactor = annualRainfallMm / 1400'));

bodyChildren.push(h2('7.3 ระดับน้ำ (Water Level Update)'));
bodyChildren.push(codeBlock(
  '// น้ำเข้า: ฝน\n' +
  'inflowMm = rainfall\n\n' +
  '// น้ำออก: ระเหย (ET) + ซึม (percolation)\n' +
  'dayETmm = 3 + (temp - 25) x 0.15       // mm/day\n' +
  'percMmPerDay = Sandy ? 8 : Clay ? 1.5 : 3.5\n\n' +
  '// ชลประทาน: เติมน้ำตอน 7:00 น. เมื่อ FLOODED/REFLOODING\n' +
  'if (waterSource includes "ชลประทาน" && phase in [FLOODED, REFLOODING] && hour === 7)\n' +
  '  irrigationCm = 0.5\n\n' +
  'waterLevelCm += (inflowMm - outflowMm) / 10 + irrigationCm'
));

bodyChildren.push(h2('7.4 ผลผลิตข้าว (Yield Estimation)'));
bodyChildren.push(codeBlock(
  'maxKgPerHa = KDML ? 3500 : RD43 ? 4200 : 4500\n' +
  'growthFactor = 1 / (1 + exp(-10 x (p - 0.5)))   // S-curve logistic\n' +
  'awdPenalty = 0.97                                  // AWD ลด 3%\n' +
  'droughtFactor = rainfed ? 0.75 : rainfed+backup ? 0.88 : 1.0\n\n' +
  'yieldKgPerHa = maxKgPerHa x growthFactor x awdPenalty x droughtFactor'
));

// ===== 8. ข้อมูลอ้างอิง =====
bodyChildren.push(h1('8. ข้อมูลอ้างอิงเชิงเทคนิค'));

bodyChildren.push(h2('8.1 ค่าพารามิเตอร์ที่อ้างอิง'));
bodyChildren.push(buildTable(
  ['พารามิเตอร์', 'ค่า', 'ที่มา'],
  [
    ['GWP CH4 (100-yr)', '28', 'IPCC AR5 / TGO 2566'],
    ['GWP N2O (100-yr)', '265', 'IPCC AR5 / TGO 2566'],
    ['EF CF Irrigated', '1.30 kg CH4/ha/day', 'T-VER-P-AG-001 (นาชลประทานไทย)'],
    ['EF CF Rainfed', '1.00 kg CH4/ha/day', 'T-VER-P-AG-001 (นาน้ำฝนไทย)'],
    ['EF CF Dry', '0.70 kg CH4/ha/day', 'T-VER-P-AG-001 (นาแล้งไทย)'],
    ['AWD CH4 reduction', '~40-70%', 'ขึ้นกับจำนวน cycles'],
    ['Root:Shoot ratio', '0.24 (evergreen)', 'IPCC Table 4.4'],
  ],
  { colWidths: [30, 30, 40] }
));
bodyChildren.push(tableCaption('ตารางที่ 12: ค่าพารามิเตอร์ทางเทคนิคและที่มา'));

bodyChildren.push(h2('8.2 ข้อมูลพันธุ์ข้าวไทย'));
bodyChildren.push(buildTable(
  ['พันธุ์ข้าว', 'ผลผลิตสูงสุด (kg/ha)', 'ฤดูกาล (วัน)', 'เหมาะกับ'],
  [
    ['KDML105 (หอมมะลิ)', '3,500', '120', 'นาชลประทาน'],
    ['PTT1 (ปทุมธานี 1)', '4,500', '105', 'นาน้ำฝน'],
    ['RD43 (กข 43)', '4,200', '95', 'นาแล้ง/ฝนตก'],
  ],
  { colWidths: [30, 25, 20, 25] }
));
bodyChildren.push(tableCaption('ตารางที่ 13: ข้อมูลพันธุ์ข้าวไทยที่ใช้ในโมเดล'));

// ===== 9. การบันทึกข้อมูล =====
bodyChildren.push(h1('9. การบันทึกข้อมูล (Data Recording)'));

bodyChildren.push(h2('9.1 MQTT Topics'));
bodyChildren.push(body('ข้อมูลทุก reading ถูกส่งไปยัง MQTT broker ที่ 35.213.186.240:1883 ผ่าน 3 topics:'));
bodyChildren.push(buildTable(
  ['Topic', 'คำอธิบาย', 'QoS'],
  [
    ['awd/readings', 'ทุก reading (batch topic)', '0'],
    ['awd/status', 'สถานะ simulation (retain)', '0'],
    ['awd/field/<fieldId>', 'แยกตามแปลง (เช่น awd/field/awd-korat)', '0'],
  ],
  { colWidths: [30, 50, 20] }
));
bodyChildren.push(tableCaption('ตารางที่ 14: MQTT topics สำหรับการส่งข้อมูล AWD'));

bodyChildren.push(h2('9.2 CSV Audit Trail (38 คอลัมน์)'));
bodyChildren.push(body('ไฟล์: mini-services/awd-simulator/data/awd-readings.csv'));
bodyChildren.push(bullet('ขนาดปัจจุบัน: 3.4 MB (3,525,225 bytes)'));
bodyChildren.push(bullet('ข้อมูลสภาพแวดล้อม: temp, humidity, rainfall, soil moisture, pH'));
bodyChildren.push(bullet('ค่า flux ทั้ง 3 ก๊าซ: CH4, N2O, CO2 (mg/m2/hr และ kg/ha/day)'));
bodyChildren.push(bullet('ค่าสะสม: cumulative kg และ tCO2e'));
bodyChildren.push(bullet('baseline และ emission reduction'));
bodyChildren.push(bullet('edgeNodeId, integrityHash (SHA-256), signature (HMAC-SHA256) — ตรวจสอบความถูกต้อง'));
bodyChildren.push(bullet('tverMethodology = T-VER-P-AG-001'));

bodyChildren.push(h2('9.3 Edge Authentication'));
bodyChildren.push(body(
  'ทุก reading ถูก sign ด้วย edge device token ที่ได้จาก IoT Gateway เพื่อให้ downstream consumers สามารถตรวจสอบความถูกต้องและความไม่ถูกแก้ไขของข้อมูลได้:'
));
bodyChildren.push(codeBlock(
  '{\n' +
  '  edgeNodeId: "EDGE-AWD-001",\n' +
  '  integrityHash: "SHA-256(reading JSON)",     // ตรวจจับการแก้ไข\n' +
  '  signature: "HMAC-SHA256(token, hash)",      // ยืนยันตัวตน edge device\n' +
  '  signatureAlgorithm: "HMAC-SHA256",\n' +
  '  hashAlgorithm: "SHA-256",\n' +
  '  tokenExpiresAt: "2026-07-12T13:15:00.000Z"\n' +
  '}'
));

// ===== 10. ตัวอย่างการคำนวณจริง =====
bodyChildren.push(h1('10. ตัวอย่างการคำนวณจริง'));
bodyChildren.push(body('สถานการณ์: นครราชสีมา วันที่ 30 (TILLERING), FLOODED, 14:00 น.'));

bodyChildren.push(h2('10.1 Input'));
bodyChildren.push(codeBlock(
  'stage = TILLERING, awdPhase = FLOODED\n' +
  'temp = 34C, soilType = Sandy Loam\n' +
  'areaHa = 48'
));

bodyChildren.push(h2('10.2 การคำนวณทีละขั้น'));
bodyChildren.push(h3('Step 1: CH4 flux'));
bodyChildren.push(codeBlock(
  'baseFlux = 15 (TILLERING)\n' +
  'waterFactor = 1.0 (FLOODED)\n' +
  'tempFactor = 1 + (34-28) x 0.03 = 1.18\n' +
  'soilFactor = 1.0 (Sandy Loam)\n' +
  'ch4Flux = 15 x 1.0 x 1.18 x 1.0 = 17.7 mg/m2/hr'
));

bodyChildren.push(h3('Step 2: kg/ha for 1 hour'));
bodyChildren.push(codeBlock('ch4KgPerHaThisHour = 17.7 x 0.24 / 24 = 0.177 kg/ha'));

bodyChildren.push(h3('Step 3: Total kg this hour (48 ha)'));
bodyChildren.push(codeBlock('ch4KgThisHour = 0.177 x 48 = 8.50 kg CH4'));

bodyChildren.push(h3('Step 4: tCO2e'));
bodyChildren.push(codeBlock('ch4tCO2e = 8.50 x 28 / 1000 = 0.238 tCO2e'));

bodyChildren.push(h3('Step 5: Baseline (continuous flooding)'));
bodyChildren.push(codeBlock(
  'baselineCH4KgThisHour = (1.30 x 48) / 24 = 2.6 kg CH4\n' +
  'baselineCO2e = 2.6 x 28 / 1000 = 0.0728 tCO2e'
));

bodyChildren.push(h3('Step 6: Emission reduction'));
bodyChildren.push(codeBlock(
  'emission reduction = baseline - project = 0.0728 - 0.0238 = 0.0490 tCO2e/hour\n' +
  'approx 0.049 x 24 = 1.18 tCO2e/day reduction'
));

bodyChildren.push(bodyMixed([
  { text: 'ตลอดฤดูกาล 120 วัน: ประมาณ ', bold: false },
  { text: '140 tCO2e ลดได้ต่อแปลง 48 ha', bold: true, color: '2A7A65' },
]));

// ===== 11. สรุป =====
bodyChildren.push(h1('11. สรุป'));
bodyChildren.push(body('โมเดล AWD Carbon Credit Assessment ของแพลตฟอร์ม dMRV มีจุดเด่นดังนี้:'));

bodyChildren.push(bullet('ใช้มาตรฐาน T-VER-P-AG-001 ของ TGO ประเทศไทย (ไม่ใช่ IPCC สากล)'));
bodyChildren.push(bullet('คำนวณ 3 ก๊าซ — CH4 (หลัก), N2O (trade-off), CO2 (offset)'));
bodyChildren.push(bullet('Baseline = Continuous Flooding เปรียบเทียบกับ AWD เพื่อหา emission reduction'));
bodyChildren.push(bullet('GWP IPCC AR5 (CH4=28, N2O=265) ตามประกาศ TGO 2566'));
bodyChildren.push(bullet('จำลอง 3 สภาพแวดล้อมไทยจริง — ชลประทาน, น้ำฝน, แล้ง'));
bodyChildren.push(bullet('4 AWD Phases สลับท่วม-แห้ง ตามเกณฑ์ที่กำหนด'));
bodyChildren.push(bullet('Edge Authentication + SHA-256/HMAC-SHA256 ป้องกันการปลอมแปลงข้อมูล'));
bodyChildren.push(bullet('CSV Audit Trail 38 คอลัมน์ สำหรับ VVB ตรวจสอบ'));
bodyChildren.push(bullet('MQTT Publishing ไปยัง broker ภายนอกเพื่อ real-time monitoring'));

bodyChildren.push(body(
  'โมเดลนี้เป็นระบบจำลองที่ครอบคลุมทั้งด้านวิทยาศาสตร์การเกษตร การจัดการน้ำ การปล่อยก๊าซเรือนกระจก การรับรองเครดิตคาร์บอน และความปลอดภัยของข้อมูล IoT ทำให้เหมาะสำหรับใช้เป็นต้นแบบในการพัฒนาระบบ dMRV สำหรับโครงการ AWD จริงในประเทศไทย'
));

// ─── Document Assembly ───
const doc = new Document({
  creator: 'dMRV Platform',
  title: 'AWD Carbon Credit Assessment Model',
  description: 'Documentation of the AWD Rice Cultivation Carbon Credit Assessment Model',
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' },
          size: 24,
          color: '000000',
        },
        paragraph: {
          spacing: { line: 312 },
        },
      },
      heading1: {
        run: {
          font: { ascii: 'Calibri', eastAsia: 'SimHei' },
          size: 32, bold: true, color: '0C1F1A',
        },
        paragraph: { spacing: { before: 480, after: 240 } },
      },
      heading2: {
        run: {
          font: { ascii: 'Calibri', eastAsia: 'SimHei' },
          size: 28, bold: true, color: '0C1F1A',
        },
        paragraph: { spacing: { before: 360, after: 180 } },
      },
      heading3: {
        run: {
          font: { ascii: 'Calibri', eastAsia: 'SimHei' },
          size: 26, bold: true, color: '2A7A65',
        },
        paragraph: { spacing: { before: 280, after: 140 } },
      },
    },
  },
  sections: [
    // Cover section — margin 0
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: buildCoverR1({
        title: 'โมเดลการประเมินคาร์บอนเครดิต AWD',
        subtitle: 'AWD Rice Cultivation Carbon Credit Assessment Model — T-VER-P-AG-001',
        englishLabel: 'AWD CARBON CREDIT MODEL',
        metaLines: [
          'มาตรฐาน: T-VER-P-AG-001 (TGO Thailand)',
          'พื้นที่ทดลอง: 3 แปลงนาข้าว (นครราชสีมา, สุพรรณบุรี, อุบลราชธานี)',
          'GWP: IPCC AR5 (CH4=28, N2O=265)',
          'เอกสารอ้างอิงทางเทคนิค',
        ],
        footerLeft: 'dMRV Platform Documentation',
        footerRight: '2026 Edition',
      }),
    },
    // Body section — normal margins + footer with page numbers
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2A7A65', space: 4 } },
            children: [new TextRun({
              text: 'AWD Carbon Credit Model — T-VER-P-AG-001',
              size: 18, color: '506070', italics: true,
              font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' },
            })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '— ', size: 18, color: '506070',
                font: { ascii: 'Calibri' },
              }),
              new TextRun({
                children: [PageNumber.CURRENT], size: 18, color: '506070',
                font: { ascii: 'Calibri' },
              }),
              new TextRun({
                text: ' —', size: 18, color: '506070',
                font: { ascii: 'Calibri' },
              }),
            ],
          })],
        }),
      },
      children: bodyChildren,
    },
  ],
});

// ─── Write file ───
Packer.toBuffer(doc).then((buf) => {
  const outPath = '/home/z/my-project/AWD-Carbon-Credit-Model.docx';
  fs.writeFileSync(outPath, buf);
  console.log('Generated: ' + outPath);
  console.log('   Size: ' + (buf.length / 1024).toFixed(1) + ' KB');
}).catch((err) => {
  console.error('Error generating document:', err);
  process.exit(1);
});
