# 🚀 관리자 계정 빠른 생성 가이드

## ⚡ 빠른 생성 (Render PostgreSQL)

### 1. Render Dashboard 접속
- https://dashboard.render.com
- PostgreSQL 서비스 선택

### 2. Query 탭 클릭

### 3. 다음 SQL 실행

```sql
-- bcrypt 해시 생성이 필요하므로, 먼저 해시를 생성해야 합니다
-- 아래는 임시 해시입니다 (실제로는 스크립트로 생성 권장)

-- 방법 1: 스크립트로 해시 생성 후 사용
-- 방법 2: 아래 SQL로 직접 생성 (비밀번호: admin123)

-- 비밀번호 해시 생성 (bcrypt.hash('admin123', 10))
-- 실제 해시는 스크립트 실행으로 생성해야 합니다
```

### 4. 또는 스크립트 실행

로컬에서:
```bash
cd db
DATABASE_URL="postgresql://insighti_user:비밀번호@dpg-d3kardu3jp1c73b2dkrg-a.singapore-postgres.render.com/insighti_db_yckk" node create-admin.js
```

---

## 📋 관리자 계정 정보

- **이메일**: `admin@insighti.com`
- **비밀번호**: `admin123`
- **역할**: `super_admin`

---

## ✅ 계정 생성 확인

```sql
SELECT email, name, role, is_active 
FROM admin_user 
WHERE email = 'admin@insighti.com';
```

결과가 나오면 계정이 생성된 것입니다.

---

## 🧪 테스트 재실행

관리자 계정 생성 후:
```bash
cd backend
node scripts/test-feature-6-admin.js
```

