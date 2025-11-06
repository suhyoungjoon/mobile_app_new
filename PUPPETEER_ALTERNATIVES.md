# 📄 Puppeteer 대체 라이브러리 분석

## 🔍 Puppeteer 문제점

### 무게
- **크기**: 약 300MB (Chromium 포함)
- **설치 시간**: 3-5분
- **메모리 사용**: 높음
- **빌드 타임아웃**: Free/Starter 플랜에서 실패 가능

### 현재 사용
- HTML 템플릿 (Handlebars) → PDF 변환
- 보고서 생성에만 사용

---

## ✅ 대체 라이브러리 옵션

### 옵션 1: pdfkit (가장 가벼움) ⭐ **추천**

**특징**:
- ✅ 매우 가벼움 (~1MB)
- ✅ 빠른 설치
- ✅ 서버 사이드 전용
- ✅ 프로그래밍 방식 PDF 생성

**단점**:
- ❌ HTML 템플릿 직접 사용 불가
- ❌ 레이아웃을 코드로 작성해야 함

**설치**:
```bash
npm install pdfkit
```

**사용 예시**:
```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');

function generatePDF(data) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream('report.pdf'));
  
  doc.fontSize(20).text('보고서', 100, 100);
  doc.fontSize(12).text(`단지: ${data.complex}`, 100, 150);
  // ...
  
  doc.end();
}
```

---

### 옵션 2: pdfmake (문서 기반) ⭐⭐ **추천**

**특징**:
- ✅ 가벼움 (~500KB)
- ✅ 문서 객체로 PDF 생성
- ✅ 테이블, 이미지, 스타일링 지원
- ✅ 빠른 설치

**단점**:
- ❌ HTML 템플릿 직접 사용 불가
- ❌ 문서 구조를 JavaScript 객체로 정의

**설치**:
```bash
npm install pdfmake
```

**사용 예시**:
```javascript
const PdfPrinter = require('pdfmake');

const fonts = {
  Roboto: {
    normal: 'fonts/Roboto-Regular.ttf',
    bold: 'fonts/Roboto-Medium.ttf',
    italics: 'fonts/Roboto-Italic.ttf',
    bolditalics: 'fonts/Roboto-MediumItalic.ttf'
  }
};

const printer = new PdfPrinter(fonts);

const docDefinition = {
  content: [
    { text: '보고서', style: 'header' },
    { text: `단지: ${data.complex}` },
    // ...
  ],
  styles: {
    header: { fontSize: 18, bold: true }
  }
};

const pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('report.pdf'));
pdfDoc.end();
```

---

### 옵션 3: html-pdf (HTML → PDF) ⭐⭐⭐ **가장 적합**

**특징**:
- ✅ HTML 템플릿 사용 가능 (현재 Handlebars 템플릿 그대로 사용)
- ✅ 가벼움 (~5MB, PhantomJS 포함)
- ✅ 기존 코드 최소 변경

**단점**:
- ⚠️ PhantomJS 포함 (하지만 Puppeteer보다 훨씬 가벼움)
- ⚠️ 최신 HTML/CSS 기능 제한

**설치**:
```bash
npm install html-pdf
```

**사용 예시**:
```javascript
const pdf = require('html-pdf');
const handlebars = require('handlebars');
const fs = require('fs');

// 기존 Handlebars 템플릿 그대로 사용
const template = handlebars.compile(fs.readFileSync('template.hbs', 'utf8'));
const html = template(data);

const options = { format: 'A4' };

pdf.create(html, options).toFile('report.pdf', (err, res) => {
  if (err) throw err;
  console.log('PDF 생성 완료');
});
```

---

### 옵션 4: wkhtmltopdf (외부 바이너리)

**특징**:
- ✅ HTML → PDF 변환
- ✅ 기존 템플릿 사용 가능

**단점**:
- ❌ 외부 바이너리 설치 필요
- ❌ Render에서 설치 복잡

---

## 🎯 권장사항

### ⭐⭐⭐ **옵션 3: html-pdf (가장 적합)**

**이유**:
1. ✅ **기존 코드 최소 변경**: Handlebars 템플릿 그대로 사용
2. ✅ **가벼움**: Puppeteer의 1/60 크기 (~5MB vs 300MB)
3. ✅ **빠른 설치**: 10-30초
4. ✅ **빌드 성공 가능성 높음**: Free/Starter 플랜에서도 작동

---

## 📊 비교표

| 라이브러리 | 크기 | 설치 시간 | HTML 템플릿 | 코드 변경 |
|-----------|------|-----------|-------------|-----------|
| **Puppeteer** | 300MB | 3-5분 | ✅ | 최소 |
| **html-pdf** | 5MB | 10-30초 | ✅ | 최소 |
| **pdfmake** | 500KB | 5초 | ❌ | 중간 |
| **pdfkit** | 1MB | 5초 | ❌ | 많음 |

---

## 🔄 마이그레이션 가이드 (html-pdf)

### 1. 패키지 설치
```bash
npm uninstall puppeteer
npm install html-pdf
```

### 2. pdfGenerator.js 수정

**변경 전 (Puppeteer)**:
```javascript
const puppeteer = require('puppeteer');

async generatePDF(templateName, data, options = {}) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html);
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();
  return pdfBuffer;
}
```

**변경 후 (html-pdf)**:
```javascript
const pdf = require('html-pdf');
const handlebars = require('handlebars');
const fs = require('fs');

async generatePDF(templateName, data, options = {}) {
  const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateContent);
  const html = template(data);
  
  const pdfOptions = {
    format: options.format || 'A4',
    margin: options.margin || { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
  };
  
  return new Promise((resolve, reject) => {
    pdf.create(html, pdfOptions).toBuffer((err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}
```

---

## 💡 비용 절감 효과

### 빌드 시간
- **Puppeteer**: 5-8분 (타임아웃 가능)
- **html-pdf**: 2-3분 (안정적)

### 플랜 요구사항
- **Puppeteer**: Standard 플랜 ($25/월) 필요 가능
- **html-pdf**: Free/Starter 플랜 ($0-7/월) 가능

### 비용 절감
- **월 $18-25 절감** (Standard → Free/Starter)

---

## ✅ 결론

### ⭐⭐⭐ **html-pdf로 마이그레이션 권장**

**이유**:
1. ✅ 기존 Handlebars 템플릿 그대로 사용
2. ✅ 코드 변경 최소화
3. ✅ 빌드 시간 대폭 단축
4. ✅ Free/Starter 플랜에서 작동
5. ✅ 비용 절감

---

## 🎯 다음 단계

1. **html-pdf로 마이그레이션 진행 여부 결정**
2. **마이그레이션 진행** (제가 도와드리겠습니다)
3. **테스트**
4. **배포**

마이그레이션을 진행할까요?
