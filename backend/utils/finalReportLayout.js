/**
 * 최종보고서 점검방식별 표 양식 (빨간 박스 = 1 set = 1행).
 * 템플릿이 아닌 새 페이지에 표를 그려 넣기 위한 정의.
 *
 * - headerLabels: 파란색 항목명 (컬럼 헤더)
 * - columns: [ { field, w, maxChars } ] 데이터 컬럼
 * - origin: 표 시작 좌표 { x, y } (y는 PDF 기준, 페이지 상단 쪽이 큼)
 * - rowHeight: 한 행(빨간 박스) 높이 pt
 * - headerHeight: 헤더 행 높이
 * - maxRowsPerPage: 한 페이지에 넣을 최대 데이터 행 수
 */

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

// 육안점검: 빨간 박스 1개 = 위치·공종·점검의견·결과 한 행
const VISUAL_TABLE = {
  title: '육안점검',
  headerLabels: ['위치', '공종', '점검의견(하자·특이사항)', '결과'],
  columns: [
    { field: 'location', w: 90, maxChars: 12 },
    { field: 'trade', w: 90, maxChars: 12 },
    { field: 'note', w: 250, maxChars: 36 },
    { field: 'result', w: 70, maxChars: 8 }
  ],
  origin: { x: 50, y: 760 },
  headerHeight: 28,
  rowHeight: 26,
  maxRowsPerPage: 22
};

// 열화상점검
const THERMAL_TABLE = {
  title: '열화상점검',
  headerLabels: ['위치', '공종', '점검의견(하자·특이사항)', '결과'],
  columns: [
    { field: 'location', w: 90, maxChars: 12 },
    { field: 'trade', w: 90, maxChars: 12 },
    { field: 'note', w: 250, maxChars: 36 },
    { field: 'result', w: 70, maxChars: 8 }
  ],
  origin: { x: 50, y: 760 },
  headerHeight: 28,
  rowHeight: 26,
  maxRowsPerPage: 22
};

// 공기질점검
const AIR_TABLE = {
  title: '공기질점검',
  headerLabels: ['위치', '결과', '유형', '메모', 'TVOC', 'HCHO', '라돈'],
  columns: [
    { field: 'location', w: 70, maxChars: 10 },
    { field: 'result', w: 60, maxChars: 8 },
    { field: 'process_type', w: 70, maxChars: 10 },
    { field: 'note', w: 120, maxChars: 18 },
    { field: 'tvoc', w: 48, maxChars: 6 },
    { field: 'hcho', w: 48, maxChars: 6 },
    { field: 'radon', w: 55, maxChars: 8 }
  ],
  origin: { x: 50, y: 760 },
  headerHeight: 28,
  rowHeight: 26,
  maxRowsPerPage: 22
};

// 레벨기점검
const LEVEL_TABLE = {
  title: '레벨기점검',
  headerLabels: ['위치', '결과', '기준(mm)', '메모', '4점 좌우값'],
  columns: [
    { field: 'location', w: 90, maxChars: 12 },
    { field: 'result', w: 70, maxChars: 8 },
    { field: 'reference_mm', w: 55, maxChars: 6 },
    { field: 'note', w: 180, maxChars: 28 },
    { field: 'points', w: 140, maxChars: 24 }
  ],
  origin: { x: 50, y: 760 },
  headerHeight: 28,
  rowHeight: 26,
  maxRowsPerPage: 22
};

module.exports = {
  VISUAL_TABLE,
  THERMAL_TABLE,
  AIR_TABLE,
  LEVEL_TABLE,
  PAGE_WIDTH,
  PAGE_HEIGHT
};
