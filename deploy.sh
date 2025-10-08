#!/bin/bash

# 🚀 무료 배포 스크립트
echo "🚀 인싸이트아이 앱 무료 배포 시작..."

# 1. Git 상태 확인
echo "📋 Git 상태 확인..."
git status

# 2. 변경사항 커밋
echo "💾 변경사항 커밋..."
git add .
git commit -m "feat: 무료 배포 설정 추가 (Vercel + Render)"

# 3. GitHub 푸시
echo "📤 GitHub 푸시..."
git push origin main

echo "✅ 배포 준비 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. Vercel.com에서 프로젝트 연결"
echo "2. Render.com에서 백엔드 서비스 생성"
echo "3. Render.com에서 PostgreSQL 데이터베이스 생성"
echo "4. 환경 변수 설정"
echo "5. DEPLOYMENT_GUIDE.md 참조하여 배포 완료"
echo ""
echo "🔗 배포 가이드: DEPLOYMENT_GUIDE.md"
