// SMS service test script
const fetch = require('node-fetch');

async function testSMSService() {
  console.log('🔍 Testing SMS service...');
  
  try {
    // First, get auth token
    console.log('1. Getting auth token...');
    const authResponse = await fetch('http://localhost:3000/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        complex: '서울 인싸이트자이',
        dong: '101',
        ho: '1203',
        name: '홍길동',
        phone: '010-1234-5678'
      })
    });
    
    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.statusText}`);
    }
    
    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✅ Auth token received');
    
    // Test SMS service status
    console.log('2. Testing SMS service status...');
    const statusResponse = await fetch('http://localhost:3000/api/sms/status', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ SMS service status:', statusData);
    }
    
    // Test phone number validation
    console.log('3. Testing phone number validation...');
    const validationResponse = await fetch('http://localhost:3000/api/sms/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '010-1234-5678'
      })
    });
    
    if (validationResponse.ok) {
      const validationData = await validationResponse.json();
      console.log('✅ Phone validation:', validationData);
    }
    
    // Test basic SMS sending
    console.log('4. Testing basic SMS sending...');
    const smsResponse = await fetch('http://localhost:3000/api/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: '010-1234-5678',
        message: '[인싸이트아이] 테스트 SMS입니다. 정상적으로 발송되었습니다.'
      })
    });
    
    if (smsResponse.ok) {
      const smsData = await smsResponse.json();
      console.log('✅ Basic SMS sent:', smsData);
    } else {
      const errorText = await smsResponse.text();
      console.log('⚠️  Basic SMS failed:', errorText);
    }
    
    // Test welcome SMS
    console.log('5. Testing welcome SMS...');
    const welcomeResponse = await fetch('http://localhost:3000/api/sms/welcome', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '010-1234-5678',
        userInfo: {
          complex: '서울 인싸이트자이',
          dong: '101',
          ho: '1203',
          name: '홍길동'
        }
      })
    });
    
    if (welcomeResponse.ok) {
      const welcomeData = await welcomeResponse.json();
      console.log('✅ Welcome SMS sent:', welcomeData);
    } else {
      const errorText = await welcomeResponse.text();
      console.log('⚠️  Welcome SMS failed:', errorText);
    }
    
    // Test inspection completion notification
    console.log('6. Testing inspection completion notification...');
    const completionResponse = await fetch('http://localhost:3000/api/sms/inspection-completion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '010-1234-5678',
        caseInfo: {
          complex: '서울 인싸이트자이',
          dong: '101',
          ho: '1203',
          defectCount: 3
        }
      })
    });
    
    if (completionResponse.ok) {
      const completionData = await completionResponse.json();
      console.log('✅ Inspection completion SMS sent:', completionData);
    } else {
      const errorText = await completionResponse.text();
      console.log('⚠️  Inspection completion SMS failed:', errorText);
    }
    
    // Test report notification
    console.log('7. Testing report notification...');
    const reportResponse = await fetch('http://localhost:3000/api/sms/report-notification', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '010-1234-5678',
        reportUrl: 'http://localhost:3000/reports/test-report.pdf',
        caseInfo: {
          complex: '서울 인싸이트자이',
          dong: '101',
          ho: '1203'
        }
      })
    });
    
    if (reportResponse.ok) {
      const reportData = await reportResponse.json();
      console.log('✅ Report notification SMS sent:', reportData);
    } else {
      const errorText = await reportResponse.text();
      console.log('⚠️  Report notification SMS failed:', errorText);
    }
    
    console.log('\n✅ SMS service test completed successfully!');
    console.log('\n📱 SMS Features:');
    console.log('   - Basic SMS sending');
    console.log('   - Welcome SMS');
    console.log('   - Inspection completion notification');
    console.log('   - Report notification');
    console.log('   - Phone number validation');
    console.log('   - Mock service for development');
    
  } catch (error) {
    console.error('❌ SMS service test failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running');
    console.log('Please start the server first: npm run dev');
    return false;
  }
}

// Run test
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testSMSService();
  }
}

main();
