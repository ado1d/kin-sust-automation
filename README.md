
## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database

Copy `.env.example` to `.env` and update the `DATABASE_URL`:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/kin_automation
```

### 3. Run Database migration

## Database setup
```
DATABASE_URL="postgresql://postgres.jecoitlypcktfgmawgkm:password@aws-1-ap-northeast-1.pooler.supabase.com:xxxx/postgres" npm run db:migrate

```
### 4. Start Development Server

```bash
npm run dev
```


## Architecture

- `src/lib/db.ts` - PostgreSQL connection pool and query helpers
- `src/lib/helpers.ts` - Shared helper functions for data enrichment
- `src/app/api/` - API routes using raw SQL queries
- `db/migrations/` - SQL migration files
- `scripts/migrate.js` - Migration runner

