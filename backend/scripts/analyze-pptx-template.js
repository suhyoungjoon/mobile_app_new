/**
 * PowerPoint 템플릿 파일 분석
 * 템플릿 구조를 파악하여 데이터 삽입 위치 확인
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

async function analyzePPTXTemplate(filePath) {
  try {
    console.log('📊 PowerPoint 템플릿 분석 시작...\n');
    console.log(`파일: ${filePath}\n`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
      return null;
    }
    
    // ZIP 파일로 열기
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    
    // 슬라이드 파일 찾기
    const slideFiles = zipEntries.filter(entry => 
      entry.entryName.startsWith('ppt/slides/slide') && 
      entry.entryName.endsWith('.xml')
    ).sort((a, b) => {
      const aNum = parseInt(a.entryName.match(/slide(\d+)/)?.[1] || '0');
      const bNum = parseInt(b.entryName.match(/slide(\d+)/)?.[1] || '0');
      return aNum - bNum;
    });
    
    console.log(`✅ 총 슬라이드 수: ${slideFiles.length}개\n`);
    
    // XML 파서 설정
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
      parseTrueNumberOnly: false
    });
    
    const analysisResult = {
      totalSlides: slideFiles.length,
      slides: [],
      placeholders: []
    };
    
    // 각 슬라이드 분석
    slideFiles.forEach((slideFile, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 슬라이드 ${index + 1}`);
      console.log('='.repeat(60));
      
      const content = slideFile.getData().toString('utf8');
      const parsed = parser.parse(content);
      
      // 텍스트 추출 함수
      const extractText = (obj, texts = [], path = '') => {
        if (typeof obj === 'string') {
          const trimmed = obj.trim();
          if (trimmed && trimmed.length > 0 && trimmed.length < 500) {
            texts.push({ text: trimmed, path });
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, idx) => extractText(item, texts, `${path}[${idx}]`));
        } else if (typeof obj === 'object' && obj !== null) {
          Object.entries(obj).forEach(([key, value]) => {
            extractText(value, texts, path ? `${path}.${key}` : key);
          });
        }
        return texts;
      };
      
      const texts = extractText(parsed);
      const uniqueTexts = [...new Set(texts.map(t => t.text))];
      
      console.log('텍스트 내용:');
      uniqueTexts.forEach((text, i) => {
        console.log(`  ${i + 1}. ${text}`);
      });
      
      // 플레이스홀더 찾기 ({{변수명}} 형식)
      const placeholderPattern = /\{\{([^}]+)\}\}/g;
      const placeholders = [];
      let match;
      while ((match = placeholderPattern.exec(content)) !== null) {
        placeholders.push(match[1].trim());
      }
      
      if (placeholders.length > 0) {
        console.log('\n  🔖 플레이스홀더:');
        placeholders.forEach(ph => {
          console.log(`     - {{${ph}}}`);
        });
        analysisResult.placeholders.push(...placeholders);
      }
      
      // 테이블 확인
      const hasTable = content.includes('<a:tbl>') || content.includes('table');
      if (hasTable) {
        console.log('\n  📊 테이블 포함됨');
      }
      
      // 이미지 확인
      const imageRefs = zipEntries.filter(entry => 
        entry.entryName.includes('ppt/media/')
      );
      
      if (imageRefs.length > 0) {
        console.log(`\n  🖼️ 이미지/미디어 파일: ${imageRefs.length}개`);
      }
      
      analysisResult.slides.push({
        slideNumber: index + 1,
        texts: uniqueTexts,
        placeholders: placeholders,
        hasTable: hasTable,
        imageCount: imageRefs.length
      });
    });
    
    // 분석 결과 요약
    console.log(`\n${'='.repeat(60)}`);
    console.log('📋 템플릿 구조 요약');
    console.log('='.repeat(60));
    console.log(`총 슬라이드: ${analysisResult.totalSlides}개`);
    console.log(`발견된 플레이스홀더: ${[...new Set(analysisResult.placeholders)].length}개`);
    if (analysisResult.placeholders.length > 0) {
      console.log('\n플레이스홀더 목록:');
      [...new Set(analysisResult.placeholders)].forEach(ph => {
        console.log(`  - {{${ph}}}`);
      });
    }
    
    // 결과를 JSON 파일로 저장
    const outputPath = path.join(__dirname, '..', '..', 'docs', 'pptx-template-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysisResult, null, 2), 'utf8');
    console.log(`\n✅ 분석 결과 저장: ${outputPath}`);
    console.log('\n✅ 분석 완료!');
    
    return analysisResult;
    
  } catch (error) {
    console.error('❌ 분석 오류:', error.message);
    console.error(error.stack);
    return null;
  }
}

// 실행
if (require.main === module) {
  const filePath = path.join(__dirname, '..', '..', 'docs', '보고서.pptx.pptx');
  analyzePPTXTemplate(filePath);
}

module.exports = { analyzePPTXTemplate };
