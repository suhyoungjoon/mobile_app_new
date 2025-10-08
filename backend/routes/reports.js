// Reports routes
const express = require('express');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const pdfGenerator = require('../utils/pdfGenerator');
const smsService = require('../utils/smsService');

const router = express.Router();

// Get report preview
router.get('/preview', authenticateToken, async (req, res) => {
  try {
    const { householdId, complex, dong, ho, name } = req.user;

    // Get latest case with defects from database
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
    
    // Generate HTML preview
    const html = generateReportHTML({
      complex,
      dong,
      ho,
      name,
      created_at: caseData.created_at,
      defects: caseData.defects || []
    });

    res.json({
      html,
      case_id: caseData.id,
      defects_count: caseData.defects?.length || 0,
      defects: caseData.defects || []
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

// Simple HTML report generator
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
