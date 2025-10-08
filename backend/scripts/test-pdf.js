// PDF generation test script
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testPDFGeneration() {
  console.log('🔍 Testing PDF generation system...');
  
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
    
    // Get cases to find a case ID
    console.log('2. Getting cases...');
    const casesResponse = await fetch('http://localhost:3000/api/cases', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!casesResponse.ok) {
      throw new Error(`Get cases failed: ${casesResponse.statusText}`);
    }
    
    const casesData = await casesResponse.json();
    console.log('✅ Cases retrieved:', casesData.length);
    
    if (casesData.length === 0) {
      console.log('⚠️  No cases found. Creating a test case...');
      
      // Create a test case
      const createCaseResponse = await fetch('http://localhost:3000/api/cases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: '하자접수'
        })
      });
      
      if (!createCaseResponse.ok) {
        throw new Error(`Create case failed: ${createCaseResponse.statusText}`);
      }
      
      const newCase = await createCaseResponse.json();
      console.log('✅ Test case created:', newCase.id);
      
      // Add a test defect
      const createDefectResponse = await fetch('http://localhost:3000/api/defects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          case_id: newCase.id,
          location: '거실',
          trade: '바닥재',
          content: '마루판 들뜸 현상 발견',
          memo: '현장 확인 필요'
        })
      });
      
      if (!createDefectResponse.ok) {
        throw new Error(`Create defect failed: ${createDefectResponse.statusText}`);
      }
      
      console.log('✅ Test defect created');
      
      // Use the new case ID
      var caseId = newCase.id;
    } else {
      var caseId = casesData[0].id;
    }
    
    // Test PDF generation
    console.log('3. Testing PDF generation...');
    const pdfResponse = await fetch('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        case_id: caseId,
        template: 'simple-report'
      })
    });
    
    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      throw new Error(`PDF generation failed: ${pdfResponse.statusText} - ${errorText}`);
    }
    
    const pdfData = await pdfResponse.json();
    console.log('✅ PDF generated successfully');
    console.log('   - Filename:', pdfData.filename);
    console.log('   - URL:', pdfData.url);
    console.log('   - Size:', pdfData.size, 'bytes');
    
    // Test report preview
    console.log('4. Testing report preview...');
    const previewResponse = await fetch('http://localhost:3000/api/reports/preview', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (previewResponse.ok) {
      const previewData = await previewResponse.json();
      console.log('✅ Report preview generated');
      console.log('   - Defects count:', previewData.defects_count);
    }
    
    // Test report sending
    console.log('5. Testing report sending...');
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
    
    if (sendResponse.ok) {
      const sendData = await sendResponse.json();
      console.log('✅ Report sent successfully');
      console.log('   - PDF URL:', sendData.pdf_url);
      console.log('   - Sent to:', sendData.sent_to);
    }
    
    console.log('\n✅ PDF generation test completed successfully!');
    console.log('\n📄 Generated PDFs can be viewed at:');
    console.log('   http://localhost:3000/reports/');
    
  } catch (error) {
    console.error('❌ PDF generation test failed:', error.message);
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
    await testPDFGeneration();
  }
}

main();
