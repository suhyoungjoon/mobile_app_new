/**
 * PowerPoint 템플릿 매핑 유틸리티
 * 템플릿의 텍스트 박스 위치와 플레이스홀더를 매핑
 */

const fs = require('fs');
const path = require('path');

class PPTXTemplateMapper {
  constructor() {
    this.templateDir = path.join(__dirname, '..', '..', 'docs');
    this.mappingFile = path.join(this.templateDir, 'pptx-template-mapping.json');
    this.loadMapping();
  }

  /**
   * 템플릿 매핑 정보 로드
   */
  loadMapping() {
    if (fs.existsSync(this.mappingFile)) {
      this.mapping = JSON.parse(fs.readFileSync(this.mappingFile, 'utf8'));
    } else {
      // 기본 매핑 (템플릿 분석 후 수동으로 설정)
      this.mapping = {
        slide1: {
          title: {
            placeholder: '{{title}}',
            defaultText: 'CM형 사전점검 종합 보고서',
            position: { x: 0, y: 0, width: 0, height: 0 }
          },
          complex: {
            placeholder: '{{complex}}',
            defaultText: '단지명',
            position: { x: 0, y: 0, width: 0, height: 0 }
          },
          dongHo: {
            placeholder: '{{dong}}-{{ho}}',
            defaultText: '동-호',
            position: { x: 0, y: 0, width: 0, height: 0 }
          },
          name: {
            placeholder: '{{name}}',
            defaultText: '세대주',
            position: { x: 0, y: 0, width: 0, height: 0 }
          },
          date: {
            placeholder: '{{date}}',
            defaultText: '점검일',
            position: { x: 0, y: 0, width: 0, height: 0 }
          }
        }
      };
      this.saveMapping();
    }
  }

  /**
   * 템플릿 매핑 정보 저장
   */
  saveMapping() {
    fs.writeFileSync(this.mappingFile, JSON.stringify(this.mapping, null, 2), 'utf8');
  }

  /**
   * 슬라이드의 텍스트 교체
   */
  replaceTextInSlide(slideContent, replacements) {
    let modifiedContent = slideContent;

    Object.entries(replacements).forEach(([placeholder, value]) => {
      // 플레이스홀더 형식: {{변수명}}
      const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
      modifiedContent = modifiedContent.replace(regex, value || '');
    });

    return modifiedContent;
  }

  /**
   * 데이터를 템플릿 매핑에 맞게 변환
   */
  mapDataToTemplate(data) {
    const replacements = {
      title: 'CM형 사전점검 종합 보고서',
      complex: data.complex || '',
      dong: data.dong || '',
      ho: data.ho || '',
      name: data.name || '',
      date: this.formatDate(data.created_at),
      generated_at: this.formatDate(data.generated_at),
      type: data.type || '',
      total_defects: data.total_defects || 0,
      total_air: data.total_air || 0,
      total_radon: data.total_radon || 0,
      total_level: data.total_level || 0,
      total_thermal: data.total_thermal || 0
    };

    return replacements;
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
}

module.exports = new PPTXTemplateMapper();
