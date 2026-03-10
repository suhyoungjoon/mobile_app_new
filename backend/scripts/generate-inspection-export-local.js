/**
 * 로컬에서 특정 세대(인싸이트자이 7동 701호) 점검결과 ZIP 생성
 *
 * 사용: cd backend && node scripts/generate-inspection-export-local.js
 * 필요: config/database 연결 가능 (또는 DATABASE_URL)
 * 출력: backend/reports/점검결과_7동_701호_<timestamp>.zip
 */
const path = require('path');
const fs = require('fs');
const pool = require('../database');
const { buildInspectionExportZip } = require('../utils/inspectionExport');

const COMPLEX_NAME = '인싸이트자이';
const DONG = '7';
const HO = '701';

function getResultText(result) {
  const resultMap = { 'normal': '정상', 'check': '확인요망', 'na': '해당없음' };
  return resultMap[result] || result;
}

const INSPECTION_QUERY = `
  SELECT
    ii.id, ii.type, ii.location, ii.trade, ii.serial_no, ii.note, ii.result, ii.created_at,
    am.process_type, am.tvoc, am.hcho, am.co2, am.unit_tvoc, am.unit_hcho,
    rm.radon, rm.unit_radon,
    lm.left_mm, lm.right_mm,
    lm.point1_left_mm, lm.point1_right_mm, lm.point2_left_mm, lm.point2_right_mm,
    lm.point3_left_mm, lm.point3_right_mm, lm.point4_left_mm, lm.point4_right_mm,
    lm.reference_mm,
    (SELECT json_agg(json_build_object('file_url', tp.file_url, 'caption', tp.caption, 'shot_at', tp.shot_at))
     FROM thermal_photo tp WHERE tp.item_id = ii.id) as thermal_photos,
    (SELECT json_agg(json_build_object('file_url', ip.file_url, 'caption', ip.caption, 'sort_order', ip.sort_order) ORDER BY ip.sort_order)
     FROM inspection_photo ip WHERE ip.item_id = ii.id) as inspection_photos
  FROM inspection_item ii
  LEFT JOIN air_measure am ON ii.id = am.item_id
  LEFT JOIN radon_measure rm ON ii.id = rm.item_id
  LEFT JOIN level_measure lm ON ii.id = lm.item_id
  WHERE ii.case_id IN (SELECT id FROM case_header WHERE household_id = $1)
  ORDER BY ii.created_at ASC
`;

function parseRows(rows) {
  const visual = [], thermal = [], air = [], radon = [], level = [];
  (rows || []).forEach((row) => {
    const base = {
      location: row.location,
      trade: row.trade,
      serial_no: row.serial_no,
      note: row.note,
      result: row.result,
      result_text: getResultText(row.result),
      created_at: row.created_at
    };
    switch (row.type) {
      case 'visual': {
        const vPhotos = (row.inspection_photos && Array.isArray(row.inspection_photos))
          ? row.inspection_photos : (row.inspection_photos ? [row.inspection_photos] : []);
        visual.push({ ...base, photos: vPhotos });
        break;
      }
      case 'thermal': {
        const tThermal = (row.thermal_photos && Array.isArray(row.thermal_photos))
          ? row.thermal_photos : (row.thermal_photos ? [row.thermal_photos] : []);
        const tInspection = (row.inspection_photos && Array.isArray(row.inspection_photos))
          ? row.inspection_photos : (row.inspection_photos ? [row.inspection_photos] : []);
        thermal.push({ ...base, photos: [...tInspection, ...tThermal] });
        break;
      }
      case 'air': {
        const aPhotos = (row.inspection_photos && Array.isArray(row.inspection_photos))
          ? row.inspection_photos : (row.inspection_photos ? [row.inspection_photos] : []);
        const processTypeLabel = row.process_type === 'flush_out' ? 'Flush-out' : row.process_type === 'bake_out' ? 'Bake-out' : '-';
        air.push({
          ...base,
          process_type: row.process_type,
          process_type_label: processTypeLabel,
          tvoc: row.tvoc,
          hcho: row.hcho,
          co2: row.co2,
          unit_tvoc: row.unit_tvoc,
          unit_hcho: row.unit_hcho,
          photos: aPhotos
        });
        break;
      }
      case 'radon': {
        const rPhotos = (row.inspection_photos && Array.isArray(row.inspection_photos))
          ? row.inspection_photos : (row.inspection_photos ? [row.inspection_photos] : []);
        radon.push({ ...base, radon: row.radon, unit: row.unit_radon, photos: rPhotos });
        break;
      }
      case 'level': {
        const refMm = row.reference_mm != null ? row.reference_mm : 150;
        const has4 = row.point1_left_mm != null || row.point1_right_mm != null || row.point2_left_mm != null || row.point2_right_mm != null ||
          row.point3_left_mm != null || row.point3_right_mm != null || row.point4_left_mm != null || row.point4_right_mm != null;
        const lPhotos = (row.inspection_photos && Array.isArray(row.inspection_photos))
          ? row.inspection_photos : (row.inspection_photos ? [row.inspection_photos] : []);
        level.push({
          ...base,
          left_mm: row.left_mm,
          right_mm: row.right_mm,
          point1_left_mm: row.point1_left_mm,
          point1_right_mm: row.point1_right_mm,
          point2_left_mm: row.point2_left_mm,
          point2_right_mm: row.point2_right_mm,
          point3_left_mm: row.point3_left_mm,
          point3_right_mm: row.point3_right_mm,
          point4_left_mm: row.point4_left_mm,
          point4_right_mm: row.point4_right_mm,
          reference_mm: row.reference_mm,
          level_reference_mm: refMm,
          level_summary_text: has4
            ? `1번 좌${row.point1_left_mm ?? '-'}/우${row.point1_right_mm ?? '-'} 2번 좌${row.point2_left_mm ?? '-'}/우${row.point2_right_mm ?? '-'} 3번 좌${row.point3_left_mm ?? '-'}/우${row.point3_right_mm ?? '-'} 4번 좌${row.point4_left_mm ?? '-'}/우${row.point4_right_mm ?? '-'} (기준 ${refMm}mm)`
            : `좌 ${row.left_mm ?? '-'}mm / 우 ${row.right_mm ?? '-'}mm`,
          photos: lPhotos
        });
        break;
      }
      default:
        break;
    }
  });
  return { visual, thermal, air, radon, level };
}

async function run() {
  console.log(`세대 조회: ${COMPLEX_NAME} ${DONG}동 ${HO}호`);
  const hRes = await pool.query(
    `SELECT h.id FROM household h
     JOIN complex c ON h.complex_id = c.id
     WHERE LOWER(TRIM(c.name)) LIKE $1 AND h.dong = $2 AND h.ho = $3`,
    [`%${COMPLEX_NAME.replace(/\s/g, '%')}%`, DONG, HO]
  );
  if (!hRes.rows.length) {
    console.error('해당 세대를 찾을 수 없습니다. complex 이름·동·호를 확인하세요.');
    process.exit(1);
  }
  const householdId = hRes.rows[0].id;
  console.log('household_id:', householdId);

  const result = await pool.query(INSPECTION_QUERY, [householdId]);
  const data = parseRows(result.rows);
  const counts = {
    육안: (data.visual || []).length,
    열화상: (data.thermal || []).length,
    공기질: (data.air || []).length,
    라돈: (data.radon || []).length,
    레벨기: (data.level || []).length
  };
  console.log('점검 건수:', counts);

  const zipBuffer = await buildInspectionExportZip(data, DONG, HO);
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const filename = `점검결과_${DONG}동_${HO}호_${timestamp}.zip`;
  const outPath = path.join(reportsDir, filename);
  fs.writeFileSync(outPath, zipBuffer);
  console.log('생성 완료:', outPath);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
