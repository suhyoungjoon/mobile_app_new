// PDF generation service using Puppeteer
const puppeteer = require('puppeteer');
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

    let browser;
    try {
      // Launch browser with automatic Chromium download if needed
      // In Render, Chromium will be downloaded on first use if not present
      const launchOptions = {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      };
      
      // If Chromium is not found, Puppeteer will download it automatically
      // This happens at runtime, not during build
      browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();

      // Load template
      const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateContent);

      // Generate HTML
      const html = template(data);

      // Set content
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format,
        margin,
        printBackground,
        displayHeaderFooter,
        headerTemplate,
        footerTemplate
      });

      // Save to file
      const outputPath = path.join(this.outputDir, filename);
      fs.writeFileSync(outputPath, pdfBuffer);

      return {
        filename,
        path: outputPath,
        url: `/reports/${filename}`,
        size: pdfBuffer.length
      };

    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
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
