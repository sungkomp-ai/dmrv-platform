# dMRV Platform Download

## 📦 dMRV-Platform.zip

Ready-to-deploy zip file for GitHub repository.

### File Size
**542 KB** (200 files, excluding node_modules, .next, db, and build artifacts)

### How to Use

1. Download `dMRV-Platform.zip`
2. Extract to your project directory
3. Run `bun install` to install dependencies
4. Copy `.env.example` to `.env` and configure
5. Run `bun run db:push` to initialize database
6. Run `bun run dev` to start development server

### What's Included
- ✅ All source code (Next.js 16 + TypeScript)
- ✅ Prisma schema (20+ models)
- ✅ 26 API route handlers
- ✅ 25+ dMRV view components
- ✅ 3 mini-service simulators (Pyrolysis, LiDAR, AWD)
- ✅ shadcn/ui components
- ✅ .env.example template
- ✅ .gitignore (GitHub-ready)
- ✅ README.md with full documentation

### What's Excluded
- ❌ node_modules/ (install via `bun install`)
- ❌ .next/ build artifacts
- ❌ Database files (auto-created via `bun run db:push`)
- ❌ Sandbox-specific files (Caddyfile, scripts)
- ❌ Screenshots & logs
