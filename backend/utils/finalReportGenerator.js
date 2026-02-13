/**
 * 최종보고서: 템플릿 1~7, 9, 11, 14~15p 유지하고,
 * 8·10·12·13p는 빨간 박스 기준 표 양식으로 새 페이지를 만들어 삽입.
 * (값이 없어도 템플릿의 예전 형태가 남지 않음)
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const LAYOUT = require('./finalReportLayout');

const TEMPLATE_FILENAME = '종합점검보고서_최종1.pdf';
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const FONTS_DIR = path.join(__dirname, '..', 'fonts');

const FONT_SIZE = 9;
const HEADER_FONT_SIZE = 10;
const TITLE_FONT_SIZE = 14;

function safeText(v) {
  if (v == null || v === '') return '-';
  return String(v).slice(0, 200);
}

function truncateToFit(text, maxChars = 999) {
  const s = safeText(text);
  if (s === '-' || !s) return s;
  if (maxChars <= 0) return s;
  const str = String(s);
  if (str.length <= maxChars) return str;
  return str.slice(0, Math.max(0, maxChars - 1)) + '…';
}

async function embedCustomFont(pdfDoc) {
  try {
    const fontkit = require('@pdf-lib/fontkit');
    pdfDoc.registerFontkit(fontkit);
    const ttfPath = path.join(FONTS_DIR, 'NotoSansKR-Regular.ttf');
    if (fs.existsSync(ttfPath)) {
      const fontBytes = fs.readFileSync(ttfPath);
      return await pdfDoc.embedFont(fontBytes);
    }
  } catch (e) {
    //
  }
  return await pdfDoc.embedFont(StandardFonts.Helvetica);
}

/** 표 한 페이지 그리기: 제목, 동/호, 헤더 행, 데이터 행(빨간 박스 단위). getCellValue(item, field) => string */
function drawTablePage(page, font, tableDef, reportData, items, getCellValue) {
  const { x: ox, y: oy } = tableDef.origin;
  const { headerLabels, columns, headerHeight, rowHeight } = tableDef;
  const dong = reportData.dong || '';
  const ho = reportData.ho || '';

  // 제목
  page.drawText(tableDef.title, {
    x: ox,
    y: LAYOUT.PAGE_HEIGHT - 50,
    size: TITLE_FONT_SIZE,
    font
  });
  page.drawText(`${dong}동 ${ho}호  최종점검결과`, {
    x: ox,
    y: LAYOUT.PAGE_HEIGHT - 70,
    size: 11,
    font
  });

  const tableTop = oy;
  const totalWidth = columns.reduce((s, c) => s + c.w, 0);

  // 헤더 행 배경 + 텍스트
  page.drawRectangle({
    x: ox,
    y: tableTop - headerHeight,
    width: totalWidth,
    height: headerHeight,
    color: rgb(0.85, 0.9, 1)
  });
  let cx = ox;
  headerLabels.forEach((label, j) => {
    page.drawText(truncateToFit(label, 30), {
      x: cx + 4,
      y: tableTop - headerHeight + 6,
      size: HEADER_FONT_SIZE,
      font
    });
    cx += columns[j].w;
  });
  // 헤더 아래선
  page.drawLine({
    start: { x: ox, y: tableTop - headerHeight },
    end: { x: ox + totalWidth, y: tableTop - headerHeight },
    thickness: 0.5,
    color: rgb(0.3, 0.3, 0.3)
  });

  const dataRows = (items || []).slice(0, tableDef.maxRowsPerPage);

  dataRows.forEach((item, rowIndex) => {
    const rowY = tableTop - headerHeight - (rowIndex + 1) * rowHeight;
    const cellBottom = rowY;
    const textY = cellBottom + 5;

    // 빨간 박스 테두리 (1 set = 1행)
    page.drawRectangle({
      x: ox,
      y: rowY,
      width: totalWidth,
      height: rowHeight,
      borderColor: rgb(0.9, 0.2, 0.2),
      borderWidth: 0.8
    });

    let cellX = ox;
    columns.forEach((col, j) => {
      const val = getCellValue(item, col.field);
      const text = truncateToFit(val, col.maxChars);
      page.drawText(text || '-', {
        x: cellX + 4,
        y: textY,
        size: FONT_SIZE,
        font
      });
      // 세로선 (마지막 제외)
      if (j < columns.length - 1) {
        page.drawLine({
          start: { x: cellX + col.w, y: rowY },
          end: { x: cellX + col.w, y: rowY + rowHeight },
          thickness: 0.3,
          color: rgb(0.7, 0.7, 0.7)
        });
      }
      cellX += col.w;
    });
  });

  // 표 외곽선
  const tableHeight = headerHeight + dataRows.length * rowHeight;
  page.drawRectangle({
    x: ox,
    y: tableTop - tableHeight,
    width: totalWidth,
    height: tableHeight,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 0.5
  });
}

/** 육안점검 표 페이지 1장 그리기 */
function drawVisualTablePage(page, font, reportData) {
  const items = reportData.visual_inspections || [];
  drawTablePage(page, font, LAYOUT.VISUAL_TABLE, reportData, items, (item, field) => {
    if (field === 'result') return item.result_text ?? item.result ?? item[field];
    return item[field];
  });
}

/** 열화상점검 표 페이지 1장 그리기 */
function drawThermalTablePage(page, font, reportData) {
  const items = reportData.thermal_inspections || [];
  drawTablePage(page, font, LAYOUT.THERMAL_TABLE, reportData, items, (item, field) => {
    if (field === 'result') return item.result_text ?? item.result ?? item[field];
    return item[field];
  });
}

/** 공기질점검 표 페이지: air+radon 한 행으로 매핑 */
function drawAirTablePage(page, font, reportData) {
  const airList = reportData.air_measurements || [];
  const radonList = reportData.radon_measurements || [];
  const combined = [];
  airList.forEach((a, i) => {
    combined.push({ air: a, radon: radonList[i] || null });
  });
  if (combined.length === 0 && radonList.length > 0) {
    radonList.forEach((r) => combined.push({ air: null, radon: r }));
  }
  drawTablePage(page, font, LAYOUT.AIR_TABLE, reportData, combined, (row, field) => {
    if (field === 'radon') {
      const r = row.radon;
      return r ? `${r.radon ?? '-'} ${(r.unit || '').trim()}`.trim() : '-';
    }
    const a = row.air;
    if (!a) return '-';
    if (field === 'process_type') return a.process_type_label ?? a.process_type ?? '-';
    if (field === 'result') return a.result_text ?? a.result ?? '-';
    if (field === 'tvoc' || field === 'hcho') return String(a[field] ?? '-');
    return a[field];
  });
}

/** 레벨기점검 표 페이지 1장 그리기 */
function drawLevelTablePage(page, font, reportData) {
  const items = reportData.level_measurements || [];
  drawTablePage(page, font, LAYOUT.LEVEL_TABLE, reportData, items, (item, field) => {
    if (field === 'result') return item.result_text ?? item.result ?? item[field];
    if (field === 'reference_mm') return String(item.level_reference_mm ?? item.reference_mm ?? 150);
    if (field === 'points') return item.level_summary_text ?? item[field];
    return item[field];
  });
}

/** 템플릿에서 8·10·12·13p 제거 후, 해당 자리에 표 페이지 4장 삽입 (순서 유지) */
async function assembleFinalWithTemplatePages(templateDoc, reportData, font, pdfDoc) {
  // 제거: 13p(12), 12p(11), 10p(9), 8p(7) — 뒤에서부터 제거
  if (templateDoc.getPageCount() > 12) templateDoc.removePage(12);
  if (templateDoc.getPageCount() > 11) templateDoc.removePage(11);
  if (templateDoc.getPageCount() > 9) templateDoc.removePage(9);
  if (templateDoc.getPageCount() > 7) templateDoc.removePage(7);

  // 7, 9, 11, 12 자리에 삽입 → 순서: 0-6, [새8p], template9p, [새10p], template11p, [새12p], [새13p], template14-15p
  templateDoc.insertPage(7, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  templateDoc.insertPage(9, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  templateDoc.insertPage(11, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  templateDoc.insertPage(12, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);

  const pages = templateDoc.getPages();
  if (pages[7]) drawVisualTablePage(pages[7], font, reportData);
  if (pages[9]) drawThermalTablePage(pages[9], font, reportData);
  if (pages[11]) drawAirTablePage(pages[11], font, reportData);
  if (pages[12]) drawLevelTablePage(pages[12], font, reportData);
}

/** 템플릿 없이 점검 표 페이지만 4장 생성 */
async function generateDataOnlyReport(reportData, font, pdfDoc) {
  for (let i = 0; i < 4; i++) {
    const page = pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    if (i === 0) drawVisualTablePage(page, font, reportData);
    else if (i === 1) drawThermalTablePage(page, font, reportData);
    else if (i === 2) drawAirTablePage(page, font, reportData);
    else drawLevelTablePage(page, font, reportData);
  }
}

async function generateFinalReport(reportData, options = {}) {
  const dong = reportData.dong || '';
  const ho = reportData.ho || '';
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const finalFilename = options.filename || `보고서_최종_${dong}-${ho}_${timestamp}.pdf`;
  const finalPath = path.join(REPORTS_DIR, finalFilename);

  const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_FILENAME);
  let pdfDoc;
  let usedTemplate = false;

  if (fs.existsSync(templatePath)) {
    try {
      const templateBytes = fs.readFileSync(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
      usedTemplate = pdfDoc.getPageCount() >= 13;
    } catch (e) {
      if (!/encrypted|password/i.test(String(e.message))) throw e;
      pdfDoc = await PDFDocument.create();
    }
  }
  if (!pdfDoc) {
    pdfDoc = await PDFDocument.create();
  }

  const font = await embedCustomFont(pdfDoc);

  if (usedTemplate && pdfDoc.getPageCount() >= 13) {
    await assembleFinalWithTemplatePages(pdfDoc, reportData, font, pdfDoc);
  } else {
    await generateDataOnlyReport(reportData, font, pdfDoc);
  }

  const bytes = await pdfDoc.save();
  fs.writeFileSync(finalPath, bytes);

  const size = fs.statSync(finalPath).size;
  return {
    filename: finalFilename,
    path: finalPath,
    url: `/reports/${finalFilename}`,
    size
  };
}

module.exports = {
  generateFinalReport,
  TEMPLATE_FILENAME,
  FILL_PAGE_INDICES: [7, 9, 11, 12]
};
