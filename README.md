## Notion-Style Editor – Environment Setup

This project is the front-end for a Notion-like editor built with Next.js 14 (App Router) and JavaScript. Step 1 of the implementation plan is complete: the base framework has been generated and environment placeholders for Supabase credentials are ready.

### Stack Snapshot
- `Next.js 14` with the App Router
- `React` / `React DOM`
- `Tailwind CSS` (scaffolded by the template; can be trimmed later if unnecessary)
- `ESLint`

### Prerequisites
- Node.js 18.17+ (recommend using nvm or Volta to match the development environment)
- npm (auto-configured by the scaffold)

### First-Time Setup
1. Install dependencies (already run during scaffolding, but safe to repeat):
   ```bash
   npm install
   ```
2. Copy `env.example` to `.env.local` and fill in your Supabase credentials:
   ```bash
   cp env.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (from Project Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon public API key
3. Configure the GitHub OAuth provider in Supabase:
   - Supabase Dashboard → Authentication → Providers → GitHub
   - Supply the Client ID/Secret from your GitHub OAuth App
   - Add callback URL: `http://localhost:3000/api/auth/callback`

### Running Locally
```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Next Steps (Plan Reference)
- Implement authentication helpers and protected routes
- Define the Supabase `documents` table and RLS policies
- Integrate the Blocknote editor for create/update flows
