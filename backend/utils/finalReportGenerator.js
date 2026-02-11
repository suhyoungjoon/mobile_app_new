/**
 * 최종보고서 순서:
 * 1~10p: 템플릿 그대로
 * 11p: 육안점검 설명 (템플릿) → 다음: 육안점검결과(1p)
 * 14p: 열화상점검 설명 (템플릿) → 다음: 열화상점검결과(2p)
 * 17p: 공기질점검 설명 (템플릿) → 다음: 공기질점검결과(3p)
 * 20p: 레벨기점검 설명 (템플릿) → 다음: 레벨기점검결과(4p)
 * 21p~: 템플릿 그대로
 * (템플릿 12·13·15·16·18·19p는 사용하지 않고, 설명→결과 순으로만 배치)
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const TEMPLATE_FILENAME = '인사이트아이_보고서_전체.pdf';
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

// 사용할 설명 페이지만 (1-based 11, 14, 17, 20 → 0-based 10, 13, 16, 19). 그 사이 템플릿 12·13·15·16·18·19는 건너뜀
const DESCRIPTION_PAGES_1_BASED = [11, 14, 17, 20];
const DESCRIPTION_TEMPLATE_INDICES = DESCRIPTION_PAGES_1_BASED.map((p) => p - 1); // 10, 13, 16, 19

async function generateFinalReport(reportData, pdfmakeGenerator, options = {}) {
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

  const tempResultsFilename = `final-results-${Date.now()}.pdf`;
  const resultsPdfBlob = await pdfmakeGenerator.generateFinalReportInspectionOverlayPDF(reportData, {
    filename: tempResultsFilename
  });
  const resultsBytes = fs.readFileSync(resultsPdfBlob.path);
  const resultsPdf = await PDFDocument.load(resultsBytes);
  const resultsPageCount = resultsPdf.getPageCount();

  const mergedPdf = await PDFDocument.create();

  // 1~10p: 템플릿 0~9 그대로
  for (let i = 0; i < 10 && i < templatePageCount; i++) {
    const [p] = await mergedPdf.copyPages(templatePdf, [i]);
    mergedPdf.addPage(p);
  }

  // 11p(설명) → 육안결과 → 14p(설명) → 열화상결과 → 17p(설명) → 공기질결과 → 20p(설명) → 레벨기결과 (템플릿 12·13·15·16·18·19는 사용 안 함)
  for (let k = 0; k < DESCRIPTION_TEMPLATE_INDICES.length; k++) {
    const templateIdx = DESCRIPTION_TEMPLATE_INDICES[k];
    if (templateIdx >= templatePageCount) continue;
    const [descPage] = await mergedPdf.copyPages(templatePdf, [templateIdx]);
    mergedPdf.addPage(descPage);
    if (k < resultsPageCount) {
      const [resultPage] = await mergedPdf.copyPages(resultsPdf, [k]);
      mergedPdf.addPage(resultPage);
    }
  }

  // 21p~: 템플릿 20번째 페이지부터 끝까지
  for (let i = 20; i < templatePageCount; i++) {
    const [p] = await mergedPdf.copyPages(templatePdf, [i]);
    mergedPdf.addPage(p);
  }

  const mergedBytes = await mergedPdf.save();
  fs.writeFileSync(finalPath, mergedBytes);

  try {
    fs.unlinkSync(resultsPdfBlob.path);
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
  DESCRIPTION_PAGES_1_BASED,
  DESCRIPTION_TEMPLATE_INDICES
};
