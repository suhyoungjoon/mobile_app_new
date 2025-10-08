// SMS routes
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const smsService = require('../utils/smsService');

const router = express.Router();

// Send SMS
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { to, message } = req.body;
    const { phone: userPhone } = req.user;

    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    // Validate phone number
    if (!smsService.validatePhoneNumber(to)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check if SMS service is configured
    const serviceStatus = smsService.getServiceStatus();
    
    let result;
    if (serviceStatus.isConfigured) {
      result = await smsService.sendSMS(to, message);
    } else {
      // Use mock service for development
      result = await smsService.sendMockSMS(to, message);
    }

    if (result.success) {
      res.json({
        message: 'SMS sent successfully',
        requestId: result.requestId,
        statusCode: result.statusCode,
        mock: result.mock || false
      });
    } else {
      res.status(500).json({
        error: 'SMS sending failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('SMS route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send report notification
router.post('/report-notification', authenticateToken, async (req, res) => {
  try {
    const { phone, reportUrl, caseInfo } = req.body;
    const { phone: userPhone } = req.user;

    if (!phone || !reportUrl || !caseInfo) {
      return res.status(400).json({ error: 'Phone, report URL, and case info are required' });
    }

    // Validate phone number
    if (!smsService.validatePhoneNumber(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check if SMS service is configured
    const serviceStatus = smsService.getServiceStatus();
    
    let result;
    if (serviceStatus.isConfigured) {
      result = await smsService.sendReportNotification(phone, reportUrl, caseInfo);
    } else {
      // Use mock service for development
      result = await smsService.sendMockSMS(phone, 
        `[인싸이트아이] ${caseInfo.complex} ${caseInfo.dong}-${caseInfo.ho} 세대 점검보고서가 완료되었습니다.\n\n보고서 확인: ${reportUrl}\n\n문의: 1588-0000`
      );
    }

    if (result.success) {
      res.json({
        message: 'Report notification sent successfully',
        requestId: result.requestId,
        statusCode: result.statusCode,
        mock: result.mock || false
      });
    } else {
      res.status(500).json({
        error: 'Report notification failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Report notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send inspection completion notification
router.post('/inspection-completion', authenticateToken, async (req, res) => {
  try {
    const { phone, caseInfo } = req.body;
    const { phone: userPhone } = req.user;

    if (!phone || !caseInfo) {
      return res.status(400).json({ error: 'Phone and case info are required' });
    }

    // Validate phone number
    if (!smsService.validatePhoneNumber(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check if SMS service is configured
    const serviceStatus = smsService.getServiceStatus();
    
    let result;
    if (serviceStatus.isConfigured) {
      result = await smsService.sendInspectionCompletion(phone, caseInfo);
    } else {
      // Use mock service for development
      result = await smsService.sendMockSMS(phone, 
        `[인싸이트아이] ${caseInfo.complex} ${caseInfo.dong}-${caseInfo.ho} 세대 점검이 완료되었습니다.\n\n하자 ${caseInfo.defectCount}건이 등록되었으며, 보고서는 곧 발송됩니다.\n\n문의: 1588-0000`
      );
    }

    if (result.success) {
      res.json({
        message: 'Inspection completion notification sent successfully',
        requestId: result.requestId,
        statusCode: result.statusCode,
        mock: result.mock || false
      });
    } else {
      res.status(500).json({
        error: 'Inspection completion notification failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Inspection completion notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send welcome SMS
router.post('/welcome', authenticateToken, async (req, res) => {
  try {
    const { phone, userInfo } = req.body;
    const { phone: userPhone } = req.user;

    if (!phone || !userInfo) {
      return res.status(400).json({ error: 'Phone and user info are required' });
    }

    // Validate phone number
    if (!smsService.validatePhoneNumber(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check if SMS service is configured
    const serviceStatus = smsService.getServiceStatus();
    
    let result;
    if (serviceStatus.isConfigured) {
      result = await smsService.sendWelcomeSMS(phone, userInfo);
    } else {
      // Use mock service for development
      result = await smsService.sendMockSMS(phone, 
        `[인싸이트아이] ${userInfo.complex} ${userInfo.dong}-${userInfo.ho} ${userInfo.name}님, 점검 시스템에 오신 것을 환영합니다.\n\n3일간 무료로 이용하실 수 있습니다.\n\n문의: 1588-0000`
      );
    }

    if (result.success) {
      res.json({
        message: 'Welcome SMS sent successfully',
        requestId: result.requestId,
        statusCode: result.statusCode,
        mock: result.mock || false
      });
    } else {
      res.status(500).json({
        error: 'Welcome SMS failed',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Welcome SMS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get SMS service status
router.get('/status', authenticateToken, (req, res) => {
  try {
    const status = smsService.getServiceStatus();
    res.json(status);
  } catch (error) {
    console.error('SMS status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate phone number
router.post('/validate', (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const isValid = smsService.validatePhoneNumber(phone);
    const formatted = smsService.formatPhoneNumber(phone);

    res.json({
      phone,
      formatted,
      isValid
    });

  } catch (error) {
    console.error('Phone validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
