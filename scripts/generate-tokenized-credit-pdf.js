/* eslint-disable @typescript-eslint/no-require-imports */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, ShadingType, WidthType,
  TableLayoutType, PageBreak, SectionType, NumberFormat, PageNumber,
  Header, Footer, TabStopType, TabStopPosition,
  TableOfContents,
} = require("docx");
const fs = require("fs");

// ============================================================
// PALETTE FG-1 (Forest Mint)
// ============================================================
const P = {
  bg: "0C1F1A",
  primary: "FFFFFF",
  accent: "3DDBB5",
  titleColor: "FFFFFF",
  subtitleColor: "B0B8C0",
  metaColor: "90989F",
  footerColor: "687078",
  table: {
    headerBg: "2A7A65",
    headerText: "FFFFFF",
    accentLine: "2A7A65",
    innerLine: "C5D8D0",
    surface: "EDF5F2",
  },
};

// ============================================================
// FONT: Use Loma for Thai text (available on this system)
// ============================================================
const THAI_FONT = "Loma";
const EN_FONT = "Arial";

function thaiRun(text, opts = {}) {
  return new TextRun({
    text,
    font: { ascii: EN_FONT, eastAsia: THAI_FONT, cs: THAI_FONT },
    ...opts,
  });
}

// ============================================================
// COVER HELPERS
// ============================================================
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
  insideHorizontal: { style: BorderStyle.NONE, size: 0 },
  insideVertical: { style: BorderStyle.NONE, size: 0 },
};

const allNoBorders = noBorders;

function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  // Thai chars are roughly same width as CJK
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
  const breakAfter = new Set([
    ..." \t", "-", "/",
  ]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) {
        breakAt = i; break;
      }
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
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight +
    metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, midSpacing: Math.max(safeRemaining - topSpacing - bottomSpacing, 0), bottomSpacing };
}

// ============================================================
// COVER R1
// ============================================================
function buildCoverR1(config) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
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
        text: config.englishLabel.split("").join("  "),
        size: 18, color: P.accent, font: { ascii: EN_FONT }, characterSpacing: 40,
      })],
    }));
  }

  // 3. Title
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({
        text: titleLines[i], size: titleSize, bold: true,
        color: P.titleColor,
        font: { eastAsia: THAI_FONT, ascii: EN_FONT, cs: THAI_FONT },
      })],
    }));
  }

  // 4. Subtitle
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({
        text: config.subtitle, size: 24, color: P.subtitleColor,
        font: { eastAsia: THAI_FONT, ascii: EN_FONT, cs: THAI_FONT },
      })],
    }));
  }

  // 5. Meta info lines
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({
        text: line, size: 24, color: P.metaColor,
        font: { eastAsia: THAI_FONT, ascii: EN_FONT, cs: THAI_FONT },
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
      new TextRun({ text: config.footerLeft || "", size: 16, color: P.footerColor, font: { ascii: EN_FONT } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: P.footerColor, font: { ascii: EN_FONT } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// ============================================================
// TABLE HELPER (Horizontal-Only with mint header)
// ============================================================
const tableBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
  insideVertical: { style: BorderStyle.NONE, size: 0 },
};

function makeHeaderCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
    borders: tableBorders,
    children: [new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({
        text, bold: true, size: 20, color: P.table.headerText,
        font: { eastAsia: THAI_FONT, ascii: EN_FONT, cs: THAI_FONT },
      })],
    })],
  });
}

function makeCell(text, widthPct, isAlt = false, opts = {}) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: isAlt ? { type: ShadingType.CLEAR, fill: P.table.surface } : undefined,
    borders: tableBorders,
    children: [new Paragraph({
      spacing: { before: 30, after: 30 },
      children: [thaiRun(text, { size: 20, ...opts })],
    })],
  });
}

function makeTable(headers, rows, colWidths) {
  const tableRows = [];
  // Header
  tableRows.push(new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, i) => makeHeaderCell(h, colWidths[i])),
  }));
  // Data rows
  rows.forEach((row, ri) => {
    tableRows.push(new TableRow({
      cantSplit: true,
      children: row.map((cell, ci) => makeCell(cell, colWidths[ci], ri % 2 === 1)),
    }));
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: tableBorders,
    rows: tableRows,
  });
}

// ============================================================
// BODY CONTENT HELPERS
// ============================================================
function bodyPara(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 312 },
    indent: { firstLine: 0 },
    alignment: AlignmentType.JUSTIFIED,
    ...opts,
    children: [thaiRun(text, { size: 24 })],
  });
}

function bulletPara(text) {
  return new Paragraph({
    spacing: { after: 60, line: 312 },
    indent: { left: 480 },
    children: [
      thaiRun("-  ", { size: 24, color: P.table.accentLine }),
      thaiRun(text, { size: 24 }),
    ],
  });
}

function codeBlock(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: 480 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: P.table.accentLine, space: 8 } },
    shading: { type: ShadingType.CLEAR, fill: "F0F4F2" },
    children: [new TextRun({
      text,
      size: 20,
      font: { ascii: "Courier New", eastAsia: THAI_FONT, cs: THAI_FONT },
    })],
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [thaiRun(text, { size: 32, bold: true, color: "0C1F1A" })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [thaiRun(text, { size: 28, bold: true, color: "1A4A3D" })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [thaiRun(text, { size: 24, bold: true, color: "2A7A65" })],
  });
}

function spacer(h = 100) {
  return new Paragraph({ spacing: { before: h } });
}

// ============================================================
// CHAPTER CONTENT
// ============================================================

// --- Chapter 1 ---
function ch1() {
  return [
    heading1("\u0e1a\u0e17\u0e19\u0e33 (Introduction)"),
    bodyPara("เอกสารฉบับนี้จัดทำขึ้นเพื่ออธิบายกระบวนการ Tokenize คาร์บอนเครดิตตั้งแต่การวัด รายงาน และตรวจสอบ (Measurement, Reporting, Verification หรือ MRV) ไปจนถึงการซื้อขายบน Marketplace ของแพลตฟอร์ม dMRV Platform โดยมีวัตถุประสงค์หลักเพื่อให้ผู้อ่านทั้งหน่วยงานภาครัฐ นักลงทุน ผู้ตรวจสอบ (Validation and Verification Body: VVB) และผู้ซื้อขายคาร์บอนเครดิตสามารถเข้าใจระบบและขั้นตอนการทำงานได้อย่างครบถ้วนและโปร่งใส"),
    bodyPara("แพลตฟอร์ม dMRV ได้รับการออกแบบมาเพื่อรองรับมาตรฐานคาร์บอนเครดิตหลากหลายมาตรฐาน อาทิ T-VER จาก Thailand Greenhouse Gas Management Organization (TGO), Verra (VCS), Gold Standard, I-REC และ Clean Development Mechanism (CDM) ซึ่งครอบคลุมทั้งโครงการลดก๊าซเรือนกระจกในประเทศและต่างประเทศ ระบบนี้เป็นโซลูชัน End-to-End ที่เชื่อมโยงข้อมูลจริงจากแหล่งต้นทางไปจนถึงการออก Token บน Marketplace พร้อมกลไกตรวจสอบทุกขั้นตอน"),
    bodyPara("ผู้อ่านเอกสารฉบับนี้จะได้รับความรู้เกี่ยวกับสถาปัตยกรรมระบบโดยรวม (Architecture Overview) การส่งข้อมูลโครงการ (Project Submission) การคำนวณปริมาณคาร์บอน (Carbon Quantification) การรับรองเครดิต (Certification) กองทุนสำรองความเสี่ยง (Buffer Pool) การสร้างเครดิตหรือ Minting/Tokenization ตลาดซื้อขายเครดิต (Marketplace) สัญญาซื้อขายล่วงหน้า (Forward Contracts) สะพานข้ามเชน (Cross-Chain Bridge) และทะเบียนสาธารณะพร้อม Audit Trail ซึ่งครอบคลุมทุกมิติของวงจรชีวิตคาร์บอนเครดิตบนแพลตฟอร์ม"),
    bodyPara("บทที่ 2 ถึง 11 จะอธิบายเทคโนโลยีและกระบวนการของแต่ละส่วนอย่างละเอียด โดยเริ่มจากภาพรวมสถาปัตยกรรมระบบที่แสดงให้เห็นถึง 11 ขั้นตอนหลักในระบบ ไปจนถึงทะเบียนสาธารณะที่ใช้ Merkle Tree เพื่อรับรองความสมบูรณ์ของข้อมูล ทั้งนี้ เอกสารใช้ภาษาไทยเป็นหลัก ปนกับคำศัพท์ทางเทคนิคภาษาอังกฤษ ซึ่งเป็นมาตรฐานในอุตสาหกรรมคาร์บอนเครดิตสากล"),
  ];
}

// --- Chapter 2 ---
function ch2() {
  return [
    heading1("\u0e20\u0e32\u0e1e\u0e23\u0e27\u0e21\u0e23\u0e30\u0e1a\u0e1a Tokenized Carbon Credit (Architecture Overview)"),
    heading2("\u0e27\u0e34\u0e18\u0e35\u0e01\u0e32\u0e23 Tokenization"),
    bodyPara("กระบวนการ Tokenization ของคาร์บอนเครดิตบนแพลตฟอร์ม dMRV เริ่มจากข้อมูลจริง (Raw Data) ที่ถูกเก็บรวบรวมจากแหล่งต้นทาง เช่น สถานีตรวจวัด ข้อมูลดาวเทียม หรือรายงานการตรวจนับจากโครงการ จากนั้นผ่านการ Quantification เพื่อคำนวณปริมาณคาร์บอนที่ลดลงหรือดูดซับได้จริง ผลการคำนวณนี้จะถูกส่งไปยังกระบวนการ Certification โดย Validation and Verification Body (VVB) เพื่อยืนยันความถูกต้อง หลังจากผ่านการรับรองแล้ว ระบบจะดำเนินการ Tokenization ซึ่งเปลี่ยนเครดิตเป็น Token บน Blockchain หรือระบบ Off-chain และนำไปจัดจำหน่ายบน Marketplace จนถึงขั้นตอนสุดท้ายคือ Retirement ซึ่งเป็นการเกษียณเครดิตออกจากระบบอย่างถาวร"),
    heading2("11 ขั้นตอนในระบบ"),
    bodyPara("ระบบ Tokenized Carbon Credit ประกอบด้วย 11 ขั้นตอนหลักที่เชื่อมโยงกันอย่างเป็นระบบ ดังตารางต่อไปนี้แสดง Lifecycle Flow ตั้งแต่เริ่มต้นจนถึงการเกษียณเครดิต แต่ละขั้นตอนมี Entity และ API Endpoint ที่รับผิดชอบโดยเฉพาะ ทำให้สามารถติดตามและตรวจสอบได้ทุกจุด"),
    // Table 1: Lifecycle Flow
    makeTable(
      ["\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19", "\u0e0a\u0e37\u0e48\u0e2d\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19", "Entity / API"],
      [
        ["1", "Project Submission", "Submission API (/api/dmrv/submission)"],
        ["2", "Data Collection & Monitoring", "IoT Sensors / Manual Input"],
        ["3", "Carbon Quantification", "Carbon API (/api/dmrv/carbon)"],
        ["4", "VVB Validation", "Validation and Verification Body"],
        ["5", "Certification", "Certification API (/api/dmrv/certification)"],
        ["6", "Buffer Pool Allocation", "Buffer API (/api/dmrv/buffer)"],
        ["7", "Token Minting", "Marketplace API (/api/dmrv/marketplace)"],
        ["8", "Marketplace Listing", "Marketplace API (/api/dmrv/marketplace)"],
        ["9", "Trade Execution", "Marketplace API (/api/dmrv/marketplace)"],
        ["10", "Cross-Chain Bridge (ถ้ามี)", "Bridge API (/api/dmrv/bridge)"],
        ["11", "Retirement", "Registry API (/api/dmrv/registry)"],
      ],
      [10, 30, 60],
    ),
    spacer(100),
    heading2("Entity หลักและการเชื่อมโยงกัน"),
    bodyPara("ระบบประกอบด้วย Entity หลัก 6 ประเภท ได้แก่ Submission (ข้อมูลโครงการ), Carbon Calculation (ผลการคำนวณ), Certificate (ใบรับรอง), Buffer Pool (กองทุนสำรอง), MarketplaceCredit (เครดิตบนตลาด) และ BridgeTransaction (ธุรกรรมข้ามเชน) แต่ละ Entity เชื่อมโยงกันผ่าน Foreign Key เช่น projectId, certificateId และ creditId ทำให้สามารถติดตาม Traceability จากโครงการต้นทางไปจนถึงเครดิตที่ซื้อขายได้"),
    // Table 2: Component Mapping
    makeTable(
      ["Entity", "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22", "\u0e04\u0e35\u0e22\u0e4c\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e42\u0e22\u0e07"],
      [
        ["Submission", "ข้อมูลโครงการและฟอร์มยื่นคำขอ", "projectId"],
        ["CarbonCalculation", "ผลการคำนวณปริมาณคาร์บอน", "projectId"],
        ["Certificate", "ใบรับรองจาก VVB", "projectId"],
        ["BufferPool", "เครดิตสำรองความเสี่ยง", "certificateId"],
        ["MarketplaceCredit", "เครดิตที่ออกจำหน่ายบนตลาด", "certificateId"],
        ["BridgeTransaction", "ธุรกรรมข้าม Blockchain", "creditId"],
      ],
      [25, 45, 30],
    ),
    spacer(100),
    heading2("\u0e21\u0e32\u0e15\u0e23\u0e10\u0e32\u0e19\u0e17\u0e35\u0e48\u0e23\u0e2d\u0e07\u0e23\u0e31\u0e1a"),
    bodyPara("แพลตฟอร์ม dMRV รองรับมาตรฐานคาร์บอนเครดิต 5 มาตรฐานหลัก ได้แก่ T-VER (Thailand Voluntary Emission Reduction) ที่ออกโดย TGO ซึ่งเป็นมาตรฐานหลักสำหรับโครงการในประเทศไทย Verra (Verified Carbon Standard: VCS) ซึ่งเป็นมาตรฐานสากลที่ได้รับความนิยมสูงสุด Gold Standard ที่เน้นความยั่งยืนและผลกระทบต่อชุมชน I-REC สำหรับพลังงานหมุนเวียน และ CDM (Clean Development Mechanism) ภายใต้กรอบสนธิสัญญา Kyoto แต่ละมาตรฐานมี Methodology และข้อกำหนดที่แตกต่างกัน ระบบจึงออกแบบให้รองรับทั้งหมดผ่าน Configuration ที่ยืดหยุ่น"),
  ];
}

// --- Chapter 3 ---
function ch3() {
  return [
    heading1("\u0e01\u0e32\u0e23\u0e2a\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23 (Project Submission)"),
    heading2("Submission Workflow"),
    bodyPara("ขั้นตอนการส่งข้อมูลโครงการบนแพลตฟอร์ม dMRV ประกอบด้วย 4 สถานะหลัก ได้แก่ Draft (ร่าง) ซึ่งเป็นสถานะเริ่มต้นที่ผู้ใช้สามารถบันทึกข้อมูลได้โดยยังไม่ส่ง Submitted (ส่งแล้ว) ซึ่งหมายความว่าข้อมูลถูกส่งเข้าสู่ระบบแล้วและรอการตรวจสอบ Under Review (กำลังตรวจสอบ) ซึ่งเป็นสถานะที่เจ้าหน้าที่หรือ VVB กำลังพิจารณา และ Approved/Rejected (อนุมัติ/ปฏิเสธ) ซึ่งเป็นผลลัพธ์สุดท้ายของการตรวจสอบ ระบบนี้ทำให้มั่นใจได้ว่าทุกโครงการผ่านการพิจารณาอย่างเป็นระบบก่อนดำเนินการต่อ"),
    // Table 3: Submission Statuses
    makeTable(
      ["\u0e2a\u0e16\u0e32\u0e19\u0e30", "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22", "\u0e01\u0e32\u0e23\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23"],
      [
        ["Draft", "ร่างข้อมูลโครงการ", "สามารถแก้ไขและบันทึกได้"],
        ["Submitted", "ส่งข้อมูลเข้าระบบแล้ว", "รอเจ้าหน้าที่ตรวจสอบ"],
        ["Under Review", "กำลังอยู่ระหว่างการตรวจสอบ", "VVB กำลังพิจารณาเอกสาร"],
        ["Approved", "อนุมัติโครงการ", "ดำเนินการขั้นตอนถัดไปได้"],
        ["Rejected", "ปฏิเสธโครงการ", "แก้ไขและยื่นใหม่ได้"],
      ],
      [20, 40, 40],
    ),
    spacer(100),
    heading2("\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e02\u0e2d\u0e07\u0e1f\u0e2d\u0e23\u0e4c\u0e21 (5 \u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17)"),
    bodyPara("ระบบรองรับฟอร์มหลัก 5 ประเภท ได้แก่ ฟอร์มลงทะเบียนโครงการ (Project Registration Form) สำหรับสมัครโครงการใหม่เข้าสู่ระบบ ฟอร์มรายงานการติดตาม (Monitoring Report Form) สำหรับส่งข้อมูลการติดตามผลเป็นรายงวด ฟอร์มคำขอเครดิต (Credit Request Form) สำหรับขอออกคาร์บอนเครดิตจากผลลัพธ์โครงการ ฟอร์มคำขอตรวจสอบ (Verification Request Form) สำหรับขอให้ VVB เข้าตรวจสอบ และฟอร์มส่งข้อมูล (Data Submission Form) สำหรับส่งข้อมูลพื้นฐานทั่วไป แต่ละฟอร์มมี Field ที่แตกต่างกันตามความเหมาะสมของมาตรฐานที่ใช้"),
    heading2("T-VER Submission Workflow"),
    bodyPara("สำหรับมาตรฐาน T-VER ของ TGO ขั้นตอนการยื่นโครงการมีรายละเอียดเฉพาะ 5 ขั้นตอน ได้แก่ การลงทะเบียนโครงการ (Project Registration) ซึ่งเป็นการกรอกข้อมูลโครงการเบื้องต้น จากนั้นระบบจะทำการตรวจสอบข้อมูลอัตโนมัติ (Data Validation) เพื่อตรวจสอบความสมบูรณ์ของข้อมูล หลังจากนั้น VVB จะเข้ามาตรวจสอบโครงการ (VVB Validation) ตาม Methodology ที่เลือก จากนั้นผู้ดำเนินการโครงการสามารถขอรับใบรับรอง (Certificate Request) และสุดท้ายคือการออกเครดิต (Credit Issuance) หลังจากได้รับการอนุมัติทั้งหมด"),
    codeBlock("API Endpoint: POST /api/dmrv/submission"),
    codeBlock("Body: { projectId, formType, status, data, submittedAt }"),
  ];
}

// --- Chapter 4 ---
function ch4() {
  return [
    heading1("\u0e01\u0e32\u0e23\u0e04\u0e33\u0e19\u0e27\u0e13\u0e1b\u0e23\u0e34\u0e21\u0e32\u0e13\u0e04\u0e32\u0e23\u0e4c\u0e1a\u0e2d\u0e19 (Carbon Quantification)"),
    heading2("5 \u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e04\u0e32\u0e23\u0e4c\u0e1a\u0e2d\u0e19"),
    bodyPara("แพลตฟอร์ม dMRV รองรับการคำนวณคาร์บอน 5 ประเภทหลัก ได้แก่ Biochar ซึ่งเป็นการดูดซับคาร์บอนผ่านถ่านชีวภาพ AWD Rice (Alternate Wetting and Drying) ซึ่งเป็นเทคนิคการปลูกข้าวลดการปล่อยมีเทน Biogas ซึ่งเป็นการลดก๊าซเรือนกระจกจากการผลิตไบโอก๊าซ Solar ซึ่งเป็นการลดการปล่อยจากพลังงานแสงอาทิตย์ทดแทน และ Blue Carbon ซึ่งเป็นการดูดซับคาร์บอนจากกุ้ยมังกรและป่าชายเลน แต่ละประเภทมี Emission Factor และสูตรคำนวณที่แตกต่างกันตาม Methodology ที่ใช้"),
    // Table 4: Carbon Types & Emission Factors
    makeTable(
      ["\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e04\u0e32\u0e23\u0e4c\u0e1a\u0e2d\u0e19", "Emission Factor", "\u0e2b\u0e19\u0e48\u0e27\u0e22", "\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e04\u0e33\u0e19\u0e27\u0e13"],
      [
        ["Biochar", "0.73", "tCO2e/ton", "Carbon Content x Stability Factor"],
        ["AWD Rice", "1.38 / 0.0117", "tCO2e/ha (CH4/N2O)", "Baseline - Project Emissions"],
        ["Biogas", "25.0", "tCO2e/ton", "Methane Capture x GWPs"],
        ["Solar", "0.5086", "tCO2e/MWh", "Generation x Grid EF"],
        ["Blue Carbon", "9.9", "tCO2e/ha/yr", "Sediment + Biomass"],
      ],
      [18, 28, 22, 32],
    ),
    spacer(100),
    heading2("Emission Factors ที่ใช้"),
    bodyPara("Emission Factors ที่ใช้ในระบบมาจากแหล่งข้อมูลที่น่าเชื่อถือ โดย Grid Electricity Emission Factor ใช้ค่า 0.5086 tCO2e/MWh ตาม TGO-EF 2024 ซึ่งเป็นค่าที่ TGO ประกาศใช้อย่างเป็นทางการ สำหรับ Diesel ใช้ค่า 2.68 tCO2e/liter สำหรับ N2O from Soil ใช้ค่า 0.0117 tCO2e/ha สำหรับ Methane from Rice ใช้ค่า 1.38 tCO2e/ha สำหรับ Biochar ใช้ค่า 0.73 tCO2e/ton สำหรับ Biogas ใช้ค่า 25.0 tCO2e/ton และสำหรับ Blue Carbon ใช้ค่า 9.9 tCO2e/ha/yr ค่าเหล่านี้สอดคล้องกับ IPCC Guidelines และมาตรฐานที่ใช้ในประเทศไทย"),
    heading2("\u0e2a\u0e39\u0e15\u0e23\u0e04\u0e33\u0e19\u0e27\u0e13"),
    bodyPara("สูตรคำนวณสำหรับแต่ละประเภทคาร์บอนแตกต่างกันไปตาม Methodology ที่ใช้ สำหรับ Biochar ใช้สูตร: เครดิต = ปริมาณ Biochar (ton) x Carbon Content (%) x Stability Factor x (1 - Buffer%) สำหรับ AWD Rice ใช้สูตร: เครดิต = (Baseline CH4 + Baseline N2O) - (Project CH4 + Project N2O) x Area (ha) สำหรับ Biogas ใช้สูตร: เครดิต = Volume of Methane Captured (m3) x Density x GWP สำหรับ Solar ใช้สูตร: เครดิต = Generation (MWh) x Grid EF สำหรับ Blue Carbon ใช้สูตร: เครดิต = (Sediment Carbon + Biomass Carbon) x Area (ha)"),
    heading2("\u0e01\u0e32\u0e23\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15\u0e08\u0e32\u0e01\u0e1c\u0e25\u0e01\u0e32\u0e23\u0e04\u0e33\u0e19\u0e27\u0e13"),
    bodyPara("หลังจากคำนวณปริมาณคาร์บอนได้แล้ว ระบบจะสร้าง Carbon Calculation Record ที่บันทึกผลลัพธ์ทั้งหมด รวมถึง Gross Credits (เครดิตก่อนหัก Buffer), Net Credits (เครดิตหลังหัก Buffer), Emission Factors ที่ใช้ และ Methodology ที่อ้างอิง ข้อมูลนี้จะถูกนำไปใช้ในขั้นตอน Certification ถัดไป และเป็นข้อมูลพื้นฐานสำหรับการออกใบรับรอง"),
    codeBlock("API Endpoint: POST /api/dmrv/carbon"),
    codeBlock("Body: { projectId, carbonType, methodology, calculations, grossCredits }"),
  ];
}

// --- Chapter 5 ---
function ch5() {
  return [
    heading1("\u0e01\u0e32\u0e23\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15 (Certification)"),
    heading2("5 \u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19 T-VER Workflow"),
    bodyPara("กระบวนการรับรองเครดิตสำหรับมาตรฐาน T-VER ประกอบด้วย 5 ขั้นตอนหลัก ขั้นแรกคือการยื่นคำขอรับรอง (Submit Request) ซึ่งผู้ดำเนินการโครงการส่งเอกสารหลักฐานและผลการคำนวณเข้าสู่ระบบ ขั้นที่สองคือการตรวจสอบเอกสาร (Document Review) ซึ่งระบบจะตรวจสอบความสมบูรณ์ของเอกสารอัตโนมัติ ขั้นที่สามคือ VVB ประเมิน (VVB Assessment) ซึ่ง Validation and Verification Body จะทำการประเมินโครงการตาม Methodology ที่เลือก ขั้นที่สี่คืออนุมัติหรือปฏิเสธ (Approve/Reject) ซึ่งเป็นผลการพิจารณา และขั้นสุดท้ายคือการออก Master Certificate (Certificate Issuance) หลังจากผ่านการอนุมัติแล้ว"),
    // Table 5: Certification Workflow
    makeTable(
      ["\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19", "\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14", "\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e1c\u0e34\u0e14\u0e0a\u0e2d\u0e1a"],
      [
        ["1. Submit Request", "ยื่นคำขอรับรองพร้อมเอกสาร", "Project Owner"],
        ["2. Document Review", "ตรวจสอบความสมบูรณ์ของเอกสาร", "System (Auto)"],
        ["3. VVB Assessment", "VVB ประเมินตาม Methodology", "VVB"],
        ["4. Approve/Reject", "พิจารณาอนุมัติหรือปฏิเสธ", "Certification Body"],
        ["5. Certificate Issuance", "ออก Master Certificate", "System"],
      ],
      [25, 50, 25],
    ),
    spacer(100),
    heading2("\u0e23\u0e39\u0e1b\u0e41\u0e1a\u0e1a Master Certificate"),
    bodyPara("Master Certificate ใช้รูปแบบ TVER-MC-YYYY-XXXXX โดย YYYY คือปีที่ออก และ XXXXX คือหมายเลขลำดับที่ ตัวอย่างเช่น TVER-MC-2025-00001 ใบรับรองนี้เป็นเอกสารทางการที่ยืนยันว่าโครงการได้ผ่านการตรวจสอบและรับรองตาม Methodology ที่ระบุ พร้อมระบุปริมาณเครดิตที่ได้รับอนุมัติ ขอบเขตพื้นที่ และระยะเวลาที่มีผลบังคับใช้ ใบรับรองนี้สามารถค้นหาได้ผ่านทะเบียนสาธารณะ (Public Registry) และเป็นหลักฐานสำคัญสำหรับการซื้อขายคาร์บอนเครดิต"),
    heading2("Methodologies ที่รองรับ"),
    bodyPara("ระบบรองรับ Methodology หลัก 3 ตัวสำหรับ T-VER ได้แก่ T-VER-P-CC-001 สำหรับโครงการ Biochar (Carbon Removal) ซึ่งเป็น Methodology สำหรับคำนวณปริมาณคาร์บอนที่ดูดซับโดยถ่านชีวภาพ T-VER-P-AG-001 สำหรับโครงการ AWD Rice (Agriculture) ซึ่งเป็น Methodology สำหรับลดการปล่อยมีเทนจากนาข้าว และ T-VER-P-FOR-001 สำหรับโครงการ Forest Carbon (Forestry) ซึ่งเป็น Methodology สำหรับคำนวณการดูดซับคาร์บอนของป่า"),
    heading2("\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e43\u0e1a\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07"),
    bodyPara("ใบรับรองมี 3 สถานะ ได้แก่ submitted (ยื่นคำขอแล้ว รอการตรวจสอบ) approved (ได้รับการอนุมัติ สามารถนำไปสร้างเครดิตได้) และ rejected (ปฏิเสธ เนื่องจากข้อมูลไม่ครบถ้วนหรือไม่ผ่านเกณฑ์) สถานะเหล่านี้ถูกบันทึกใน Audit Trail ทุกครั้งที่มีการเปลี่ยนแปลง ทำให้สามารถตรวจสอบย้อนกลับได้"),
    codeBlock("API Endpoint: POST /api/dmrv/certification"),
    codeBlock("Body: { projectId, certificateNumber, status, methodology, credits }"),
  ];
}

// --- Chapter 6 ---
function ch6() {
  return [
    heading1("\u0e2a\u0e23\u0e30\u0e2a\u0e33\u0e23\u0e2d\u0e01\u0e04\u0e27\u0e32\u0e21\u0e40\u0e2a\u0e35\u0e48\u0e22\u0e07 (Buffer Pool)"),
    heading2("\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01\u0e2a\u0e33\u0e23\u0e2d\u0e01\u0e04\u0e27\u0e32\u0e21\u0e44\u0e21\u0e48\u0e41\u0e19\u0e48\u0e19\u0e2d\u0e19"),
    bodyPara("Buffer Pool เป็นกลไกสำคัญในระบบคาร์บอนเครดิตที่ออกแบบมาเพื่อรับมือกับความไม่แน่นอน (Uncertainty) ของการลดหรือดูดซับคาร์บอน เมื่อโครงการได้รับเครดิตจากการรับรอง ระบบจะหักเปอร์เซ็นต์บางส่วนออกไปเก็บไว้ใน Buffer Pool ก่อนที่จะนำเครดิตที่เหลือออกจำหน่ายบน Marketplace โดยอัตราส่วนการหักขึ้นอยู่กับระดับความเสี่ยง (Risk Category) ของโครงการ ซึ่งพิจารณาจาก Uncertainty ของข้อมูลและปัจจัยเสี่ยงอื่นๆ"),
    heading2("Risk Categories และ Buffer Percentage"),
    bodyPara("ระบบจัดระดับความเสี่ยงออกเป็น 4 ระดับ โดยแต่ละระดับมีอัตราการหักสำรอกที่แตกต่างกัน ระดับ LOW หมายถึง Uncertainty ต่ำกว่า 15% จะหักสำรอก 10% ระดับ MEDIUM หมายถึง Uncertainty ระหว่าง 15-30% จะหักสำรอก 15% ระดับ HIGH หมายถึง Uncertainty ระหว่าง 30-45% จะหักสำรอก 20% และระดับ VERY HIGH หมายถึง Uncertainty มากกว่า 45% จะหักสำรอก 30% การจัดระดับนี้สอดคล้องกับแนวทางของ Verra VCS และมาตรฐานสากล"),
    // Table 6: Buffer Risk Tiers
    makeTable(
      ["\u0e23\u0e30\u0e14\u0e31\u0e1a", "Uncertainty", "Buffer %", "\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23"],
      [
        ["LOW", "< 15%", "10%", "Solar, Biogas (ข้อมูลชัดเจน)"],
        ["MEDIUM", "15-30%", "15%", "AWD Rice, Biochar"],
        ["HIGH", "30-45%", "20%", "Forest Carbon"],
        ["VERY HIGH", "> 45%", "30%", "Blue Carbon (ข้อมูลจำกัด)"],
      ],
      [18, 22, 18, 42],
    ),
    spacer(100),
    heading2("\u0e01\u0e32\u0e23\u0e1b\u0e25\u0e48\u0e2d\u0e22\u0e2a\u0e33\u0e23\u0e2d\u0e01\u0e01\u0e25\u0e31\u0e1a"),
    bodyPara("เมื่อโครงการผ่านการตรวจสอบเพิ่มเติม (Verification) แล้ว หรือเมื่อความเสี่ยงลดลง ระบบสามารถปล่อยเครดิตที่เก็บไว้ใน Buffer Pool กลับออกมาได้ ตัวอย่างเช่น หากโครงการเริ่มต้นอยู่ในระดับ MEDIUM (หัก 15%) แต่หลังจากผ่านการตรวจสอบ 3 ปีแล้วพบว่าผลลัพธ์ตรงตามที่คาดไว้ ระบบสามารถลดระดับเป็น LOW (หัก 10%) และปล่อยส่วนต่าง 5% กลับออกมาเป็นเครดิตที่สามารถซื้อขายได้ กลไกนี้ช่วยสร้างความสมดุลระหว่างการรักษาความน่าเชื่อถือของเครดิตกับการเพิ่มผลประโยชน์ให้แก่เจ้าของโครงการ"),
    codeBlock("API Endpoint: POST /api/dmrv/buffer"),
    codeBlock("Body: { certificateId, riskCategory, bufferAmount, netCredits }"),
  ];
}

// --- Chapter 7 ---
function ch7() {
  return [
    heading1("\u0e01\u0e32\u0e23\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15 (Minting / Tokenization)"),
    heading2("\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e01\u0e32\u0e23 Minting"),
    bodyPara("การสร้างเครดิต (Minting) เป็นขั้นตอนที่สำคัญที่สุดในการแปลงคาร์บอนเครดิตจากใบรับรองให้กลายเป็น Token ที่สามารถซื้อขายได้บน Marketplace ขั้นตอนนี้เริ่มจากเครดิตที่ผ่านการรับรองแล้ว (Certified Credits) จากนั้นระบบจะกำหนด Buffer Pool ตาม Risk Category ที่ประเมินไว้ หลังจากหัก Buffer แล้ว เครดิตส่วนที่เหลือ (Net Credits) จะถูกสร้างเป็น Token ซึ่งอาจเป็น NFT บน Blockchain หรือ Off-chain Token ขึ้นอยู่กับการตั้งค่าของระบบ แต่ละ Token จะมี Token ID ไม่ซ้ำกัน และเชื่อมโยงกับโครงการต้นทางผ่าน Metadata"),
    heading2("Entity: MarketplaceCredit"),
    bodyPara("เครดิตที่สร้างขึ้นจะถูกจัดเก็บในรูปแบบ MarketplaceCredit ซึ่งประกอบด้วยข้อมูลสำคัญ ได้แก่ id (รหัสเฉพาะ), tokenId (รหัส Token บน Blockchain), amount (ปริมาณเครดิต), project (ข้อมูลโครงการต้นทาง), methodology (Methodology ที่ใช้), location (สถานที่โครงการ) และ metadata ซึ่งรวมถึงราคา (price) ข้อมูลเหล่านี้ถูกบันทึกลงในฐานข้อมูลและ Audit Trail ทุกครั้งที่มีการสร้างเครดิต"),
    heading2("Token ID Format"),
    bodyPara("Token ID ใช้รูปแบบที่ไม่ซ้ำกันเพื่อป้องกันการ Duplicate และรองรับการติดตามย้อนกลับ รูปแบบทั่วไปคือ DMRV-{CarbonType}-{Year}-{Sequence} ตัวอย่างเช่น DMRV-BIOCHAR-2025-00001 หรือ DMRV-AWDRICE-2025-00042 การออกแบบนี้ทำให้สามารถระบุประเภทคาร์บอน ปีที่สร้าง และลำดับได้อย่างรวดเร็วจาก Token ID เพียงอย่างเดียว"),
    heading2("3 \u0e2a\u0e16\u0e32\u0e19\u0e30\u0e02\u0e2d\u0e07\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15"),
    bodyPara("เครดิตบน Marketplace มี 3 สถานะหลัก ได้แก่ Available (พร้อมซื้อขาย) ซึ่งเป็นสถานะเริ่มต้นหลังจาก Minting เสร็จสิ้น Traded (ซื้อขายแล้ว) ซึ่งเป็นสถานะที่เครดิตถูกโอนไปยังผู้ซื้อแล้ว และ Retired (เกษียณแล้ว) ซึ่งเป็นสถานะสุดท้ายที่เครดิตถูกถอนออกจากระบบอย่างถาวรเพื่อนำไปใช้ Offset การเปลี่ยนสถานะทุกครั้งจะถูกบันทึกใน Audit Trail"),
    // Table 7: Marketplace Credit Statuses
    makeTable(
      ["\u0e2a\u0e16\u0e32\u0e19\u0e30", "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22", "\u0e01\u0e32\u0e23\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23"],
      [
        ["Available", "เครดิตพร้อมซื้อขายบน Marketplace", "แสดงรายการบนตลาด"],
        ["Traded", "เครดิตถูกซื้อแล้ว", "โอนไปยัง Portfolio ของผู้ซื้อ"],
        ["Retired", "เครดิตเกษียณถาวร", "นำออกจากระบบเพื่อ Offset"],
      ],
      [18, 42, 40],
    ),
    spacer(100),
    codeBlock("API Endpoint: POST /api/dmrv/marketplace (Mint)"),
    codeBlock("Body: { certificateId, tokenId, amount, metadata }"),
  ];
}

// --- Chapter 8 ---
function ch8() {
  return [
    heading1("\u0e15\u0e25\u0e32\u0e14\u0e0b\u0e37\u0e49\u0e2d\u0e02\u0e32\u0e22\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15 (Marketplace)"),
    heading2("4 \u0e2a\u0e48\u0e27\u0e19\u0e2b\u0e25\u0e31\u0e01"),
    bodyPara("ตลาดซื้อขายคาร์บอนเครดิต (Marketplace) บนแพลตฟอร์ม dMRV ประกอบด้วย 4 ส่วนหลัก ได้แก่ Credit Listing ซึ่งเป็นส่วนแสดงรายการเครดิตที่พร้อมซื้อขาย พร้อมข้อมูลโครงการ ประเภทคาร์บอน ราคา และปริมาณ Mint Credits ซึ่งเป็นส่วนสำหรับสร้างเครดิตใหม่จากใบรับรองที่ได้รับอนุมัติ Trade/Retire ซึ่งเป็นส่วนสำหรับดำเนินการซื้อขายหรือเกษียณเครดิต และ Portfolio ซึ่งเป็นส่วนแสดงภาพรวมเครดิตที่ผู้ใช้ครอบครอง การออกแบบ 4 ส่วนนี้ทำให้ผู้ใช้สามารถดำเนินการได้ครบวงจรในที่เดียว"),
    heading2("การซื้อขายเครดิต (Trade)"),
    bodyPara("การซื้อขายเครดิตบน Marketplace เป็นกระบวนการที่ตรงไปตรงมา ผู้ซื้อเลือกเครดิตที่ต้องการจาก Credit Listing จากนั้นระบุชื่อผู้ซื้อ (Buyer Name) และยืนยันการทำรายการ เมื่อทำรายการสำเร็จ สถานะเครดิตจะเปลี่ยนจาก Available เป็น Traded และเครดิตจะถูกโอนเข้าสู่ Portfolio ของผู้ซื้อ ราคาซื้อขายจะถูกบันทึกในระบบพร้อมข้อมูลผู้ซื้อ ผู้ขาย และเวลาทำรายการ"),
    heading2("\u0e01\u0e32\u0e23\u0e40\u0e01\u0e29\u0e35\u0e22\u0e19\u0e40\u0e04\u0e23\u0e14\u0e34\u0e15 (Retirement)"),
    bodyPara("การเกษียณเครดิต (Retirement) เป็นขั้นตอนสุดท้ายในวงจรชีวิตของคาร์บอนเครดิต เมื่อผู้ซื้อต้องการนำเครดิตไปใช้ Offset การปล่อยก๊าซเรือนกระจกขององค์กร เครดิตจะถูกเกษียณออกจากระบบอย่างถาวร ซึ่งหมายความว่าเครดิตดังกล่าวจะไม่สามารถนำกลับมาซื้อขายได้อีก การเกษียณนี้เป็นกลไกสำคัญที่ป้องกัน Double Counting และรับรองว่าแต่ละเครดิตจะถูกนำไปใช้ Offset ได้เพียงครั้งเดียวเท่านั้น ข้อมูลการเกษียณจะถูกบันทึกใน Public Registry และ Audit Trail ถาวร"),
    heading2("MarketplaceSummary"),
    bodyPara("ระบบจะรวบรวมสถิติภาพรวมของตลาดอย่างต่อเนื่อง ผ่าน MarketplaceSummary ที่แสดง totalCredits (จำนวนเครดิตทั้งหมดที่สร้าง) availableVolume (ปริมาณที่พร้อมซื้อขาย) tradedVolume (ปริมาณที่ซื้อขายแล้ว) และ retiredVolume (ปริมาณที่เกษียณแล้ว) ข้อมูลเหล่านี้ช่วยให้ผู้ใช้เห็นภาพรวมของตลาดได้อย่างรวดเร็ว และใช้ในการตัดสินใจลงทุนหรือซื้อเครดิต"),
    codeBlock("API Endpoint: GET/POST /api/dmrv/marketplace"),
    codeBlock("Trade Body: { creditId, buyerName, action: \"trade\" }"),
    codeBlock("Retire Body: { creditId, buyerName, action: \"retire\" }"),
  ];
}

// --- Chapter 9 ---
function ch9() {
  return [
    heading1("\u0e2a\u0e31\u0e0d\u0e0d\u0e32\u0e0b\u0e37\u0e49\u0e2d\u0e02\u0e32\u0e22\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32 (Forward Contracts)"),
    heading2("5 \u0e2a\u0e16\u0e32\u0e19\u0e30\u0e02\u0e2d\u0e07\u0e2a\u0e31\u0e0d\u0e0d\u0e32"),
    bodyPara("ระบบสัญญาซื้อขายล่วงหน้า (Forward Contracts) ช่วยให้ผู้ซื้อและผู้ขายสามารถตกลงซื้อขายคาร์บอนเครดิตล่วงหน้าก่อนที่เครดิตจะถูกสร้างจริง สัญญามี 5 สถานะ ได้แก่ DRAFT (ร่างสัญญา) ซึ่งเป็นสถานะเริ่มต้นที่สามารถแก้ไขได้ ACTIVE (สัญญามีผล) ซึ่งหมายความว่าทั้งสองฝ่ายตกลงเรียบร้อยแล้ว COMPLETED (สำเร็จ) ซึ่งเกิดขึ้นเมื่อเครดิตถูกส่งมอบตามสัญญา CANCELLED (ยกเลิก) ซึ่งเป็นการยกเลิกโดยความยินยอมของทั้งสองฝ่าย และ DEFAULTED (ผิดนัด) ซึ่งเกิดขึ้นเมื่อผู้ขายไม่สามารถส่งมอบเครดิตตามกำหนด"),
    // Table 8: Forward Contract Statuses
    makeTable(
      ["\u0e2a\u0e16\u0e32\u0e19\u0e30", "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22", "\u0e40\u0e07\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e02\u0e01\u0e32\u0e23\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19"],
      [
        ["DRAFT", "ร่างสัญญา - ยังไม่มีผลบังคับ", "-> ACTIVE (เมื่อทั้งสองฝ่ายลงนาม)"],
        ["ACTIVE", "สัญญามีผลบังคับ", "-> COMPLETED / CANCELLED / DEFAULTED"],
        ["COMPLETED", "ส่งมอบเครดิตสำเร็จ", "สถานะสุดท้าย"],
        ["CANCELLED", "ยกเลิกโดยความยินยอม", "สถานะสุดท้าย"],
        ["DEFAULTED", "ผิดนัดส่งมอบ", "สถานะสุดท้าย"],
      ],
      [18, 42, 40],
    ),
    spacer(100),
    heading2("Fields หลักของสัญญา"),
    bodyPara("สัญญาซื้อขายล่วงหน้าประกอบด้วยข้อมูลสำคัญ ได้แก่ projectId (รหัสโครงการ) sellerName (ชื่อผู้ขาย) buyerName (ชื่อผู้ซื้อ) creditAmount (ปริมาณเครดิต) pricePerUnit (ราคาต่อหน่วย) totalValue (มูลค่ารวมของสัญญา) deliveryDate (วันที่กำหนดส่งมอบ) และ terms (เงื่อนไขเพิ่มเติม) ระบบรองรับการสลับสกุลเงินระหว่าง THB และ USD โดยใช้อัตราแลกเปลี่ยน 34.5 บาทต่อดอลลาร์สหรัฐ ข้อมูลทั้งหมดถูกบันทึกในระบบและสามารถตรวจสอบได้"),
    heading2("Currency Toggle และ Auto-Refresh"),
    bodyPara("ระบบรองรับการแสดงราคาในสองสกุลเงิน ได้แก่ THB (บาทไทย) และ USD (ดอลลาร์สหรัฐ) โดยมีอัตราแลกเปลี่ยนคงที่ที่ 34.5 บาทต่อดอลลาร์ ผู้ใช้สามารถสลับสกุลเงินได้ตลอดเวลา และราคาจะถูกคำนวณใหม่ทันที นอกจากนี้ ระบบยังมีกลไก Auto-Refresh ทุก 30 วินาที เพื่ออัพเดทข้อมูลสถานะสัญญา Upcoming Deliveries และ Countdown สำหรับสัญญาที่ใกล้ถึงกำหนดส่งมอบ ทำให้ผู้ใช้ไม่พลาดข้อมูลที่สำคัญ"),
    heading2("Upcoming Deliveries"),
    bodyPara("ส่วน Upcoming Deliveries แสดงรายการสัญญาที่ใกล้ถึงกำหนดส่งมอบ พร้อม Countdown Timer ที่แสดงเวลาที่เหลืออยู่ วัตถุประสงค์คือเตือนผู้ขายให้เตรียมเครดิตให้พร้อม และให้ผู้ซื้อทราบว่าเครดิตจะถูกส่งมอบเมื่อไร ระบบแสดงข้อมูลชื่อโครงการ ปริมาณเครดิต วันส่งมอบ และสถานะปัจจุบันของสัญญา"),
    codeBlock("API Endpoint: GET/POST /api/dmrv/forward"),
    codeBlock("Body: { projectId, sellerName, buyerName, creditAmount, pricePerUnit, currency, deliveryDate }"),
  ];
}

// --- Chapter 10 ---
function ch10() {
  return [
    heading1("\u0e2a\u0e30\u0e1e\u0e32\u0e19\u0e02\u0e49\u0e32\u0e21\u0e40\u0e0a\u0e19 (Cross-Chain Bridge)"),
    heading2("Registry Types"),
    bodyPara("ระบบสะพานข้ามเชน (Cross-Chain Bridge) รองรับ Registry ภายนอก 6 ประเภท ได้แก่ VERRA (Verra VCS Registry) GOLD_STANDARD (Gold Standard Registry) I_REC (International Renewable Energy Certificate) CDM (Clean Development Mechanism Registry) T_VER (Thailand Voluntary Emission Reduction ของ TGO) และ CUSTOM (Registry แบบกำหนดเอง) แต่ละ Registry มีรูปแบบข้อมูลและ API ที่แตกต่างกัน ระบบ Bridge จึงออกแบบให้รองรับ Protocol หลายรูปแบบเพื่อเชื่อมต่อกับแต่ละ Registry ได้อย่างยืดหยุ่น"),
    // Table 9: Registry Types
    makeTable(
      ["Registry Type", "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22", "\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25"],
      [
        ["VERRA", "Verra VCS Registry", "Verra API"],
        ["GOLD_STANDARD", "Gold Standard Registry", "Gold Standard API"],
        ["I_REC", "International Renewable Energy Certificate", "I-REC Registry"],
        ["CDM", "Clean Development Mechanism", "UNFCCC API"],
        ["T_VER", "Thailand Voluntary Emission Reduction", "TGO Portal"],
        ["CUSTOM", "Registry แบบกำหนดเอง", "User-defined"],
      ],
      [25, 45, 30],
    ),
    spacer(100),
    heading2("Bridge Protocols"),
    bodyPara("ระบบรองรับ Bridge Protocol 5 ประเภท ได้แก่ API (เชื่อมต่อผ่าน REST API แบบดั้งเดิม) POLYGON_BRIDGE (ใช้ Polygon Bridge Protocol สำหรับส่งมอบ Asset ข้าม Chain) ETHEREUM_BRIDGE (ใช้ Ethereum Bridge สำหรับเชื่อมต่อกับ Ethereum Mainnet) COSMOS_IBC (ใช้ Inter-Blockchain Communication Protocol ของ Cosmos Network) และ CUSTOM (Protocol แบบกำหนดเอง) แต่ละ Protocol มีกลไกการทำงานและความเร็วที่แตกต่างกัน การเลือก Protocol ขึ้นอยู่กับ Registry ปลายทางและความต้องการของผู้ใช้"),
    // Table 10: Bridge Protocols
    makeTable(
      ["Protocol", "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22", "\u0e04\u0e27\u0e32\u0e21\u0e40\u0e23\u0e47\u0e27"],
      [
        ["API", "เชื่อมต่อผ่าน REST API", "ทันที (Sync)"],
        ["POLYGON_BRIDGE", "Polygon Bridge Protocol", "5-15 นาที"],
        ["ETHEREUM_BRIDGE", "Ethereum Bridge", "10-30 นาที"],
        ["COSMOS_IBC", "Cosmos IBC Protocol", "3-10 นาที"],
        ["CUSTOM", "Protocol แบบกำหนดเอง", "ขึ้นอยู่กับการตั้งค่า"],
      ],
      [25, 50, 25],
    ),
    spacer(100),
    heading2("Transaction Types และ Statuses"),
    bodyPara("ธุรกรรมข้ามเชนมี 3 ประเภทหลัก ได้แก่ MINT (สร้างเครดิตจาก Registry ภายนอกเข้าสู่ระบบ) TRANSFER (โอนเครดิตระหว่าง Chain) และ RETIRE (เกษียณเครดิต) แต่ละประเภทมีทิศทางได้ 2 ทิศทาง ได้แก่ INBOUND (เข้าสู่ระบบ) และ OUTBOUND (ออกจากระบบ) สถานะธุรกรรมมี 5 สถานะ ได้แก่ PENDING (รอดำเนินการ) SUBMITTED (ส่งแล้ว) CONFIRMED (ยืนยันแล้ว) FAILED (ล้มเหลว) และ ROLLED_BACK (ย้อนกลับแล้ว) การติดตามสถานะทำได้ผ่าน txHash และ externalRef"),
    bodyPara("BridgeTransaction จะบันทึกข้อมูลสำคัญ ได้แก่ txHash (Transaction Hash บน Blockchain) externalRef (รหัสอ้างอิงจาก Registry ภายนอก) และ metadata (ข้อมูลเพิ่มเติม) ข้อมูลเหล่านี้ช่วยให้สามารถตรวจสอบธุรกรรมได้ทั้งบน Blockchain และบน Registry ภายนอก รับรองความโปร่งใสและสามารถตรวจสอบย้อนกลับได้"),
    codeBlock("API Endpoint: POST /api/dmrv/bridge"),
    codeBlock("Body: { registryType, protocol, txType, txHash, externalRef, metadata }"),
  ];
}

// --- Chapter 11 ---
function ch11() {
  return [
    heading1("\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e2a\u0e32\u0e18\u0e32\u0e23\u0e13\u0e41\u0e25\u0e30 Audit Trail (Public Registry)"),
    heading2("8 Event Types"),
    bodyPara("ระบบทะเบียนสาธารณะ (Public Registry) บันทึกเหตุการณ์ทั้งหมดในรูปแบบ Event Types 8 ประเภท ได้แก่ ORIGIN (เหตุการณ์เริ่มต้นของโครงการ) QUANTIFY (เหตุการณ์คำนวณปริมาณคาร์บอน) VERIFY (เหตุการณ์ VVB ตรวจสอบ) CERTIFY (เหตุการณ์ออกใบรับรอง) MINT (เหตุการณ์สร้างเครดิต) TRADE (เหตุการณ์ซื้อขาย) RETIRE (เหตุการณ์เกษียณเครดิต) และ BUFFER (เหตุการณ์จัดสรร Buffer Pool) แต่ละ Event มีข้อมูลครบถ้วน รวมถึง dataHash และ previousHash สำหรับตรวจสอบความสมบูรณ์"),
    // Table 11: Audit Trail Event Types
    makeTable(
      ["Event Type", "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22", "Entity ที่เกี่ยวข้อง"],
      [
        ["ORIGIN", "เหตุการณ์เริ่มต้นของโครงการ", "Submission"],
        ["QUANTIFY", "คำนวณปริมาณคาร์บอน", "CarbonCalculation"],
        ["VERIFY", "VVB ตรวจสอบโครงการ", "Certificate"],
        ["CERTIFY", "ออกใบรับรอง", "Certificate"],
        ["MINT", "สร้างเครดิต (Tokenization)", "MarketplaceCredit"],
        ["TRADE", "ซื้อขายเครดิต", "MarketplaceCredit"],
        ["RETIRE", "เกษียณเครดิตถาวร", "MarketplaceCredit"],
        ["BUFFER", "จัดสรร/ปล่อย Buffer Pool", "BufferPool"],
      ],
      [22, 48, 30],
    ),
    spacer(100),
    heading2("Merkle Tree Audit Trail"),
    bodyPara("Audit Trail ของระบบใช้โครงสร้าง Merkle Tree เพื่อรับรองความสมบูรณ์ของข้อมูลทุกเหตุการณ์ แต่ละ Node ในต้นไม้ประกอบด้วย dataHash (แฮชของข้อมูลใน Node นั้น) previousHash (แฮชของ Node ก่อนหน้า) และ merkleRoot (รากของ Merkle Tree) โครงสร้างนี้ทำให้สามารถตรวจสอบได้ว่าข้อมูลไม่ถูกแก้ไข หากมีการเปลี่ยนแปลงข้อมูลใดๆ แม้เพียง 1 บิต merkleRoot จะเปลี่ยนแปลงทันที ทำให้สามารถตรวจจับการดัดแปลงข้อมูลได้"),
    heading2("Chain Integrity"),
    bodyPara("การตรวจสอบความสมบูรณ์ของ Chain ทำได้ 2 ระดับ ระดับแรกคือการตรวจสอบ Merkle Tree ซึ่งตรวจสอบว่า dataHash และ previousHash ของแต่ละ Node ตรงกันและเชื่อมโยงกันอย่างถูกต้อง ระดับที่สองคือการตรวจสอบ Double-Counting ซึ่งตรวจสอบว่าเครดิตแต่ละหน่วยไม่ถูกนำไปใช้ Offset มากกว่า 1 ครั้ง ระบบจะตรวจสอบผ่านการเปรียบเทียบ creditId ทั้งหมดใน Audit Trail หากพบรายการที่ซ้ำกัน ระบบจะแจ้งเตือนทันที"),
    heading2("Certificate Search และ Export"),
    bodyPara("ทะเบียนสาธารณะมีฟีเจอร์ค้นหา Certificate ที่รวดเร็ว ผู้ใช้สามารถค้นหาโดยใช้ Certificate Number, ชื่อโครงการ, หรือจังหวัด นอกจากนี้ยังสามารถ Export Audit Trail ออกมาในรูปแบบ JSON เพื่อนำไปใช้ในการตรวจสอบภายนอกหรือรายงานไปยังหน่วยงานที่เกี่ยวข้อง ข้อมูลที่ Export จะครอบคลุมทุก Event ตั้งแต่ ORIGIN จนถึง RETIRE"),
    heading2("Certificate Details"),
    bodyPara("รายละเอียดของ Certificate บนทะเบียนสาธารณะประกอบด้วย Certificate Number (เช่น TVER-MC-2025-00001) Project (ชื่อโครงการ) Methodology (Methodology ที่ใช้) Province (จังหวัดที่ตั้งโครงการ) Valid Period (ระยะเวลาที่มีผลบังคับใช้) และสถานะ PDPA Compliant ที่ยืนยันว่าข้อมูลส่วนบุคคลได้รับการคุ้มครองตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 นอกจากนี้ยังมีการระบุ No Double Counting เพื่อยืนยันว่าเครดิตนี้ไม่ถูกนับซ้ำ"),
    codeBlock("API Endpoint: GET /api/dmrv/registry"),
    codeBlock("Export: GET /api/dmrv/registry/export?format=json"),
  ];
}

// ============================================================
// MAIN DOCUMENT
// ============================================================
async function main() {
  const coverConfig = {
    title: "Tokenized Carbon Credit \u0e08\u0e19\u0e16\u0e49\u0e07 Marketplace",
    subtitle: "เอกสารเทคนิค dMRV Platform",
    englishLabel: "DIGITAL MRV TECHNICAL DOCUMENT",
    metaLines: [
      "Measurement, Reporting, Verification",
      "Tokenization - Marketplace - Retirement",
      "Version 1.0 - 2025",
    ],
    footerLeft: "dMRV Platform",
    footerRight: "Confidential",
    palette: {
      bg: P.bg,
      titleColor: P.titleColor,
      subtitleColor: P.subtitleColor,
      metaColor: P.metaColor,
      accent: P.accent,
      footerColor: P.footerColor,
    },
  };

  const bodyContent = [
    ...ch1(),
    ...ch2(),
    ...ch3(),
    ...ch4(),
    ...ch5(),
    ...ch6(),
    ...ch7(),
    ...ch8(),
    ...ch9(),
    ...ch10(),
    ...ch11(),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: { ascii: EN_FONT, eastAsia: THAI_FONT, cs: THAI_FONT },
            size: 24,
          },
        },
      },
    },
    sections: [
      // Section 1: Cover
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children: buildCoverR1(coverConfig),
      },
      // Section 2: Body
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine, space: 4 } },
              spacing: { after: 100 },
              children: [
                new TextRun({ text: "dMRV Platform - Tokenized Carbon Credit", size: 16, color: "888888", font: { ascii: EN_FONT } }),
                new TextRun({ text: "                                        ", size: 16 }),
                new TextRun({ text: "Technical Document v1.0", size: 16, color: "AAAAAA", font: { ascii: EN_FONT } }),
              ],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "PAGE ", size: 16, color: "888888", font: { ascii: EN_FONT } }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888", font: { ascii: EN_FONT } }),
              ],
            })],
          }),
        },
        children: bodyContent,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = "/home/z/my-project/Tokenized-Carbon-Credit-Platform.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("DOCX written to", outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
