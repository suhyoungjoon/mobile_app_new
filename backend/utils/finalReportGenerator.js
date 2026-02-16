/**
 * 최종보고서: 템플릿 1~7, 9, 11, 14~15p 유지.
 * 8·10·12·13p는 제거 후 같은 위치에 빈 A4 4장 삽입하고 점검결과(육안/열화상/공기질/레벨기)만 별도 페이지로 그림.
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

/** 육안점검 블록형 1페이지분만: chunk(항목 배열)만 그리기. 제목·동호 포함. */
function drawVisualBlocksOnPage(page, font, reportData, chunk) {
  const dong = reportData.dong || '';
  const ho = reportData.ho || '';
  const block = LAYOUT.VISUAL_BLOCK;
  const ox = block.origin.x;
  const cw = block.contentWidth;
  const rowH = block.rowHeight;
  const photoH = block.photoHeight;
  const lw = block.labelWidth;
  const cdw = block.cellDetailWidth;
  const gap = block.blockGap;
  const bw = block.borderWidth;
  const rgbLabel = () => rgb(block.colors.labelBorder.r, block.colors.labelBorder.g, block.colors.labelBorder.b);
  const rgbValue = () => rgb(block.colors.valueBorder.r, block.colors.valueBorder.g, block.colors.valueBorder.b);
  const rgbPhoto = () => rgb(block.colors.photoBorder.r, block.colors.photoBorder.g, block.colors.photoBorder.b);

  page.drawText(block.title, { x: ox, y: LAYOUT.PAGE_HEIGHT - 50, size: TITLE_FONT_SIZE, font });
  page.drawText(`${dong}동 ${ho}호  최종점검결과`, { x: ox, y: LAYOUT.PAGE_HEIGHT - 70, size: 11, font });

  const blockHeight = rowH * 3 + photoH;
  const totalBlockH = blockHeight + gap;
  const startY = block.origin.y;

  chunk.forEach((item, idx) => {
    const by = startY - idx * totalBlockH;
    const locVal = safeText(item.location);
    const tradeVal = safeText(item.trade);
    const defectVal = safeText(item.note);
    const noteVal = safeText(item.result_text ?? item.result ?? item.note ?? '');

    // 1) 위치 행: [위치](파란) [값](초록)
    const valueW1 = cw - lw;
    page.drawRectangle({
      x: ox,
      y: by - rowH,
      width: lw,
      height: rowH,
      borderColor: rgbLabel(),
      borderWidth: bw
    });
    page.drawText(truncateToFit('위치', 8), {
      x: ox + 4,
      y: by - rowH + 5,
      size: FONT_SIZE,
      font
    });
    page.drawRectangle({
      x: ox + lw,
      y: by - rowH,
      width: valueW1,
      height: rowH,
      borderColor: rgbValue(),
      borderWidth: bw
    });
    page.drawText(truncateToFit(locVal, 28), {
      x: ox + lw + 4,
      y: by - rowH + 5,
      size: FONT_SIZE,
      font
    });

    // 2) 사진 영역: 근거리/원거리 빈 칸 (주황 테두리)
    const halfW = cw / 2;
    const photoY = by - rowH - photoH;
    page.drawRectangle({
      x: ox,
      y: photoY,
      width: halfW,
      height: photoH,
      borderColor: rgbPhoto(),
      borderWidth: bw
    });
    page.drawText('근거리', {
      x: ox + halfW / 2 - 15,
      y: photoY + photoH / 2 - 4,
      size: 9,
      font
    });
    page.drawRectangle({
      x: ox + halfW,
      y: photoY,
      width: halfW,
      height: photoH,
      borderColor: rgbPhoto(),
      borderWidth: bw
    });
    page.drawText('원거리', {
      x: ox + halfW + halfW / 2 - 15,
      y: photoY + photoH / 2 - 4,
      size: 9,
      font
    });

    // 3) 공종/하자내용 행: [공 종][값][하자내용][값]
    const row2Y = photoY - rowH;
    [['공 종', tradeVal], ['하자내용', defectVal]].forEach(([label, val], i) => {
      const cx = ox + i * (cdw * 2);
      page.drawRectangle({
        x: cx,
        y: row2Y,
        width: lw,
        height: rowH,
        borderColor: rgbLabel(),
        borderWidth: bw
      });
      page.drawText(truncateToFit(label, 6), {
        x: cx + 4,
        y: row2Y + 5,
        size: FONT_SIZE,
        font
      });
      page.drawRectangle({
        x: cx + lw,
        y: row2Y,
        width: cdw * 2 - lw,
        height: rowH,
        borderColor: rgbValue(),
        borderWidth: bw
      });
      page.drawText(truncateToFit(val, 14), {
        x: cx + lw + 4,
        y: row2Y + 5,
        size: FONT_SIZE,
        font
      });
    });

    // 4) 특이사항 행: [특이사항][값]
    const row3Y = row2Y - rowH;
    page.drawRectangle({
      x: ox,
      y: row3Y,
      width: lw,
      height: rowH,
      borderColor: rgbLabel(),
      borderWidth: bw
    });
    page.drawText('특이사항', {
      x: ox + 4,
      y: row3Y + 5,
      size: FONT_SIZE,
      font
    });
    page.drawRectangle({
      x: ox + lw,
      y: row3Y,
      width: cw - lw,
      height: rowH,
      borderColor: rgbValue(),
      borderWidth: bw
    });
    page.drawText(truncateToFit(noteVal, 42), {
      x: ox + lw + 4,
      y: row3Y + 5,
      size: FONT_SIZE,
      font
    });
  });
}

/** 육안점검: 갯수/페이지 제한 없이 모든 항목 블록 그리기. 필요 시 추가 페이지 삽입. 사용한 페이지 수 반환. */
function drawVisualTablePages(pdfDoc, slotIndex, font, reportData) {
  const items = reportData.visual_inspections || [];
  const block = LAYOUT.VISUAL_BLOCK;
  const rowH = block.rowHeight;
  const photoH = block.photoHeight;
  const gap = block.blockGap;
  const blockHeight = rowH * 3 + photoH;
  const totalBlockH = blockHeight + gap;
  const maxBlocks = Math.max(1, Math.floor((block.origin.y - 80) / totalBlockH));
  const initialSlot = slotIndex;
  let offset = 0;
  let page = pdfDoc.getPages()[slotIndex];
  while (true) {
    const chunk = items.slice(offset, offset + maxBlocks);
    drawVisualBlocksOnPage(page, font, reportData, chunk);
    offset += chunk.length;
    if (offset >= items.length) break;
    pdfDoc.insertPage(slotIndex + 1, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    slotIndex++;
    page = pdfDoc.getPages()[slotIndex];
  }
  return slotIndex - initialSlot + 1;
}

/** 열화상점검 1페이지분: chunk만 그리기. */
function drawThermalBlocksOnPage(page, font, reportData, chunk) {
  const dong = reportData.dong || '';
  const ho = reportData.ho || '';
  const block = LAYOUT.THERMAL_BLOCK;
  const ox = block.origin.x;
  const cw = block.contentWidth;
  const rowH = block.rowHeight;
  const photoH = block.photoHeight;
  const lw = block.labelWidth;
  const cdw = block.cellDetailWidth;
  const gap = block.blockGap;
  const bw = block.borderWidth;
  const rgbLabel = () => rgb(block.colors.labelBorder.r, block.colors.labelBorder.g, block.colors.labelBorder.b);
  const rgbValue = () => rgb(block.colors.valueBorder.r, block.colors.valueBorder.g, block.colors.valueBorder.b);
  const rgbPhoto = () => rgb(block.colors.photoBorder.r, block.colors.photoBorder.g, block.colors.photoBorder.b);

  page.drawText(block.title, { x: ox, y: LAYOUT.PAGE_HEIGHT - 50, size: TITLE_FONT_SIZE, font });
  page.drawText(`${dong}동 ${ho}호  최종점검결과`, { x: ox, y: LAYOUT.PAGE_HEIGHT - 70, size: 11, font });

  const blockHeight = rowH * 3 + photoH;
  const totalBlockH = blockHeight + gap;
  const startY = block.origin.y;

  chunk.forEach((item, idx) => {
    const by = startY - idx * totalBlockH;
    const locVal = safeText(item.location);
    const tradeVal = safeText(item.trade);
    const noteVal = safeText(item.result_text ?? item.result ?? item.note ?? '');

    const valueW1 = cw - lw;
    page.drawRectangle({ x: ox, y: by - rowH, width: lw, height: rowH, borderColor: rgbLabel(), borderWidth: bw });
    page.drawText('위치', { x: ox + 4, y: by - rowH + 5, size: FONT_SIZE, font });
    page.drawRectangle({ x: ox + lw, y: by - rowH, width: valueW1, height: rowH, borderColor: rgbValue(), borderWidth: bw });
    page.drawText(truncateToFit(locVal, 28), { x: ox + lw + 4, y: by - rowH + 5, size: FONT_SIZE, font });

    const halfW = cw / 2;
    const photoY = by - rowH - photoH;
    page.drawRectangle({ x: ox, y: photoY, width: halfW, height: photoH, borderColor: rgbPhoto(), borderWidth: bw });
    page.drawText('일반', { x: ox + halfW / 2 - 12, y: photoY + photoH / 2 - 4, size: 9, font });
    page.drawRectangle({ x: ox + halfW, y: photoY, width: halfW, height: photoH, borderColor: rgbPhoto(), borderWidth: bw });
    page.drawText('열화상', { x: ox + halfW + halfW / 2 - 12, y: photoY + photoH / 2 - 4, size: 9, font });

    const row2Y = photoY - rowH;
    [['공종', tradeVal], ['점검내용', noteVal]].forEach(([label, val], i) => {
      const cx = ox + i * (cdw * 2);
      page.drawRectangle({ x: cx, y: row2Y, width: lw, height: rowH, borderColor: rgbLabel(), borderWidth: bw });
      page.drawText(truncateToFit(label, 6), { x: cx + 4, y: row2Y + 5, size: FONT_SIZE, font });
      page.drawRectangle({ x: cx + lw, y: row2Y, width: cdw * 2 - lw, height: rowH, borderColor: rgbValue(), borderWidth: bw });
      page.drawText(truncateToFit(val, 14), { x: cx + lw + 4, y: row2Y + 5, size: FONT_SIZE, font });
    });
  });
}

/** 열화상점검: 갯수/페이지 제한 없이 모든 항목 그리기. 사용한 페이지 수 반환. */
function drawThermalTablePages(pdfDoc, slotIndex, font, reportData) {
  const items = reportData.thermal_inspections || [];
  const block = LAYOUT.THERMAL_BLOCK;
  const rowH = block.rowHeight;
  const photoH = block.photoHeight;
  const gap = block.blockGap;
  const blockHeight = rowH * 3 + photoH;
  const totalBlockH = blockHeight + gap;
  const maxBlocks = Math.max(1, Math.floor((block.origin.y - 80) / totalBlockH));
  const initialSlot = slotIndex;
  let offset = 0;
  let page = pdfDoc.getPages()[slotIndex];
  while (true) {
    const chunk = items.slice(offset, offset + maxBlocks);
    drawThermalBlocksOnPage(page, font, reportData, chunk);
    offset += chunk.length;
    if (offset >= items.length) break;
    pdfDoc.insertPage(slotIndex + 1, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    slotIndex++;
    page = pdfDoc.getPages()[slotIndex];
  }
  return slotIndex - initialSlot + 1;
}

/** 공기질점검 1페이지분: chunk(combined 행 배열)만 그리기. */
function drawAirBlocksOnPage(page, font, reportData, chunk) {
  const dong = reportData.dong || '';
  const ho = reportData.ho || '';
  const block = LAYOUT.AIR_BLOCK;
  const ox = block.origin.x;
  const mH = block.metaRowHeight;
  const mLw = block.metaLabelWidth;
  const mVw = block.metaValueWidth;
  const pW = block.paramsWidth;
  const vW = block.valuesWidth;
  const phW = block.photoWidth;
  const phH = block.photoHeight;
  const gap = block.blockGap;
  const bw = block.borderWidth;
  const rgbLabel = () => rgb(block.colors.labelBorder.r, block.colors.labelBorder.g, block.colors.labelBorder.b);
  const rgbValue = () => rgb(block.colors.valueBorder.r, block.colors.valueBorder.g, block.colors.valueBorder.b);
  const rgbPhoto = () => rgb(block.colors.photoBorder.r, block.colors.photoBorder.g, block.colors.photoBorder.b);

  page.drawText(block.title, { x: ox, y: LAYOUT.PAGE_HEIGHT - 50, size: TITLE_FONT_SIZE, font });
  page.drawText(`${dong}동 ${ho}호  최종점검결과`, { x: ox, y: LAYOUT.PAGE_HEIGHT - 70, size: 11, font });

  const totalBlockH = block.blockHeight + gap;
  const startY = block.origin.y;

  chunk.forEach((row, idx) => {
    const a = row.air;
    const r = row.radon;
    const by = block.origin.y - idx * totalBlockH;
    const metaX = ox;
    const locVal = a ? safeText(a.location) : (r ? safeText(r.location) : '-');
    const resVal = a ? (a.result_text ?? a.result ?? '-') : (r ? (r.result_text ?? r.result ?? '-') : '-');
    const typeVal = a ? (a.process_type_label ?? a.process_type ?? '-') : '-';
    const memoVal = a ? safeText(a.note) : (r ? safeText(r.note) : '-');
    const tvocVal = a ? String(a.tvoc ?? '-') : '-';
    const hchoVal = a ? String(a.hcho ?? '-') : '-';
    const radonVal = r ? `${r.radon ?? '-'} ${(r.unit || '').trim()}`.trim() : '-';

    [['위치', locVal], ['결과', resVal], ['유형', typeVal], ['메모', memoVal]].forEach(([label, val], i) => {
      const rowY = by - (i + 1) * mH;
      page.drawRectangle({ x: metaX, y: rowY, width: mLw, height: mH, borderColor: rgbLabel(), borderWidth: bw });
      page.drawText(truncateToFit(label, 4), { x: metaX + 2, y: rowY + 4, size: 8, font });
      page.drawRectangle({ x: metaX + mLw, y: rowY, width: mVw, height: mH, borderColor: rgbValue(), borderWidth: bw });
      page.drawText(truncateToFit(val, 12), { x: metaX + mLw + 2, y: rowY + 4, size: 8, font });
    });

    const paramsX = ox + mLw + mVw + 8;
    const paramsY = by - 10;
    page.drawText('TVOC (mg/m³)', { x: paramsX, y: paramsY, size: 8, font });
    page.drawText('휘발성유기화합물', { x: paramsX, y: paramsY - 12, size: 7, font });
    page.drawText('HCHO (mg/m³)', { x: paramsX, y: paramsY - 28, size: 8, font });
    page.drawText('포름알데히드', { x: paramsX, y: paramsY - 40, size: 7, font });
    page.drawText('라돈 Radon (Bq/m³)', { x: paramsX, y: paramsY - 56, size: 8, font });

    const valuesX = paramsX + pW + 8;
    const valH = 22;
    [tvocVal, hchoVal, radonVal].forEach((v, i) => {
      const vy = paramsY - i * valH;
      page.drawRectangle({ x: valuesX, y: vy - 16, width: vW, height: 18, borderColor: rgbValue(), borderWidth: bw });
      page.drawText(truncateToFit(v, 10), { x: valuesX + 2, y: vy - 12, size: 8, font });
    });

    const photoX = valuesX + vW + 8;
    page.drawRectangle({ x: photoX, y: by - phH - 20, width: phW, height: phH, borderColor: rgbPhoto(), borderWidth: bw });
    page.drawText('라돈 사진', { x: photoX + 8, y: by - 18, size: 8, font });
  });
}

/** 공기질점검: 갯수/페이지 제한 없이 모든 행 그리기. 사용한 페이지 수 반환. */
function drawAirTablePages(pdfDoc, slotIndex, font, reportData) {
  const airList = reportData.air_measurements || [];
  const radonList = reportData.radon_measurements || [];
  const combined = [];
  airList.forEach((a, i) => {
    combined.push({ air: a, radon: radonList[i] || null });
  });
  if (combined.length === 0 && radonList.length > 0) {
    radonList.forEach((r) => combined.push({ air: null, radon: r }));
  }
  const block = LAYOUT.AIR_BLOCK;
  const totalBlockH = block.blockHeight + block.blockGap;
  const maxBlocks = Math.max(1, Math.floor((block.origin.y - 80) / totalBlockH));
  const initialSlot = slotIndex;
  let offset = 0;
  let page = pdfDoc.getPages()[slotIndex];
  while (true) {
    const chunk = combined.slice(offset, offset + maxBlocks);
    drawAirBlocksOnPage(page, font, reportData, chunk);
    offset += chunk.length;
    if (offset >= combined.length) break;
    pdfDoc.insertPage(slotIndex + 1, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    slotIndex++;
    page = pdfDoc.getPages()[slotIndex];
  }
  return slotIndex - initialSlot + 1;
}

/** 레벨기 중앙 다이어그램: 창문 + 점선 + 점검방향 화살표 (코드로 그리기) */
function drawLevelDiagram(page, font, diagramX, diagramY, diagramWidth, diagramHeight) {
  const black = rgb(0.2, 0.2, 0.2);
  const centerX = diagramX + diagramWidth / 2;
  const top = diagramY + diagramHeight - 10;
  const bottom = diagramY + 10;

  page.drawRectangle({
    x: diagramX,
    y: diagramY,
    width: diagramWidth,
    height: diagramHeight,
    borderColor: black,
    borderWidth: 0.5
  });

  const winW = 70;
  const winH = 24;
  const winX = centerX - winW / 2;
  const winY = top - winH - 15;
  page.drawRectangle({
    x: winX,
    y: winY,
    width: winW,
    height: winH,
    borderColor: black,
    borderWidth: 0.4
  });
  page.drawText('(창문)', {
    x: centerX - 18,
    y: winY - 12,
    size: 7,
    font
  });

  for (let i = 0; i < 8; i++) {
    const fromX = i % 2 === 0 ? winX : winX + winW;
    const fromY = winY + (i < 4 ? winH : 0);
    const toX = fromX + (i < 2 ? -25 : i < 4 ? 25 : i < 6 ? -25 : 25);
    const toY = fromY + (i < 2 || i >= 6 ? 20 : -20);
    page.drawLine({
      start: { x: fromX, y: fromY },
      end: { x: toX, y: toY },
      thickness: 0.3,
      color: black
    });
  }

  const arrowTop = bottom + 45;
  page.drawLine({
    start: { x: centerX - 12, y: arrowTop - 25 },
    end: { x: centerX, y: arrowTop },
    thickness: 0.8,
    color: black
  });
  page.drawLine({
    start: { x: centerX + 12, y: arrowTop - 25 },
    end: { x: centerX, y: arrowTop },
    thickness: 0.8,
    color: black
  });
  page.drawText('(점검방향)', {
    x: centerX - 22,
    y: bottom + 8,
    size: 7,
    font
  });
}

/** 레벨기점검 블록형 1페이지분: chunk만 그리기. (갯수 제한 없음) */
function drawLevelBlocksOnPage(page, font, reportData, chunk) {
  const dong = reportData.dong || '';
  const ho = reportData.ho || '';
  const block = LAYOUT.LEVEL_BLOCK;
  const ox = block.origin.x;
  const rowH = block.rowHeight;
  const lw = block.labelWidth;
  const pLw = block.pointLabelWidth;
  const pVw = block.pointValueWidth;
  const dW = block.diagramWidth;
  const dH = block.diagramHeight;
  const metaW = block.metaWidth;
  const phH = block.photoHeight;
  const gap = block.blockGap;
  const bw = block.borderWidth;
  const rgbLabel = () => rgb(block.colors.labelBorder.r, block.colors.labelBorder.g, block.colors.labelBorder.b);
  const rgbValue = () => rgb(block.colors.valueBorder.r, block.colors.valueBorder.g, block.colors.valueBorder.b);
  const rgbPhoto = () => rgb(block.colors.photoBorder.r, block.colors.photoBorder.g, block.colors.photoBorder.b);

  page.drawText(block.title, { x: ox, y: LAYOUT.PAGE_HEIGHT - 50, size: TITLE_FONT_SIZE, font });
  page.drawText(`${dong}동 ${ho}호  최종점검결과`, { x: ox, y: LAYOUT.PAGE_HEIGHT - 70, size: 11, font });

  const pointLabels = ['1. 좌측', '2. 우측', '3. 우측', '4. 좌측'];
  const blockHeight = 90 + dH + rowH * 4 + phH;
  const totalBlockH = blockHeight + gap;
  const startY = block.origin.y;

  chunk.forEach((item, idx) => {
    const by = startY - idx * totalBlockH;
    page.drawText(block.topNote, { x: ox, y: by - 12, size: 8, font });

    const pointsText = item.level_summary_text || item.points || '-';
    const points = String(pointsText).split(/[,/]\s*/).slice(0, 4);
    const refMm = String(item.level_reference_mm ?? item.reference_mm ?? 150);

    let rowY = by - 28;
    pointLabels.forEach((label, i) => {
      const px = ox + (i < 2 ? 0 : 260);
      page.drawRectangle({ x: px, y: rowY, width: pLw, height: rowH, borderColor: rgbLabel(), borderWidth: bw });
      page.drawText(truncateToFit(label, 8), { x: px + 2, y: rowY + 4, size: FONT_SIZE - 1, font });
      page.drawRectangle({ x: px + pLw, y: rowY, width: pVw, height: rowH, borderColor: rgbValue(), borderWidth: bw });
      page.drawText(truncateToFit(points[i] || '-', 6), { x: px + pLw + 2, y: rowY + 4, size: FONT_SIZE - 1, font });
      page.drawRectangle({ x: px + pLw + pVw, y: rowY, width: 36, height: rowH, borderColor: rgbValue(), borderWidth: bw });
      page.drawText('mm', { x: px + pLw + pVw + 6, y: rowY + 4, size: FONT_SIZE - 1, font });
      if (i === 1) rowY -= rowH + 4;
      else rowY -= rowH;
    });

    const diagramX = ox + 160;
    const diagramY = rowY - dH - 8;
    drawLevelDiagram(page, font, diagramX, diagramY, dW, dH);

    const metaX = ox + 160 + dW + 12;
    let metaY = by - 32;
    [['위치', safeText(item.location)], ['결과', item.result_text ?? item.result ?? '-'], ['기준', refMm], ['메모', safeText(item.note)]].forEach(([label, val]) => {
      page.drawRectangle({ x: metaX, y: metaY, width: lw, height: rowH, borderColor: rgbLabel(), borderWidth: bw });
      page.drawText(truncateToFit(label, 4), { x: metaX + 2, y: metaY + 4, size: 8, font });
      page.drawRectangle({ x: metaX + lw, y: metaY, width: metaW - lw, height: rowH, borderColor: rgbValue(), borderWidth: bw });
      page.drawText(truncateToFit(val, 12), { x: metaX + lw + 2, y: metaY + 4, size: 8, font });
      metaY -= rowH;
    });

    const photoY = diagramY - phH - 8;
    page.drawRectangle({ x: ox, y: photoY, width: 495, height: phH, borderColor: rgbPhoto(), borderWidth: bw });
    page.drawText('점검사진', { x: ox + 8, y: photoY + phH - 14, size: 8, font });
  });
}

/** 레벨기점검: 갯수/페이지 제한 없이 모든 항목 그리기. (기존 2개 제한 제거) 사용한 페이지 수 반환. */
function drawLevelTablePages(pdfDoc, slotIndex, font, reportData) {
  const items = reportData.level_measurements || [];
  const block = LAYOUT.LEVEL_BLOCK;
  const rowH = block.rowHeight;
  const dH = block.diagramHeight;
  const phH = block.photoHeight;
  const gap = block.blockGap;
  const blockHeight = 90 + dH + rowH * 4 + phH;
  const totalBlockH = blockHeight + gap;
  const maxBlocks = Math.max(1, Math.floor((block.origin.y - 80) / totalBlockH));
  const initialSlot = slotIndex;
  let offset = 0;
  let page = pdfDoc.getPages()[slotIndex];
  while (true) {
    const chunk = items.slice(offset, offset + maxBlocks);
    drawLevelBlocksOnPage(page, font, reportData, chunk);
    offset += chunk.length;
    if (offset >= items.length) break;
    pdfDoc.insertPage(slotIndex + 1, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    slotIndex++;
    page = pdfDoc.getPages()[slotIndex];
  }
  return slotIndex - initialSlot + 1;
}

/** 템플릿 8·10·12·13p를 제거하고, 같은 위치에 빈 A4 4장 삽입 후 점검결과만 별도 페이지로 그림. 항목 많으면 추가 페이지 삽입. */
async function assembleFinalWithTemplatePages(templateDoc, reportData, font, pdfDoc) {
  if (templateDoc.getPageCount() > 12) templateDoc.removePage(12);
  if (templateDoc.getPageCount() > 11) templateDoc.removePage(11);
  if (templateDoc.getPageCount() > 9) templateDoc.removePage(9);
  if (templateDoc.getPageCount() > 7) templateDoc.removePage(7);

  templateDoc.insertPage(7, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  templateDoc.insertPage(9, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  templateDoc.insertPage(11, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  templateDoc.insertPage(12, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);

  const v = drawVisualTablePages(pdfDoc, 7, font, reportData);
  const t = drawThermalTablePages(pdfDoc, 9 + (v - 1), font, reportData);
  const a = drawAirTablePages(pdfDoc, 11 + (v - 1) + (t - 1), font, reportData);
  drawLevelTablePages(pdfDoc, 12 + (v - 1) + (t - 1) + (a - 1), font, reportData);
}

/** 템플릿 없이 점검 표 페이지만 생성 (항목 많으면 추가 페이지) */
async function generateDataOnlyReport(reportData, font, pdfDoc) {
  pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  drawVisualTablePages(pdfDoc, pdfDoc.getPageCount() - 1, font, reportData);
  pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  drawThermalTablePages(pdfDoc, pdfDoc.getPageCount() - 1, font, reportData);
  pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  drawAirTablePages(pdfDoc, pdfDoc.getPageCount() - 1, font, reportData);
  pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  drawLevelTablePages(pdfDoc, pdfDoc.getPageCount() - 1, font, reportData);
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
