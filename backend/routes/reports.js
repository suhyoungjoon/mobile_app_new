// Reports routes
const express = require('express');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
// const pdfGenerator = require('../utils/pdfGenerator'); // PDF 기능 임시 비활성화
const smsService = require('../utils/smsService');

const router = express.Router();

// Get report preview
router.get('/preview', authenticateToken, async (req, res) => {
  try {
    const { householdId, complex, dong, ho, name } = req.user;

    // Get latest case with defects and equipment inspections from database
    const query = `
      SELECT c.id, c.type, c.created_at,
             json_agg(
               json_build_object(
                 'id', d.id,
                 'location', d.location,
                 'trade', d.trade,
                 'content', d.content,
                 'memo', d.memo,
                 'photos', (
                   SELECT json_agg(
                     json_build_object(
                       'kind', p.kind,
                       'url', p.url
                     )
                   )
                   FROM photo p WHERE p.defect_id = d.id
                 )
               )
             ) FILTER (WHERE d.id IS NOT NULL) as defects
      FROM case_header c
      LEFT JOIN defect d ON c.id = d.case_id
      WHERE c.household_id = $1
      GROUP BY c.id, c.type, c.created_at
      ORDER BY c.created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [householdId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No cases found' });
    }

    const caseData = result.rows[0];
    const caseId = caseData.id;

    // Get equipment inspection data
    const equipmentQuery = `
      SELECT 
        ii.type,
        ii.location,
        ii.trade,
        ii.note,
        ii.result,
        ii.created_at,
        -- Air measurements
        am.tvoc,
        am.hcho,
        am.co2,
        am.unit_tvoc,
        am.unit_hcho,
        -- Radon measurements
        rm.radon,
        rm.unit_radon,
        -- Level measurements
        lm.left_mm,
        lm.right_mm,
        -- Thermal photos
        (
          SELECT json_agg(
            json_build_object(
              'file_url', tp.file_url,
              'caption', tp.caption,
              'shot_at', tp.shot_at
            )
          )
          FROM thermal_photo tp WHERE tp.item_id = ii.id
        ) as photos
      FROM inspection_item ii
      LEFT JOIN air_measure am ON ii.id = am.item_id
      LEFT JOIN radon_measure rm ON ii.id = rm.item_id
      LEFT JOIN level_measure lm ON ii.id = lm.item_id
      WHERE ii.case_id = $1
      ORDER BY ii.created_at ASC
    `;

    const equipmentResult = await pool.query(equipmentQuery, [caseId]);
    const equipmentData = equipmentResult.rows;

    // Process equipment data by type
    const airMeasurements = [];
    const radonMeasurements = [];
    const levelMeasurements = [];
    const thermalInspections = [];

    equipmentData.forEach(item => {
      const baseData = {
        location: item.location,
        trade: item.trade,
        note: item.note,
        result: item.result,
        result_text: getResultText(item.result),
        created_at: item.created_at
      };

      switch (item.type) {
        case 'air':
          airMeasurements.push({
            ...baseData,
            tvoc: item.tvoc,
            hcho: item.hcho,
            co2: item.co2,
            unit_tvoc: item.unit_tvoc,
            unit_hcho: item.unit_hcho
          });
          break;
        case 'radon':
          radonMeasurements.push({
            ...baseData,
            radon: item.radon,
            unit: item.unit_radon
          });
          break;
        case 'level':
          levelMeasurements.push({
            ...baseData,
            left_mm: item.left_mm,
            right_mm: item.right_mm
          });
          break;
        case 'thermal':
          thermalInspections.push({
            ...baseData,
            photos: item.photos || []
          });
          break;
      }
    });

    // Calculate totals
    const totalDefects = caseData.defects ? caseData.defects.length : 0;
    const totalThermal = thermalInspections.length;
    const totalAir = airMeasurements.length;
    const totalRadon = radonMeasurements.length;
    const totalLevel = levelMeasurements.length;
    const totalEquipment = totalThermal + totalAir + totalRadon + totalLevel;
    const hasEquipmentData = totalEquipment > 0;

    // Generate comprehensive HTML report
    const html = generateComprehensiveReportHTML({
      complex,
      dong,
      ho,
      name,
      type: caseData.type,
      created_at: caseData.created_at,
      generated_at: new Date(),
      total_defects: totalDefects,
      total_thermal: totalThermal,
      total_air: totalAir,
      total_radon: totalRadon,
      total_level: totalLevel,
      total_equipment: totalEquipment,
      has_equipment_data: hasEquipmentData,
      defects: caseData.defects || [],
      air_measurements: airMeasurements,
      radon_measurements: radonMeasurements,
      level_measurements: levelMeasurements,
      thermal_inspections: thermalInspections
    });

    res.json({
      html,
      case_id: caseData.id,
      defects_count: totalDefects,
      equipment_count: totalEquipment,
      defects: caseData.defects || [],
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

// Generate PDF report
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { case_id, template = 'simple-report' } = req.body;
    const { householdId, complex, dong, ho, name } = req.user;

    if (!case_id) {
      return res.status(400).json({ error: 'case_id is required' });
    }

    // Mock data for development
    const mockCaseData = {
      id: case_id,
      type: '하자접수',
      created_at: new Date().toISOString(),
      defects: [
        {
          id: 'DEF-1',
          location: '거실',
          trade: '바닥재',
          content: '마루판 들뜸',
          memo: '현장 특이사항',
          created_at: new Date().toISOString()
        },
        {
          id: 'DEF-2',
          location: '주방',
          trade: '타일',
          content: '타일 균열',
          memo: '',
          created_at: new Date().toISOString()
        }
      ]
    };

    const defects = mockCaseData.defects || [];

    // Prepare data for PDF generation
    const reportData = {
      complex,
      dong,
      ho,
      name,
      created_at: mockCaseData.created_at,
      defects: defects.map((defect, index) => ({
        ...defect,
        index: index + 1
      }))
    };

    // Generate PDF
    const pdfResult = await pdfGenerator.generateSimpleReportPDF(reportData, defects, {
      filename: `report-${case_id}-${Date.now()}.pdf`
    });

    res.json({
      message: 'PDF generated successfully',
      filename: pdfResult.filename,
      url: pdfResult.url,
      size: pdfResult.size
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send report (with PDF generation)
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { case_id } = req.body;
    const { householdId, phone, complex, dong, ho, name } = req.user;

    if (!case_id) {
      return res.status(400).json({ error: 'case_id is required' });
    }

    // Mock data for development
    const mockCaseData = {
      id: case_id,
      type: '하자접수',
      created_at: new Date().toISOString(),
      defects: [
        {
          id: 'DEF-1',
          location: '거실',
          trade: '바닥재',
          content: '마루판 들뜸',
          memo: '현장 특이사항',
          created_at: new Date().toISOString()
        },
        {
          id: 'DEF-2',
          location: '주방',
          trade: '타일',
          content: '타일 균열',
          memo: '',
          created_at: new Date().toISOString()
        }
      ]
    };

    const defects = mockCaseData.defects || [];

    // Prepare data for PDF generation
    const reportData = {
      complex,
      dong,
      ho,
      name,
      created_at: mockCaseData.created_at,
      defects: defects.map((defect, index) => ({
        ...defect,
        index: index + 1
      }))
    };

    // Generate PDF
    const pdfResult = await pdfGenerator.generateSimpleReportPDF(reportData, defects, {
      filename: `report-${case_id}-${Date.now()}.pdf`
    });

    // Mock report record insertion
    console.log('Mock: Report record would be inserted:', {
      householdId,
      case_id,
      pdf_url: pdfResult.url,
      status: 'sent',
      sent_to: phone
    });

    // Send SMS notification
    const caseInfo = {
      complex,
      dong,
      ho,
      name,
      defectCount: defects.length
    };

    const smsResult = await smsService.sendReportNotification(phone, pdfResult.url, caseInfo);
    
    if (!smsResult.success && !smsResult.mock) {
      console.warn('SMS notification failed:', smsResult.error);
    }

    res.json({
      message: 'Report generated and sent successfully',
      filename: pdfResult.filename,
      pdf_url: pdfResult.url,
      sent_to: phone,
      size: pdfResult.size,
      sms_sent: smsResult.success,
      sms_mock: smsResult.mock || false
    });

  } catch (error) {
    console.error('Send report error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
