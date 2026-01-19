/**
 * PowerPoint 테이블 생성 유틸리티
 * 단계 7: 테이블 데이터 삽입 기능
 */

class PPTXTableGenerator {
  /**
   * 측정값 테이블 XML 생성
   */
  createMeasurementTable(measurements, type) {
    if (!measurements || measurements.length === 0) {
      return '';
    }

    const headers = this.getTableHeaders(type);
    const rows = measurements.map(m => this.createTableRow(m, type));

    return `
      <p:graphicFrame>
        <p:nvGraphicFramePr>
          <p:cNvPr id="${Date.now()}" name="Table"/>
          <p:cNvGraphicFramePr/>
          <p:nvPr/>
        </p:nvGraphicFramePr>
        <p:xfrm>
          <a:off x="1000000" y="3000000"/>
          <a:ext cx="7000000" cy="${2000000 + measurements.length * 500000}"/>
        </p:xfrm>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
            <a:tbl>
              <a:tblPr/>
              <a:tblGrid>
                ${headers.map(() => '<a:gridCol w="2000000"/>').join('\n                ')}
              </a:tblGrid>
              <a:tr h="500000">
                ${headers.map(header => `
                  <a:tc>
                    <a:txBody>
                      <a:bodyPr/>
                      <a:p>
                        <a:r>
                          <a:t>${header}</a:t>
                        </a:r>
                      </a:p>
                    </a:txBody>
                  </a:tc>
                `).join('')}
              </a:tr>
              ${rows.join('\n              ')}
            </a:tbl>
          </a:graphicData>
        </a:graphic>
      </p:graphicFrame>`;
  }

  /**
   * 테이블 헤더 가져오기
   */
  getTableHeaders(type) {
    switch (type) {
      case 'air':
        return ['위치', 'TVOC', 'HCHO', 'CO2', '결과'];
      case 'radon':
        return ['위치', '라돈', '단위', '결과'];
      case 'level':
        return ['위치', '좌측(mm)', '우측(mm)', '결과'];
      case 'thermal':
        return ['위치', '공정', '점검내용', '결과'];
      default:
        return ['위치', '값', '결과'];
    }
  }

  /**
   * 테이블 행 생성
   */
  createTableRow(measurement, type) {
    let cells = [];
    
    switch (type) {
      case 'air':
        cells = [
          measurement.location || '',
          `${measurement.tvoc || ''} ${measurement.unit_tvoc || 'mg/m³'}`,
          `${measurement.hcho || ''} ${measurement.unit_hcho || 'mg/m³'}`,
          `${measurement.co2 || ''} ppm`,
          measurement.result || ''
        ];
        break;
      case 'radon':
        cells = [
          measurement.location || '',
          measurement.radon || '',
          measurement.unit || 'Bq/m³',
          measurement.result || ''
        ];
        break;
      case 'level':
        cells = [
          measurement.location || '',
          measurement.left_mm || '',
          measurement.right_mm || '',
          measurement.result || ''
        ];
        break;
      case 'thermal':
        cells = [
          measurement.location || '',
          measurement.trade || '',
          measurement.note || '',
          measurement.result || ''
        ];
        break;
      default:
        cells = [measurement.location || '', '', measurement.result || ''];
    }

    return `
      <a:tr h="500000">
        ${cells.map(cell => `
          <a:tc>
            <a:txBody>
              <a:bodyPr/>
              <a:p>
                <a:r>
                  <a:t>${cell}</a:t>
                </a:r>
              </a:p>
            </a:txBody>
          </a:tc>
        `).join('')}
      </a:tr>`;
  }

  /**
   * 하자 요약 테이블 생성
   */
  createDefectSummaryTable(defects) {
    if (!defects || defects.length === 0) {
      return '';
    }

    const rows = defects.map(defect => `
      <a:tr h="500000">
        <a:tc>
          <a:txBody>
            <a:bodyPr/>
            <a:p>
              <a:r>
                <a:t>${defect.index || ''}</a:t>
              </a:r>
            </a:p>
          </a:txBody>
        </a:tc>
        <a:tc>
          <a:txBody>
            <a:bodyPr/>
            <a:p>
              <a:r>
                <a:t>${defect.location || ''}</a:t>
              </a:r>
            </a:p>
          </a:txBody>
        </a:tc>
        <a:tc>
          <a:txBody>
            <a:bodyPr/>
            <a:p>
              <a:r>
                <a:t>${defect.trade || ''}</a:t>
              </a:r>
            </a:p>
          </a:txBody>
        </a:tc>
        <a:tc>
          <a:txBody>
            <a:bodyPr/>
            <a:p>
              <a:r>
                <a:t>${(defect.content || '').substring(0, 50)}</a:t>
              </a:r>
            </a:p>
          </a:txBody>
        </a:tc>
      </a:tr>
    `);

    return `
      <p:graphicFrame>
        <p:nvGraphicFramePr>
          <p:cNvPr id="${Date.now()}" name="DefectTable"/>
          <p:cNvGraphicFramePr/>
          <p:nvPr/>
        </p:nvGraphicFramePr>
        <p:xfrm>
          <a:off x="1000000" y="3000000"/>
          <a:ext cx="7000000" cy="${2000000 + defects.length * 500000}"/>
        </p:xfrm>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
            <a:tbl>
              <a:tblPr/>
              <a:tblGrid>
                <a:gridCol w="800000"/>
                <a:gridCol w="1500000"/>
                <a:gridCol w="1500000"/>
                <a:gridCol w="3200000"/>
              </a:tblGrid>
              <a:tr h="500000">
                <a:tc>
                  <a:txBody>
                    <a:bodyPr/>
                    <a:p>
                      <a:r>
                        <a:t>번호</a:t>
                      </a:r>
                    </a:p>
                  </a:txBody>
                </a:tc>
                <a:tc>
                  <a:txBody>
                    <a:bodyPr/>
                    <a:p>
                      <a:r>
                        <a:t>위치</a:t>
                      </a:r>
                    </a:p>
                  </a:txBody>
                </a:tc>
                <a:tc>
                  <a:txBody>
                    <a:bodyPr/>
                    <a:p>
                      <a:r>
                        <a:t>공종</a:t>
                      </a:r>
                    </a:p>
                  </a:txBody>
                </a:tc>
                <a:tc>
                  <a:txBody>
                    <a:bodyPr/>
                    <a:p>
                      <a:r>
                        <a:t>내용</a:t>
                      </a:r>
                    </a:p>
                  </a:txBody>
                </a:tc>
              </a:tr>
              ${rows.join('\n              ')}
            </a:tbl>
          </a:graphicData>
        </a:graphic>
      </p:graphicFrame>`;
  }
}

module.exports = new PPTXTableGenerator();
