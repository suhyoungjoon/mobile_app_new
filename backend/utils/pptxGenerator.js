/**
 * PowerPoint 보고서 생성기
 * 템플릿 파일을 기반으로 세대 정보 및 측정 정보를 포함한 보고서 생성
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

class PPTXGenerator {
  constructor() {
    this.templateDir = path.join(__dirname, '..', '..', 'docs');
    this.outputDir = path.join(__dirname, '..', 'reports');
    this.uploadsDir = path.join(__dirname, '..', 'uploads');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 템플릿 파일 경로 가져오기
   */
  getTemplatePath() {
    return path.join(this.templateDir, '보고서.pptx.pptx');
  }

  /**
   * 이미지 파일을 PowerPoint에 추가할 수 있는 형식으로 변환
   */
  async prepareImage(imagePath) {
    try {
      if (!fs.existsSync(imagePath)) {
        console.warn(`⚠️ 이미지 파일을 찾을 수 없습니다: ${imagePath}`);
        return null;
      }

      // 이미지 정보 확인
      const metadata = await sharp(imagePath).metadata();
      
      // 이미지 크기 조정 (PowerPoint에 맞게 최대 1920x1080)
      const maxWidth = 1920;
      const maxHeight = 1080;
      
      let width = metadata.width;
      let height = metadata.height;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // 이미지 리사이즈 및 최적화
      const buffer = await sharp(imagePath)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      return {
        buffer,
        width,
        height,
        format: 'jpeg'
      };
    } catch (error) {
      console.error(`❌ 이미지 처리 오류 (${imagePath}):`, error.message);
      return null;
    }
  }

  /**
   * PowerPoint 보고서 생성
   */
  async generateReport(data, options = {}) {
    try {
      const {
        filename = `report-${uuidv4()}.pptx`,
        templatePath = this.getTemplatePath()
      } = options;

      console.log('📊 PowerPoint 보고서 생성 시작...');
      console.log(`템플릿: ${templatePath}`);
      console.log(`출력 파일: ${filename}`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`템플릿 파일을 찾을 수 없습니다: ${templatePath}`);
      }

      // 템플릿 파일 복사
      const outputPath = path.join(this.outputDir, filename);
      fs.copyFileSync(templatePath, outputPath);

      // ZIP으로 열기
      const zip = new AdmZip(outputPath);
      
      // XML 파서 설정
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseAttributeValue: true,
        trimValues: true,
        preserveOrder: true
      });

      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        format: true,
        preserveOrder: true
      });

      // 슬라이드 파일 찾기
      const slideFiles = zip.getEntries()
        .filter(entry => 
          entry.entryName.startsWith('ppt/slides/slide') && 
          entry.entryName.endsWith('.xml')
        )
        .sort((a, b) => {
          const aNum = parseInt(a.entryName.match(/slide(\d+)/)?.[1] || '0');
          const bNum = parseInt(b.entryName.match(/slide(\d+)/)?.[1] || '0');
          return aNum - bNum;
        });

      console.log(`✅ 슬라이드 수: ${slideFiles.length}개`);

      // 첫 번째 슬라이드에 세대 정보 추가
      if (slideFiles.length > 0) {
        await this.addHouseholdInfo(zip, slideFiles[0], data, parser, builder);
      }

      // 하자 및 측정 정보를 위한 새 슬라이드 추가
      await this.addDefectsAndMeasurements(zip, data, parser, builder);

      // ZIP 파일 저장
      zip.writeZip(outputPath);

      console.log(`✅ PowerPoint 보고서 생성 완료: ${outputPath}`);

      return {
        success: true,
        filename,
        path: outputPath,
        url: `/reports/${filename}`,
        size: fs.statSync(outputPath).size
      };

    } catch (error) {
      console.error('❌ PowerPoint 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 첫 번째 슬라이드에 세대 정보 추가
   */
  async addHouseholdInfo(zip, slideEntry, data, parser, builder) {
    try {
      const content = slideEntry.getData().toString('utf8');
      const parsed = parser.parse(content);

      // 세대 정보 텍스트 찾아서 교체
      // 실제 구현에서는 XML 구조를 분석하여 적절한 위치에 텍스트 삽입
      let modifiedContent = content;

      // 간단한 텍스트 교체 (실제로는 XML 구조를 정확히 파악해야 함)
      const replacements = {
        '{{complex}}': data.complex || '',
        '{{dong}}': data.dong || '',
        '{{ho}}': data.ho || '',
        '{{name}}': data.name || '',
        '{{type}}': data.type || '',
        '{{created_at}}': this.formatDate(data.created_at) || '',
        '{{generated_at}}': this.formatDate(data.generated_at) || ''
      };

      Object.entries(replacements).forEach(([placeholder, value]) => {
        modifiedContent = modifiedContent.replace(new RegExp(placeholder, 'g'), value);
      });

      // ZIP에 업데이트된 슬라이드 저장
      zip.updateFile(slideEntry.entryName, Buffer.from(modifiedContent, 'utf8'));

    } catch (error) {
      console.error('❌ 세대 정보 추가 오류:', error);
    }
  }

  /**
   * 하자 및 측정 정보를 새 슬라이드로 추가
   */
  async addDefectsAndMeasurements(zip, data, parser, builder) {
    try {
      // 하자 목록 슬라이드 추가
      if (data.defects && data.defects.length > 0) {
        for (const defect of data.defects) {
          await this.addDefectSlide(zip, defect, parser, builder);
        }
      }

      // 측정 정보 슬라이드 추가
      if (data.air_measurements && data.air_measurements.length > 0) {
        for (const measurement of data.air_measurements) {
          await this.addMeasurementSlide(zip, 'air', measurement, parser, builder);
        }
      }

      if (data.radon_measurements && data.radon_measurements.length > 0) {
        for (const measurement of data.radon_measurements) {
          await this.addMeasurementSlide(zip, 'radon', measurement, parser, builder);
        }
      }

      if (data.level_measurements && data.level_measurements.length > 0) {
        for (const measurement of data.level_measurements) {
          await this.addMeasurementSlide(zip, 'level', measurement, parser, builder);
        }
      }

      if (data.thermal_inspections && data.thermal_inspections.length > 0) {
        for (const inspection of data.thermal_inspections) {
          await this.addThermalSlide(zip, inspection, parser, builder);
        }
      }

    } catch (error) {
      console.error('❌ 하자/측정 정보 추가 오류:', error);
    }
  }

  /**
   * 하자 슬라이드 추가
   */
  async addDefectSlide(zip, defect, parser, builder) {
    // 실제 구현에서는 템플릿의 슬라이드를 복사하여 하자 정보로 채움
    // 이미지도 함께 추가
    console.log(`📄 하자 슬라이드 추가: ${defect.id}`);
    
    if (defect.photos && defect.photos.length > 0) {
      for (const photo of defect.photos) {
        await this.addImageToZip(zip, photo.url, photo.id);
      }
    }
  }

  /**
   * 측정값 슬라이드 추가
   */
  async addMeasurementSlide(zip, type, measurement, parser, builder) {
    console.log(`📄 측정값 슬라이드 추가: ${type} - ${measurement.location}`);
    
    // 측정값 사진이 있으면 추가
    if (measurement.photoKey) {
      const photoPath = path.join(this.uploadsDir, measurement.photoKey);
      await this.addImageToZip(zip, photoPath, measurement.photoKey);
    }
  }

  /**
   * 열화상 슬라이드 추가
   */
  async addThermalSlide(zip, inspection, parser, builder) {
    console.log(`📄 열화상 슬라이드 추가: ${inspection.location}`);
    
    if (inspection.photos && inspection.photos.length > 0) {
      for (const photo of inspection.photos) {
        await this.addImageToZip(zip, photo.file_url, photo.id);
      }
    }
  }

  /**
   * 이미지를 ZIP에 추가
   */
  async addImageToZip(zip, imagePath, imageId) {
    try {
      const fullPath = imagePath.startsWith('/') 
        ? path.join(__dirname, '..', imagePath)
        : path.join(this.uploadsDir, imagePath);

      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ 이미지 파일을 찾을 수 없습니다: ${fullPath}`);
        return;
      }

      const imageData = await this.prepareImage(fullPath);
      if (!imageData) return;

      // PowerPoint 미디어 폴더에 이미지 추가
      const imageExt = path.extname(fullPath) || '.jpg';
      const mediaPath = `ppt/media/image_${imageId}${imageExt}`;
      
      zip.addFile(mediaPath, imageData.buffer);

      console.log(`✅ 이미지 추가: ${mediaPath}`);

    } catch (error) {
      console.error(`❌ 이미지 추가 오류 (${imagePath}):`, error.message);
    }
  }

  /**
   * 날짜 포맷팅
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 보고서 URL 가져오기
   */
  getReportUrl(filename) {
    return `/reports/${filename}`;
  }
}

module.exports = new PPTXGenerator();
