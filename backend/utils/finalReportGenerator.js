/**
 * 최종보고서: 템플릿 PDF(인사이트아이_보고서_전체.pdf)의 점검결과 구간만
 * 실제 점검 데이터로 생성한 PDF로 치환하여 병합.
 * 16~23p 구간은 템플릿 페이지를 배경으로 유지하고, 내용 영역에만 점검 결과를 오버레이하여
 * 템플릿의 이미지(로고·아이콘 등, 사진 제외)는 그대로 사용합니다.
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

const TEMPLATE_FILENAME = '인사이트아이_보고서_전체.pdf';
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

// 템플릿 PDF에서 점검결과로 치환할 페이지 구간 (1-based). 그 앞/뒤는 템플릿 유지
const INSPECTION_START_PAGE = 16;  // 1-based
const INSPECTION_END_PAGE = 23;    // 1-based

// 16~23p에서 "내용만 덮을" 영역 (pt). 이 영역 밖(상·하·좌·우)은 템플릿 이미지가 그대로 보임
// A4 기준 (595 x 842). 필요 시 템플릿 레이아웃에 맞게 조정
const CONTENT_LEFT = 45;
const CONTENT_BOTTOM = 45;
const CONTENT_WIDTH = 505;
const CONTENT_HEIGHT = 752;

async function generateFinalReport(reportData, pdfmakeGenerator, options = {}) {
  const preserveTemplateImages = options.preserveTemplateImages !== false;

  const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_FILENAME);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`최종보고서 템플릿을 찾을 수 없습니다: ${TEMPLATE_FILENAME}. templates 폴더에 파일을 넣어주세요.`);
  }

  const dong = reportData.dong || '';
  const ho = reportData.ho || '';
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const finalFilename = options.filename || `보고서_최종_${dong}-${ho}_${timestamp}.pdf`;
  const finalPath = path.join(REPORTS_DIR, finalFilename);

  const templateBytes = fs.readFileSync(templatePath);
  const templatePdf = await PDFDocument.load(templateBytes);
  const templatePageCount = templatePdf.getPageCount();

  const tempInspectionFilename = `inspection-${Date.now()}.pdf`;
  const inspectionResult = await pdfmakeGenerator.generateInspectionResultsPDF(reportData, {
    filename: tempInspectionFilename
  });
  const inspectionBytes = fs.readFileSync(inspectionResult.path);
  const inspectionPdf = await PDFDocument.load(inspectionBytes);
  const inspectionPageCount = inspectionPdf.getPageCount();

  const mergedPdf = await PDFDocument.create();

  const beforeEnd = Math.min(INSPECTION_START_PAGE - 1, templatePageCount);
  const beforeIndices = Array.from({ length: beforeEnd }, (_, i) => i);
  if (beforeIndices.length > 0) {
    const copiedBefore = await mergedPdf.copyPages(templatePdf, beforeIndices);
    copiedBefore.forEach((p) => mergedPdf.addPage(p));
  }

  if (preserveTemplateImages && templatePageCount >= INSPECTION_END_PAGE) {
    // 16~23p: 템플릿 페이지를 배경으로 복사한 뒤, 내용 영역만 흰색으로 덮고 점검 결과 PDF를 그 위에 그림
    const templateInspectionIndices = Array.from(
      { length: INSPECTION_END_PAGE - INSPECTION_START_PAGE + 1 },
      (_, i) => INSPECTION_START_PAGE - 1 + i
    );
    const copiedTemplateInspection = await mergedPdf.copyPages(templatePdf, templateInspectionIndices);

    for (let i = 0; i < copiedTemplateInspection.length; i++) {
      const page = copiedTemplateInspection[i];
      // 내용 영역만 흰색 사각형으로 덮어서 템플릿 글자/표는 가리고, 바깥쪽 이미지는 유지
      page.drawRectangle({
        x: CONTENT_LEFT,
        y: CONTENT_BOTTOM,
        width: CONTENT_WIDTH,
        height: CONTENT_HEIGHT,
        color: rgb(1, 1, 1)
      });
      // 해당하는 점검 결과 페이지를 내용 영역에 맞춰 그리기
      if (i < inspectionPageCount) {
        const [embeddedInspectionPage] = await mergedPdf.embedPdf(inspectionPdf, [i]);
        page.drawPage(embeddedInspectionPage, {
          x: CONTENT_LEFT,
          y: CONTENT_BOTTOM,
          width: CONTENT_WIDTH,
          height: CONTENT_HEIGHT
        });
      }
      mergedPdf.addPage(page);
    }

    // 점검 결과가 8페이지를 넘으면 나머지는 그대로 추가 (템플릿 배경 없음)
    if (inspectionPageCount > copiedTemplateInspection.length) {
      const extraIndices = Array.from(
        { length: inspectionPageCount - copiedTemplateInspection.length },
        (_, i) => copiedTemplateInspection.length + i
      );
      const copiedExtra = await mergedPdf.copyPages(inspectionPdf, extraIndices);
      copiedExtra.forEach((p) => mergedPdf.addPage(p));
    }
  } else {
    // 기존 방식: 16~23p 전체를 점검 결과 PDF로 교체 (템플릿 이미지 미사용)
    const inspectionIndices = Array.from({ length: inspectionPageCount }, (_, i) => i);
    const copiedInspection = await mergedPdf.copyPages(inspectionPdf, inspectionIndices);
    copiedInspection.forEach((p) => mergedPdf.addPage(p));
  }

  const afterStart = INSPECTION_END_PAGE;
  if (afterStart < templatePageCount) {
    const afterIndices = [];
    for (let i = afterStart; i < templatePageCount; i++) afterIndices.push(i);
    const copiedAfter = await mergedPdf.copyPages(templatePdf, afterIndices);
    copiedAfter.forEach((p) => mergedPdf.addPage(p));
  }

  const mergedBytes = await mergedPdf.save();
  fs.writeFileSync(finalPath, mergedBytes);

  try {
    fs.unlinkSync(inspectionResult.path);
  } catch (e) {
    // ignore
  }

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
  INSPECTION_START_PAGE,
  INSPECTION_END_PAGE
};
