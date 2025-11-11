# 데이터베이스 설정 가이드

## Supabase에서 documents 테이블 생성하기

`supabase/migrations/create_documents_table.sql` 파일의 내용을 Supabase SQL Editor에서 실행하세요.

### 방법 1: Supabase Dashboard 사용 (권장)

1. Supabase Dashboard 접속
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. **New query** 클릭
4. `supabase/migrations/create_documents_table.sql` 파일의 내용을 복사하여 붙여넣기
5. **Run** 버튼 클릭

### 방법 2: Supabase CLI 사용

```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
npm install -g supabase

# Supabase 프로젝트와 연결
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

## 테이블 구조

### documents 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 문서 고유 ID (Primary Key) |
| user_id | UUID | 작성자 ID (auth.users 참조) |
| title | TEXT | 문서 제목 |
| content | JSONB | 문서 내용 (Blocknote JSON) |
| created_at | TIMESTAMPTZ | 생성 시각 |
| updated_at | TIMESTAMPTZ | 수정 시각 (자동 업데이트) |

## Row Level Security (RLS) 정책

모든 정책은 `auth.uid() = user_id` 조건을 사용하여 사용자가 자신의 문서만 접근할 수 있도록 제한합니다:

- **SELECT**: 자신의 문서만 조회 가능
- **INSERT**: 자신의 문서만 생성 가능
- **UPDATE**: 자신의 문서만 수정 가능
- **DELETE**: 자신의 문서만 삭제 가능

## 확인 방법

SQL Editor에서 다음 쿼리로 테이블이 제대로 생성되었는지 확인:

```sql
SELECT * FROM documents;
```

처음에는 빈 테이블이 표시되어야 합니다.

