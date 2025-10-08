// File upload test script
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testFileUpload() {
  console.log('🔍 Testing file upload system...');
  
  try {
    // Create a test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    // Save test image
    const testImagePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(testImagePath, testImageBuffer);
    
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
    
    // Test file upload
    console.log('2. Testing file upload...');
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath), {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    
    const uploadResponse = await fetch('http://localhost:3000/api/upload/photo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorText}`);
    }
    
    const uploadData = await uploadResponse.json();
    console.log('✅ File uploaded successfully');
    console.log('   - Key:', uploadData.key);
    console.log('   - URL:', uploadData.url);
    console.log('   - Thumbnail URL:', uploadData.thumbnail_url);
    console.log('   - Size:', uploadData.size, 'bytes');
    
    // Test file info
    console.log('3. Testing file info...');
    const infoResponse = await fetch(`http://localhost:3000/api/upload/photo/${uploadData.key}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (infoResponse.ok) {
      const infoData = await infoResponse.json();
      console.log('✅ File info retrieved');
      console.log('   - Filename:', infoData.filename);
      console.log('   - URL:', infoData.url);
    }
    
    // Clean up test file
    fs.unlinkSync(testImagePath);
    
    console.log('\n✅ File upload test completed successfully!');
    
  } catch (error) {
    console.error('❌ File upload test failed:', error.message);
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
    await testFileUpload();
  }
}

main();
