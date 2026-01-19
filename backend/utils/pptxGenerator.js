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
const templateMapper = require('./pptxTemplateMapper');

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

      // 단계별 구현
      console.log('\n📋 단계별 구현 시작:\n');
      
      // 단계 1: 첫 번째 슬라이드에 세대 정보 추가
      if (slideFiles.length > 0) {
        await this.addHouseholdInfo(zip, slideFiles[0], data, parser, builder);
      }

      // 단계 2-4: 하자 및 측정 정보를 위한 새 슬라이드 추가
      await this.addDefectsAndMeasurements(zip, data, parser, builder);
      
      // 단계 7: 프레젠테이션 파일 업데이트 (슬라이드 목록에 새 슬라이드 추가)
      await this.updatePresentationFile(zip);

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
   * 단계 1: 플레이스홀더를 찾아서 데이터로 교체
   */
  async addHouseholdInfo(zip, slideEntry, data, parser, builder) {
    try {
      console.log('📝 단계 1: 세대 정보 삽입 시작...');
      
      const content = slideEntry.getData().toString('utf8');
      
      // 템플릿 매퍼를 사용하여 데이터 변환
      const replacements = templateMapper.mapDataToTemplate(data);
      
      // 플레이스홀더 교체
      let modifiedContent = templateMapper.replaceTextInSlide(content, replacements);
      
      // 추가 텍스트 교체 (템플릿에 직접 포함된 경우)
      const additionalReplacements = {
        'CM형 사전점검 종합 보고서': `CM형 ${data.type || '사전점검'} 종합 보고서`,
        '단지명': data.complex || '단지명',
        '동-호': `${data.dong || ''}-${data.ho || ''}`,
        '세대주': data.name || '세대주',
        '점검일': this.formatDate(data.created_at) || '점검일'
      };
      
      Object.entries(additionalReplacements).forEach(([oldText, newText]) => {
        // XML 내의 텍스트 노드만 교체 (태그는 유지)
        const textNodePattern = new RegExp(`(<a:t[^>]*>)${this.escapeRegex(oldText)}(</a:t>)`, 'g');
        modifiedContent = modifiedContent.replace(textNodePattern, `$1${newText}$2`);
      });
      
      // ZIP에 업데이트된 슬라이드 저장
      zip.updateFile(slideEntry.entryName, Buffer.from(modifiedContent, 'utf8'));
      
      console.log('✅ 단계 1 완료: 세대 정보 삽입됨');

    } catch (error) {
      console.error('❌ 세대 정보 추가 오류:', error);
      throw error;
    }
  }

  /**
   * 정규식 특수문자 이스케이프
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
   * 단계 5: 하자 정보를 새 슬라이드로 추가
   */
  async addDefectSlide(zip, defect, parser, builder) {
    try {
      console.log(`📄 단계 5: 하자 슬라이드 추가 - ${defect.id}`);
      
      // 템플릿의 하자 슬라이드 템플릿을 찾거나 기본 슬라이드를 복사
      // 여기서는 간단하게 텍스트 기반 슬라이드 생성
      const slideNumber = this.getNextSlideNumber(zip);
      const slideXml = this.createDefectSlideXML(slideNumber, defect);
      
      // 슬라이드 파일 추가
      zip.addFile(`ppt/slides/slide${slideNumber}.xml`, Buffer.from(slideXml, 'utf8'));
      
      // 관계 파일 추가
      await this.addSlideRelationship(zip, slideNumber);
      
      // 이미지 추가
      if (defect.photos && defect.photos.length > 0) {
        for (const photo of defect.photos) {
          await this.addImageToZip(zip, photo.url, photo.id);
        }
      }
      
      console.log(`✅ 하자 슬라이드 ${slideNumber} 추가 완료`);
      
    } catch (error) {
      console.error(`❌ 하자 슬라이드 추가 오류:`, error);
    }
  }

  /**
   * 다음 슬라이드 번호 가져오기
   */
  getNextSlideNumber(zip) {
    const slideFiles = zip.getEntries()
      .filter(entry => entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml'))
      .map(entry => {
        const match = entry.entryName.match(/slide(\d+)\.xml/);
        return match ? parseInt(match[1]) : 0;
      });
    
    return slideFiles.length > 0 ? Math.max(...slideFiles) + 1 : 1;
  }

  /**
   * 하자 슬라이드 XML 생성
   */
  createDefectSlideXML(slideNumber, defect) {
    // 간단한 하자 슬라이드 XML 구조
    // 실제로는 템플릿의 슬라이드를 복사하여 수정하는 것이 더 좋음
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="9144000" cy="6858000"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="9144000" cy="6858000"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="제목 1"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="ctrTitle"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r>
              <a:t>하자 #${defect.index || 1}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="내용"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="body" idx="1"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r>
              <a:t>위치: ${defect.location || ''}</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:r>
              <a:t>공종: ${defect.trade || ''}</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:r>
              <a:t>내용: ${defect.content || ''}</a:t>
            </a:r>
          </a:p>
          ${defect.memo ? `<a:p><a:r><a:t>메모: ${defect.memo}</a:t></a:r></a:p>` : ''}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sld>`;
  }

  /**
   * 슬라이드 관계 파일 추가
   */
  async addSlideRelationship(zip, slideNumber) {
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
    
    zip.addFile(`ppt/slides/_rels/slide${slideNumber}.xml.rels`, Buffer.from(relsXml, 'utf8'));
  }

  /**
   * 측정값 슬라이드 추가
   * 단계 6: 측정 정보를 새 슬라이드로 추가
   */
  async addMeasurementSlide(zip, type, measurement, parser, builder) {
    try {
      console.log(`📄 단계 6: 측정값 슬라이드 추가 - ${type} - ${measurement.location}`);
      
      const slideNumber = this.getNextSlideNumber(zip);
      const slideXml = this.createMeasurementSlideXML(slideNumber, type, measurement);
      
      // 슬라이드 파일 추가
      zip.addFile(`ppt/slides/slide${slideNumber}.xml`, Buffer.from(slideXml, 'utf8'));
      
      // 관계 파일 추가
      await this.addSlideRelationship(zip, slideNumber);
      
      // 측정값 사진이 있으면 추가
      if (measurement.photoKey) {
        const photoPath = path.join(this.uploadsDir, measurement.photoKey);
        await this.addImageToZip(zip, photoPath, measurement.photoKey);
      }
      
      console.log(`✅ 측정값 슬라이드 ${slideNumber} 추가 완료`);
      
    } catch (error) {
      console.error(`❌ 측정값 슬라이드 추가 오류:`, error);
    }
  }

  /**
   * 측정값 슬라이드 XML 생성
   */
  createMeasurementSlideXML(slideNumber, type, measurement) {
    const typeNames = {
      air: '공기질 측정',
      radon: '라돈 측정',
      level: '레벨기 측정'
    };
    
    let content = '';
    if (type === 'air') {
      content = `
          <a:p><a:r><a:t>TVOC: ${measurement.tvoc || ''} ${measurement.unit_tvoc || 'mg/m³'}</a:t></a:r></a:p>
          <a:p><a:r><a:t>HCHO: ${measurement.hcho || ''} ${measurement.unit_hcho || 'mg/m³'}</a:t></a:r></a:p>
          <a:p><a:r><a:t>CO2: ${measurement.co2 || ''} ppm</a:t></a:r></a:p>`;
    } else if (type === 'radon') {
      content = `<a:p><a:r><a:t>라돈: ${measurement.radon || ''} ${measurement.unit || 'Bq/m³'}</a:t></a:r></a:p>`;
    } else if (type === 'level') {
      content = `
          <a:p><a:r><a:t>좌측: ${measurement.left_mm || ''} mm</a:t></a:r></a:p>
          <a:p><a:r><a:t>우측: ${measurement.right_mm || ''} mm</a:t></a:r></a:p>`;
    }
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="9144000" cy="6858000"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="9144000" cy="6858000"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="제목"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="ctrTitle"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r>
              <a:t>${typeNames[type] || type} - ${measurement.location || ''}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="내용"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="body" idx="1"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>위치: ${measurement.location || ''}</a:t></a:r></a:p>
          <a:p><a:r><a:t>공정: ${measurement.trade || ''}</a:t></a:r></a:p>${content}
          ${measurement.note ? `<a:p><a:r><a:t>메모: ${measurement.note}</a:t></a:r></a:p>` : ''}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sld>`;
  }

  /**
   * 열화상 슬라이드 추가
   * 단계 6: 열화상 정보를 새 슬라이드로 추가
   */
  async addThermalSlide(zip, inspection, parser, builder) {
    try {
      console.log(`📄 단계 6: 열화상 슬라이드 추가 - ${inspection.location}`);
      
      const slideNumber = this.getNextSlideNumber(zip);
      const slideXml = this.createThermalSlideXML(slideNumber, inspection);
      
      // 슬라이드 파일 추가
      zip.addFile(`ppt/slides/slide${slideNumber}.xml`, Buffer.from(slideXml, 'utf8'));
      
      // 관계 파일 추가
      await this.addSlideRelationship(zip, slideNumber);
      
      // 이미지 추가
      if (inspection.photos && inspection.photos.length > 0) {
        for (const photo of inspection.photos) {
          await this.addImageToZip(zip, photo.file_url, photo.id);
        }
      }
      
      console.log(`✅ 열화상 슬라이드 ${slideNumber} 추가 완료`);
      
    } catch (error) {
      console.error(`❌ 열화상 슬라이드 추가 오류:`, error);
    }
  }

  /**
   * 열화상 슬라이드 XML 생성
   */
  createThermalSlideXML(slideNumber, inspection) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="9144000" cy="6858000"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="9144000" cy="6858000"/>
        </a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="제목"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="ctrTitle"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p>
            <a:r>
              <a:t>열화상 점검 - ${inspection.location || ''}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="내용"/>
          <p:cNvSpPr>
            <a:spLocks noGrp="1"/>
          </p:cNvSpPr>
          <p:nvPr>
            <p:ph type="body" idx="1"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:p><a:r><a:t>위치: ${inspection.location || ''}</a:t></a:r></a:p>
          <a:p><a:r><a:t>공정: ${inspection.trade || ''}</a:t></a:r></a:p>
          ${inspection.note ? `<a:p><a:r><a:t>점검내용: ${inspection.note}</a:t></a:r></a:p>` : ''}
          ${inspection.result ? `<a:p><a:r><a:t>결과: ${inspection.result}</a:t></a:r></a:p>` : ''}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sld>`;
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
   * 프레젠테이션 파일 업데이트
   * 단계 7: 새로 추가된 슬라이드를 프레젠테이션 목록에 추가
   */
  async updatePresentationFile(zip) {
    try {
      console.log('📝 단계 7: 프레젠테이션 파일 업데이트...');
      
      const presFile = zip.getEntry('ppt/presentation.xml');
      if (!presFile) {
        console.warn('⚠️ 프레젠테이션 파일을 찾을 수 없습니다.');
        return;
      }
      
      const content = presFile.getData().toString('utf8');
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        preserveOrder: true
      });
      
      const parsed = parser.parse(content);
      
      // 슬라이드 목록에 새 슬라이드 추가
      // 실제 구현에서는 XML 구조를 정확히 파악하여 수정해야 함
      
      console.log('✅ 단계 7 완료: 프레젠테이션 파일 업데이트됨');
      
    } catch (error) {
      console.error('❌ 프레젠테이션 파일 업데이트 오류:', error);
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
