# BE-1.1: Project Setup & Database — Implementation Guide

**Task:** Initialize backend project (Node.js/Express), set up PostgreSQL, create migration system, apply schema  
**Estimated:** 1 day  
**Owner:** Backend Lead  
**Status:** Ready to Start

---

## Checklist

- [ ] **1. Project Initialization (30 min)**
  - [ ] Create `.env` from `.env.example`
  - [ ] Install dependencies: `npm install`
  - [ ] Verify Node.js 18+ (`node --version`)

- [ ] **2. Database Connection (1 hour)**
  - [ ] Configure PostgreSQL connection string in `.env`
  - [ ] Test connection: `psql $DATABASE_URL`
  - [ ] Update `backend/src/db/index.js` with connection pool settings

- [ ] **3. Migration System (1 hour)**
  - [ ] Update `backend/src/db/migrate.js` to:
    - Read and execute SQL migrations from `backend/src/db/schema.sql`
    - Track migration version in DB (optional, for v2)
    - Log execution results
  - [ ] Run migration: `npm run migrate`
  - [ ] Verify all 12 tables created: `psql $DATABASE_URL -c "\dt"`

- [ ] **4. Seed Data (1 hour)**
  - [ ] Create `backend/src/db/seed.js` to:
    - Create test users (test@example.com / Password123!)
    - Create OAuth provider credentials (placeholders for Google/Microsoft)
    - Create test phone records (optional at this stage)
  - [ ] Run seed: `npm run seed`
  - [ ] Verify data: `psql $DATABASE_URL -c "SELECT * FROM app_users LIMIT 1;"`

- [ ] **5. Test Connectivity (30 min)**
  - [ ] Start server: `npm run dev`
  - [ ] Verify server listens on port 3000: `curl http://localhost:3000/health`
  - [ ] Check logs for errors (should be clean)

---

## Key Files to Check/Update

### `.env` Configuration
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/phone_list

# Redis (for token blacklist & caching)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email Service (Phase 1.2)
SENDGRID_API_KEY=your-sendgrid-key

# OAuth (Phase 1.7, 1.8)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx

# API
API_PORT=3000
NODE_ENV=development
```

### `backend/src/db/index.js` (Connection Pool)
```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
```

### `backend/src/db/migrate.js` (Migration Runner)
```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  try {
    console.log('Running migrations...');
    await pool.query(schema);
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
```

### `backend/src/db/seed.js` (Seed Data)
```javascript
import bcrypt from 'bcryptjs';
import pool from './index.js';

async function seed() {
  try {
    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    await pool.query(
      'INSERT INTO app_users (email, password_hash, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      ['test@example.com', hashedPassword, 'active']
    );

    // Create OAuth provider credentials (placeholder)
    await pool.query(
      'INSERT INTO oauth_providers (provider, client_id, client_secret) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      ['google', 'google-client-id', 'google-client-secret']
    );
    await pool.query(
      'INSERT INTO oauth_providers (provider, client_id, client_secret) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      ['microsoft', 'microsoft-client-id', 'microsoft-client-secret']
    );

    console.log('✅ Seed data inserted successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
```

### `package.json` Scripts
```json
{
  "scripts": {
    "dev": "node --experimental-modules --input-type=module <(echo 'import ./src/server.js') 2>/dev/null || nodemon --exec node --experimental-modules src/server.js",
    "start": "node src/server.js",
    "migrate": "node src/db/migrate.js",
    "seed": "node src/db/seed.js",
    "migrate:seed": "npm run migrate && npm run seed",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

---

## Testing the Setup

### 1. Database Connection
```bash
# Connect to database and check tables
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

# Should list: app_users, phones, phone_owners, phone_sources, contact_attempts, etc.
```

### 2. Test User Login (after BE-1.5)
```bash
# Signup
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","display_name":"Test User"}'

# Signin
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# Response should include JWT token
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` (PostgreSQL) | DB not running | Start: `brew services start postgresql` or `docker run -d postgres` |
| `Error: column "..." does not exist` | Schema not migrated | Run: `npm run migrate` |
| `FATAL: role "user" does not exist` | PostgreSQL user not created | Create: `createuser phone_list` |
| `JWT token undefined` | `.env` missing JWT_SECRET | Add to `.env`: `JWT_SECRET=your-key` |
| `nodemon: command not found` | devDependencies not installed | Run: `npm install` |

---

## Acceptance Criteria

✅ Database contains all 12 tables (verified via psql)  
✅ Indexes and constraints in place (schema.sql applied cleanly)  
✅ Migrations run without errors  
✅ Test user created (test@example.com with hashed password)  
✅ Server starts and listens on port 3000  
✅ Health check endpoint responds (curl http://localhost:3000/health)  
✅ No console errors on startup

---

## Next Task

After completing BE-1.1:
- **BE-1.3:** JWT & Session Management (tokens, refresh logic)
- **BE-1.4:** Password Security & Account Lockout (bcrypt, rate limits)

