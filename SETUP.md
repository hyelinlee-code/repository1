# 🚀 설정 가이드

plan.md의 2번, 3번 단계가 완료되었습니다!

## ✅ 완료된 작업

### 1. 패키지 설치
- `@supabase/supabase-js` - Supabase 클라이언트
- `@supabase/ssr` - Next.js SSR 지원

### 2. Supabase 클라이언트 설정
- `lib/supabase/client.js` - 클라이언트 컴포넌트용
- `lib/supabase/server.js` - 서버 컴포넌트/Server Actions용
- `lib/supabase/middleware.js` - 미들웨어용

### 3. 인증 시스템
- `app/api/auth/callback/route.js` - OAuth 콜백 핸들러
- `app/api/auth/signout/route.js` - 로그아웃 핸들러
- `components/AuthButton.js` - 로그인/로그아웃 버튼
- `middleware.js` - 세션 관리 및 보호 라우트

### 4. 페이지 구조
- `/` - 랜딩 페이지 (로그인 유도)
- `/dashboard` - 사용자 문서 목록
- `/documents/new` - 새 문서 작성
- `/documents/[id]` - 문서 상세/편집
- `/auth/auth-code-error` - 인증 오류 페이지

### 5. UI 컴포넌트
- `components/Navbar.js` - 네비게이션 바
- `app/layout.js` - 루트 레이아웃 (Navbar 포함)

## 🔧 다음 설정 단계

### 1. 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase 프로젝트 설정

1. **Supabase 프로젝트 생성**
   - https://supabase.com 에서 새 프로젝트 생성
   - Project URL과 anon/public key를 `.env.local`에 복사

2. **GitHub OAuth 설정**
   - Supabase Dashboard → Authentication → Providers → GitHub
   - GitHub에서 OAuth App 생성:
     - Settings → Developer settings → OAuth Apps → New OAuth App
     - Homepage URL: `http://localhost:3000`
     - Authorization callback URL: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - Client ID와 Client Secret을 Supabase에 입력

3. **Site URL 설정**
   - Supabase Dashboard → Authentication → URL Configuration
   - Site URL: `http://localhost:3000` (개발), `https://your-domain.com` (배포)
   - Redirect URLs에 추가:
     - `http://localhost:3000/api/auth/callback`
     - `https://your-domain.com/api/auth/callback`

### 3. 개발 서버 실행

```bash
npm run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

## 📋 다음 개발 단계

현재 **단계 2와 3이 완료**되었습니다. 다음 단계:

### 단계 4: 문서 CRUD
- `documents` 테이블 생성 (Supabase)
- RLS(Row Level Security) 정책 설정
- 문서 작성/조회/수정/삭제 기능 구현

### 단계 5: Blocknote 통합
- `@blocknote/core`, `@blocknote/react` 패키지 설치
- 에디터 컴포넌트 구현
- JSON 저장 및 렌더링

## 🎨 현재 구조

```
webapp/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── callback/route.js
│   │       └── signout/route.js
│   ├── auth/
│   │   └── auth-code-error/page.js
│   ├── dashboard/
│   │   └── page.js
│   ├── documents/
│   │   ├── new/page.js
│   │   └── [id]/page.js
│   ├── layout.js
│   ├── page.js
│   └── globals.css
├── components/
│   ├── AuthButton.js
│   └── Navbar.js
├── lib/
│   └── supabase/
│       ├── client.js
│       ├── server.js
│       └── middleware.js
├── middleware.js
├── .env.local (생성 필요)
└── package.json
```

## 🧪 테스트 시나리오

1. ✅ 홈페이지(`/`) 접속 → 랜딩 페이지 표시
2. ✅ "GitHub 로그인" 클릭 → Supabase Auth 페이지로 리다이렉트
3. ✅ GitHub 인증 완료 → `/dashboard`로 리다이렉트
4. ✅ 로그인 상태에서 `/` 접속 → `/dashboard`로 자동 리다이렉트
5. ⏳ 문서 작성/조회 (단계 4에서 구현 예정)

## 💡 팁

- 개발 중에는 Supabase Dashboard의 Authentication 탭에서 실시간으로 사용자 세션을 확인할 수 있습니다.
- 브라우저 개발자 도구의 Application → Cookies에서 Supabase 인증 쿠키를 확인할 수 있습니다.
- 로그인 문제가 있다면 콘솔에서 에러 메시지를 확인하세요.

