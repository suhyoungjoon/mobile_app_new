# 👨‍💼 관리자 계정 설정 가이드

## 📋 관리자 계정 정보

### 기본 관리자 계정
- **이메일**: `admin@insighti.com`
- **비밀번호**: `admin123`
- **역할**: `super_admin`

---

## 🔧 관리자 계정 생성 방법

### 방법 1: 스크립트 사용 (권장)

```bash
cd db
DATABASE_URL="postgresql://..." node create-admin.js
```

### 방법 2: Render PostgreSQL에서 직접 실행

1. **Render Dashboard → PostgreSQL → Query 탭**
2. **다음 SQL 실행**:

```sql
-- 관리자 계정 생성
INSERT INTO admin_user (email, password_hash, name, role, is_active)
VALUES (
  'admin@insighti.com',
  '$2a$10$rK8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X', -- bcrypt hash of 'admin123'
  'Super Admin',
  'super_admin',
  true
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    is_active = true;
```

**주의**: 비밀번호 해시는 `bcrypt.hash('admin123', 10)`로 생성해야 합니다.

---

## 🧪 테스트 전 확인

### 1. 관리자 계정 존재 확인
```sql
SELECT email, name, role, is_active 
FROM admin_user 
WHERE email = 'admin@insighti.com';
```

### 2. 관리자 로그인 테스트
```bash
curl -X POST https://mobile-app-new.onrender.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@insighti.com","password":"admin123"}'
```

---

## ✅ 관리자 계정 생성 후

1. **테스트 스크립트 실행**
2. **관리자 로그인 확인**
3. **대시보드 접근 확인**

---

## 🔒 보안 주의사항

### 프로덕션 환경
- ✅ 기본 비밀번호(`admin123`) 반드시 변경
- ✅ 강력한 비밀번호 사용
- ✅ 정기적인 비밀번호 변경

### 비밀번호 변경 방법
- 관리자 대시보드에서 변경 (구현 필요)
- 또는 데이터베이스에서 직접 변경

---

관리자 계정이 없으면 먼저 생성해야 합니다!

