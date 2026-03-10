/**
 * file_url → 서버 내 절대 경로 (점검결과 내보내기 등에서 사진 파일 읽기용)
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

const UPLOADS_DIR = path.isAbsolute(config.upload.dir)
  ? config.upload.dir
  : path.join(__dirname, '..', config.upload.dir.replace(/^\.\//, ''));

function getPhotoPath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  let rel = String(fileUrl).trim();
  const urlMatch = rel.match(/^https?:\/\/[^/]+(\/uploads\/.+)$/i);
  if (urlMatch) rel = urlMatch[1];
  rel = rel.replace(/^\//, '');
  if (!rel || !rel.startsWith('uploads')) return null;
  const sub = rel.replace(/^uploads\/?/, '') || rel;
  let full = path.join(UPLOADS_DIR, sub);
  if (fs.existsSync(full)) return full;
  const baseName = path.basename(sub);
  if (baseName && baseName !== sub) {
    const alt = path.join(UPLOADS_DIR, baseName);
    if (fs.existsSync(alt)) return alt;
  }
  return null;
}

module.exports = { getPhotoPath, UPLOADS_DIR };
