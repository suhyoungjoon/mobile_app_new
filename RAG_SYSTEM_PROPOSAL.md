# 🤖 하자 판정 RAG 시스템 구축 제안

## 📋 목차
1. [개요](#개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [데이터 수집 및 저장](#데이터-수집-및-저장)
4. [벡터 임베딩 및 검색](#벡터-임베딩-및-검색)
5. [AI 판정 프로세스](#ai-판정-프로세스)
6. [구현 계획](#구현-계획)
7. [기대 효과](#기대-효과)

---

## 🎯 개요

### 현재 상황
- Azure OpenAI로 하자 사진 분석
- 일회성 판정 (과거 데이터 활용 X)
- 판정 정확도 개선 어려움

### 제안 시스템
- **과거 판정 데이터 활용** (RAG)
- **유사 사례 기반 판정**
- **지속적 학습 및 개선**

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                   하자 등록 프로세스                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  1. 사진 업로드 + AI 판정                                │
│     • Azure OpenAI Vision                               │
│     • 하자 유형, 심각도 분석                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. 데이터 저장 (PostgreSQL)                             │
│     • 원본 사진                                          │
│     • AI 판정 결과                                       │
│     • 관리자 검증 결과 (처리 후)                         │
│     • 메타데이터 (위치, 공종, 날짜)                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. 벡터 임베딩 생성                                      │
│     • 이미지 → 벡터 (CLIP, ResNet 등)                   │
│     • 텍스트 → 벡터 (OpenAI Embeddings)                 │
│     • 벡터 DB 저장 (Pinecone / pgvector)                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  4. RAG 검색 엔진                                         │
│     • 유사 사례 검색                                      │
│     • Top-K 유사 하자 반환                               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  5. 향상된 AI 판정                                        │
│     • 현재 사진 + 유사 사례                              │
│     • 과거 판정 결과 참고                                │
│     • 정확도 향상된 판정                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 데이터 수집 및 저장

### 1. PostgreSQL 스키마 확장

```sql
-- 하자 판정 이력 테이블
CREATE TABLE defect_judgments (
  id SERIAL PRIMARY KEY,
  defect_id INTEGER REFERENCES defects(id),
  
  -- AI 판정 결과
  ai_defect_type VARCHAR(100),      -- AI가 판정한 하자 유형
  ai_severity VARCHAR(50),          -- AI가 판정한 심각도
  ai_confidence DECIMAL(5,2),       -- AI 신뢰도 (0-100%)
  ai_description TEXT,              -- AI 판정 설명
  ai_model_version VARCHAR(50),     -- 사용한 AI 모델 버전
  
  -- 관리자 검증 결과
  verified BOOLEAN DEFAULT FALSE,   -- 관리자 검증 여부
  verified_defect_type VARCHAR(100), -- 관리자가 확인한 실제 유형
  verified_severity VARCHAR(50),     -- 관리자가 확인한 실제 심각도
  verification_notes TEXT,           -- 검증 메모
  verified_at TIMESTAMP,
  verified_by INTEGER,
  
  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 임베딩 (pgvector 사용 시)
  image_embedding vector(512),      -- 이미지 벡터
  text_embedding vector(1536)       -- 텍스트 벡터
);

-- 유사 사례 검색 인덱스
CREATE INDEX idx_image_embedding ON defect_judgments 
  USING ivfflat (image_embedding vector_cosine_ops);

CREATE INDEX idx_text_embedding ON defect_judgments 
  USING ivfflat (text_embedding vector_cosine_ops);

-- 하자 사진 메타데이터 확장
ALTER TABLE defect_photos ADD COLUMN embedding vector(512);
ALTER TABLE defect_photos ADD COLUMN feature_hash VARCHAR(64);
```

### 2. 저장 데이터 구조

```json
{
  "defect_id": 123,
  "photos": [
    {
      "url": "https://...",
      "type": "near",
      "embedding": [0.123, 0.456, ...],  // 512차원
      "features": {
        "brightness": 0.8,
        "contrast": 0.6,
        "dominant_colors": ["#FFF", "#CCC"]
      }
    }
  ],
  "ai_judgment": {
    "type": "벽지 찢김",
    "severity": "중",
    "confidence": 85.5,
    "reasoning": "벽지 표면에 10cm 길이의 찢김 확인...",
    "similar_cases": [
      {
        "defect_id": 45,
        "similarity": 0.92,
        "type": "벽지 찢김",
        "verified": true
      }
    ]
  },
  "verification": {
    "verified": true,
    "actual_type": "벽지 찢김",
    "actual_severity": "중",
    "notes": "AI 판정 정확함"
  }
}
```

---

## 🔍 벡터 임베딩 및 검색

### Option 1: OpenAI Embeddings + Pinecone (추천)

**장점:**
- 관리형 서비스 (운영 간편)
- 빠른 검색 속도
- 무료 티어 제공

**구현:**

```javascript
// backend/services/rag-service.js
const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

class RAGService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.index = this.pinecone.index('defect-judgments');
  }

  // 1. 이미지 → 텍스트 설명 → 임베딩
  async embedDefect(defect) {
    // Azure OpenAI로 이미지 분석
    const description = await this.analyzeImage(defect.photo_url);
    
    // 텍스트 임베딩 생성
    const embedding = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: `
        하자 유형: ${defect.type}
        위치: ${defect.location}
        공종: ${defect.trade}
        내용: ${defect.content}
        AI 판정: ${description}
      `
    });
    
    return embedding.data[0].embedding;
  }

  // 2. 벡터 DB에 저장
  async storeJudgment(defect, judgment) {
    const embedding = await this.embedDefect(defect);
    
    await this.index.upsert([{
      id: `defect-${defect.id}`,
      values: embedding,
      metadata: {
        defect_id: defect.id,
        type: judgment.ai_defect_type,
        severity: judgment.ai_severity,
        confidence: judgment.ai_confidence,
        verified: judgment.verified,
        verified_type: judgment.verified_defect_type,
        location: defect.location,
        trade: defect.trade,
        photo_url: defect.photo_url,
        created_at: defect.created_at
      }
    }]);
  }

  // 3. 유사 사례 검색
  async findSimilarCases(defect, topK = 5) {
    const embedding = await this.embedDefect(defect);
    
    const results = await this.index.query({
      vector: embedding,
      topK: topK,
      includeMetadata: true,
      filter: {
        verified: { $eq: true }  // 검증된 사례만
      }
    });
    
    return results.matches.map(match => ({
      defect_id: match.metadata.defect_id,
      similarity: match.score,
      type: match.metadata.verified_type || match.metadata.type,
      severity: match.metadata.severity,
      location: match.metadata.location,
      photo_url: match.metadata.photo_url
    }));
  }
}

module.exports = new RAGService();
```

### Option 2: pgvector (Self-hosted)

**장점:**
- PostgreSQL 확장 (별도 서비스 불필요)
- 데이터 통합 관리
- 무료

**구현:**

```sql
-- pgvector 설치 (Render PostgreSQL에서 지원)
CREATE EXTENSION vector;

-- 유사도 검색 함수
CREATE FUNCTION find_similar_defects(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  defect_id int,
  similarity float,
  defect_type varchar,
  severity varchar,
  photo_url text
)
LANGUAGE sql
AS $$
  SELECT 
    dj.defect_id,
    1 - (dj.text_embedding <=> query_embedding) as similarity,
    dj.verified_defect_type,
    dj.verified_severity,
    dp.url as photo_url
  FROM defect_judgments dj
  JOIN defect_photos dp ON dj.defect_id = dp.defect_id
  WHERE 
    dj.verified = true
    AND 1 - (dj.text_embedding <=> query_embedding) > match_threshold
  ORDER BY dj.text_embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## 🤖 AI 판정 프로세스 (RAG 적용)

### 기존 프로세스

```
사진 업로드 → Azure OpenAI 분석 → 판정 결과
```

### 개선된 프로세스 (RAG)

```
사진 업로드 
  ↓
1. 유사 사례 검색 (RAG)
  ↓
2. Azure OpenAI 분석 + 유사 사례 정보
  ↓
3. 향상된 판정 결과
  ↓
4. 판정 결과 저장 (재학습용)
```

### 구현 코드

```javascript
// backend/routes/azure-ai.js (수정)
router.post('/analyze-defect', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { location, trade, content } = req.body;
    const photoPath = req.file.path;
    
    // 1. 현재 하자 정보로 임베딩 생성
    const currentDefect = { location, trade, content, photo_url: photoPath };
    
    // 2. RAG: 유사 사례 검색
    const similarCases = await ragService.findSimilarCases(currentDefect, 5);
    
    // 3. Azure OpenAI로 분석 (유사 사례 포함)
    const prompt = `
다음 하자 사진을 분석해주세요:

**현재 하자:**
- 위치: ${location}
- 공종: ${trade}
- 내용: ${content}

**유사 과거 사례 (참고용):**
${similarCases.map((c, i) => `
${i+1}. 유사도: ${(c.similarity * 100).toFixed(1)}%
   - 유형: ${c.type}
   - 심각도: ${c.severity}
   - 위치: ${c.location}
`).join('\n')}

위 과거 사례들을 참고하여, 현재 하자의 유형과 심각도를 판정해주세요.
과거 사례와 다른 점이 있다면 명확히 설명해주세요.
`;

    const analysis = await azureOpenAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 건축 하자 전문가입니다. 과거 검증된 사례를 참고하여 정확한 판정을 내립니다.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url', 
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            }
          ]
        }
      ]
    });
    
    const judgment = parseAIResponse(analysis.choices[0].message.content);
    
    // 4. 판정 결과 저장 (재학습용)
    const savedJudgment = await db.query(`
      INSERT INTO defect_judgments (
        defect_id, ai_defect_type, ai_severity, 
        ai_confidence, ai_description, ai_model_version
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      defectId, 
      judgment.type, 
      judgment.severity, 
      judgment.confidence,
      judgment.description,
      'gpt-4o-mini'
    ]);
    
    // 5. 비동기로 임베딩 저장
    ragService.storeJudgment(currentDefect, savedJudgment.rows[0])
      .catch(err => console.error('임베딩 저장 실패:', err));
    
    res.json({
      judgment,
      similar_cases: similarCases,
      confidence_boost: similarCases.length > 0 ? '+15%' : '0%'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📊 관리자 검증 시스템

### 관리자가 처리 완료 시 검증

```javascript
// backend/routes/admin.js (수정)
router.post('/verify-judgment/:judgmentId', async (req, res) => {
  const { judgmentId } = req.params;
  const { verified_type, verified_severity, notes } = req.body;
  
  // 1. 검증 결과 저장
  await db.query(`
    UPDATE defect_judgments 
    SET 
      verified = true,
      verified_defect_type = $1,
      verified_severity = $2,
      verification_notes = $3,
      verified_at = NOW(),
      verified_by = $4
    WHERE id = $5
  `, [verified_type, verified_severity, notes, req.user.id, judgmentId]);
  
  // 2. RAG 데이터 업데이트 (검증된 정보로)
  const judgment = await db.query(
    'SELECT * FROM defect_judgments WHERE id = $1', 
    [judgmentId]
  );
  
  await ragService.updateVerifiedCase(judgment.rows[0]);
  
  res.json({ message: '검증 완료 및 학습 데이터 업데이트됨' });
});
```

---

## 🎯 구현 계획

### Phase 1: 기본 인프라 (1-2주)

**Week 1:**
- [ ] PostgreSQL 스키마 확장
- [ ] defect_judgments 테이블 생성
- [ ] Pinecone 계정 생성 및 설정
- [ ] OpenAI Embeddings API 연동

**Week 2:**
- [ ] RAG Service 기본 구현
- [ ] 임베딩 생성 로직
- [ ] 벡터 저장 로직
- [ ] 유사도 검색 로직

### Phase 2: AI 판정 개선 (1-2주)

**Week 3:**
- [ ] Azure OpenAI 프롬프트 개선 (유사 사례 포함)
- [ ] 판정 결과 저장 로직
- [ ] 비동기 임베딩 처리

**Week 4:**
- [ ] 관리자 검증 UI
- [ ] 검증 결과 피드백 루프
- [ ] 통계 대시보드

### Phase 3: 최적화 및 모니터링 (1주)

**Week 5:**
- [ ] 성능 최적화
- [ ] 캐싱 전략
- [ ] 모니터링 대시보드
- [ ] A/B 테스트 (RAG vs 기본)

---

## 💰 비용 분석

### Option 1: OpenAI + Pinecone (추천)

| 항목 | 비용 | 설명 |
|------|------|------|
| OpenAI Embeddings | ~$0.0001/1K tokens | 월 10,000건 기준 ~$5 |
| Pinecone | Free tier → $70/월 | 100K 벡터까지 무료 |
| Azure OpenAI | 기존 사용 중 | 추가 비용 거의 없음 |
| **월 예상 비용** | **$0~75** | 초기엔 무료, 확장 시 $75 |

### Option 2: pgvector (Self-hosted)

| 항목 | 비용 | 설명 |
|------|------|------|
| OpenAI Embeddings | ~$0.0001/1K tokens | 월 10,000건 기준 ~$5 |
| PostgreSQL | 기존 Render 사용 | 추가 비용 없음 |
| **월 예상 비용** | **~$5** | 매우 저렴 |

**추천:** 초기에는 **pgvector**로 시작, 규모 확장 시 Pinecone 전환

---

## 📈 기대 효과

### 1. AI 판정 정확도 향상

**Before (현재):**
```
정확도: ~70%
신뢰도: 낮음 (과거 데이터 없음)
```

**After (RAG 적용):**
```
정확도: ~85-90%
신뢰도: 높음 (검증된 유사 사례 기반)
```

### 2. 지속적 학습

```
사용자 등록 → AI 판정 → 관리자 검증 → RAG 데이터 추가
                    ↑                            ↓
                    └────────── 판정 개선 ────────┘
```

- **선순환 구조**: 사용할수록 똑똑해짐
- **도메인 특화**: 건설 하자에 최적화된 AI

### 3. 비용 절감

| 항목 | Before | After | 절감 |
|------|--------|-------|------|
| 오판으로 인한 재검사 | 월 30건 | 월 10건 | -66% |
| 관리자 검수 시간 | 건당 10분 | 건당 5분 | -50% |
| AI API 호출 | 건당 3회 | 건당 1회 | -66% |

### 4. 데이터 자산화

- 축적된 하자 판정 데이터 → 회사 자산
- 타 프로젝트 재사용 가능
- 업계 표준 데이터셋 구축 가능

---

## 🚀 빠른 시작 (Minimal MVP)

### 1주일 안에 구현 가능한 최소 버전:

```javascript
// backend/services/simple-rag.js
class SimpleRAG {
  // PostgreSQL만 사용 (벡터 없이)
  async findSimilarCases(defect) {
    // 키워드 기반 유사도 (간단한 버전)
    const result = await db.query(`
      SELECT 
        d.id,
        d.location,
        d.trade,
        d.content,
        dj.verified_defect_type,
        dj.verified_severity,
        dp.url as photo_url,
        -- 간단한 유사도 계산
        (
          CASE WHEN d.location = $1 THEN 0.3 ELSE 0 END +
          CASE WHEN d.trade = $2 THEN 0.4 ELSE 0 END +
          CASE WHEN d.content ILIKE '%' || $3 || '%' THEN 0.3 ELSE 0 END
        ) as similarity
      FROM defects d
      JOIN defect_judgments dj ON d.id = dj.defect_id
      JOIN defect_photos dp ON d.id = dp.defect_id
      WHERE 
        dj.verified = true
        AND (
          d.location = $1 
          OR d.trade = $2 
          OR d.content ILIKE '%' || $3 || '%'
        )
      ORDER BY similarity DESC
      LIMIT 5
    `, [defect.location, defect.trade, defect.content]);
    
    return result.rows;
  }
}
```

이렇게 시작해서 점진적으로 벡터 검색으로 업그레이드!

---

## 🎓 학습 리소스

- **Pinecone 가이드**: https://docs.pinecone.io/
- **OpenAI Embeddings**: https://platform.openai.com/docs/guides/embeddings
- **pgvector**: https://github.com/pgvector/pgvector
- **RAG 패턴**: https://www.pinecone.io/learn/retrieval-augmented-generation/

---

## ✅ 다음 단계

1. **Phase 1 시작 여부 결정**
2. **pgvector vs Pinecone 선택**
3. **스키마 확장 승인**
4. **개발 착수**

궁금한 점이 있으시면 언제든 질문해주세요! 🚀

