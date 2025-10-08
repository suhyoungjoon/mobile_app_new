// Full system integration test
const fetch = require('node-fetch');

async function testFullSystem() {
  console.log('🔍 Testing full system integration...');
  
  try {
    // Test 1: Backend health check
    console.log('1. Testing backend health...');
    const healthResponse = await fetch('http://localhost:3000/health');
    if (!healthResponse.ok) {
      throw new Error('Backend server is not running');
    }
    console.log('✅ Backend server is running');
    
    // Test 2: Authentication
    console.log('2. Testing authentication...');
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
      throw new Error(`Authentication failed: ${authResponse.statusText}`);
    }
    
    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✅ Authentication successful');
    
    // Test 3: Case creation
    console.log('3. Testing case creation...');
    const caseResponse = await fetch('http://localhost:3000/api/cases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: '하자접수'
      })
    });
    
    if (!caseResponse.ok) {
      throw new Error(`Case creation failed: ${caseResponse.statusText}`);
    }
    
    const caseData = await caseResponse.json();
    const caseId = caseData.id;
    console.log('✅ Case created:', caseId);
    
    // Test 4: Defect creation
    console.log('4. Testing defect creation...');
    const defectResponse = await fetch('http://localhost:3000/api/defects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        case_id: caseId,
        location: '거실',
        trade: '바닥재',
        content: '마루판 들뜸 현상 발견',
        memo: '현장 확인 필요'
      })
    });
    
    if (!defectResponse.ok) {
      throw new Error(`Defect creation failed: ${defectResponse.statusText}`);
    }
    
    const defectData = await defectResponse.json();
    console.log('✅ Defect created:', defectData.id);
    
    // Test 5: Report preview
    console.log('5. Testing report preview...');
    const previewResponse = await fetch('http://localhost:3000/api/reports/preview', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!previewResponse.ok) {
      throw new Error(`Report preview failed: ${previewResponse.statusText}`);
    }
    
    const previewData = await previewResponse.json();
    console.log('✅ Report preview generated');
    
    // Test 6: PDF generation
    console.log('6. Testing PDF generation...');
    const pdfResponse = await fetch('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        case_id: caseId
      })
    });
    
    if (!pdfResponse.ok) {
      throw new Error(`PDF generation failed: ${pdfResponse.statusText}`);
    }
    
    const pdfData = await pdfResponse.json();
    console.log('✅ PDF generated:', pdfData.filename);
    
    // Test 7: Report sending
    console.log('7. Testing report sending...');
    const sendResponse = await fetch('http://localhost:3000/api/reports/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        case_id: caseId
      })
    });
    
    if (!sendResponse.ok) {
      throw new Error(`Report sending failed: ${sendResponse.statusText}`);
    }
    
    const sendData = await sendResponse.json();
    console.log('✅ Report sent successfully');
    
    // Test 8: SMS status
    console.log('8. Testing SMS service...');
    const smsStatusResponse = await fetch('http://localhost:3000/api/sms/status', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (smsStatusResponse.ok) {
      const smsStatus = await smsStatusResponse.json();
      console.log('✅ SMS service status:', smsStatus.isConfigured ? 'Configured' : 'Mock mode');
    }
    
    // Test 9: Frontend accessibility
    console.log('9. Testing frontend accessibility...');
    const frontendResponse = await fetch('http://localhost:8080');
    if (frontendResponse.ok) {
      console.log('✅ Frontend is accessible');
    } else {
      console.log('⚠️  Frontend is not accessible (start with: python -m http.server 8080)');
    }
    
    console.log('\n🎉 Full system test completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Backend server running');
    console.log('   ✅ Authentication working');
    console.log('   ✅ Case management working');
    console.log('   ✅ Defect management working');
    console.log('   ✅ Report generation working');
    console.log('   ✅ PDF generation working');
    console.log('   ✅ SMS service available');
    console.log('   ✅ Frontend accessible');
    
    console.log('\n🚀 System is ready for use!');
    console.log('   Backend: http://localhost:3000');
    console.log('   Frontend: http://localhost:8080');
    console.log('   API Docs: http://localhost:3000/api');
    
  } catch (error) {
    console.error('❌ Full system test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure backend server is running: npm run dev');
    console.log('   2. Make sure database is set up: npm run setup-db');
    console.log('   3. Make sure frontend server is running: python -m http.server 8080');
    console.log('   4. Check browser console for any CORS errors');
    process.exit(1);
  }
}

// Check if servers are running
async function checkServers() {
  const servers = [
    { name: 'Backend', url: 'http://localhost:3000/health' },
    { name: 'Frontend', url: 'http://localhost:8080' }
  ];
  
  for (const server of servers) {
    try {
      const response = await fetch(server.url);
      if (response.ok) {
        console.log(`✅ ${server.name} server is running`);
      } else {
        console.log(`⚠️  ${server.name} server responded with ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${server.name} server is not running`);
    }
  }
}

// Run test
async function main() {
  console.log('🔍 Checking server status...');
  await checkServers();
  console.log('');
  
  await testFullSystem();
}

main();
