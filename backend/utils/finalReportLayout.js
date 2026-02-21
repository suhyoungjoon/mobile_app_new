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

// 육안점검: 블록형 (위치 행 + 근거리/원거리 빈 사진 + 공종/하자내용 + 특이사항)
const VISUAL_BLOCK = {
  title: '육안점검',
  origin: { x: 50, y: 700 },
  contentWidth: 495,
  rowHeight: 22,
  photoHeight: 90,
  labelWidth: 70,
  // 위치 행: 라벨 70, 값 나머지
  // 사진 행: 좌(근거리) 247.5, 우(원거리) 247.5
  // 공종/하자 행: 4칸 각 123.75 (라벨|값|라벨|값)
  cellDetailWidth: 123.75,
  blockGap: 14,
  borderWidth: 0.8,
  colors: {
    labelBorder: { r: 0.2, g: 0.4, b: 0.9 },   // 파란
    valueBorder: { r: 0.2, g: 0.6, b: 0.4 },   // 초록
    photoBorder: { r: 0.95, g: 0.6, b: 0.2 }  // 주황
  }
};

// (기존 리스트형은 열화상 등에서만 사용, 육안은 VISUAL_BLOCK 사용)
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

// 열화상점검: 블록형 (위치 + 일반/열화상 빈 사진 + 공종/점검내용)
const THERMAL_BLOCK = {
  title: '열화상점검',
  origin: { x: 50, y: 700 },
  contentWidth: 495,
  rowHeight: 22,
  photoHeight: 90,
  labelWidth: 70,
  cellDetailWidth: 123.75,
  blockGap: 14,
  borderWidth: 0.8,
  colors: {
    labelBorder: { r: 0.2, g: 0.4, b: 0.9 },
    valueBorder: { r: 0.2, g: 0.6, b: 0.4 },
    photoBorder: { r: 0.95, g: 0.6, b: 0.2 }
  }
};

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

// 공기질점검: 블록형 [점검내용][고정그림][수치|단위][사진1개] — 세로 높이 통일
const AIR_BLOCK = {
  title: '공기질점검',
  origin: { x: 50, y: 680 },
  blockWidth: 495,
  blockHeight: 120,
  // 한 행(점검결과 1개)의 세로 높이 — 점검내용/고정그림/수치/사진 모두 동일
  contentRowHeight: 100,
  // 점검내용: 위치/결과/유형/메모
  metaLabelWidth: 50,
  metaValueWidth: 100,
  metaRowHeight: 20,
  // 고정그림(다이어그램) 너비/높이
  diagramWidth: 90,
  diagramHeight: 90,
  // 수치 테이블: 값열 | 단위열
  valuesValColWidth: 48,
  valuesUnitColWidth: 72,
  valuesRowHeight: 22,
  // 사진 1개
  photoWidth: 100,
  photoHeight: 100,
  blockGap: 12,
  borderWidth: 0.8,
  colors: {
    labelBorder: { r: 0.2, g: 0.4, b: 0.9 },
    valueBorder: { r: 0.2, g: 0.6, b: 0.4 },
    photoBorder: { r: 0.95, g: 0.6, b: 0.2 }
  }
};

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

// 레벨기점검: [좌: 1번2번/고정그림/3번4번][중: 점검내용][우: 사진] — 세로 높이 통일
// diagram을 축소해 1번2번/3번4번과 겹치지 않도록, 측정값 영역 확대
const LEVEL_BLOCK = {
  title: '레벨기점검',
  origin: { x: 50, y: 660 },
  contentRowHeight: 120,
  rowHeight: 20,
  labelWidth: 70,
  metaValueWidth: 110,
  // 좌측: 수치행 + 다이어그램 (1번2번3번4번 값 영역 확대)
  pointRowHeight: 26,
  pointLabelWidth: 26,
  pointValueWidth: 55,
  leftSectionWidth: 175,
  diagramWidth: 95,
  diagramHeight: 52,
  photoWidth: 100,
  photoHeight: 100,
  blockGap: 12,
  borderWidth: 0.8,
  colors: {
    labelBorder: { r: 0.2, g: 0.4, b: 0.9 },
    valueBorder: { r: 0.2, g: 0.6, b: 0.4 },
    photoBorder: { r: 0.95, g: 0.6, b: 0.2 }
  }
};

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
  VISUAL_BLOCK,
  THERMAL_TABLE,
  THERMAL_BLOCK,
  AIR_TABLE,
  AIR_BLOCK,
  LEVEL_TABLE,
  LEVEL_BLOCK,
  PAGE_WIDTH,
  PAGE_HEIGHT
};
