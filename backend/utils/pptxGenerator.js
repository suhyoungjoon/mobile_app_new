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
const tableGenerator = require('./pptxTableGenerator');

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
      // 주의: 새 슬라이드 추가는 PowerPoint 파일 구조를 복잡하게 만들 수 있음
      // 현재는 첫 번째 슬라이드만 수정하는 방식으로 진행
      // 향후 템플릿 슬라이드를 복사하여 수정하는 방식으로 개선 예정
      console.log('⚠️ 현재는 첫 번째 슬라이드만 수정합니다.');
      console.log('   새 슬라이드 추가 기능은 향후 구현 예정입니다.');
      
      // await this.addDefectsAndMeasurements(zip, data, parser, builder);
      // await this.addSummarySlide(zip, data, parser, builder);
      // await this.updateContentTypes(zip);
      // await this.updatePresentationFile(zip);

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
   * 요약 슬라이드 추가 (테이블 포함)
   * 단계 7: 테이블 데이터 삽입
   */
  async addSummarySlide(zip, data, parser, builder) {
    try {
      console.log('📊 단계 7: 요약 슬라이드 추가 (테이블 포함)...');
      
      const slideNumber = this.getNextSlideNumber(zip);
      const slideXml = this.createSummarySlideXML(slideNumber, data);
      
      // 슬라이드 파일 추가
      zip.addFile(`ppt/slides/slide${slideNumber}.xml`, Buffer.from(slideXml, 'utf8'));
      
      // 관계 파일 추가
      await this.addSlideRelationship(zip, slideNumber);
      
      console.log(`✅ 요약 슬라이드 ${slideNumber} 추가 완료`);
      
    } catch (error) {
      console.error('❌ 요약 슬라이드 추가 오류:', error);
    }
  }

  /**
   * 요약 슬라이드 XML 생성 (테이블 포함)
   */
  createSummarySlideXML(slideNumber, data) {
    // 하자 요약 테이블
    const defectTable = data.defects && data.defects.length > 0
      ? tableGenerator.createDefectSummaryTable(data.defects)
      : '';

    // 측정값 요약 테이블
    const airTable = data.air_measurements && data.air_measurements.length > 0
      ? tableGenerator.createMeasurementTable(data.air_measurements, 'air')
      : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
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
              <a:t>점검 요약</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      ${defectTable}
      ${airTable}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sld>`;
  }

  /**
   * 템플릿 슬라이드 복사
   */
  copyTemplateSlide(zip, sourceSlideNum, targetSlideNum) {
    try {
      // 원본 슬라이드 파일 복사
      const sourceSlide = `ppt/slides/slide${sourceSlideNum}.xml`;
      const targetSlide = `ppt/slides/slide${targetSlideNum}.xml`;
      
      const sourceEntry = zip.getEntry(sourceSlide);
      if (!sourceEntry) {
        throw new Error(`템플릿 슬라이드 ${sourceSlideNum}을 찾을 수 없습니다.`);
      }
      
      const slideContent = sourceEntry.getData();
      zip.addFile(targetSlide, slideContent);
      
      // 관계 파일도 복사
      const sourceRels = `ppt/slides/_rels/slide${sourceSlideNum}.xml.rels`;
      const targetRels = `ppt/slides/_rels/slide${targetSlideNum}.xml.rels`;
      
      const relsEntry = zip.getEntry(sourceRels);
      if (relsEntry) {
        const relsContent = relsEntry.getData();
        zip.addFile(targetRels, relsContent);
      } else {
        // 관계 파일이 없으면 기본 관계 파일 생성
        this.addSlideRelationship(zip, targetSlideNum);
      }
      
      return targetSlide;
    } catch (error) {
      console.error(`❌ 템플릿 슬라이드 복사 오류:`, error);
      throw error;
    }
  }

  /**
   * 하자 슬라이드 추가
   * 단계 5: 하자 정보를 새 슬라이드로 추가 (템플릿 슬라이드 복사 후 수정)
   */
  async addDefectSlide(zip, defect, parser, builder) {
    try {
      console.log(`📄 단계 5: 하자 슬라이드 추가 - ${defect.id}`);
      
      const slideNumber = this.getNextSlideNumber(zip);
      
      // 템플릿의 두 번째 슬라이드를 복사 (또는 적절한 템플릿 슬라이드)
      const templateSlideNum = 2; // 두 번째 슬라이드를 템플릿으로 사용
      this.copyTemplateSlide(zip, templateSlideNum, slideNumber);
      
      // 복사된 슬라이드 수정
      const slideEntry = zip.getEntry(`ppt/slides/slide${slideNumber}.xml`);
      if (!slideEntry) {
        throw new Error(`슬라이드 ${slideNumber}을 찾을 수 없습니다.`);
      }
      
      let slideContent = slideEntry.getData().toString('utf8');
      
      // 텍스트 교체 (템플릿의 텍스트를 하자 정보로 교체)
      // 실제로는 XML 구조를 정확히 파악하여 교체해야 함
      slideContent = slideContent.replace(
        /<a:t[^>]*>([^<]*)<\/a:t>/g,
        (match, text) => {
          // 특정 텍스트 패턴을 찾아서 교체
          if (text.includes('제목') || text.includes('Title')) {
            return match.replace(text, `하자 #${defect.index || 1}`);
          }
          return match;
        }
      );
      
      // 이미지 추가
      const imageInfos = [];
      if (defect.photos && defect.photos.length > 0) {
        for (const photo of defect.photos) {
          const imageInfo = await this.addImageToZip(zip, photo.url, `${defect.id}_${photo.id}`);
          if (imageInfo) {
            imageInfos.push(imageInfo);
          }
        }
      }
      
      // 슬라이드 파일 업데이트
      zip.updateFile(`ppt/slides/slide${slideNumber}.xml`, Buffer.from(slideContent, 'utf8'));
      
      console.log(`✅ 하자 슬라이드 ${slideNumber} 추가 완료 (이미지 ${imageInfos.length}개)`);
      
    } catch (error) {
      console.error(`❌ 하자 슬라이드 추가 오류:`, error);
      // 오류 발생 시 기본 슬라이드 생성
      await this.addDefectSlideFallback(zip, defect);
    }
  }

  /**
   * 하자 슬라이드 추가 (Fallback - 기본 XML 생성)
   */
  async addDefectSlideFallback(zip, defect) {
    try {
      const slideNumber = this.getNextSlideNumber(zip);
      const slideXml = this.createDefectSlideXML(slideNumber, defect);
      
      zip.addFile(`ppt/slides/slide${slideNumber}.xml`, Buffer.from(slideXml, 'utf8'));
      await this.addSlideRelationship(zip, slideNumber);
      
      console.log(`✅ 하자 슬라이드 ${slideNumber} 추가 완료 (Fallback)`);
    } catch (error) {
      console.error(`❌ Fallback 하자 슬라이드 추가 오류:`, error);
    }
  }

  /**
   * 이미지가 포함된 슬라이드 관계 파일 추가
   */
  async addSlideRelationshipWithImages(zip, slideNumber, imageInfos) {
    let relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"
               xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`;
    
    // 이미지 관계 추가
    imageInfos.forEach((imageInfo, index) => {
      relsXml += `\n  <Relationship Id="${imageInfo.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imageInfo.fileName}"/>`;
    });
    
    relsXml += '\n</Relationships>';
    
    zip.addFile(`ppt/slides/_rels/slide${slideNumber}.xml.rels`, Buffer.from(relsXml, 'utf8'));
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
   * 올바른 PowerPoint XML 구조로 생성
   */
  createDefectSlideXML(slideNumber, defect) {
    // PowerPoint XML 네임스페이스 포함
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
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
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="7315200" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" rtlCol="0">
            <a:spAutoFit/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>하자 #${defect.index || 1}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
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
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="1828800"/>
            <a:ext cx="7315200" cy="4572000"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" rtlCol="0">
            <a:spAutoFit/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>위치: ${this.escapeXml(defect.location || '')}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>공종: ${this.escapeXml(defect.trade || '')}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>내용: ${this.escapeXml(defect.content || '')}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>
          ${defect.memo ? `<a:p><a:r><a:rPr lang="ko-KR" dirty="0"/><a:t>메모: ${this.escapeXml(defect.memo)}</a:t></a:r><a:endParaRPr lang="ko-KR" dirty="0"/></a:p>` : ''}
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
   * XML 특수문자 이스케이프
   */
  escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>TVOC: ${measurement.tvoc || ''} ${measurement.unit_tvoc || 'mg/m³'}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>HCHO: ${measurement.hcho || ''} ${measurement.unit_hcho || 'mg/m³'}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>CO2: ${measurement.co2 || ''} ppm</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>`;
    } else if (type === 'radon') {
      content = `<a:p><a:r><a:rPr lang="ko-KR" dirty="0"/><a:t>라돈: ${measurement.radon || ''} ${measurement.unit || 'Bq/m³'}</a:t></a:r><a:endParaRPr lang="ko-KR" dirty="0"/></a:p>`;
    } else if (type === 'level') {
      content = `
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>좌측: ${measurement.left_mm || ''} mm</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>우측: ${measurement.right_mm || ''} mm</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>`;
    }
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
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
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="7315200" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" rtlCol="0">
            <a:spAutoFit/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>${typeNames[type] || type} - ${this.escapeXml(measurement.location || '')}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
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
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="1828800"/>
            <a:ext cx="7315200" cy="4572000"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" rtlCol="0">
            <a:spAutoFit/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>위치: ${this.escapeXml(measurement.location || '')}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>공정: ${this.escapeXml(measurement.trade || '')}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>${content}
          ${measurement.note ? `<a:p><a:r><a:rPr lang="ko-KR" dirty="0"/><a:t>메모: ${this.escapeXml(measurement.note)}</a:t></a:r><a:endParaRPr lang="ko-KR" dirty="0"/></a:p>` : ''}
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
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
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
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="7315200" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" rtlCol="0">
            <a:spAutoFit/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>열화상 점검 - ${this.escapeXml(inspection.location || '')}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
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
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="1828800"/>
            <a:ext cx="7315200" cy="4572000"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" rtlCol="0">
            <a:spAutoFit/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>위치: ${this.escapeXml(inspection.location || '')}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>
          <a:p>
            <a:r>
              <a:rPr lang="ko-KR" dirty="0"/>
              <a:t>공정: ${this.escapeXml(inspection.trade || '')}</a:t>
            </a:r>
            <a:endParaRPr lang="ko-KR" dirty="0"/>
          </a:p>
          ${inspection.note ? `<a:p><a:r><a:rPr lang="ko-KR" dirty="0"/><a:t>점검내용: ${this.escapeXml(inspection.note)}</a:t></a:r><a:endParaRPr lang="ko-KR" dirty="0"/></a:p>` : ''}
          ${inspection.result ? `<a:p><a:r><a:rPr lang="ko-KR" dirty="0"/><a:t>결과: ${this.escapeXml(inspection.result)}</a:t></a:r><a:endParaRPr lang="ko-KR" dirty="0"/></a:p>` : ''}
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
   * 단계 4: 이미지 삽입 위치 및 크기 조정
   */
  async addImageToZip(zip, imagePath, imageId) {
    try {
      console.log(`🖼️ 단계 4: 이미지 추가 - ${imageId}`);
      
      const fullPath = imagePath.startsWith('/') 
        ? path.join(__dirname, '..', imagePath)
        : path.join(this.uploadsDir, imagePath);

      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ 이미지 파일을 찾을 수 없습니다: ${fullPath}`);
        return null;
      }

      const imageData = await this.prepareImage(fullPath);
      if (!imageData) return null;

      // PowerPoint 미디어 폴더에 이미지 추가
      const imageExt = '.jpg'; // 항상 JPEG로 변환
      const mediaFileName = `image_${imageId}_${Date.now()}${imageExt}`;
      const mediaPath = `ppt/media/${mediaFileName}`;
      
      zip.addFile(mediaPath, imageData.buffer);

      console.log(`✅ 이미지 추가 완료: ${mediaPath} (${imageData.width}x${imageData.height})`);

      // 이미지 정보 반환 (슬라이드에 삽입할 때 사용)
      return {
        mediaPath,
        fileName: mediaFileName,
        width: imageData.width,
        height: imageData.height,
        rId: `rId${Date.now()}` // 관계 ID 생성
      };

    } catch (error) {
      console.error(`❌ 이미지 추가 오류 (${imagePath}):`, error.message);
      return null;
    }
  }

  /**
   * 슬라이드에 이미지 삽입
   */
  async insertImageIntoSlide(slideContent, imageInfo, position = { x: 1000000, y: 2000000, width: 3000000, height: 2000000 }) {
    // PowerPoint XML에 이미지 삽입
    // 실제 구현에서는 XML 구조를 정확히 파악하여 삽입해야 함
    const imageXml = `
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${Date.now()}" name="Picture"/>
          <p:cNvPicPr>
            <a:picLocks noChangeAspect="1"/>
          </p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="${imageInfo.rId}"/>
          <a:stretch>
            <a:fillRect/>
          </a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="${position.x}" y="${position.y}"/>
            <a:ext cx="${position.width}" cy="${position.height}"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
        </p:spPr>
      </p:pic>`;
    
    // 슬라이드의 spTree에 이미지 추가
    return slideContent.replace('</p:spTree>', `${imageXml}</p:spTree>`);
  }

  /**
   * Content_Types.xml 업데이트
   * 단계 8: 새로 추가된 슬라이드를 Content Types에 등록
   */
  async updateContentTypes(zip) {
    try {
      console.log('📝 단계 8: Content_Types.xml 업데이트...');
      
      const contentTypesFile = zip.getEntry('[Content_Types].xml');
      if (!contentTypesFile) {
        console.warn('⚠️ Content_Types.xml 파일을 찾을 수 없습니다.');
        return;
      }
      
      const content = contentTypesFile.getData().toString('utf8');
      
      // 새로 추가된 슬라이드 파일 찾기
      const newSlideFiles = zip.getEntries()
        .filter(entry => {
          const isSlide = entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml');
          if (!isSlide) return false;
          // Content_Types에 이미 등록되어 있는지 확인
          const slideNum = entry.entryName.match(/slide(\d+)\.xml/)?.[1];
          return slideNum && !content.includes(`ppt/slides/slide${slideNum}.xml`);
        })
        .map(entry => entry.entryName);
      
      if (newSlideFiles.length === 0) {
        console.log('  새로 추가된 슬라이드가 없습니다.');
        return;
      }
      
      console.log(`  새 슬라이드 파일: ${newSlideFiles.length}개`);
      
      // 새 슬라이드를 Content Types에 추가
      let modifiedContent = content;
      const overridePattern = /(<Override[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>)/;
      
      newSlideFiles.forEach(slidePath => {
        const slideFileName = slidePath.split('/').pop();
        const overrideTag = `<Override PartName="/${slidePath}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
        
        // 기존 Override 태그 뒤에 추가
        if (modifiedContent.includes('</Types>')) {
          modifiedContent = modifiedContent.replace('</Types>', `  ${overrideTag}\n</Types>`);
        }
      });
      
      zip.updateFile('[Content_Types].xml', Buffer.from(modifiedContent, 'utf8'));
      
      console.log(`✅ 단계 8 완료: Content_Types.xml 업데이트됨`);
      
    } catch (error) {
      console.error('❌ Content_Types.xml 업데이트 오류:', error);
    }
  }

  /**
   * 프레젠테이션 파일 업데이트
   * 단계 9: 새로 추가된 슬라이드를 프레젠테이션 목록에 추가
   */
  async updatePresentationFile(zip) {
    try {
      console.log('📝 단계 9: 프레젠테이션 파일 업데이트...');
      
      const presFile = zip.getEntry('ppt/presentation.xml');
      if (!presFile) {
        console.warn('⚠️ 프레젠테이션 파일을 찾을 수 없습니다.');
        return;
      }
      
      const content = presFile.getData().toString('utf8');
      
      // 슬라이드 파일 목록 가져오기 (기존 + 새로 추가된 것)
      const allSlideFiles = zip.getEntries()
        .filter(entry => entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml'))
        .map(entry => {
          const match = entry.entryName.match(/slide(\d+)\.xml/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(num => num > 0)
        .sort((a, b) => a - b);
      
      console.log(`  발견된 슬라이드: ${allSlideFiles.join(', ')}`);
      
      // 기존 슬라이드 ID 찾기
      const sldIdPattern = /<p:sldId[^>]*id="(\d+)"[^>]*r:id="rId(\d+)"[^>]*\/>/g;
      const existingIds = [];
      let match;
      while ((match = sldIdPattern.exec(content)) !== null) {
        existingIds.push({
          id: parseInt(match[1]),
          rId: parseInt(match[2])
        });
      }
      
      console.log(`  기존 슬라이드 ID: ${existingIds.length}개`);
      
      // 새로 추가된 슬라이드만 찾기 (기존에 없는 것)
      const existingSlideNums = existingIds.length; // 기존 슬라이드 수
      const newSlideNums = allSlideFiles.filter(num => num > existingSlideNums);
      
      if (newSlideNums.length === 0) {
        console.log('  새로 추가된 슬라이드가 없습니다.');
        return;
      }
      
      console.log(`  새로 추가된 슬라이드: ${newSlideNums.join(', ')}`);
      
      // 새 슬라이드 ID 추가
      const maxId = existingIds.length > 0 ? Math.max(...existingIds.map(i => i.id)) : 0;
      const maxRId = existingIds.length > 0 ? Math.max(...existingIds.map(i => i.rId)) : 0;
      
      // sldIdLst 태그 찾아서 새 슬라이드 추가
      const sldIdLstPattern = /(<p:sldIdLst[^>]*>)([\s\S]*?)(<\/p:sldIdLst>)/;
      const sldIdLstMatch = content.match(sldIdLstPattern);
      
      if (sldIdLstMatch) {
        let newSldIds = '';
        newSlideNums.forEach((slideNum, index) => {
          const newId = maxId + index + 1;
          const newRId = maxRId + index + 1;
          newSldIds += `\n    <p:sldId id="${newId}" r:id="rId${newRId}"/>`;
        });
        
        const modifiedContent = content.replace(
          sldIdLstPattern,
          `$1${sldIdLstMatch[2]}${newSldIds}\n  $3`
        );
        
        zip.updateFile('ppt/presentation.xml', Buffer.from(modifiedContent, 'utf8'));
        
        // 관계 파일도 업데이트
        await this.updatePresentationRelationships(zip, newSlideNums, maxRId);
        
        console.log(`✅ 단계 9 완료: 프레젠테이션 파일 업데이트됨 (새 슬라이드 ${newSlideNums.length}개 추가)`);
      } else {
        console.warn('⚠️ sldIdLst 태그를 찾을 수 없습니다.');
      }
      
    } catch (error) {
      console.error('❌ 프레젠테이션 파일 업데이트 오류:', error);
      console.error(error.stack);
      // 오류가 발생해도 계속 진행 (슬라이드는 이미 추가됨)
    }
  }

  /**
   * 프레젠테이션 관계 파일 업데이트
   */
  async updatePresentationRelationships(zip, slideFiles, startRId) {
    try {
      const relsFile = zip.getEntry('ppt/_rels/presentation.xml.rels');
      if (!relsFile) {
        return;
      }
      
      const content = relsFile.getData().toString('utf8');
      let newRels = '';
      
      slideFiles.forEach((slideNum, index) => {
        const rId = startRId + index + 1;
        newRels += `\n  <Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${slideNum}.xml"/>`;
      });
      
      const modifiedContent = content.replace('</Relationships>', `${newRels}\n</Relationships>`);
      zip.updateFile('ppt/_rels/presentation.xml.rels', Buffer.from(modifiedContent, 'utf8'));
      
    } catch (error) {
      console.error('❌ 프레젠테이션 관계 파일 업데이트 오류:', error);
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
