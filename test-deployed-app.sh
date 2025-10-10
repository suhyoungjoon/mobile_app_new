#!/bin/bash

echo "🧪 배포된 앱 기능 테스트 시작"
echo "=================================="
echo ""

# API Base URL
API_URL="https://insighti-backend.onrender.com/api"

# 1. Health Check
echo "1️⃣ Health Check"
curl -s https://insighti-backend.onrender.com/health | jq .
echo ""

# 2. 로그인 테스트
echo "2️⃣ 로그인 테스트"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/session" \
  -H "Content-Type: application/json" \
  -d '{
    "complex": "서울 인싸이트자이",
    "dong": "101",
    "ho": "1203",
    "name": "홍길동",
    "phone": "010-1234-5678"
  }')

echo "$LOGIN_RESPONSE" | jq .
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r .token)
echo "✅ 토큰 발급: ${TOKEN:0:50}..."
echo ""

# 3. 케이스 조회
echo "3️⃣ 케이스 조회"
curl -s -X GET "$API_URL/cases" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

# 4. 새 케이스 생성
echo "4️⃣ 새 케이스 생성"
NEW_CASE=$(curl -s -X POST "$API_URL/cases" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "하자접수"
  }')
echo "$NEW_CASE" | jq .
CASE_ID=$(echo "$NEW_CASE" | jq -r .id)
echo "✅ 케이스 ID: $CASE_ID"
echo ""

# 5. 하자 등록
echo "5️⃣ 하자 등록"
curl -s -X POST "$API_URL/defects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"case_id\": \"$CASE_ID\",
    \"location\": \"거실\",
    \"trade\": \"마루\",
    \"content\": \"마루판 들뜸 발견\",
    \"memo\": \"테스트 하자 항목\"
  }" | jq .
echo ""

# 6. 보고서 미리보기
echo "6️⃣ 보고서 미리보기"
REPORT=$(curl -s -X GET "$API_URL/reports/preview" \
  -H "Authorization: Bearer $TOKEN")
echo "$REPORT" | jq '.defects_count, .case_id'
echo ""

echo "=================================="
echo "✅ 모든 테스트 완료!"
echo ""
echo "📱 프론트엔드 테스트:"
echo "https://insightiprecheckmockupv1-qeaedv2yv-suh-young-joons-projects.vercel.app"
echo ""
echo "🔑 테스트 로그인 정보:"
echo "  아파트: 서울 인싸이트자이"
echo "  동: 101"
echo "  호: 1203"
echo "  성명: 홍길동"
echo "  전화번호: 010-1234-5678"

