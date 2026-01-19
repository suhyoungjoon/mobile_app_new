/**
 * PowerPoint 템플릿 상세 분석
 * 텍스트 박스, 이미지, 테이블의 정확한 위치와 구조 파악
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

async function analyzeDetailed() {
  try {
    const filePath = path.join(__dirname, '..', '..', 'docs', '보고서.pptx.pptx');
    console.log('📊 PowerPoint 템플릿 상세 분석 시작...\n');
    
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    
    // XML 파서 설정
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
      preserveOrder: true
    });
    
    // 첫 번째 슬라이드 상세 분석
    const firstSlide = zipEntries.find(entry => 
      entry.entryName === 'ppt/slides/slide1.xml'
    );
    
    if (!firstSlide) {
      console.error('❌ 첫 번째 슬라이드를 찾을 수 없습니다.');
      return;
    }
    
    console.log('📄 첫 번째 슬라이드 상세 분석\n');
    console.log('='.repeat(60));
    
    const content = firstSlide.getData().toString('utf8');
    const parsed = parser.parse(content);
    
    // 텍스트 박스 찾기
    console.log('\n🔍 텍스트 박스 분석:');
    const textBoxPattern = /<a:t[^>]*>([^<]+)<\/a:t>/g;
    let match;
    let textIndex = 1;
    while ((match = textBoxPattern.exec(content)) !== null) {
      const text = match[1].trim();
      if (text && text.length > 0 && text.length < 100) {
        console.log(`  ${textIndex}. "${text}"`);
        textIndex++;
      }
    }
    
    // 이미지 참조 찾기
    console.log('\n🖼️ 이미지 참조 분석:');
    const imagePattern = /rId(\d+)/g;
    const imageRefs = new Set();
    while ((match = imagePattern.exec(content)) !== null) {
      imageRefs.add(match[1]);
    }
    console.log(`  발견된 이미지 참조: ${imageRefs.size}개`);
    imageRefs.forEach(ref => {
      console.log(`    - rId${ref}`);
    });
    
    // 관계 파일 확인
    const relsFile = zipEntries.find(entry => 
      entry.entryName === 'ppt/slides/_rels/slide1.xml.rels'
    );
    
    if (relsFile) {
      console.log('\n📎 슬라이드 관계 파일:');
      const relsContent = relsFile.getData().toString('utf8');
      const relsParsed = parser.parse(relsContent);
      console.log(JSON.stringify(relsParsed, null, 2));
    }
    
    // 텍스트 박스 위치 정보 추출
    console.log('\n📍 텍스트 박스 위치 정보:');
    const textBoxPattern2 = /<p:sp[^>]*>[\s\S]*?<a:t[^>]*>([^<]+)<\/a:t>[\s\S]*?<\/p:sp>/g;
    let slideTexts = [];
    while ((match = textBoxPattern2.exec(content)) !== null) {
      const fullMatch = match[0];
      const textMatch = fullMatch.match(/<a:t[^>]*>([^<]+)<\/a:t>/);
      if (textMatch) {
        const text = textMatch[1].trim();
        // 위치 정보 추출
        const xMatch = fullMatch.match(/x="([^"]+)"/);
        const yMatch = fullMatch.match(/y="([^"]+)"/);
        const wMatch = fullMatch.match(/cx="([^"]+)"/);
        const hMatch = fullMatch.match(/cy="([^"]+)"/);
        
        slideTexts.push({
          text,
          x: xMatch ? xMatch[1] : null,
          y: yMatch ? yMatch[1] : null,
          width: wMatch ? wMatch[1] : null,
          height: hMatch ? hMatch[1] : null
        });
      }
    }
    
    slideTexts.forEach((item, idx) => {
      if (item.text && item.text.length > 0 && item.text.length < 100) {
        console.log(`\n  텍스트 ${idx + 1}: "${item.text}"`);
        if (item.x) console.log(`    위치: x=${item.x}, y=${item.y}`);
        if (item.width) console.log(`    크기: w=${item.width}, h=${item.height}`);
      }
    });
    
    // 결과 저장
    const analysisResult = {
      slideNumber: 1,
      textBoxes: slideTexts.filter(t => t.text && t.text.length > 0),
      imageRefs: Array.from(imageRefs),
      totalTexts: slideTexts.length
    };
    
    const outputPath = path.join(__dirname, '..', '..', 'docs', 'pptx-detailed-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysisResult, null, 2), 'utf8');
    console.log(`\n✅ 상세 분석 결과 저장: ${outputPath}`);
    console.log('\n✅ 분석 완료!');
    
  } catch (error) {
    console.error('❌ 분석 오류:', error.message);
    console.error(error.stack);
  }
}

analyzeDetailed();
