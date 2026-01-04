// PDF generation service using html-pdf (lightweight alternative to Puppeteer)
const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const { v4: uuidv4 } = require('uuid');

class PDFGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'reports');
    this.templateDir = path.join(__dirname, '..', 'templates');
    this.ensureDirectories();
    this.registerHelpers();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.templateDir)) {
      fs.mkdirSync(this.templateDir, { recursive: true });
    }
  }

  registerHelpers() {
    // Date formatting helper
    handlebars.registerHelper('formatDate', (date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // Number formatting helper
    handlebars.registerHelper('formatNumber', (num) => {
      if (!num) return '0';
      return num.toLocaleString();
    });

    // Conditional helper
    handlebars.registerHelper('if_eq', function(a, b, opts) {
      if (a === b) {
        return opts.fn(this);
      } else {
        return opts.inverse(this);
      }
    });
  }

  async generatePDF(templateName, data, options = {}) {
    const {
      filename = `report-${uuidv4()}.pdf`,
      format = 'A4',
      margin = { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground = true,
      displayHeaderFooter = true,
      headerTemplate = '',
      footerTemplate = ''
    } = options;

    try {
      // Load template
      const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateContent);

      // Generate HTML
      const html = template(data);
      
      // 디버깅: 데이터 및 HTML 확인
      console.log('📊 PDF 생성 데이터 확인:', {
        complex: data.complex,
        dong: data.dong,
        ho: data.ho,
        name: data.name,
        type: data.type,
        total_defects: data.total_defects,
        has_complex: !!data.complex,
        has_dong: !!data.dong,
        has_ho: !!data.ho,
        has_name: !!data.name
      });
      
      // HTML에서 데이터 확인
      const htmlCheck = {
        has_complex: html.includes(data.complex || ''),
        has_dong: html.includes(data.dong || ''),
        has_ho: html.includes(data.ho || ''),
        has_name: html.includes(data.name || ''),
        html_length: html.length
      };
      console.log('📄 HTML 데이터 포함 확인:', htmlCheck);
      
      // 데이터가 없으면 경고
      if (!data.complex || !data.dong || !data.ho || !data.name) {
        console.warn('⚠️ PDF 생성 데이터 누락:', {
          complex: data.complex || 'MISSING',
          dong: data.dong || 'MISSING',
          ho: data.ho || 'MISSING',
          name: data.name || 'MISSING'
        });
      }

      // PDF options for html-pdf
      const pdfOptions = {
        format: format,
        border: {
          top: margin.top,
          right: margin.right,
          bottom: margin.bottom,
          left: margin.left
        },
        type: 'pdf',
        quality: '75',
        renderDelay: 2000, // Wait for any dynamic content (한글 폰트 로딩을 위해 증가)
        timeout: 30000,
        // 한글 폰트 지원을 위한 옵션
        phantomPath: process.env.PHANTOMJS_PATH,
        // 한글 인코딩 설정
        'phantomjs-options': {
          'web-security': false,
          'load-images': true
        }
      };

      // Generate PDF using html-pdf
      return new Promise((resolve, reject) => {
        pdf.create(html, pdfOptions).toBuffer((err, buffer) => {
          if (err) {
            console.error('PDF generation error:', err);
            reject(new Error(`PDF generation failed: ${err.message}`));
            return;
          }

          try {
            // Save to file
            const outputPath = path.join(this.outputDir, filename);
            fs.writeFileSync(outputPath, buffer);

            resolve({
              filename,
              path: outputPath,
              url: `/reports/${filename}`,
              size: buffer.length
            });
          } catch (fileError) {
            console.error('File save error:', fileError);
            reject(new Error(`Failed to save PDF file: ${fileError.message}`));
          }
        });
      });

    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  async generateHTML(templateName, data) {
    try {
      const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateContent);
      return template(data);
    } catch (error) {
      console.error('HTML generation error:', error);
      throw new Error(`HTML generation failed: ${error.message}`);
    }
  }

  async generateReportPDF(caseData, defects, options = {}) {
    const data = {
      ...caseData,
      defects,
      generated_at: new Date().toISOString(),
      total_defects: defects.length
    };

    return await this.generatePDF('inspection-report', data, options);
  }

  async generateSimpleReportPDF(caseData, defects, options = {}) {
    const data = {
      complex: caseData.complex,
      dong: caseData.dong,
      ho: caseData.ho,
      name: caseData.name,
      created_at: caseData.created_at,
      defects: defects.map((defect, index) => ({
        ...defect,
        index: index + 1
      })),
      generated_at: new Date().toISOString(),
      total_defects: defects.length
    };

    return await this.generatePDF('simple-report', data, options);
  }

  getReportPath(filename) {
    return path.join(this.outputDir, filename);
  }

  getReportUrl(filename) {
    return `/reports/${filename}`;
  }

  async deleteReport(filename) {
    try {
      const filePath = path.join(this.outputDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Report deletion error:', error);
      return false;
    }
  }

  listReports() {
    try {
      const files = fs.readdirSync(this.outputDir);
      return files
        .filter(file => file.endsWith('.pdf'))
        .map(file => {
          const filePath = path.join(this.outputDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            size: stats.size,
            created_at: stats.birthtime,
            url: this.getReportUrl(file)
          };
        })
        .sort((a, b) => b.created_at - a.created_at);
    } catch (error) {
      console.error('Report listing error:', error);
      return [];
    }
  }
}

module.exports = new PDFGenerator();
