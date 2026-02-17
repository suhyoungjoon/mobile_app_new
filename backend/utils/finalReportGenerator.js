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
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const AIR_DIAGRAM_PATH = path.join(ASSETS_DIR, 'air_quality_diagram.png');
const LEVEL_DIAGRAM_PATH = path.join(ASSETS_DIR, 'level_diagram.png');

/** file_url(/uploads/xxx 또는 uploads/xxx) → 서버 내 절대 경로. 없으면 null */
function getPhotoPath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const rel = fileUrl.replace(/^\//, '');
  if (!rel) return null;
  const full = path.isAbsolute(rel) ? rel : path.join(__dirname, '..', rel);
  return fs.existsSync(full) ? full : null;
}

/** 사진 파일을 PDF에 임베드하고 페이지에 그리기. 실패 시 무시 */
async function embedAndDrawPhoto(pdfDoc, page, fileUrl, x, y, w, h) {
  const photoPath = getPhotoPath(fileUrl);
  if (!photoPath || !fs.existsSync(photoPath)) return;
  try {
    const buf = fs.readFileSync(photoPath);
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e;
    const image = isPng ? await pdfDoc.embedPng(buf) : await pdfDoc.embedJpg(buf);
    const dims = image.scale(1);
    const scale = Math.min(w / dims.width, h / dims.height, 1);
    const drawW = dims.width * scale;
    const drawH = dims.height * scale;
    const dx = x + (w - drawW) / 2;
    const dy = y + (h - drawH) / 2;
    page.drawImage(image, { x: dx, y: dy, width: drawW, height: drawH });
  } catch (e) {
    // ignore
  }
}

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

/** 육안점검 블록형 1페이지분만: chunk(항목 배열)만 그리기. 제목·동호 포함. 점검 사진 있으면 채움. */
async function drawVisualBlocksOnPage(pdfDoc, page, font, reportData, chunk) {
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

  for (let idx = 0; idx < chunk.length; idx++) {
    const item = chunk[idx];
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

    // 2) 사진 영역: 근거리/원거리. 점검 등록 사진 있으면 채움
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
    page.drawRectangle({
      x: ox + halfW,
      y: photoY,
      width: halfW,
      height: photoH,
      borderColor: rgbPhoto(),
      borderWidth: bw
    });
    const photos = item.photos && Array.isArray(item.photos) ? item.photos : [];
    const url0 = photos[0] && (photos[0].file_url || photos[0].url);
    const url1 = photos[1] && (photos[1].file_url || photos[1].url);
    if (url0) await embedAndDrawPhoto(pdfDoc, page, url0, ox + 2, photoY + 2, halfW - 4, photoH - 4);
    if (url1) await embedAndDrawPhoto(pdfDoc, page, url1, ox + halfW + 2, photoY + 2, halfW - 4, photoH - 4);
    if (!url0) page.drawText('근거리', { x: ox + halfW / 2 - 15, y: photoY + photoH / 2 - 4, size: 9, font });
    if (!url1) page.drawText('원거리', { x: ox + halfW + halfW / 2 - 15, y: photoY + photoH / 2 - 4, size: 9, font });

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
  }
}

/** 육안점검: 갯수/페이지 제한 없이 모든 항목 블록 그리기. 필요 시 추가 페이지 삽입. 사용한 페이지 수 반환. */
async function drawVisualTablePages(pdfDoc, slotIndex, font, reportData) {
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
    await drawVisualBlocksOnPage(pdfDoc, page, font, reportData, chunk);
    offset += chunk.length;
    if (offset >= items.length) break;
    pdfDoc.insertPage(slotIndex + 1, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    slotIndex++;
    page = pdfDoc.getPages()[slotIndex];
  }
  return slotIndex - initialSlot + 1;
}

/** 열화상점검 1페이지분: chunk만 그리기. 점검 사진 있으면 채움. */
async function drawThermalBlocksOnPage(pdfDoc, page, font, reportData, chunk) {
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

  for (let idx = 0; idx < chunk.length; idx++) {
    const item = chunk[idx];
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
    page.drawRectangle({ x: ox + halfW, y: photoY, width: halfW, height: photoH, borderColor: rgbPhoto(), borderWidth: bw });
    const photos = item.photos && Array.isArray(item.photos) ? item.photos : [];
    const url0 = photos[0] && (photos[0].file_url || photos[0].url);
    const url1 = photos[1] && (photos[1].file_url || photos[1].url);
    if (url0) await embedAndDrawPhoto(pdfDoc, page, url0, ox + 2, photoY + 2, halfW - 4, photoH - 4);
    if (url1) await embedAndDrawPhoto(pdfDoc, page, url1, ox + halfW + 2, photoY + 2, halfW - 4, photoH - 4);
    if (!url0) page.drawText('일반', { x: ox + halfW / 2 - 12, y: photoY + photoH / 2 - 4, size: 9, font });
    if (!url1) page.drawText('열화상', { x: ox + halfW + halfW / 2 - 12, y: photoY + photoH / 2 - 4, size: 9, font });

    const row2Y = photoY - rowH;
    [['공종', tradeVal], ['점검내용', noteVal]].forEach(([label, val], i) => {
      const cx = ox + i * (cdw * 2);
      page.drawRectangle({ x: cx, y: row2Y, width: lw, height: rowH, borderColor: rgbLabel(), borderWidth: bw });
      page.drawText(truncateToFit(label, 6), { x: cx + 4, y: row2Y + 5, size: FONT_SIZE, font });
      page.drawRectangle({ x: cx + lw, y: row2Y, width: cdw * 2 - lw, height: rowH, borderColor: rgbValue(), borderWidth: bw });
      page.drawText(truncateToFit(val, 14), { x: cx + lw + 4, y: row2Y + 5, size: FONT_SIZE, font });
    });
  }
}

/** 열화상점검: 갯수/페이지 제한 없이 모든 항목 그리기. 사용한 페이지 수 반환. */
async function drawThermalTablePages(pdfDoc, slotIndex, font, reportData) {
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
    await drawThermalBlocksOnPage(pdfDoc, page, font, reportData, chunk);
    offset += chunk.length;
    if (offset >= items.length) break;
    pdfDoc.insertPage(slotIndex + 1, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    slotIndex++;
    page = pdfDoc.getPages()[slotIndex];
  }
  return slotIndex - initialSlot + 1;
}

/** 공기질점검 1페이지분: 블록형. 점검 사진 있으면 공기질/라돈 사진 칸에 채움 */
async function drawAirBlocksOnPage(pdfDoc, page, font, reportData, chunk, airDiagramImage) {
  const dong = reportData.dong || '';
  const ho = reportData.ho || '';
  const block = LAYOUT.AIR_BLOCK;
  const ox = block.origin.x;
  const mH = block.metaRowHeight;
  const mLw = block.metaLabelWidth;
  const mVw = block.metaValueWidth;
  const phW = block.photoWidth;
  const phH = block.photoHeight;
  const gap = block.blockGap;
  const rgbPhoto = () => rgb(block.colors.photoBorder.r, block.colors.photoBorder.g, block.colors.photoBorder.b);
  const rgbBeige = () => rgb(0.96, 0.94, 0.88);
  const rgbLabelBg = () => rgb(0.92, 0.91, 0.88);
  const rgbBlack = () => rgb(0.2, 0.2, 0.2);
  const rgbOuterBorder = () => rgb(0.85, 0.45, 0.35);
  const rgbInnerBorder = () => rgb(0.55, 0.4, 0.32);

  page.drawText(block.title, { x: ox, y: LAYOUT.PAGE_HEIGHT - 50, size: TITLE_FONT_SIZE, font });
  page.drawText(`${dong}동 ${ho}호  최종점검결과`, { x: ox, y: LAYOUT.PAGE_HEIGHT - 70, size: 11, font });

  const totalBlockH = block.blockHeight + gap;
  const airImgW = 220;
  const airImgH = 72;
  const metaEndX = ox + mLw + mVw;
  const blockContentW = 495;
  const blockContentH = 120;

  for (let idx = 0; idx < chunk.length; idx++) {
    const row = chunk[idx];
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
    const radonVal = r ? `${r.radon ?? '-'}`.trim() : '-';

    const blockLeft = ox;
    const blockBottom = by - blockContentH - 25;
    page.drawRectangle({
      x: blockLeft - 2,
      y: blockBottom - 2,
      width: blockContentW + 4,
      height: blockContentH + phH + 30,
      borderColor: rgbOuterBorder(),
      borderWidth: 1.2
    });
    page.drawRectangle({
      x: blockLeft,
      y: blockBottom,
      width: blockContentW,
      height: blockContentH + phH + 26,
      color: rgbBeige(),
      borderColor: rgbInnerBorder(),
      borderWidth: 0.5
    });

    [['위치', locVal], ['결과', resVal], ['유형', typeVal], ['메모', memoVal]].forEach(([label, val], i) => {
      const rowY = by - (i + 1) * mH;
      page.drawRectangle({ x: metaX, y: rowY, width: mLw, height: mH, color: rgbLabelBg(), borderColor: rgbBlack(), borderWidth: 0.4 });
      page.drawText(truncateToFit(label, 4), { x: metaX + 2, y: rowY + 4, size: 8, font });
      page.drawRectangle({ x: metaX + mLw, y: rowY, width: mVw, height: mH, color: rgb(1, 1, 1), borderColor: rgbBlack(), borderWidth: 0.4 });
      page.drawText(truncateToFit(val, 12), { x: metaX + mLw + 2, y: rowY + 4, size: 8, font });
    });

    if (airDiagramImage) {
      page.drawImage(airDiagramImage, {
        x: metaEndX + 10,
        y: by - airImgH - 10,
        width: airImgW,
        height: airImgH
      });
    }

    const tableX = metaEndX + 10 + airImgW + 8;
    const tableRowH = 22;
    const tableW = 120;
    const valColW = 52;
    const tableH = tableRowH * 3;
    const tableY = by - 60;
    page.drawRectangle({
      x: tableX,
      y: tableY - tableH,
      width: tableW,
      height: tableH,
      color: rgbBeige(),
      borderColor: rgbBlack(),
      borderWidth: 0.4
    });
    [tvocVal, hchoVal, radonVal].forEach((v, i) => {
      const rowY = tableY - (i + 1) * tableRowH;
      page.drawLine({ start: { x: tableX, y: rowY }, end: { x: tableX + tableW, y: rowY }, thickness: 0.4, color: rgbBlack() });
      page.drawText(truncateToFit(v, 8), { x: tableX + 4, y: rowY + 5, size: 8, font });
      const paramLabels = ['TVOC (mg/m\u00B3)', 'HCHO (mg/m\u00B3)', 'Radon (Bq/m\u00B3)'];
      page.drawText(truncateToFit(paramLabels[i], 14), { x: tableX + valColW + 4, y: rowY + 5, size: 7, font });
    });
    page.drawLine({ start: { x: tableX + valColW, y: tableY - tableH }, end: { x: tableX + valColW, y: tableY }, thickness: 0.4, color: rgbBlack() });

    const photoX = tableX + tableW + 10;
    const halfPhW = phW / 2;
    page.drawRectangle({ x: photoX, y: by - phH - 20, width: halfPhW, height: phH, borderColor: rgbPhoto(), borderWidth: 0.8 });
    page.drawRectangle({ x: photoX + halfPhW, y: by - phH - 20, width: halfPhW, height: phH, borderColor: rgbPhoto(), borderWidth: 0.8 });
    const photos = (a && a.photos) ? a.photos : (r && r.photos) ? r.photos : [];
    const url0 = photos[0] && (photos[0].file_url || photos[0].url);
    const url1 = photos[1] && (photos[1].file_url || photos[1].url);
    if (url0) await embedAndDrawPhoto(pdfDoc, page, url0, photoX + 2, by - phH - 18, halfPhW - 4, phH - 4);
    if (url1) await embedAndDrawPhoto(pdfDoc, page, url1, photoX + halfPhW + 2, by - phH - 18, halfPhW - 4, phH - 4);
    if (!url0 && !url1) page.drawText('공기질/라돈 사진', { x: photoX + 8, y: by - 18, size: 8, font });
  }
}

/** 공기질점검: 갯수/페이지 제한 없이 모든 행 그리기. 사용한 페이지 수 반환. */
async function drawAirTablePages(pdfDoc, slotIndex, font, reportData, airDiagramImage) {
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
    await drawAirBlocksOnPage(pdfDoc, page, font, reportData, chunk, airDiagramImage);
    offset += chunk.length;
    if (offset >= combined.length) break;
    pdfDoc.insertPage(slotIndex + 1, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    slotIndex++;
    page = pdfDoc.getPages()[slotIndex];
  }
  return slotIndex - initialSlot + 1;
}

/** 공기질 수치중심: 리스트(표) + 하단 사진 영역. 표는 AIR_TABLE, 사진은 마지막 페이지 하단에만. */
function getAirRowForTable(row) {
  const a = row.air;
  const r = row.radon;
  return {
    location: a ? safeText(a.location) : (r ? safeText(r.location) : '-'),
    result: a ? (a.result_text ?? a.result ?? '-') : (r ? (r.result_text ?? r.result ?? '-') : '-'),
    process_type: a ? (a.process_type_label ?? a.process_type ?? '-') : '-',
    note: a ? safeText(a.note) : (r ? safeText(r.note) : '-'),
    tvoc: a != null && a.tvoc != null ? String(a.tvoc) : '-',
    hcho: a != null && a.hcho != null ? String(a.hcho) : '-',
    radon: r != null && r.radon != null ? `${r.radon} ${(r.unit || '').trim()}`.trim() : (a ? '-' : '-')
  };
}

async function drawAirTablePagesValues(pdfDoc, slotIndex, font, reportData) {
  const airList = reportData.air_measurements || [];
  const radonList = reportData.radon_measurements || [];
  const combined = [];
  airList.forEach((a, i) => {
    combined.push({ air: a, radon: radonList[i] || null });
  });
  if (combined.length === 0 && radonList.length > 0) {
    radonList.forEach((r) => combined.push({ air: null, radon: r }));
  }
  const airRows = combined.map(getAirRowForTable);
  const tableDef = LAYOUT.AIR_TABLE;
  const initialSlot = slotIndex;
  let offset = 0;
  let page = pdfDoc.getPages()[slotIndex];
  const photoAreaHeight = 110;
  const maxRowsLastPage = Math.max(1, Math.floor((tableDef.origin.y - photoAreaHeight - tableDef.headerHeight - 40) / tableDef.rowHeight));

  while (offset < airRows.length) {
    const isLastChunk = offset + tableDef.maxRowsPerPage >= airRows.length;
    const maxRows = isLastChunk ? Math.min(airRows.length - offset, maxRowsLastPage) : tableDef.maxRowsPerPage;
    const chunk = airRows.slice(offset, offset + maxRows);
    const getCellValue = (item, field) => item[field] ?? '-';
    drawTablePage(page, font, tableDef, reportData, chunk, getCellValue);

    if (isLastChunk) {
      const photoY = 120;
      const photoH = 90;
      const photoW = 495;
      const photoX = tableDef.origin.x;
      page.drawRectangle({
        x: photoX,
        y: photoY,
        width: photoW,
        height: photoH,
        borderColor: rgb(0.95, 0.6, 0.2),
        borderWidth: 0.8
      });
      let url0, url1;
      for (const a of airList) {
        if (a.photos && a.photos.length > 0) {
          url0 = a.photos[0].file_url || a.photos[0].url;
          url1 = a.photos[1] && (a.photos[1].file_url || a.photos[1].url);
          break;
        }
      }
      if (!url0 && !url1) {
        for (const r of radonList) {
          if (r.photos && r.photos.length > 0) {
            url0 = r.photos[0].file_url || r.photos[0].url;
            url1 = r.photos[1] && (r.photos[1].file_url || r.photos[1].url);
            break;
          }
        }
      }
      if (url0) await embedAndDrawPhoto(pdfDoc, page, url0, photoX + 2, photoY + 2, (photoW / 2) - 4, photoH - 4);
      if (url1) await embedAndDrawPhoto(pdfDoc, page, url1, photoX + photoW / 2 + 2, photoY + 2, (photoW / 2) - 4, photoH - 4);
      if (!url0 && !url1) page.drawText('공기질/라돈 점검 사진', { x: photoX + 8, y: photoY + photoH - 14, size: 9, font });
    }

    offset += chunk.length;
    if (offset >= airRows.length) break;
    pdfDoc.insertPage(slotIndex + 1, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    slotIndex++;
    page = pdfDoc.getPages()[slotIndex];
  }
  return slotIndex - initialSlot + 1;
}

/** 레벨기 중앙 다이어그램: 고정 이미지 사용 시 이미지 그리기, 없으면 코드로 창문+점선+점검방향 그리기 */
function drawLevelDiagram(page, font, diagramX, diagramY, diagramWidth, diagramHeight, levelDiagramImage) {
  if (levelDiagramImage) {
    page.drawImage(levelDiagramImage, {
      x: diagramX,
      y: diagramY,
      width: diagramWidth,
      height: diagramHeight
    });
    return;
  }
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

/** 레벨기점검 블록형 1페이지분: 점검 사진 있으면 하단 칸에 채움 */
async function drawLevelBlocksOnPage(pdfDoc, page, font, reportData, chunk, levelDiagramImage) {
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
  const rgbRed = () => rgb(0.9, 0.2, 0.2);
  const photoTotalW = 495;
  const halfPhotoW = photoTotalW / 2;

  page.drawText(block.title, { x: ox, y: LAYOUT.PAGE_HEIGHT - 50, size: TITLE_FONT_SIZE, font });
  page.drawText(`${dong}동 ${ho}호  최종점검결과`, { x: ox, y: LAYOUT.PAGE_HEIGHT - 70, size: 11, font });

  const pointLabels = ['1. 좌측', '2. 우측', '3. 우측', '4. 좌측'];
  const blockHeight = 120 + dH + phH + 60;
  const totalBlockH = blockHeight + gap;
  const startY = block.origin.y;
  const diagramX = ox + 100;

  for (let idx = 0; idx < chunk.length; idx++) {
    const item = chunk[idx];
    const by = startY - idx * totalBlockH;
    const diagramY = by - 26 - 20 - dH - 30;

    const topNote = block.topNote;
    const noteW = 320;
    const noteH = 22;
    const noteX = ox;
    const noteY = by - noteH - 4;
    page.drawRectangle({
      x: noteX,
      y: noteY,
      width: noteW,
      height: noteH,
      borderColor: rgbRed(),
      borderWidth: 0.8
    });
    page.drawText(topNote, { x: noteX + 6, y: noteY + 6, size: 8, font, color: rgbRed() });

    const pointsText = item.level_summary_text || item.points || '-';
    const points = String(pointsText).split(/[,/]\s*/).slice(0, 4);
    const refMm = String(item.level_reference_mm ?? item.reference_mm ?? 150);

    const pointMargin = 6;
    const ph = 22;
    const positions = [
      { x: diagramX - pLw - pVw - 40 - pointMargin, y: diagramY + dH - 10 },
      { x: diagramX + dW + pointMargin, y: diagramY + dH - 10 },
      { x: diagramX - pLw - pVw - 40 - pointMargin, y: diagramY - ph - 8 },
      { x: diagramX + dW + pointMargin, y: diagramY - ph - 8 }
    ];
    pointLabels.forEach((label, i) => {
      const px = positions[i].x;
      const py = positions[i].y;
      page.drawRectangle({ x: px, y: py, width: pLw, height: ph, borderColor: rgbLabel(), borderWidth: bw });
      page.drawText(truncateToFit(label, 8), { x: px + 2, y: py + 4, size: FONT_SIZE - 1, font });
      page.drawRectangle({ x: px + pLw, y: py, width: pVw, height: ph, borderColor: rgbValue(), borderWidth: bw });
      page.drawText(truncateToFit(points[i] || '-', 6), { x: px + pLw + 2, y: py + 4, size: FONT_SIZE - 1, font });
      page.drawRectangle({ x: px + pLw + pVw, y: py, width: 32, height: ph, borderColor: rgbValue(), borderWidth: bw });
      page.drawText('mm', { x: px + pLw + pVw + 4, y: py + 4, size: FONT_SIZE - 1, font });
    });

    drawLevelDiagram(page, font, diagramX, diagramY, dW, dH, levelDiagramImage);

    const metaX = diagramX + dW + 12;
    let metaY = by - 32;
    [['위치', safeText(item.location)], ['결과', item.result_text ?? item.result ?? '-'], ['기준', refMm], ['메모', safeText(item.note)]].forEach(([label, val]) => {
      page.drawRectangle({ x: metaX, y: metaY, width: lw, height: rowH, borderColor: rgbLabel(), borderWidth: bw });
      page.drawText(truncateToFit(label, 4), { x: metaX + 2, y: metaY + 4, size: 8, font });
      page.drawRectangle({ x: metaX + lw, y: metaY, width: metaW - lw, height: rowH, borderColor: rgbValue(), borderWidth: bw });
      page.drawText(truncateToFit(val, 12), { x: metaX + lw + 2, y: metaY + 4, size: 8, font });
      metaY -= rowH;
    });

    const photoY = diagramY - phH - 12;
    page.drawRectangle({ x: ox, y: photoY, width: halfPhotoW, height: phH, borderColor: rgbPhoto(), borderWidth: bw });
    page.drawRectangle({ x: ox + halfPhotoW, y: photoY, width: halfPhotoW, height: phH, borderColor: rgbPhoto(), borderWidth: bw });
    const photos = item.photos && Array.isArray(item.photos) ? item.photos : [];
    const url0 = photos[0] && (photos[0].file_url || photos[0].url);
    const url1 = photos[1] && (photos[1].file_url || photos[1].url);
    if (url0) await embedAndDrawPhoto(pdfDoc, page, url0, ox + 2, photoY + 2, halfPhotoW - 4, phH - 4);
    if (url1) await embedAndDrawPhoto(pdfDoc, page, url1, ox + halfPhotoW + 2, photoY + 2, halfPhotoW - 4, phH - 4);
    if (!url0 && !url1) page.drawText('점검사진', { x: ox + 8, y: photoY + phH - 14, size: 8, font });
  }
}

/** 레벨기점검: 갯수/페이지 제한 없이 모든 항목 그리기. 사용한 페이지 수 반환. */
async function drawLevelTablePages(pdfDoc, slotIndex, font, reportData, levelDiagramImage) {
  const items = reportData.level_measurements || [];
  const block = LAYOUT.LEVEL_BLOCK;
  const dH = block.diagramHeight;
  const phH = block.photoHeight;
  const gap = block.blockGap;
  const blockHeight = 120 + dH + phH + 60;
  const totalBlockH = blockHeight + gap;
  const maxBlocks = Math.max(1, Math.floor((block.origin.y - 80) / totalBlockH));
  const initialSlot = slotIndex;
  let offset = 0;
  let page = pdfDoc.getPages()[slotIndex];
  while (true) {
    const chunk = items.slice(offset, offset + maxBlocks);
    await drawLevelBlocksOnPage(pdfDoc, page, font, reportData, chunk, levelDiagramImage);
    offset += chunk.length;
    if (offset >= items.length) break;
    pdfDoc.insertPage(slotIndex + 1, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    slotIndex++;
    page = pdfDoc.getPages()[slotIndex];
  }
  return slotIndex - initialSlot + 1;
}

/** 레벨기 수치중심: 리스트(표) + 하단 사진 영역. 사진 있으면 마지막 페이지 하단에 채움. */
async function drawLevelTablePagesValues(pdfDoc, slotIndex, font, reportData) {
  const items = reportData.level_measurements || [];
  const tableDef = LAYOUT.LEVEL_TABLE;
  const getCellValue = (item, field) => {
    if (field === 'result') return item.result_text ?? item.result ?? '-';
    if (field === 'reference_mm') return String(item.level_reference_mm ?? item.reference_mm ?? '-');
    if (field === 'points') return item.level_summary_text ?? item.points ?? '-';
    return safeText(item[field]);
  };
  const initialSlot = slotIndex;
  let offset = 0;
  let page = pdfDoc.getPages()[slotIndex];
  const photoAreaHeight = 110;
  const maxRowsLastPage = Math.max(1, Math.floor((tableDef.origin.y - photoAreaHeight - tableDef.headerHeight - 40) / tableDef.rowHeight));

  while (offset < items.length) {
    const isLastChunk = offset + tableDef.maxRowsPerPage >= items.length;
    const maxRows = isLastChunk ? Math.min(items.length - offset, maxRowsLastPage) : tableDef.maxRowsPerPage;
    const chunk = items.slice(offset, offset + maxRows);
    drawTablePage(page, font, tableDef, reportData, chunk, getCellValue);

    if (isLastChunk) {
      const photoY = 120;
      const photoH = 90;
      const photoW = 495;
      const photoX = tableDef.origin.x;
      page.drawRectangle({
        x: photoX,
        y: photoY,
        width: photoW,
        height: photoH,
        borderColor: rgb(0.95, 0.6, 0.2),
        borderWidth: 0.8
      });
      let url0, url1;
      for (const item of items) {
        if (item.photos && item.photos.length > 0) {
          url0 = item.photos[0].file_url || item.photos[0].url;
          url1 = item.photos[1] && (item.photos[1].file_url || item.photos[1].url);
          break;
        }
      }
      if (url0) await embedAndDrawPhoto(pdfDoc, page, url0, photoX + 2, photoY + 2, (photoW / 2) - 4, photoH - 4);
      if (url1) await embedAndDrawPhoto(pdfDoc, page, url1, photoX + photoW / 2 + 2, photoY + 2, (photoW / 2) - 4, photoH - 4);
      if (!url0 && !url1) page.drawText('레벨기 점검 사진', { x: photoX + 8, y: photoY + photoH - 14, size: 9, font });
    }

    offset += chunk.length;
    if (offset >= items.length) break;
    pdfDoc.insertPage(slotIndex + 1, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    slotIndex++;
    page = pdfDoc.getPages()[slotIndex];
  }
  return slotIndex - initialSlot + 1;
}

/** 템플릿 8·10·12·13p를 제거하고, 같은 위치에 빈 A4 4장 삽입 후 점검결과만 별도 페이지로 그림. 항목 많으면 추가 페이지 삽입. */
async function assembleFinalWithTemplatePages(pdfDoc, reportData, font, airDiagramImage, levelDiagramImage) {
  if (pdfDoc.getPageCount() > 12) pdfDoc.removePage(12);
  if (pdfDoc.getPageCount() > 11) pdfDoc.removePage(11);
  if (pdfDoc.getPageCount() > 9) pdfDoc.removePage(9);
  if (pdfDoc.getPageCount() > 7) pdfDoc.removePage(7);

  pdfDoc.insertPage(7, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  pdfDoc.insertPage(9, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  pdfDoc.insertPage(11, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  pdfDoc.insertPage(12, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);

  const v = await drawVisualTablePages(pdfDoc, 7, font, reportData);
  const t = await drawThermalTablePages(pdfDoc, 9 + (v - 1), font, reportData);
  const a = await drawAirTablePages(pdfDoc, 11 + (v - 1) + (t - 1), font, reportData, airDiagramImage);
  await drawLevelTablePages(pdfDoc, 12 + (v - 1) + (t - 1) + (a - 1), font, reportData, levelDiagramImage);
}

/** 수치중심: 육안/열화상은 동일, 공기질/레벨기는 리스트(표) + 하단 사진만. */
async function assembleFinalWithTemplatePagesValues(pdfDoc, reportData, font) {
  if (pdfDoc.getPageCount() > 12) pdfDoc.removePage(12);
  if (pdfDoc.getPageCount() > 11) pdfDoc.removePage(11);
  if (pdfDoc.getPageCount() > 9) pdfDoc.removePage(9);
  if (pdfDoc.getPageCount() > 7) pdfDoc.removePage(7);

  pdfDoc.insertPage(7, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  pdfDoc.insertPage(9, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  pdfDoc.insertPage(11, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  pdfDoc.insertPage(12, [LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);

  const v = await drawVisualTablePages(pdfDoc, 7, font, reportData);
  const t = await drawThermalTablePages(pdfDoc, 9 + (v - 1), font, reportData);
  const a = await drawAirTablePagesValues(pdfDoc, 11 + (v - 1) + (t - 1), font, reportData);
  await drawLevelTablePagesValues(pdfDoc, 12 + (v - 1) + (t - 1) + (a - 1), font, reportData);
}

/** 템플릿 없이 점검 표 페이지만 생성 (항목 많으면 추가 페이지) */
async function generateDataOnlyReport(reportData, font, pdfDoc, airDiagramImage, levelDiagramImage) {
  pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  await drawVisualTablePages(pdfDoc, pdfDoc.getPageCount() - 1, font, reportData);
  pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  await drawThermalTablePages(pdfDoc, pdfDoc.getPageCount() - 1, font, reportData);
  pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  await drawAirTablePages(pdfDoc, pdfDoc.getPageCount() - 1, font, reportData, airDiagramImage);
  pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
  await drawLevelTablePages(pdfDoc, pdfDoc.getPageCount() - 1, font, reportData, levelDiagramImage);
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

  let airDiagramImage = null;
  let levelDiagramImage = null;
  if (fs.existsSync(AIR_DIAGRAM_PATH)) {
    try {
      airDiagramImage = await pdfDoc.embedPng(fs.readFileSync(AIR_DIAGRAM_PATH));
    } catch (e) {
      // ignore
    }
  }
  if (fs.existsSync(LEVEL_DIAGRAM_PATH)) {
    try {
      levelDiagramImage = await pdfDoc.embedPng(fs.readFileSync(LEVEL_DIAGRAM_PATH));
    } catch (e) {
      // ignore
    }
  }

  if (usedTemplate && pdfDoc.getPageCount() >= 13) {
    await assembleFinalWithTemplatePages(pdfDoc, reportData, font, airDiagramImage, levelDiagramImage);
  } else {
    await generateDataOnlyReport(reportData, font, pdfDoc, airDiagramImage, levelDiagramImage);
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

/** 최종보고서-수치중심: 동일 템플릿·육안·열화상, 공기질/레벨기는 리스트형 + 사진만 하단. */
async function generateFinalReportValues(reportData, options = {}) {
  const dong = reportData.dong || '';
  const ho = reportData.ho || '';
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const finalFilename = options.filename || `보고서_최종_수치중심_${dong}-${ho}_${timestamp}.pdf`;
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
    await assembleFinalWithTemplatePagesValues(pdfDoc, reportData, font);
  } else {
    pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    await drawVisualTablePages(pdfDoc, 0, font, reportData);
    pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    await drawThermalTablePages(pdfDoc, 1, font, reportData);
    pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    await drawAirTablePagesValues(pdfDoc, 2, font, reportData);
    pdfDoc.addPage([LAYOUT.PAGE_WIDTH, LAYOUT.PAGE_HEIGHT]);
    await drawLevelTablePagesValues(pdfDoc, 3, font, reportData);
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
  generateFinalReportValues,
  TEMPLATE_FILENAME,
  FILL_PAGE_INDICES: [7, 9, 11, 12]
};
