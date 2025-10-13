# 🔄 현재 AI 판정 로직 + RAG 통합 제안

## 📊 현재 시스템 분석

### 현재 로직 플로우

```
┌─────────────────────────────────────────┐
│  1. 사진 업로드 (사용자)                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  2. HybridDetector.analyze()            │
│     ├─ LocalDetector (TensorFlow)      │
│     │   • 무료 모델                     │
│     │   • 빠른 분석 (브라우저)          │
│     │   • 신뢰도: 0.7~0.9              │
│     └─ 신뢰도 >= 0.80?                 │
│         ├─ YES → 로컬 결과 사용 ✅      │
│         └─ NO  → 3단계로                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  3. CloudDetector.analyze()             │
│     • Azure OpenAI GPT-4o Vision       │
│     • 유료 ($0.0025/건)                │
│     • 높은 정확도                       │
│     • 로컬 예측 참고                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  4. 최종 판정 결과                       │
│     • 하자 유형                          │
│     • 신뢰도                             │
│     • 심각도                             │
│     • 설명                               │
└─────────────────────────────────────────┘
```

### 현재 시스템 장점

✅ **비용 효율적**: 80% 케이스는 무료 (로컬 AI)
✅ **빠른 속도**: 로컬 분석 ~500ms
✅ **높은 정확도**: 클라우드 AI 보정
✅ **점진적 비용**: 필요할 때만 GPT-4o 사용

### 현재 시스템 한계

❌ **과거 데이터 미활용**: 매번 처음부터 판정
❌ **유사 사례 참고 불가**: 컨텍스트 부족
❌ **학습 불가**: 관리자 검증 결과 반영 안됨

---

## 🚀 RAG 통합 제안 (3단계 개선안)

### Option 1: **Minimal RAG** (1주 구현 가능) ⭐ 추천

```
┌─────────────────────────────────────────┐
│  1. 사진 업로드                          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  2. RAG: 키워드 기반 유사 사례 검색     │
│     • PostgreSQL 쿼리                   │
│     • 위치 + 공종 매칭                  │
│     • 검증된 사례만 (verified=true)     │
│     • Top-3 반환                        │
│     • 빠름 (~50ms)                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  3. LocalDetector (TensorFlow)          │
│     + 유사 사례 정보                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  신뢰도 >= 0.80?                        │
│  + 유사 사례 일치?                      │
└─────────────────────────────────────────┘
       ↓ YES          ↓ NO
    로컬 사용    CloudDetector + RAG
                      ↓
              ┌─────────────────┐
              │ GPT-4o Vision   │
              │ + 유사 3건 참고 │
              └─────────────────┘
```

**장점:**
- ✅ 빠른 구현 (1주)
- ✅ 추가 비용 거의 없음
- ✅ 기존 로직 최소 변경
- ✅ 즉시 효과

**구현 코드:**

```javascript
// backend/services/simple-rag.js
class SimpleRAG {
  async findSimilarCases(defect) {
    const result = await db.query(`
      SELECT 
        d.id,
        d.location,
        d.trade,
        d.content,
        dj.verified_defect_type as defect_type,
        dj.verified_severity as severity,
        dj.ai_confidence,
        dp.url as photo_url,
        -- 키워드 매칭 점수
        (
          CASE WHEN d.location = $1 THEN 0.4 ELSE 0 END +
          CASE WHEN d.trade = $2 THEN 0.4 ELSE 0 END +
          CASE WHEN d.content ILIKE '%' || $3 || '%' THEN 0.2 ELSE 0 END
        ) as similarity_score
      FROM defects d
      JOIN defect_judgments dj ON d.id = dj.defect_id
      LEFT JOIN defect_photos dp ON d.id = dp.defect_id AND dp.kind = 'near'
      WHERE 
        dj.verified = true
        AND dj.created_at > NOW() - INTERVAL '1 year'
        AND (
          d.location = $1 
          OR d.trade = $2 
          OR d.content ILIKE '%' || $3 || '%'
        )
      ORDER BY similarity_score DESC, dj.ai_confidence DESC
      LIMIT 3
    `, [defect.location, defect.trade, defect.content || '']);
    
    return result.rows;
  }
  
  // 판정 결과 저장
  async saveJudgment(defectId, aiResult, localResult, similarCases) {
    await db.query(`
      INSERT INTO defect_judgments (
        defect_id,
        ai_defect_type,
        ai_severity,
        ai_confidence,
        ai_description,
        local_prediction,
        similar_case_ids,
        ai_model_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      defectId,
      aiResult.defectType,
      aiResult.severity,
      aiResult.confidence,
      aiResult.description,
      localResult ? JSON.stringify(localResult) : null,
      similarCases.map(c => c.id),
      'hybrid-v1'
    ]);
  }
}

module.exports = new SimpleRAG();
```

**HybridDetector 수정:**

```javascript
// webapp/js/ai/hybrid-detector.js (수정)
async analyze(imageFile, defectInfo = {}) {
  const overallStartTime = performance.now();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 하이브리드 AI + RAG 분석 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 🆕 0단계: RAG - 유사 사례 검색
    let similarCases = [];
    if (defectInfo.location || defectInfo.trade) {
      console.log('📚 0단계: 유사 사례 검색...');
      similarCases = await api.findSimilarDefects({
        location: defectInfo.location,
        trade: defectInfo.trade,
        content: defectInfo.content
      });
      
      if (similarCases.length > 0) {
        console.log(`✅ ${similarCases.length}건의 유사 사례 발견`);
        similarCases.forEach((c, i) => {
          console.log(`   ${i+1}. ${c.defect_type} (신뢰도: ${c.ai_confidence}%, 위치: ${c.location})`);
        });
      } else {
        console.log('ℹ️  유사 사례 없음 (신규 케이스)');
      }
    }
    
    // 1단계: 로컬 AI 분석
    console.log('📱 1단계: 로컬 AI 분석...');
    const localResult = await this.localDetector.analyze(imageFile);
    
    console.log(`✅ 로컬 분석 완료: ${localResult.defectType} (신뢰도: ${(localResult.confidence * 100).toFixed(1)}%)`);
    
    // 🆕 유사 사례와 일치 확인
    const matchingSimilar = similarCases.find(
      c => c.defect_type === localResult.defectType
    );
    
    // 2단계: 신뢰도 체크 (+ 유사 사례 보정)
    let adjustedConfidence = localResult.confidence;
    
    if (matchingSimilar) {
      // 유사 사례가 일치하면 신뢰도 +10%
      adjustedConfidence = Math.min(1.0, localResult.confidence + 0.10);
      console.log(`🎯 유사 사례 일치! 신뢰도 보정: ${(localResult.confidence * 100).toFixed(1)}% → ${(adjustedConfidence * 100).toFixed(1)}%`);
    }
    
    if (adjustedConfidence >= this.confidenceThreshold) {
      console.log('✅ 신뢰도 충분! 로컬 결과 사용');
      console.log(`💰 비용 절감: $0.0025`);
      
      this.stats.totalAnalyses++;
      this.stats.localOnly++;
      this.stats.savedCost += 0.0025;
      this.saveStats();
      
      const totalTime = performance.now() - overallStartTime;
      
      return {
        ...localResult,
        confidence: adjustedConfidence,
        similarCases: similarCases,
        ragBoost: matchingSimilar ? true : false,
        totalProcessingTime: Math.round(totalTime),
        cost: 0
      };
    }
    
    // 3단계: 클라우드 AI 분석 (유사 사례 포함)
    console.log('⚠️ 신뢰도 부족 → 클라우드 AI + RAG');
    console.log('☁️  2단계: 클라우드 AI + 유사 사례 분석...');
    
    const cloudResult = await this.cloudDetector.analyze(
      imageFile, 
      localResult,
      similarCases  // 🆕 유사 사례 전달
    );
    
    console.log(`✅ 클라우드 분석 완료: ${cloudResult.defectType}`);
    console.log(`💰 비용: $0.0025 (${this.cloudDetector.provider})`);
    
    this.stats.totalAnalyses++;
    this.stats.cloudCalls++;
    this.stats.totalCost += 0.0025;
    this.saveStats();
    
    const totalTime = performance.now() - overallStartTime;
    
    return {
      ...cloudResult,
      similarCases: similarCases,
      totalProcessingTime: Math.round(totalTime),
      cost: 0.0025
    };
    
  } catch (error) {
    console.error('❌ 하이브리드 + RAG 분석 실패:', error);
    throw error;
  }
}
```

**CloudDetector 수정 (프롬프트에 유사 사례 추가):**

```javascript
// webapp/js/ai/cloud-detector.js (수정)
preparePrompt(localResult, similarCases = []) {
  let prompt = this.promptTemplate
    .replace('{localPrediction}', localResult?.defectType || '없음')
    .replace('{localConfidence}', localResult?.confidence.toFixed(2) || '0');
  
  // 🆕 유사 사례 추가
  if (similarCases && similarCases.length > 0) {
    prompt += `\n\n**과거 검증된 유사 사례 (참고용):**\n`;
    similarCases.forEach((c, i) => {
      prompt += `${i+1}. 유형: ${c.defect_type}, 심각도: ${c.severity}, 위치: ${c.location} (신뢰도: ${c.ai_confidence}%)\n`;
    });
    prompt += `\n위 사례들을 참고하되, 현재 이미지를 독립적으로 정확히 분석하세요.`;
  }
  
  return prompt;
}

async analyze(imageFile, localResult = null, similarCases = []) {
  // ... 기존 코드 ...
  
  const prompt = this.preparePrompt(localResult, similarCases);
  
  // ... 나머지 동일
}
```

---

### Option 2: **벡터 RAG** (2-3주 구현)

더 정확하지만 구현 복잡도 높음.

```
┌─────────────────────────────────────────┐
│  0. 임베딩 생성                          │
│     • 이미지 설명 → OpenAI Embeddings  │
│     • 벡터 DB 저장 (pgvector)          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  1. 벡터 유사도 검색                     │
│     • Cosine similarity                 │
│     • Top-5 유사 사례                   │
│     • 정확도 높음                        │
└─────────────────────────────────────────┘
              ↓
         (나머지 동일)
```

**장점:**
- ✅ 매우 높은 정확도
- ✅ 의미론적 유사도
- ✅ 확장성 좋음

**단점:**
- ❌ 구현 복잡
- ❌ OpenAI Embeddings 비용 (~$5/월)
- ❌ 시간 소요 (2-3주)

---

## 📋 DB 스키마 (Option 1용)

```sql
-- defect_judgments 테이블 생성
CREATE TABLE defect_judgments (
  id SERIAL PRIMARY KEY,
  defect_id INTEGER REFERENCES defects(id),
  
  -- AI 판정
  ai_defect_type VARCHAR(100),
  ai_severity VARCHAR(50),
  ai_confidence DECIMAL(5,2),
  ai_description TEXT,
  
  -- 로컬 AI 예측
  local_prediction JSONB,  -- {type, confidence, ...}
  
  -- RAG
  similar_case_ids INTEGER[],  -- 참고한 유사 사례 ID들
  
  -- 관리자 검증
  verified BOOLEAN DEFAULT FALSE,
  verified_defect_type VARCHAR(100),
  verified_severity VARCHAR(50),
  verification_notes TEXT,
  verified_at TIMESTAMP,
  verified_by INTEGER,
  
  -- 메타
  ai_model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_defect_judgments_defect_id ON defect_judgments(defect_id);
CREATE INDEX idx_defect_judgments_verified ON defect_judgments(verified);
CREATE INDEX idx_defect_judgments_created_at ON defect_judgments(created_at);
```

---

## 🎯 추천 구현 순서

### Week 1: Minimal RAG (Option 1)

**Day 1-2: DB 준비**
- [ ] defect_judgments 테이블 생성
- [ ] 기존 하자 데이터 마이그레이션
- [ ] 샘플 검증 데이터 입력 (테스트용)

**Day 3-4: Backend RAG**
- [ ] simple-rag.js 서비스 생성
- [ ] /api/similar-defects 엔드포인트
- [ ] /api/save-judgment 엔드포인트

**Day 5: Frontend 통합**
- [ ] HybridDetector에 RAG 통합
- [ ] CloudDetector 프롬프트 수정
- [ ] UI에 유사 사례 표시

**Day 6-7: 테스트 & 튜닝**
- [ ] 정확도 테스트
- [ ] 성능 측정
- [ ] 신뢰도 보정값 튜닝

### Week 2: 관리자 검증 시스템

**Day 8-9: 검증 UI**
- [ ] Admin 페이지에 AI 판정 확인 섹션
- [ ] 검증 폼 (실제 유형, 심각도, 메모)
- [ ] 검증 완료 버튼

**Day 10-11: 검증 로직**
- [ ] 검증 API 엔드포인트
- [ ] 검증 완료 시 RAG 데이터 업데이트
- [ ] 통계 대시보드

**Day 12-14: 모니터링**
- [ ] AI 정확도 추적 (AI vs 관리자)
- [ ] RAG 효과 측정
- [ ] 대시보드 구축

---

## 📊 기대 효과

### 시나리오 비교

**현재 시스템:**
```
100건 하자 등록
├─ 80건: 로컬 AI (무료, 70% 정확도)
└─ 20건: GPT-4o ($0.05)

오판: 30건 (재검사 필요)
비용: $0.05 + 재검사 비용
```

**RAG 적용 후:**
```
100건 하자 등록
├─ 0단계: RAG 검색 (무료, 50ms)
├─ 85건: 로컬 AI + RAG 보정 (무료, 85% 정확도)
└─ 15건: GPT-4o + RAG ($0.0375)

오판: 10건 (66% 감소)
비용: $0.0375 (25% 절감)
```

**개선율:**
- ✅ 로컬 AI 사용률: 80% → 85% (+5%p)
- ✅ 클라우드 비용: 25% 절감
- ✅ 오판률: 66% 감소
- ✅ 정확도: 70% → 85% (+15%p)

---

## 🔄 선순환 구조

```
사용자 하자 등록
      ↓
RAG 검색 + AI 판정 (정확도 향상)
      ↓
관리자 검증 (실제 하자 확인)
      ↓
검증 데이터 → RAG 추가
      ↓
다음 판정 정확도 더 향상 ✨
      ↓
(반복)
```

**1개월 후:**
- 검증 데이터: ~500건
- 로컬 AI 정확도: 85%
- 클라우드 호출: 15%

**6개월 후:**
- 검증 데이터: ~3,000건
- 로컬 AI 정확도: 90%
- 클라우드 호출: 10%

**1년 후:**
- 검증 데이터: ~6,000건
- 로컬 AI 정확도: 93%
- 클라우드 호출: 7%
- **회사 핵심 자산!**

---

## ✅ 다음 단계

1. **Option 1 (Minimal RAG) 승인** ← 추천
2. Week 1 시작 (DB 스키마 확장)
3. 점진적 구현
4. 2주 후 효과 측정
5. Option 2 검토 (필요시)

---

## 💡 핵심 포인트

✨ **기존 시스템 장점 유지**
- 로컬 AI 우선 (비용 효율)
- 클라우드 AI 보정 (정확도)

✨ **RAG로 강화**
- 과거 데이터 활용
- 신뢰도 보정
- 지속적 학습

✨ **최소 비용 추가**
- PostgreSQL만 사용
- OpenAI Embeddings 불필요 (Option 1)
- 기존 인프라 활용

