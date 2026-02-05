// Reports routes
const express = require('express');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
// PDF 생성기: pdfmake 사용 (한글 폰트 지원, 보고서는 PDF 전용)
const pdfGenerator = require('../utils/pdfmakeGenerator');
const smsService = require('../utils/smsService');
const { decrypt } = require('../utils/encryption');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 점검원(admin complex)이면 요청의 household_id로 보고서 대상 세대 사용
async function getReportTargetHouseholdId(req) {
  const tokenHouseholdId = req.user?.householdId;
  const overrideId = req.query?.household_id || req.body?.household_id;
  if (!overrideId) return tokenHouseholdId;
  const r = await pool.query(
    `SELECT c.name FROM household h JOIN complex c ON h.complex_id = c.id WHERE h.id = $1`,
    [tokenHouseholdId]
  );
  const isInspector = r.rows[0] && (r.rows[0].name || '').toLowerCase() === 'admin';
  return isInspector ? parseInt(overrideId, 10) : tokenHouseholdId;
}

// Get report preview — 사용자(세대) 기준: 등록된 모든 하자 + 하자별 점검내용
router.get('/preview', authenticateToken, async (req, res) => {
  try {
    const householdId = await getReportTargetHouseholdId(req);
    const data = await loadHouseholdReportData(householdId);
    if (!data) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const {
      complex,
      dong,
      ho,
      name,
      defects,
      total_defects: totalDefects,
      total_thermal: totalThermal,
      total_air: totalAir,
      total_radon: totalRadon,
      total_level: totalLevel,
      total_equipment: totalEquipment,
      has_equipment_data: hasEquipmentData
    } = data;

    // 전체 점검 요약용 플랫 리스트 (기존 템플릿 호환)
    const airMeasurements = [];
    const radonMeasurements = [];
    const levelMeasurements = [];
    const thermalInspections = [];
    defects.forEach((d) => {
      (d.inspections.air || []).forEach((x) => airMeasurements.push(x));
      (d.inspections.radon || []).forEach((x) => radonMeasurements.push(x));
      (d.inspections.level || []).forEach((x) => levelMeasurements.push(x));
      (d.inspections.thermal || []).forEach((x) => thermalInspections.push(x));
    });

    const latestCase = defects.length > 0 ? defects[0].case_id : null;
    const defectsWithIndex = defects.map((d, i) => ({ ...d, index: i + 1 }));
    const html = generateComprehensiveReportHTML({
      complex,
      dong,
      ho,
      name,
      type: '종합점검',
      created_at: defects.length > 0 ? defects[0].case_created_at : new Date(),
      generated_at: new Date(),
      total_defects: totalDefects,
      total_thermal: totalThermal,
      total_air: totalAir,
      total_radon: totalRadon,
      total_level: totalLevel,
      total_equipment: totalEquipment,
      has_equipment_data: hasEquipmentData,
      defects: defectsWithIndex,
      air_measurements: airMeasurements,
      radon_measurements: radonMeasurements,
      level_measurements: levelMeasurements,
      thermal_inspections: thermalInspections
    });

    res.json({
      html,
      case_id: latestCase,
      defects_count: totalDefects,
      equipment_count: totalEquipment,
      defects: defects.map((d) => ({
        id: d.id,
        case_id: d.case_id,
        location: d.location,
        trade: d.trade,
        content: d.content,
        memo: d.memo,
        photos: d.photos,
        inspections: d.inspections
      })),
      equipment_data: {
        air: airMeasurements,
        radon: radonMeasurements,
        level: levelMeasurements,
        thermal: thermalInspections
      }
    });
  } catch (error) {
    console.error('Report preview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate PDF report — 사용자(세대) 기준: 등록된 모든 하자 + 하자별 점검내용
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { template = 'comprehensive-report' } = req.body;
    const householdId = await getReportTargetHouseholdId(req);

    const data = await loadHouseholdReportData(householdId);
    if (!data) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const defectsWithIndex = data.defects.map((d, i) => ({
      ...d,
      index: i + 1,
      location: d.location || '',
      trade: d.trade || '',
      content: d.content || '',
      memo: d.memo || ''
    }));

    const airMeasurements = [];
    const radonMeasurements = [];
    const levelMeasurements = [];
    const thermalInspections = [];
    data.defects.forEach((d) => {
      (d.inspections.air || []).forEach((x) => airMeasurements.push(x));
      (d.inspections.radon || []).forEach((x) => radonMeasurements.push(x));
      (d.inspections.level || []).forEach((x) => levelMeasurements.push(x));
      (d.inspections.thermal || []).forEach((x) => thermalInspections.push(x));
    });

    const reportData = {
      complex: data.complex || '',
      dong: data.dong || '',
      ho: data.ho || '',
      name: data.name || '',
      type: '종합점검',
      created_at: data.defects.length > 0 ? data.defects[0].case_created_at : new Date(),
      generated_at: new Date().toISOString(),
      total_defects: data.total_defects,
      total_thermal: data.total_thermal,
      total_air: data.total_air,
      total_radon: data.total_radon,
      total_level: data.total_level,
      total_equipment: data.total_equipment,
      has_equipment_data: data.has_equipment_data,
      defects: defectsWithIndex,
      air_measurements: airMeasurements,
      radon_measurements: radonMeasurements,
      level_measurements: levelMeasurements,
      thermal_inspections: thermalInspections
    };

    const filename = `report-${householdId}-${Date.now()}.pdf`;
    const pdfResult = await pdfGenerator.generatePDF('comprehensive-report', reportData, { filename });

    res.json({
      success: true,
      message: 'PDF generated successfully',
      filename: pdfResult.filename,
      url: pdfResult.url,
      download_url: `/api/reports/download/${pdfResult.filename}`,
      size: pdfResult.size,
      case_id: data.defects.length > 0 ? data.defects[0].case_id : null
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'PDF generation failed',
      message: error.message
    });
  }
});

// PowerPoint 보고서 생성 비활성화 — PDF만 지원 (범용적으로 열리도록)
// 보고서는 POST /reports/generate 로 PDF 생성 후 미리보기/다운로드 사용
router.post('/generate-pptx', authenticateToken, (req, res) => {
  res.status(410).json({
    success: false,
    error: 'PowerPoint report is deprecated',
    message: '보고서는 PDF만 지원합니다. POST /api/reports/generate 로 PDF를 생성해 주세요.',
    use_instead: 'POST /api/reports/generate'
  });
});

// Send report (with PDF generation) — 사용자(세대) 기준 동일
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { phone_number } = req.body;
    const householdId = await getReportTargetHouseholdId(req);

    const phoneResult = await pool.query(
      'SELECT resident_name_encrypted, phone, phone_encrypted FROM household WHERE id = $1',
      [householdId]
    );
    if (phoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Household not found' });
    }
    const userPhone = phoneResult.rows[0].phone_encrypted
      ? decrypt(phoneResult.rows[0].phone_encrypted)
      : phoneResult.rows[0].phone;
    const targetPhone = phone_number || userPhone;
    if (!targetPhone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const data = await loadHouseholdReportData(householdId);
    if (!data) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const defectsWithIndex = data.defects.map((d, i) => ({
      ...d,
      index: i + 1,
      location: d.location || '',
      trade: d.trade || '',
      content: d.content || '',
      memo: d.memo || ''
    }));
    const airMeasurements = [];
    const radonMeasurements = [];
    const levelMeasurements = [];
    const thermalInspections = [];
    data.defects.forEach((d) => {
      (d.inspections.air || []).forEach((x) => airMeasurements.push(x));
      (d.inspections.radon || []).forEach((x) => radonMeasurements.push(x));
      (d.inspections.level || []).forEach((x) => levelMeasurements.push(x));
      (d.inspections.thermal || []).forEach((x) => thermalInspections.push(x));
    });
    const reportData = {
      complex: data.complex || '',
      dong: data.dong || '',
      ho: data.ho || '',
      name: data.name || '',
      type: '종합점검',
      created_at: data.defects.length > 0 ? data.defects[0].case_created_at : new Date(),
      generated_at: new Date().toISOString(),
      total_defects: data.total_defects,
      total_thermal: data.total_thermal,
      total_air: data.total_air,
      total_radon: data.total_radon,
      total_level: data.total_level,
      total_equipment: data.total_equipment,
      has_equipment_data: data.has_equipment_data,
      defects: defectsWithIndex,
      air_measurements: airMeasurements,
      radon_measurements: radonMeasurements,
      level_measurements: levelMeasurements,
      thermal_inspections: thermalInspections
    };

    const filename = `report-${householdId}-${Date.now()}.pdf`;
    const pdfResult = await pdfGenerator.generatePDF('comprehensive-report', reportData, { filename });

    const baseUrl = process.env.BACKEND_URL || 'https://mobile-app-new.onrender.com';
    const fullPdfUrl = `${baseUrl}${pdfResult.url}`;
    const caseInfo = {
      complex: data.complex,
      dong: data.dong,
      ho: data.ho,
      name: data.name,
      defectCount: data.total_defects
    };
    const smsResult = await smsService.sendReportNotification(targetPhone, fullPdfUrl, caseInfo);
    if (!smsResult.success && !smsResult.mock) {
      console.warn('SMS notification failed:', smsResult.error);
    }

    res.json({
      success: true,
      message: 'Report generated and sent successfully',
      filename: pdfResult.filename,
      pdf_url: pdfResult.url,
      download_url: `/api/reports/download/${pdfResult.filename}`,
      sent_to: targetPhone,
      size: pdfResult.size,
      sms_sent: smsResult.success,
      sms_mock: smsResult.mock || false,
      case_id: data.defects.length > 0 ? data.defects[0].case_id : null
    });
  } catch (error) {
    console.error('Send report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send report',
      message: error.message
    });
  }
});

// PDF 전용: .pdf 확장자만 허용 (범용적으로 열리는 포맷만 지원)
function isPdfFilename(filename) {
  return typeof filename === 'string' && filename.endsWith('.pdf');
}

// Preview PDF report (browser view)
router.get('/preview-pdf/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal & PDF only
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    if (!isPdfFilename(filename)) {
      return res.status(400).json({ error: 'Only PDF reports are supported. Use /reports/generate to create a PDF.' });
    }

    const reportPath = pdfGenerator.getReportPath(filename);
    
    // Check if file exists
    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Set headers for browser preview (inline)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Send file
    res.sendFile(path.resolve(reportPath));

  } catch (error) {
    console.error('PDF preview error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to preview PDF',
      message: error.message 
    });
  }
});

// Download PDF report
router.get('/download/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal & PDF only
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    if (!isPdfFilename(filename)) {
      return res.status(400).json({ error: 'Only PDF reports are supported. Use /reports/generate to create a PDF.' });
    }

    const reportPath = pdfGenerator.getReportPath(filename);
    
    // Check if file exists
    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send file
    res.sendFile(path.resolve(reportPath));

  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to download PDF',
      message: error.message 
    });
  }
});

// Helper function to get result text
function getResultText(result) {
  const resultMap = {
    'normal': '정상',
    'check': '확인요망',
    'na': '해당없음'
  };
  return resultMap[result] || result;
}

// 사용자(세대) 기준 보고서 데이터: 해당 세대의 모든 하자 + 하자별 점검내용(inspection_item by defect_id)
async function loadHouseholdReportData(householdId) {
  const householdResult = await pool.query(
    `SELECT h.dong, h.ho, h.resident_name, h.resident_name_encrypted, c.name as complex_name
     FROM household h JOIN complex c ON h.complex_id = c.id WHERE h.id = $1`,
    [householdId]
  );
  if (householdResult.rows.length === 0) return null;
  const household = householdResult.rows[0];
  const complex = household.complex_name || '';
  const dong = household.dong || '';
  const ho = household.ho || '';
  const name = household.resident_name_encrypted
    ? decrypt(household.resident_name_encrypted)
    : (household.resident_name || '');

  const defectsResult = await pool.query(
    `SELECT d.id, d.case_id, d.location, d.trade, d.content, d.memo, d.created_at,
            c.type as case_type, c.created_at as case_created_at
     FROM defect d
     JOIN case_header c ON d.case_id = c.id
     WHERE c.household_id = $1
     ORDER BY c.created_at DESC, d.created_at DESC`,
    [householdId]
  );
  const defects = defectsResult.rows || [];

  const inspectionItemQuery = `
    SELECT ii.type, ii.location, ii.trade, ii.note, ii.result, ii.created_at,
           am.tvoc, am.hcho, am.co2, am.unit_tvoc, am.unit_hcho,
           rm.radon, rm.unit_radon,
           lm.left_mm, lm.right_mm,
           (SELECT json_agg(json_build_object('file_url', tp.file_url, 'caption', tp.caption, 'shot_at', tp.shot_at))
            FROM thermal_photo tp WHERE tp.item_id = ii.id) as photos
    FROM inspection_item ii
    LEFT JOIN air_measure am ON ii.id = am.item_id
    LEFT JOIN radon_measure rm ON ii.id = rm.item_id
    LEFT JOIN level_measure lm ON ii.id = lm.item_id
    WHERE ii.defect_id = $1
    ORDER BY ii.created_at ASC
  `;

  let totalThermal = 0, totalAir = 0, totalRadon = 0, totalLevel = 0;

  for (const defect of defects) {
    const photoResult = await pool.query(
      'SELECT id, kind, url, thumb_url, taken_at FROM photo WHERE defect_id = $1 ORDER BY kind, taken_at',
      [defect.id]
    );
    defect.photos = photoResult.rows || [];

    const itemResult = await pool.query(inspectionItemQuery, [defect.id]);
    const air = [], radon = [], level = [], thermal = [];
    (itemResult.rows || []).forEach((item) => {
      const base = {
        location: item.location,
        trade: item.trade,
        note: item.note,
        result: item.result,
        result_text: getResultText(item.result),
        created_at: item.created_at
      };
      switch (item.type) {
        case 'air':
          air.push({ ...base, tvoc: item.tvoc, hcho: item.hcho, co2: item.co2, unit_tvoc: item.unit_tvoc, unit_hcho: item.unit_hcho });
          totalAir++;
          break;
        case 'radon':
          radon.push({ ...base, radon: item.radon, unit: item.unit_radon });
          totalRadon++;
          break;
        case 'level':
          level.push({ ...base, left_mm: item.left_mm, right_mm: item.right_mm });
          totalLevel++;
          break;
        case 'thermal':
          thermal.push({ ...base, photos: item.photos || [] });
          totalThermal++;
          break;
      }
    });
    defect.inspections = { air, radon, level, thermal };
  }

  const totalEquipment = totalThermal + totalAir + totalRadon + totalLevel;
  return {
    complex,
    dong,
    ho,
    name,
    defects,
    total_defects: defects.length,
    total_thermal: totalThermal,
    total_air: totalAir,
    total_radon: totalRadon,
    total_level: totalLevel,
    total_equipment: totalEquipment,
    has_equipment_data: totalEquipment > 0
  };
}

// Comprehensive HTML report generator
function generateComprehensiveReportHTML(data) {
  const handlebars = require('handlebars');
  const fs = require('fs');
  const path = require('path');
  
  const templatePath = path.join(__dirname, '../templates/comprehensive-report.hbs');
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateSource);
  
  // Add formatDate helper
  const templateData = {
    ...data,
    formatDate: (date) => {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };
  
  return template(templateData);
}

// Simple HTML report generator (legacy)
function generateReportHTML(data) {
  const { complex, dong, ho, name, created_at, defects } = data;
  
  let defectsHtml = '';
  if (defects && defects.length > 0) {
    defectsHtml = defects.map((defect, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${defect.location}</td>
        <td>${defect.trade}</td>
        <td>${defect.content}</td>
        <td>${defect.memo || '-'}</td>
      </tr>
    `).join('');
  }

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <title>세대 점검 종합보고서</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 24px; }
        h1 { font-size: 20px; color: #333; }
        h2 { font-size: 16px; margin-top: 24px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <h1>세대 점검 종합보고서</h1>
      <div class="meta">
        단지: ${complex} / 동-호: ${dong}-${ho} / 성명: ${name} / 생성일: ${created_at}
      </div>
      
      <h2>하자 목록</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>위치</th>
            <th>세부공정</th>
            <th>내용</th>
            <th>메모</th>
          </tr>
        </thead>
        <tbody>
          ${defectsHtml}
        </tbody>
      </table>
      
      <h2>비고</h2>
      <p>※ 본 문서는 앱 입력값을 기반으로 자동 생성된 보고서입니다.</p>
    </body>
    </html>
  `;
}

module.exports = router;
