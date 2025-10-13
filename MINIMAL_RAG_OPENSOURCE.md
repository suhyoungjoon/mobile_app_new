# 🆓 비용 없는 오픈소스 RAG 구현 (최소 버전)

## 🎯 목표
- **$0 추가 비용**
- **오픈소스만 사용**
- **1주일 안에 구현**
- **기존 인프라 활용**

---

## 🏗️ 아키텍처 (100% 무료)

```
┌─────────────────────────────────────────┐
│  사진 업로드 + 하자 정보                 │
│  (위치: 거실, 공종: 벽지)                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  PostgreSQL 키워드 검색 (무료!)         │
│  SELECT * FROM defect_judgments         │
│  WHERE location = '거실'                │
│    AND trade = '벽지'                   │
│    AND verified = true                  │
│  LIMIT 3                                │
└─────────────────────────────────────────┘
              ↓
        유사 사례 3건
              ↓
┌─────────────────────────────────────────┐
│  LocalDetector (TensorFlow)             │
│  + 유사 사례 정보                        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  신뢰도 보정                             │
│  유사 사례 일치? +10%                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  CloudDetector (GPT-4o)                 │
│  + 유사 사례 3건 텍스트                 │
└─────────────────────────────────────────┘
```

**사용 기술:**
- ✅ PostgreSQL (기존 사용 중) - $0
- ✅ 키워드 검색 (SQL LIKE, ILIKE) - $0
- ✅ 없음 (벡터 임베딩 X, 외부 API X)

---

## 📋 DB 스키마 (최소 버전)

```sql
-- 1. defect_judgments 테이블 생성
CREATE TABLE defect_judgments (
  id SERIAL PRIMARY KEY,
  defect_id INTEGER REFERENCES defects(id),
  
  -- AI 판정
  ai_defect_type VARCHAR(100),          -- AI가 판정한 유형
  ai_severity VARCHAR(50),              -- 심각도
  ai_confidence DECIMAL(5,2),           -- 신뢰도 (0-100)
  ai_description TEXT,                  -- 설명
  
  -- 로컬 AI 예측 (참고용)
  local_prediction JSONB,               -- {type, confidence}
  
  -- 관리자 검증
  verified BOOLEAN DEFAULT FALSE,       -- 검증 여부
  verified_defect_type VARCHAR(100),    -- 실제 유형
  verified_severity VARCHAR(50),        -- 실제 심각도
  verification_notes TEXT,              -- 검증 메모
  verified_at TIMESTAMP,
  verified_by INTEGER,
  
  -- 메타
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 인덱스 (검색 성능 향상)
CREATE INDEX idx_defect_judgments_defect_id 
  ON defect_judgments(defect_id);

CREATE INDEX idx_defect_judgments_verified 
  ON defect_judgments(verified) 
  WHERE verified = true;

CREATE INDEX idx_defect_judgments_created_at 
  ON defect_judgments(created_at DESC);

-- 3. defects 테이블에 인덱스 추가 (빠른 검색)
CREATE INDEX idx_defects_location 
  ON defects(location);

CREATE INDEX idx_defects_trade 
  ON defects(trade);

CREATE INDEX idx_defects_content_gin 
  ON defects USING gin(to_tsvector('korean', content));
```

---

## 💻 Backend 구현 (100% 무료)

### 1. Simple RAG Service

```javascript
// backend/services/simple-rag.js
const db = require('../database');

class SimpleRAG {
  /**
   * 키워드 기반 유사 사례 검색 (무료!)
   */
  async findSimilarCases(defect) {
    const { location, trade, content } = defect;
    
    // 우선순위 점수 계산 SQL
    const query = `
      SELECT 
        d.id,
        d.location,
        d.trade,
        d.content,
        dj.verified_defect_type,
        dj.verified_severity,
        dj.ai_confidence,
        dj.ai_description,
        dj.verified_at,
        dp.url as photo_url,
        
        -- 유사도 점수 (간단한 키워드 매칭)
        (
          CASE WHEN d.location = $1 THEN 40 ELSE 0 END +
          CASE WHEN d.trade = $2 THEN 40 ELSE 0 END +
          CASE 
            WHEN $3 IS NOT NULL AND $3 != '' 
              AND d.content ILIKE '%' || $3 || '%' 
            THEN 20 
            ELSE 0 
          END
        ) as similarity_score,
        
        -- 신뢰도 점수
        dj.ai_confidence as confidence_score
        
      FROM defects d
      INNER JOIN defect_judgments dj ON d.id = dj.defect_id
      LEFT JOIN defect_photos dp ON d.id = dp.defect_id 
        AND dp.kind = 'near'
      
      WHERE 
        dj.verified = true
        AND dj.created_at > NOW() - INTERVAL '2 years'
        AND (
          d.location = $1 
          OR d.trade = $2 
          OR (
            $3 IS NOT NULL 
            AND $3 != '' 
            AND d.content ILIKE '%' || $3 || '%'
          )
        )
      
      ORDER BY 
        similarity_score DESC,
        confidence_score DESC,
        dj.verified_at DESC
      
      LIMIT 5
    `;
    
    const result = await db.query(query, [
      location || '',
      trade || '',
      content || ''
    ]);
    
    return result.rows.map(row => ({
      id: row.id,
      location: row.location,
      trade: row.trade,
      content: row.content,
      defect_type: row.verified_defect_type,
      severity: row.verified_severity,
      confidence: row.ai_confidence,
      description: row.ai_description,
      photo_url: row.photo_url,
      similarity_score: row.similarity_score,
      verified_at: row.verified_at
    }));
  }
  
  /**
   * 판정 결과 저장
   */
  async saveJudgment(judgmentData) {
    const {
      defect_id,
      ai_defect_type,
      ai_severity,
      ai_confidence,
      ai_description,
      local_prediction
    } = judgmentData;
    
    const query = `
      INSERT INTO defect_judgments (
        defect_id,
        ai_defect_type,
        ai_severity,
        ai_confidence,
        ai_description,
        local_prediction
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      defect_id,
      ai_defect_type,
      ai_severity,
      ai_confidence,
      ai_description,
      local_prediction ? JSON.stringify(local_prediction) : null
    ]);
    
    return result.rows[0];
  }
  
  /**
   * 관리자 검증
   */
  async verifyJudgment(judgmentId, verificationData) {
    const {
      verified_defect_type,
      verified_severity,
      verification_notes,
      verified_by
    } = verificationData;
    
    const query = `
      UPDATE defect_judgments
      SET 
        verified = true,
        verified_defect_type = $1,
        verified_severity = $2,
        verification_notes = $3,
        verified_at = NOW(),
        verified_by = $4
      WHERE id = $5
      RETURNING *
    `;
    
    const result = await db.query(query, [
      verified_defect_type,
      verified_severity,
      verification_notes,
      verified_by,
      judgmentId
    ]);
    
    return result.rows[0];
  }
  
  /**
   * 통계 조회
   */
  async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_judgments,
        COUNT(*) FILTER (WHERE verified = true) as verified_count,
        AVG(ai_confidence) FILTER (WHERE verified = true) as avg_confidence,
        COUNT(DISTINCT defect_id) as defect_count
      FROM defect_judgments
      WHERE created_at > NOW() - INTERVAL '30 days'
    `;
    
    const result = await db.query(query);
    return result.rows[0];
  }
}

module.exports = new SimpleRAG();
```

### 2. API Routes

```javascript
// backend/routes/rag.js
const express = require('express');
const router = express.Router();
const simpleRAG = require('../services/simple-rag');
const { authenticateToken } = require('../middleware/auth');

/**
 * 유사 사례 검색
 */
router.post('/similar-cases', authenticateToken, async (req, res) => {
  try {
    const { location, trade, content } = req.body;
    
    const similarCases = await simpleRAG.findSimilarCases({
      location,
      trade,
      content
    });
    
    res.json({
      success: true,
      count: similarCases.length,
      cases: similarCases
    });
  } catch (error) {
    console.error('유사 사례 검색 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 판정 결과 저장
 */
router.post('/save-judgment', authenticateToken, async (req, res) => {
  try {
    const judgment = await simpleRAG.saveJudgment(req.body);
    
    res.json({
      success: true,
      judgment
    });
  } catch (error) {
    console.error('판정 저장 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 관리자 검증
 */
router.post('/verify/:judgmentId', authenticateToken, async (req, res) => {
  try {
    const { judgmentId } = req.params;
    
    const verified = await simpleRAG.verifyJudgment(
      judgmentId,
      req.body
    );
    
    res.json({
      success: true,
      judgment: verified
    });
  } catch (error) {
    console.error('검증 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * RAG 통계
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await simpleRAG.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

### 3. Server.js에 라우트 추가

```javascript
// backend/server.js (추가)
const ragRoutes = require('./routes/rag');

// ... 기존 코드 ...

app.use('/api/rag', ragRoutes);
```

---

## 🌐 Frontend 구현

### 1. API Client 확장

```javascript
// webapp/js/api.js (추가)

class APIClient {
  // ... 기존 코드 ...
  
  // 🆕 유사 사례 검색
  async findSimilarDefects(defectInfo) {
    return await this.request('/api/rag/similar-cases', {
      method: 'POST',
      body: JSON.stringify(defectInfo)
    });
  }
  
  // 🆕 판정 결과 저장
  async saveJudgment(judgmentData) {
    return await this.request('/api/rag/save-judgment', {
      method: 'POST',
      body: JSON.stringify(judgmentData)
    });
  }
  
  // 🆕 관리자 검증
  async verifyJudgment(judgmentId, verificationData) {
    return await this.request(`/api/rag/verify/${judgmentId}`, {
      method: 'POST',
      body: JSON.stringify(verificationData)
    });
  }
  
  // 🆕 RAG 통계
  async getRAGStats() {
    return await this.request('/api/rag/stats');
  }
}
```

### 2. HybridDetector 수정 (RAG 통합)

```javascript
// webapp/js/ai/hybrid-detector.js (수정)

class HybridDetector {
  // ... 기존 코드 ...
  
  /**
   * 🆕 RAG 통합 분석
   */
  async analyze(imageFile, defectInfo = {}) {
    const overallStartTime = performance.now();
    
    debugLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    debugLog('🔍 Hybrid AI + RAG 분석 시작');
    debugLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      // 🆕 Step 0: RAG 유사 사례 검색
      let similarCases = [];
      if (defectInfo.location || defectInfo.trade) {
        debugLog('📚 Step 0: 유사 사례 검색...');
        
        try {
          const ragResult = await api.findSimilarDefects({
            location: defectInfo.location,
            trade: defectInfo.trade,
            content: defectInfo.content
          });
          
          similarCases = ragResult.cases || [];
          
          if (similarCases.length > 0) {
            debugLog(`✅ ${similarCases.length}건의 유사 사례 발견`);
            similarCases.forEach((c, i) => {
              debugLog(`   ${i+1}. ${c.defect_type} (유사도: ${c.similarity_score}점, 신뢰도: ${c.confidence}%)`);
            });
          } else {
            debugLog('ℹ️  유사 사례 없음 (신규 케이스)');
          }
        } catch (error) {
          debugWarn('⚠️ RAG 검색 실패 (무시하고 계속):', error);
        }
      }
      
      // Step 1: 로컬 AI 분석
      debugLog('📱 Step 1: 로컬 AI 분석...');
      const localResult = await this.localDetector.analyze(imageFile);
      
      debugLog(`✅ 로컬 분석: ${localResult.defectType} (${(localResult.confidence * 100).toFixed(1)}%)`);
      
      // 🆕 Step 2: 유사 사례 기반 신뢰도 보정
      let adjustedConfidence = localResult.confidence;
      let ragBoost = false;
      
      if (similarCases.length > 0) {
        const matchingSimilar = similarCases.find(
          c => c.defect_type === localResult.defectType
        );
        
        if (matchingSimilar) {
          // 유사 사례 일치 시 신뢰도 +10%
          const boost = 0.10;
          adjustedConfidence = Math.min(1.0, localResult.confidence + boost);
          ragBoost = true;
          
          debugLog(`🎯 유사 사례 일치! 신뢰도 보정: ${(localResult.confidence * 100).toFixed(1)}% → ${(adjustedConfidence * 100).toFixed(1)}%`);
        }
      }
      
      // Step 3: 신뢰도 체크
      if (adjustedConfidence >= this.confidenceThreshold) {
        debugLog('✅ 신뢰도 충분! 로컬 결과 사용');
        debugLog(`💰 비용 절감: $0.0025`);
        
        this.stats.totalAnalyses++;
        this.stats.localOnly++;
        this.stats.savedCost += 0.0025;
        this.saveStats();
        
        const totalTime = performance.now() - overallStartTime;
        
        return {
          ...localResult,
          confidence: adjustedConfidence,
          similarCases: similarCases,
          ragBoost: ragBoost,
          totalProcessingTime: Math.round(totalTime),
          cost: 0
        };
      }
      
      // Step 4: 클라우드 AI 분석 (유사 사례 포함)
      debugLog('⚠️ 신뢰도 부족 → Cloud AI + RAG');
      debugLog('☁️  Step 2: Cloud AI 분석...');
      
      const cloudResult = await this.cloudDetector.analyze(
        imageFile,
        localResult,
        similarCases
      );
      
      debugLog(`✅ Cloud 분석: ${cloudResult.defectType}`);
      debugLog(`💰 비용: $0.0025`);
      
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
      debugError('❌ Hybrid + RAG 분석 실패:', error);
      throw error;
    }
  }
}
```

### 3. CloudDetector 프롬프트 수정

```javascript
// webapp/js/ai/cloud-detector.js (수정)

class CloudDetector extends BaseDetector {
  // ... 기존 코드 ...
  
  preparePrompt(localResult, similarCases = []) {
    let prompt = this.promptTemplate
      .replace('{localPrediction}', localResult?.defectType || '없음')
      .replace('{localConfidence}', localResult?.confidence.toFixed(2) || '0');
    
    // 🆕 유사 사례 추가
    if (similarCases && similarCases.length > 0) {
      prompt += `\n\n**과거 검증된 유사 사례 (참고용):**\n`;
      
      similarCases.forEach((c, i) => {
        prompt += `${i+1}. ${c.defect_type} (심각도: ${c.severity})\n`;
        prompt += `   - 위치: ${c.location}, 공종: ${c.trade}\n`;
        prompt += `   - 신뢰도: ${c.confidence}%, 유사도: ${c.similarity_score}점\n`;
        if (c.description) {
          prompt += `   - 설명: ${c.description.substring(0, 100)}...\n`;
        }
      });
      
      prompt += `\n위 사례들을 참고하되, 현재 이미지를 독립적으로 정확히 분석하세요.`;
    }
    
    return prompt;
  }
  
  async analyze(imageFile, localResult = null, similarCases = []) {
    const startTime = performance.now();
    
    if (!this.isLoaded) {
      await this.loadModel();
    }
    
    try {
      const base64Image = await this.fileToBase64(imageFile);
      const prompt = this.preparePrompt(localResult, similarCases);
      
      let result;
      if (this.provider === 'gpt4o') {
        result = await this.analyzeWithGPT4o(base64Image, prompt);
      } else if (this.provider === 'gemini') {
        result = await this.analyzeWithGemini(base64Image, prompt);
      } else if (this.provider === 'claude') {
        result = await this.analyzeWithClaude(base64Image, prompt);
      }
      
      const processingTime = performance.now() - startTime;
      
      return {
        ...result,
        source: `cloud-${this.provider}`,
        processingTime: Math.round(processingTime),
        localPrediction: localResult,
        similarCasesUsed: similarCases.length
      };
      
    } catch (error) {
      debugError(`❌ ${this.name} 분석 실패:`, error);
      throw error;
    }
  }
}
```

---

## 📊 관리자 검증 UI (간단 버전)

```javascript
// webapp/js/admin.js (추가)

// 하자 목록에 AI 판정 표시
async function loadDefectsWithJudgments() {
  const defects = await api.getDefects();
  
  const container = document.getElementById('defects-container');
  
  container.innerHTML = defects.map(defect => `
    <div class="defect-card">
      <h3>${defect.location} - ${defect.trade}</h3>
      <p>${defect.content}</p>
      
      ${defect.ai_judgment ? `
        <div class="ai-judgment">
          <strong>AI 판정:</strong> ${defect.ai_judgment.ai_defect_type} 
          (신뢰도: ${defect.ai_judgment.ai_confidence}%)
          
          ${!defect.ai_judgment.verified ? `
            <button onclick="showVerifyModal(${defect.id}, ${defect.ai_judgment.id})">
              검증하기
            </button>
          ` : `
            <span class="verified">✅ 검증 완료</span>
          `}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// 검증 모달
function showVerifyModal(defectId, judgmentId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>AI 판정 검증</h2>
      
      <label>실제 하자 유형:</label>
      <select id="verify-type">
        <option value="벽지찢김">벽지찢김</option>
        <option value="벽균열">벽균열</option>
        <option value="마루판들뜸">마루판들뜸</option>
        <!-- ... 기타 옵션 ... -->
      </select>
      
      <label>실제 심각도:</label>
      <select id="verify-severity">
        <option value="경미">경미</option>
        <option value="보통">보통</option>
        <option value="심각">심각</option>
      </select>
      
      <label>메모:</label>
      <textarea id="verify-notes"></textarea>
      
      <button onclick="submitVerification(${judgmentId})">확인</button>
      <button onclick="closeModal()">취소</button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// 검증 제출
async function submitVerification(judgmentId) {
  const verified_defect_type = document.getElementById('verify-type').value;
  const verified_severity = document.getElementById('verify-severity').value;
  const verification_notes = document.getElementById('verify-notes').value;
  
  await api.verifyJudgment(judgmentId, {
    verified_defect_type,
    verified_severity,
    verification_notes,
    verified_by: AppState.session.userId
  });
  
  toast('검증 완료! RAG 데이터로 추가되었습니다.', 'success');
  closeModal();
  loadDefectsWithJudgments();
}
```

---

## 🎯 구현 순서 (1주일)

### Day 1: DB 준비
```bash
# 1. DB 스키마 생성
psql $DATABASE_URL < backend/scripts/create-rag-tables.sql

# 2. 샘플 데이터 입력 (테스트용)
# - 기존 하자 5-10건에 대해 수동으로 judgment 데이터 입력
# - verified = true로 설정
```

### Day 2-3: Backend 구현
- [ ] `backend/services/simple-rag.js` 생성
- [ ] `backend/routes/rag.js` 생성
- [ ] `server.js`에 라우트 추가
- [ ] API 테스트 (Postman/curl)

### Day 4-5: Frontend 통합
- [ ] `api.js`에 RAG API 추가
- [ ] `HybridDetector` 수정
- [ ] `CloudDetector` 프롬프트 수정
- [ ] UI 테스트

### Day 6-7: 검증 시스템 & 테스트
- [ ] 관리자 검증 UI
- [ ] 통합 테스트
- [ ] 정확도 측정
- [ ] 튜닝 (유사도 가중치 조정)

---

## 💰 비용 분석

| 항목 | 비용 |
|------|------|
| PostgreSQL | $0 (기존 Render 사용) |
| 키워드 검색 | $0 (SQL 쿼리) |
| 벡터 임베딩 | $0 (사용 안 함) |
| 외부 API | $0 (사용 안 함) |
| **총 비용** | **$0** |

---

## 📈 예상 효과

### 시나리오

**현재 (RAG 없음):**
- 로컬 AI 정확도: 70%
- 클라우드 호출: 20%
- 오판률: 30%

**RAG 적용 후 (1개월):**
- 로컬 AI 정확도: 75% (+5%p)
- 클라우드 호출: 18% (-2%p)
- 오판률: 25% (-5%p)
- 검증 데이터: 500건

**RAG 적용 후 (6개월):**
- 로컬 AI 정확도: 85% (+15%p)
- 클라우드 호출: 15% (-5%p)
- 오판률: 15% (-15%p)
- 검증 데이터: 3,000건

---

## 🔧 추가 최적화 (선택 사항)

### 1. 전문 검색 (PostgreSQL Full-Text Search)

```sql
-- 한국어 형태소 분석 (선택)
CREATE INDEX idx_defects_content_fts 
  ON defects 
  USING gin(to_tsvector('korean', content));

-- 검색 쿼리
SELECT * FROM defects
WHERE to_tsvector('korean', content) @@ to_tsquery('korean', '벽지 & 찢김');
```

### 2. 캐싱 (Redis 없이 메모리 캐시)

```javascript
// 간단한 메모리 캐시
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5분

async function findSimilarCasesWithCache(defect) {
  const cacheKey = `${defect.location}-${defect.trade}`;
  
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  }
  
  const result = await simpleRAG.findSimilarCases(defect);
  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  
  return result;
}
```

---

## ✅ 체크리스트

- [ ] DB 테이블 생성
- [ ] 샘플 데이터 입력
- [ ] Backend RAG 서비스
- [ ] API 엔드포인트
- [ ] Frontend API 클라이언트
- [ ] HybridDetector 통합
- [ ] CloudDetector 프롬프트
- [ ] 관리자 검증 UI
- [ ] 테스트 & 튜닝

---

## 🎉 결론

**100% 무료 오픈소스 RAG!**

- ✅ PostgreSQL만 사용
- ✅ 키워드 검색 (충분히 효과적)
- ✅ 추가 비용 $0
- ✅ 1주일 구현
- ✅ 기존 시스템과 완벽 통합

**나중에 업그레이드 가능:**
- Option 2: pgvector (벡터 검색) - 월 ~$5
- Option 3: Pinecone (관리형) - 월 $70

**하지만 현재 버전만으로도 충분히 효과적!**

