#!/bin/bash
# 개인정보 암호화 마이그레이션 실행 스크립트

echo "🔒 개인정보 암호화 마이그레이션 실행"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 환경변수 확인
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL 환경변수가 설정되지 않았습니다!"
  echo ""
  echo "Render PostgreSQL 연결 문자열을 설정하세요:"
  echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
  echo ""
  echo "또는 Render Dashboard에서 복사한 내부 데이터베이스 URL을 사용하세요."
  exit 1
fi

if [ -z "$ENCRYPTION_KEY" ]; then
  echo "❌ ENCRYPTION_KEY 환경변수가 설정되지 않았습니다!"
  echo ""
  echo "암호화 키를 생성하세요:"
  echo "  node scripts/generate-encryption-key.js"
  echo ""
  echo "그 다음 환경변수로 설정하세요:"
  echo "  export ENCRYPTION_KEY='<생성된_키>'"
  exit 1
fi

echo "✅ 환경변수 확인 완료"
echo ""

# 1단계: 스키마 업데이트 확인
echo "📋 1단계: 데이터베이스 스키마 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  스키마 업데이트는 수동으로 실행해야 합니다."
echo ""
echo "Render PostgreSQL Dashboard에서 다음 SQL을 실행하세요:"
echo ""
cat migrate-encrypt-personal-data.sql
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "스키마 업데이트를 완료했습니까? (y/n): " schema_done

if [ "$schema_done" != "y" ] && [ "$schema_done" != "Y" ]; then
  echo "❌ 스키마 업데이트를 먼저 완료해주세요."
  exit 1
fi

# 2단계: 데이터 마이그레이션
echo ""
echo "📋 2단계: 기존 데이터 암호화"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  이 작업은 기존 데이터를 암호화합니다."
echo "⚠️  데이터베이스 백업을 권장합니다."
echo ""
read -p "계속하시겠습니까? (y/n): " continue_migration

if [ "$continue_migration" != "y" ] && [ "$continue_migration" != "Y" ]; then
  echo "❌ 마이그레이션이 취소되었습니다."
  exit 0
fi

echo ""
echo "🚀 마이그레이션 시작..."
node migrate-encrypt-personal-data.js

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 마이그레이션 완료!"
else
  echo ""
  echo "❌ 마이그레이션 실패!"
  exit 1
fi

