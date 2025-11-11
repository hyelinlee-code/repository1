## 프로젝트 개요
- **목표**: Notion과 유사하게 문서를 작성·편집·삭제하고, Blocknote 에디터를 활용해 리치 텍스트 편집을 지원하는 웹 서비스 구축.
- **타깃 사용자**: GitHub 계정을 가진 개인/소규모 팀.
- **핵심 가치**: 빠른 로그인, 직관적인 문서 편집, Supabase를 통한 서버리스 백엔드.

## 기술 스택
- **프론트엔드**: `Next.js 14` (App Router, 서버 컴포넌트, Server Actions)
- **언어**: `JavaScript` (필요 시 TypeScript 도입 검토)
- **UI/편집기**: `Blocknote` WYSIWYG 에디터
- **백엔드/BaaS**: `Supabase` (PostgreSQL, Row Level Security, Edge Functions)
- **인증**: Supabase Auth with GitHub OAuth Provider
- **배포**: Vercel (프론트), Supabase 프로젝트 (DB/Auth/Storage)

## 핵심 기능 정의
- **GitHub 소셜 로그인**
  - Supabase Auth GitHub Provider 활성화
  - 로그인/로그아웃 UI, 세션 유지 및 보호된 페이지 가드
- **글 작성 페이지**
  - Blocknote 에디터 컴포넌트 통합
  - 제목 입력 필드, 태그(optional), 자동 저장(초기 버전엔 수동 저장)
  - Supabase `documents` 테이블에 insert (작성자 id 포함)
- **글 조회 페이지**
  - 공개 범위: 로그인 사용자에 한해 본인 문서 리스트/조회
  - 렌더링: Next.js Server Component로 데이터 패칭, Blocknote read-only 모드
  - 목록 페이지 + 상세 보기 페이지 (slug 또는 uuid)
- **글 수정/삭제 기능**
  - 문서 상세 화면에서 편집 모드 전환, Blocknote 내용 업데이트
  - Supabase update/delete RPC 혹은 Server Action 사용
  - 삭제 시 확인 모달, soft delete 컬럼 고려 여부 결정 (기본은 hard delete)

## 데이터 모델 (Supabase)

### documents 테이블
실제 스키마는 `supabase/migrations/create_documents_table.sql` 참조

**테이블 구조:**
- `id` (UUID, PRIMARY KEY) - 문서 고유 ID, 자동 생성
- `user_id` (UUID, NOT NULL) - 작성자 ID, `auth.users(id)` 참조, ON DELETE CASCADE
- `title` (TEXT, NOT NULL) - 문서 제목, 기본값: '제목 없음'
- `content` (JSONB, NOT NULL) - Blocknote document schema 저장, 기본값: '[]'
- `created_at` (TIMESTAMPTZ, NOT NULL) - 생성 시각, 자동 설정
- `updated_at` (TIMESTAMPTZ, NOT NULL) - 수정 시각, 자동 업데이트 (트리거)

**인덱스:**
- `documents_user_id_idx` - user_id 컬럼 인덱스 (빠른 조회)
- `documents_created_at_idx` - created_at 컬럼 인덱스 (정렬)

**RLS 정책:** (Row Level Security 활성화)
- `SELECT`: `auth.uid() = user_id` - 자신의 문서만 조회
- `INSERT`: `auth.uid() = user_id` - 자신의 문서만 생성
- `UPDATE`: `auth.uid() = user_id` - 자신의 문서만 수정
- `DELETE`: `auth.uid() = user_id` - 자신의 문서만 삭제

**트리거:**
- `update_documents_updated_at` - UPDATE 시 자동으로 updated_at 갱신

### 확장 고려사항
향후 추가 가능한 컬럼:
- `is_archived` (BOOLEAN) → 아카이브 기능
- `shared_with` (JSONB) → 공유 기능
- `tags` (TEXT[]) → 태그 분류
- `folder_id` (UUID) → 폴더 구조

## 페이지 구조 (Next.js App Router)
- `/` : 랜딩/로그인 유도. 세션 있으면 `/dashboard`로 리다이렉트.
- `/dashboard` : 사용자 문서 목록, 새 문서 버튼.
- `/documents/new` : 문서 작성 페이지.
- `/documents/[id]` : 문서 상세 + 편집/삭제 버튼.
- `/api/auth/callback` : Supabase auth helper 경로 설정 확인.

## 개발 단계
1. **환경 세팅**
   - Next.js 앱 생성 (`create-next-app`)
   - Supabase 프로젝트 생성 및 env 설정 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Supabase Auth GitHub Provider 등록 (client id/secret)
2. **UI/라우팅 뼈대**
   - 레이아웃, 네비게이션, 보호 라우트 로직 구성
   - 기본 페이지 (`/`, `/dashboard`, `/documents/new`, `/documents/[id]`) 생성
3. **인증 흐름**
   - Supabase client 설정, `@supabase/auth-helpers-nextjs` 도입
   - 로그인/로그아웃 버튼 및 세션 관리 구현
4. **문서 CRUD**
   - `documents` 테이블 및 RLS 정책 설정
   - 작성 페이지에서 insert, 상세 페이지에서 select/update/delete 구현
   - Server Actions 또는 Route Handlers를 통한 안전한 DB 호출
5. **Blocknote 통합**
   - 작성/수정 시 Blocknote 에디터 삽입
   - 저장 시 JSON schema 직렬화 → Supabase 저장
   - 조회 시 read-only 렌더링
6. **UX 개선**
   - 로딩/에러 상태 처리
   - form validation, 저장 성공/실패 피드백
   - 삭제 확인 모달, 작성/수정 시 Alert UI
7. **배포 및 점검**
   - Vercel에 배포, 환경 변수 설정
   - Supabase 정책, GitHub OAuth 리다이렉트 URI 검증
   - 기본 E2E 시나리오 테스트 (로그인→작성→조회→수정→삭제)

## 향후 확장 아이디어
- 문서 공유 및 협업 모드 (실시간 공동 편집)
- 문서 템플릿, 폴더/태그 정리 기능
- 검색/필터, 최근 수정 순 정렬
- 다중 플랫폼 대응 (모바일 편집 최적화)
- Supabase Storage를 이용한 이미지 업로드 지원

