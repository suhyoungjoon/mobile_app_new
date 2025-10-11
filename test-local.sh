#!/bin/bash

echo "🚀 로컬 테스트 서버 시작"
echo ""
echo "1️⃣ 백엔드 API: http://localhost:3000"
echo "2️⃣ 프론트엔드: http://localhost:8888"
echo ""
echo "⚠️ 주의: 브라우저에서 http://localhost:8888 접속 시"
echo "   API URL이 자동으로 localhost:3000으로 설정됩니다"
echo ""

# 백엔드 먼저 시작
cd backend
echo "📡 백엔드 시작 중..."
npm start &
BACKEND_PID=$!

sleep 3

# 프론트엔드 시작
cd ../webapp
echo "🌐 프론트엔드 시작 중..."
python3 -m http.server 8888 &
FRONTEND_PID=$!

echo ""
echo "✅ 서버 시작 완료!"
echo ""
echo "🔗 접속: http://localhost:8888"
echo ""
echo "종료하려면 Ctrl+C를 누르세요"
echo ""

# Ctrl+C 처리
trap "echo ''; echo '🛑 서버 종료 중...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

wait
