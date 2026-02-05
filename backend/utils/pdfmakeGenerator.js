/**
 * PDF generation using pdfmake with Korean font support
 * pdfmake는 한글 폰트를 직접 임베드할 수 있어 한글 깨짐 문제를 완전히 해결합니다.
 */

// pdfmake 0.2.12는 src/printer.js를 main으로 사용
const PdfPrinter = require('pdfmake/src/printer').default || require('pdfmake/src/printer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class PDFMakeGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'reports');
    this.fontsDir = path.join(__dirname, '..', 'fonts');
    this.ensureDirectories();
    this.initFonts();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.fontsDir)) {
      fs.mkdirSync(this.fontsDir, { recursive: true });
    }
  }

  initFonts() {
    // Roboto 폰트 경로 (pdfmake 기본 포함)
    const robotoPath = path.join(__dirname, '..', 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto');
    
    this.fonts = {
      Roboto: {
        normal: path.join(robotoPath, 'Roboto-Regular.ttf'),
        bold: path.join(robotoPath, 'Roboto-Medium.ttf'),
        italics: path.join(robotoPath, 'Roboto-Italic.ttf'),
        bolditalics: path.join(robotoPath, 'Roboto-MediumItalic.ttf')
      }
    };
    
    // Noto Sans KR 폰트 파일 확인
    const notoSansKRRegular = path.join(this.fontsDir, 'NotoSansKR-Regular.ttf');
    const notoSansKRBold = path.join(this.fontsDir, 'NotoSansKR-Bold.ttf');
    const notoSansKRMedium = path.join(this.fontsDir, 'NotoSansKR-Medium.ttf');

    if (fs.existsSync(notoSansKRRegular)) {
      // 한글 폰트가 있으면 추가 (pdfmake는 normal/bold/italics/bolditalics 4종 필요)
      const boldPath = fs.existsSync(notoSansKRBold) ? notoSansKRBold : notoSansKRRegular;
      this.fonts.NotoSansKR = {
        normal: notoSansKRRegular,
        bold: boldPath,
        italics: notoSansKRRegular,
        bolditalics: boldPath
      };
      this.defaultFont = 'NotoSansKR';
      console.log('✅ Noto Sans KR 폰트를 사용합니다.');
    } else {
      // 폰트 파일이 없으면 Roboto 사용 (한글 깨짐 가능)
      console.warn('⚠️ Noto Sans KR 폰트 파일이 없습니다. Roboto 폰트를 사용합니다.');
      console.warn('   한글을 제대로 표시하려면 fonts/ 디렉토리에 NotoSansKR-Regular.ttf 파일을 추가하세요.');
      this.defaultFont = 'Roboto';
    }

    this.printer = new PdfPrinter(this.fonts);
  }

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

  buildDocumentDefinition(data) {
    const content = [];

    // 헤더 - PowerPoint 템플릿 형식
    content.push({
      text: `CM형 ${data.type || '사전점검'} 종합 보고서`,
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 10]
    });

    // 연락처 정보 (PowerPoint 템플릿에서 가져옴)
    content.push({
      text: [
        { text: 'Tel. ', style: 'contactText' },
        { text: '1668-5343', style: 'contactText' },
        { text: '  |  Email: ', style: 'contactText' },
        { text: 'insighteye01@naver.com', style: 'contactText' }
      ],
      style: 'subtitle',
      alignment: 'center',
      margin: [0, 0, 0, 30]
    });

    // 인사말 (PowerPoint 템플릿에서 가져옴)
    content.push({
      text: '입주자님 귀하',
      style: 'greeting',
      alignment: 'left',
      margin: [0, 0, 0, 20]
    });

    // 점검 정보 테이블 (PowerPoint 템플릿 형식)
    const metaTable = {
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            { text: '입 주 자 성 함', style: 'tableHeader', border: [true, true, true, true] },
            { text: `: ${data.name || ''}`, style: 'metaText', border: [false, true, true, true] },
            { text: '점검일짜', style: 'tableHeader', border: [true, true, true, true] },
            { text: `: ${this.formatDate(data.created_at)}`, style: 'metaText', border: [false, true, true, true] }
          ],
          [
            { text: '아파트명', style: 'tableHeader', border: [true, true, true, true] },
            { text: `: ${data.complex || ''}`, style: 'metaText', border: [false, true, true, true] },
            { text: '동호수', style: 'tableHeader', border: [true, true, true, true] },
            { text: `: ${data.dong || ''}동 ${data.ho || ''}호`, style: 'metaText', border: [false, true, true, true] }
          ]
        ]
      },
      margin: [0, 0, 0, 30]
    };
    content.push(metaTable);

    // 점검 요약
    content.push({
      text: '점검 요약',
      style: 'sectionHeader',
      margin: [0, 0, 0, 10]
    });

    const summaryTable = {
      table: {
        widths: ['*', '*', '*', '*', '*'],
        body: [
          [
            { text: `총 하자 건수: ${data.total_defects || 0}건`, style: 'summaryText' },
            { text: `열화상 점검: ${data.total_thermal || 0}건`, style: 'summaryText' },
            { text: `공기질 측정: ${data.total_air || 0}건`, style: 'summaryText' },
            { text: `라돈 측정: ${data.total_radon || 0}건`, style: 'summaryText' },
            { text: `레벨기 측정: ${data.total_level || 0}건`, style: 'summaryText' }
          ]
        ]
      },
      margin: [0, 0, 0, 20]
    };
    content.push(summaryTable);

    // 점검 상세내용 (수치 포함)
    content.push({
      text: '점검 상세내용',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10]
    });
    content.push({
      text: '아래는 하자 목록 및 장비 점검 측정값(수치) 상세입니다.',
      style: 'defectText',
      margin: [0, 0, 0, 15]
    });

    // 하자 목록 (상세)
    if (data.defects && data.defects.length > 0) {
      content.push({
        text: '하자 목록 (상세)',
        style: 'sectionHeader',
        margin: [0, 15, 0, 10]
      });

      data.defects.forEach((defect, index) => {
        content.push({
          text: `하자 #${defect.index || index + 1}`,
          style: 'defectHeader',
          margin: [0, 10, 0, 5]
        });

        const defectInfo = [
          { text: `위치: ${defect.location || ''}`, style: 'defectText' },
          { text: `공종: ${defect.trade || ''}`, style: 'defectText' },
          { text: `내용: ${defect.content || ''}`, style: 'defectText' }
        ];

        if (defect.memo) {
          defectInfo.push({ text: `메모: ${defect.memo}`, style: 'defectText' });
        }

        content.push({
          ul: defectInfo,
          margin: [20, 0, 0, 10]
        });

        // 하자 사진 추가
        if (defect.photos && defect.photos.length > 0) {
          defect.photos.forEach((photo) => {
            try {
              // photo.url 형식: /uploads/filename.jpg
              // 실제 파일 경로로 변환: backend/uploads/filename.jpg
              const urlPath = photo.url.replace(/^\//, ''); // 앞의 / 제거
              const photoPath = path.join(__dirname, '..', urlPath);
              
              // 파일이 존재하는지 확인
              if (fs.existsSync(photoPath)) {
                // pdfmake에서 이미지 포함
                content.push({
                  image: photoPath,
                  width: 150,
                  margin: [20, 5, 0, 5],
                  alignment: 'left'
                });
                
                // 사진 종류 표시 (near/far)
                const photoKindText = photo.kind === 'near' ? '근접 사진' : 
                                     photo.kind === 'far' ? '원거리 사진' : '사진';
                content.push({
                  text: `[${photoKindText}]`,
                  style: 'photoCaption',
                  margin: [20, 0, 0, 10]
                });
              } else {
                console.warn(`⚠️ 사진 파일을 찾을 수 없습니다: ${photoPath}`);
              }
            } catch (error) {
              console.error(`❌ 사진 처리 오류 (하자 #${defect.index || index + 1}):`, error.message);
            }
          });
        }
      });
    } else {
      content.push({
        text: '등록된 하자가 없습니다.',
        style: 'noDataText',
        margin: [0, 20, 0, 20]
      });
    }

    // 장비 점검 데이터 (점검 상세내용 - 수치 포함)
    if (data.has_equipment_data) {
      // 측정 수치 요약 테이블 (한눈에 보는 수치)
      const summaryRows = [
        [
          { text: '구분', style: 'tableHeader', border: [true, true, true, true] },
          { text: '위치', style: 'tableHeader', border: [true, true, true, true] },
          { text: '공종', style: 'tableHeader', border: [true, true, true, true] },
          { text: '측정 수치', style: 'tableHeader', border: [true, true, true, true] },
          { text: '결과', style: 'tableHeader', border: [true, true, true, true] }
        ]
      ];
      (data.air_measurements || []).forEach((item) => {
        summaryRows.push([
          { text: '공기질', style: 'metaText', border: [true, true, true, true] },
          { text: item.location || '-', style: 'metaText', border: [true, true, true, true] },
          { text: item.trade || '-', style: 'metaText', border: [true, true, true, true] },
          { text: `TVOC ${item.tvoc ?? '-'} ${item.unit_tvoc || ''} / HCHO ${item.hcho ?? '-'} ${item.unit_hcho || ''} / CO2 ${item.co2 ?? '-'}`, style: 'metaText', border: [true, true, true, true], fontSize: 8 },
          { text: item.result_text || item.result || '-', style: 'metaText', border: [true, true, true, true] }
        ]);
      });
      (data.radon_measurements || []).forEach((item) => {
        summaryRows.push([
          { text: '라돈', style: 'metaText', border: [true, true, true, true] },
          { text: item.location || '-', style: 'metaText', border: [true, true, true, true] },
          { text: item.trade || '-', style: 'metaText', border: [true, true, true, true] },
          { text: `${item.radon ?? '-'} ${item.unit || ''}`, style: 'metaText', border: [true, true, true, true] },
          { text: item.result_text || item.result || '-', style: 'metaText', border: [true, true, true, true] }
        ]);
      });
      (data.level_measurements || []).forEach((item) => {
        summaryRows.push([
          { text: '레벨기', style: 'metaText', border: [true, true, true, true] },
          { text: item.location || '-', style: 'metaText', border: [true, true, true, true] },
          { text: item.trade || '-', style: 'metaText', border: [true, true, true, true] },
          { text: `좌 ${item.left_mm ?? '-'}mm / 우 ${item.right_mm ?? '-'}mm`, style: 'metaText', border: [true, true, true, true] },
          { text: item.result_text || item.result || '-', style: 'metaText', border: [true, true, true, true] }
        ]);
      });
      (data.thermal_inspections || []).forEach((item) => {
        summaryRows.push([
          { text: '열화상', style: 'metaText', border: [true, true, true, true] },
          { text: item.location || '-', style: 'metaText', border: [true, true, true, true] },
          { text: item.trade || '-', style: 'metaText', border: [true, true, true, true] },
          { text: item.note || '-', style: 'metaText', border: [true, true, true, true] },
          { text: item.result_text || item.result || '-', style: 'metaText', border: [true, true, true, true] }
        ]);
      });
      if (summaryRows.length > 1) {
        content.push({
          text: '측정 수치 요약',
          style: 'defectHeader',
          margin: [0, 15, 0, 8]
        });
        content.push({
          table: { widths: ['auto', '*', 'auto', '*', 'auto'], body: summaryRows },
          margin: [0, 0, 0, 15]
        });
      }

      // 공기질 측정 (상세)
      if (data.air_measurements && data.air_measurements.length > 0) {
        content.push({
          text: '공기질 측정 (상세)',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10]
        });

        data.air_measurements.forEach((item, index) => {
          content.push({
            text: `측정 #${index + 1}`,
            style: 'defectHeader',
            margin: [0, 10, 0, 5]
          });

          content.push({
            ul: [
              { text: `위치: ${item.location || ''}`, style: 'defectText' },
              { text: `공종: ${item.trade || ''}`, style: 'defectText' },
              { text: `TVOC: ${item.tvoc ?? '-'} ${item.unit_tvoc || ''}`, style: 'defectText' },
              { text: `HCHO: ${item.hcho ?? '-'} ${item.unit_hcho || ''}`, style: 'defectText' },
              { text: `CO2: ${item.co2 ?? '-'}`, style: 'defectText' },
              { text: `결과: ${item.result_text || item.result || ''}`, style: 'defectText' }
            ],
            margin: [20, 0, 0, 10]
          });
          
          // 공기질 측정 사진 추가
          if (item.photos && item.photos.length > 0) {
            item.photos.forEach((photo) => {
              try {
                const urlPath = photo.file_url.replace(/^\//, '');
                const photoPath = path.join(__dirname, '..', urlPath);
                
                if (fs.existsSync(photoPath)) {
                  content.push({
                    image: photoPath,
                    width: 150,
                    margin: [20, 5, 0, 5],
                    alignment: 'left'
                  });
                  
                  if (photo.caption) {
                    content.push({
                      text: `[${photo.caption}]`,
                      style: 'photoCaption',
                      margin: [20, 0, 0, 10]
                    });
                  }
                } else {
                  console.warn(`⚠️ 사진 파일을 찾을 수 없습니다: ${photoPath}`);
                }
              } catch (error) {
                console.error(`❌ 사진 처리 오류 (공기질 측정 #${index + 1}):`, error.message);
              }
            });
          }
        });
      }

      // 라돈 측정 (상세)
      if (data.radon_measurements && data.radon_measurements.length > 0) {
        content.push({
          text: '라돈 측정 (상세)',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10]
        });

        data.radon_measurements.forEach((item, index) => {
          content.push({
            text: `측정 #${index + 1}`,
            style: 'defectHeader',
            margin: [0, 10, 0, 5]
          });

          content.push({
            ul: [
              { text: `위치: ${item.location || ''}`, style: 'defectText' },
              { text: `공종: ${item.trade || ''}`, style: 'defectText' },
              { text: `라돈: ${item.radon ?? '-'} ${item.unit || ''}`, style: 'defectText' },
              { text: `결과: ${item.result_text || item.result || ''}`, style: 'defectText' }
            ],
            margin: [20, 0, 0, 10]
          });
          
          // 라돈 측정 사진 추가
          if (item.photos && item.photos.length > 0) {
            item.photos.forEach((photo) => {
              try {
                const urlPath = photo.file_url.replace(/^\//, '');
                const photoPath = path.join(__dirname, '..', urlPath);
                
                if (fs.existsSync(photoPath)) {
                  content.push({
                    image: photoPath,
                    width: 150,
                    margin: [20, 5, 0, 5],
                    alignment: 'left'
                  });
                  
                  if (photo.caption) {
                    content.push({
                      text: `[${photo.caption}]`,
                      style: 'photoCaption',
                      margin: [20, 0, 0, 10]
                    });
                  }
                } else {
                  console.warn(`⚠️ 사진 파일을 찾을 수 없습니다: ${photoPath}`);
                }
              } catch (error) {
                console.error(`❌ 사진 처리 오류 (라돈 측정 #${index + 1}):`, error.message);
              }
            });
          }
        });
      }

      // 레벨기 측정 (상세)
      if (data.level_measurements && data.level_measurements.length > 0) {
        content.push({
          text: '레벨기 측정 (상세)',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10]
        });

        data.level_measurements.forEach((item, index) => {
          content.push({
            text: `측정 #${index + 1}`,
            style: 'defectHeader',
            margin: [0, 10, 0, 5]
          });

          content.push({
            ul: [
              { text: `위치: ${item.location || ''}`, style: 'defectText' },
              { text: `공종: ${item.trade || ''}`, style: 'defectText' },
              { text: `좌측: ${item.left_mm ?? '-'}mm`, style: 'defectText' },
              { text: `우측: ${item.right_mm ?? '-'}mm`, style: 'defectText' },
              { text: `결과: ${item.result_text || item.result || ''}`, style: 'defectText' }
            ],
            margin: [20, 0, 0, 10]
          });
          
          // 레벨기 측정 사진 추가
          if (item.photos && item.photos.length > 0) {
            item.photos.forEach((photo) => {
              try {
                const urlPath = photo.file_url.replace(/^\//, '');
                const photoPath = path.join(__dirname, '..', urlPath);
                
                if (fs.existsSync(photoPath)) {
                  content.push({
                    image: photoPath,
                    width: 150,
                    margin: [20, 5, 0, 5],
                    alignment: 'left'
                  });
                  
                  if (photo.caption) {
                    content.push({
                      text: `[${photo.caption}]`,
                      style: 'photoCaption',
                      margin: [20, 0, 0, 10]
                    });
                  }
                } else {
                  console.warn(`⚠️ 사진 파일을 찾을 수 없습니다: ${photoPath}`);
                }
              } catch (error) {
                console.error(`❌ 사진 처리 오류 (레벨기 측정 #${index + 1}):`, error.message);
              }
            });
          }
        });
      }

      // 열화상 점검 (상세)
      if (data.thermal_inspections && data.thermal_inspections.length > 0) {
        content.push({
          text: '열화상 점검 (상세)',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10]
        });

        data.thermal_inspections.forEach((item, index) => {
          content.push({
            text: `점검 #${index + 1}`,
            style: 'defectHeader',
            margin: [0, 10, 0, 5]
          });

          const thermalInfo = [
            { text: `위치: ${item.location || ''}`, style: 'defectText' },
            { text: `공종: ${item.trade || ''}`, style: 'defectText' },
            { text: `결과: ${item.result_text || item.result || ''}`, style: 'defectText' }
          ];

          if (item.note) {
            thermalInfo.push({ text: `비고: ${item.note}`, style: 'defectText' });
          }

          content.push({
            ul: thermalInfo,
            margin: [20, 0, 0, 10]
          });
          
          // 열화상 점검 사진 추가
          if (item.photos && item.photos.length > 0) {
            item.photos.forEach((photo) => {
              try {
                const urlPath = photo.file_url.replace(/^\//, '');
                const photoPath = path.join(__dirname, '..', urlPath);
                
                if (fs.existsSync(photoPath)) {
                  content.push({
                    image: photoPath,
                    width: 150,
                    margin: [20, 5, 0, 5],
                    alignment: 'left'
                  });
                  
                  if (photo.caption) {
                    content.push({
                      text: `[${photo.caption}]`,
                      style: 'photoCaption',
                      margin: [20, 0, 0, 10]
                    });
                  } else {
                    content.push({
                      text: '[열화상 사진]',
                      style: 'photoCaption',
                      margin: [20, 0, 0, 10]
                    });
                  }
                } else {
                  console.warn(`⚠️ 사진 파일을 찾을 수 없습니다: ${photoPath}`);
                }
              } catch (error) {
                console.error(`❌ 사진 처리 오류 (열화상 점검 #${index + 1}):`, error.message);
              }
            });
          }
        });
      }
    }

    // 회사 소개 (PowerPoint 템플릿에서 가져옴)
    content.push({
      text: [
        { text: '인싸이트아이는 ', style: 'companyText' },
        { text: '사전점검', style: 'companyText', bold: true },
        { text: ', ', style: 'companyText' },
        { text: '시공사 하자등록', style: 'companyText', bold: true },
        { text: ', ', style: 'companyText' },
        { text: '사후점검', style: 'companyText', bold: true },
        { text: ' 단계에 이르기까지 입주자를 대신하여 최대한의 만족도 창출해 드리고 있는 ', style: 'companyText' },
        { text: 'CM형 사전점검 (Construction Management)', style: 'companyText', bold: true },
        { text: ' 전문회사입니다.', style: 'companyText' }
      ],
      style: 'companyInfo',
      alignment: 'left',
      margin: [0, 30, 0, 10]
    });

    content.push({
      text: '고객과 함께 미래를 만드는 데 중심적인 역할을 하는 기업이 되겠습니다.',
      style: 'companyVision',
      alignment: 'left',
      margin: [0, 0, 0, 10]
    });

    content.push({
      text: '고객과 함께 성장합니다 - Innovative Partner',
      style: 'companyTagline',
      alignment: 'left',
      margin: [0, 0, 0, 30]
    });

    // 푸터
    content.push({
      text: '인싸이트아이',
      style: 'footerText',
      alignment: 'center',
      margin: [0, 30, 0, 10]
    });

    return {
      content,
      defaultStyle: {
        font: this.defaultFont,
        fontSize: 10,
        lineHeight: 1.4
      },
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#1a73e8'
        },
        subtitle: {
          fontSize: 10,
          color: '#666'
        },
        contactText: {
          fontSize: 9,
          color: '#666'
        },
        greeting: {
          fontSize: 14,
          bold: true,
          margin: [0, 20, 0, 10]
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          fillColor: '#f0f0f0'
        },
        sectionHeader: {
          fontSize: 16,
          bold: true,
          color: '#1a73e8'
        },
        metaText: {
          fontSize: 10
        },
        summaryText: {
          fontSize: 10
        },
        defectHeader: {
          fontSize: 12,
          bold: true
        },
        defectText: {
          fontSize: 10
        },
        noDataText: {
          fontSize: 12,
          color: '#666',
          italics: true,
          alignment: 'center'
        },
        photoCaption: {
          fontSize: 8,
          color: '#666',
          italics: true
        },
        companyText: {
          fontSize: 10,
          lineHeight: 1.6
        },
        companyInfo: {
          fontSize: 10,
          lineHeight: 1.6
        },
        companyVision: {
          fontSize: 11,
          bold: true,
          color: '#1a73e8',
          lineHeight: 1.6
        },
        companyTagline: {
          fontSize: 10,
          color: '#666',
          italics: true
        },
        footerText: {
          fontSize: 10,
          color: '#888'
        }
      },
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60]
    };
  }

  async generatePDF(templateName, data, options = {}) {
    const {
      filename = `report-${uuidv4()}.pdf`
    } = options;

    return new Promise((resolve, reject) => {
      try {
        // pdfmake 문서 정의 생성
        const docDefinition = this.buildDocumentDefinition(data);

        // PDF 생성
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);

        // 파일로 저장
        const outputPath = path.join(this.outputDir, filename);
        const writeStream = fs.createWriteStream(outputPath);
        
        pdfDoc.pipe(writeStream);
        pdfDoc.end();

        writeStream.on('finish', () => {
          const stats = fs.statSync(outputPath);
          resolve({
            filename,
            path: outputPath,
            url: `/reports/${filename}`,
            size: stats.size
          });
        });

        writeStream.on('error', (error) => {
          reject(new Error(`Failed to save PDF file: ${error.message}`));
        });

      } catch (error) {
        console.error('PDF generation error:', error);
        reject(new Error(`PDF generation failed: ${error.message}`));
      }
    });
  }

  getReportPath(filename) {
    return path.join(this.outputDir, filename);
  }

  getReportUrl(filename) {
    return `/reports/${filename}`;
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
      total_defects: defects.length,
      total_thermal: 0,
      total_air: 0,
      total_radon: 0,
      total_level: 0,
      has_equipment_data: false
    };

    return await this.generatePDF('simple-report', data, options);
  }
}

module.exports = new PDFMakeGenerator();

