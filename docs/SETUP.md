# SETUP AND DEPLOYMENT GUIDE
## SHREEJI HEALTHCARE — “A Unit of Shreeji 7”

---

## 1. Prerequisites
- **Node.js**: v18+ or v20+
- **PostgreSQL**: v14+ (Local or Supabase)
- **Container Engine**: Docker or Podman
- **Git**

---

## 2. Environment Variables (.env)
Copy `.env.example` to `backend/.env`:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shreeji_healthcare
JWT_SECRET=super-secret-shreeji-jwt-key-2026-production
MPIN_SALT_ROUNDS=10
CORS_ORIGIN=*
```

---

## 3. Database Initialization
Run PostgreSQL container or connect to an existing instance:
```bash
# Start local container
podman run -d --name shreeji-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shreeji_healthcare docker.io/library/postgres:15-alpine

# Execute migrations and seed data
psql postgresql://postgres:postgres@localhost:5432/shreeji_healthcare -f database/migrations/001_initial_schema.sql
psql postgresql://postgres:postgres@localhost:5432/shreeji_healthcare -f database/migrations/002_indexes_and_constraints.sql
psql postgresql://postgres:postgres@localhost:5432/shreeji_healthcare -f database/seeds/001_seed_data.sql
```

---

## 4. Backend Startup
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:4000/api/v1
```

---

## 5. Web Frontend Startup
```bash
cd frontend
npm install
npm run dev
# Web application runs on http://localhost:5173
```

---

## 6. Android Mobile Build
For Android APK:
```bash
# Using Flutter:
cd flutter_app
flutter pub get
flutter build apk --release

# Using Web / PWA / Capacitor:
cd frontend
npx cap add android
npx cap copy android
npx cap open android
```
