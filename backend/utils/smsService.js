// SMS service using Naver Cloud Platform
// 실제 발송 비활성화: 개발 사항은 유지하되, 실제 SMS는 발송하지 않음 (환경변수 SMS_ACTUAL_SEND_ENABLED=true 시에만 발송)
const SMS_ACTUAL_SEND_ENABLED = process.env.SMS_ACTUAL_SEND_ENABLED === 'true';

const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');

class SMSService {
  constructor() {
    this.apiUrl = 'https://sens.apigw.ntruss.com';
    this.serviceId = process.env.SMS_SERVICE_ID || 'your-service-id';
    this.accessKey = process.env.SMS_ACCESS_KEY || 'your-access-key';
    this.secretKey = process.env.SMS_SECRET_KEY || 'your-secret-key';
    this.fromNumber = process.env.SMS_FROM_NUMBER || '01012345678';
  }

  // Generate signature for Naver Cloud Platform
  generateSignature(method, url, timestamp) {
    const message = `${method} ${url}\n${timestamp}\n${this.accessKey}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
    return signature;
  }

  // Send SMS using Naver Cloud Platform
  // SMS_ACTUAL_SEND_ENABLED 가 true가 아니면 실제 발송 없이 모의 발송만 수행
  async sendSMS(to, message, options = {}) {
    if (!SMS_ACTUAL_SEND_ENABLED) {
      console.log('📱 [SMS 비활성화] 실제 발송 없이 모의 처리:', to);
      return await this.sendMockSMS(to, message, options);
    }

    try {
      const timestamp = Date.now().toString();
      const url = `/sms/v2/services/${this.serviceId}/messages`;
      const fullUrl = `${this.apiUrl}${url}`;

      const signature = this.generateSignature('POST', url, timestamp);

      const data = {
        type: 'SMS',
        contentType: 'COMM',
        countryCode: '82',
        from: this.fromNumber,
        content: message,
        messages: [
          {
            to: to.replace(/-/g, ''),
            content: message
          }
        ]
      };

      const response = await axios.post(fullUrl, data, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'x-ncp-apigw-timestamp': timestamp,
          'x-ncp-iam-access-key': this.accessKey,
          'x-ncp-apigw-signature-v2': signature
        }
      });

      return {
        success: true,
        requestId: response.data.requestId,
        statusCode: response.data.statusCode,
        statusName: response.data.statusName
      };

    } catch (error) {
      console.error('SMS sending error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Send report notification SMS
  async sendReportNotification(phone, reportUrl, caseInfo) {
    const message = `[인싸이트아이] ${caseInfo.complex} ${caseInfo.dong}-${caseInfo.ho} 세대 점검보고서가 완료되었습니다.\n\n보고서 확인: ${reportUrl}\n\n문의: 1588-0000`;
    
    return await this.sendSMS(phone, message);
  }

  // Send inspection completion SMS
  async sendInspectionCompletion(phone, caseInfo) {
    const message = `[인싸이트아이] ${caseInfo.complex} ${caseInfo.dong}-${caseInfo.ho} 세대 점검이 완료되었습니다.\n\n하자 ${caseInfo.defectCount}건이 등록되었으며, 보고서는 곧 발송됩니다.\n\n문의: 1588-0000`;
    
    return await this.sendSMS(phone, message);
  }

  // Send welcome SMS
  async sendWelcomeSMS(phone, userInfo) {
    const message = `[인싸이트아이] ${userInfo.complex} ${userInfo.dong}-${userInfo.ho} ${userInfo.name}님, 점검 시스템에 오신 것을 환영합니다.\n\n3일간 무료로 이용하실 수 있습니다.\n\n문의: 1588-0000`;
    
    return await this.sendSMS(phone, message);
  }

  // Mock SMS service for development
  async sendMockSMS(to, message, options = {}) {
    console.log('📱 Mock SMS sent:');
    console.log(`   To: ${to}`);
    console.log(`   Message: ${message}`);
    console.log(`   Options:`, options);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      requestId: `mock-${Date.now()}`,
      statusCode: '202',
      statusName: 'success',
      mock: true
    };
  }

  // Get SMS service status
  getServiceStatus() {
    return {
      serviceId: this.serviceId,
      fromNumber: this.fromNumber,
      isConfigured: !!(this.serviceId && this.accessKey && this.secretKey && 
                      this.serviceId !== 'your-service-id' && 
                      this.accessKey !== 'your-access-key' && 
                      this.secretKey !== 'your-secret-key')
    };
  }

  // Validate phone number
  validatePhoneNumber(phone) {
    const cleanPhone = phone.replace(/-/g, '');
    const phoneRegex = /^010\d{8}$/;
    return phoneRegex.test(cleanPhone);
  }

  // Format phone number
  formatPhoneNumber(phone) {
    const cleanPhone = phone.replace(/-/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('010')) {
      return `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 7)}-${cleanPhone.slice(7)}`;
    }
    return phone;
  }
}

module.exports = new SMSService();
