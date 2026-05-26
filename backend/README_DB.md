Postgres / Supabase integration
===============================

This project can optionally use a Postgres database (for example Supabase) as an alternative to MongoDB for vendor data.

Setup
1. Add `DATABASE_URL` to your `.env` (see `.env.example`). Use the following values:

   - Host: `db.ffrucgiawjvzawhexnel.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`

   Example:

   DATABASE_URL=postgresql://postgres:password@db.ffrucgiawjvzawhexnel.supabase.co:5432/postgres

   If the password contains special characters like `@`, use URL encoding:

   DATABASE_URL=postgresql://postgres:Yeunhattrendoi2208%40@db.ffrucgiawjvzawhexnel.supabase.co:5432/postgres

2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Run the SQL migration to create the `vendors` table (using `psql`, Supabase SQL editor, or the helper script):

```bash
# using psql
psql "$DATABASE_URL" -f db/migrations/001_create_vendors.sql
```

Or use the backend helper scripts:

```bash
cd backend
npm run check:pg    # kiểm tra kết nối Postgres
npm run migrate:pg  # chạy migration
npm run seed:pg     # seed dữ liệu vendors
npm run setup:pg    # chạy migration rồi seed tự động
```

What the code does
- `backend/config/pg.js` reads `DATABASE_URL` and exports a `pool` and `connectPg()` function.
- `backend/services/vendorService.js` will query Postgres when `pool` is available; otherwise it falls back to MongoDB or the local dataset.

Next steps
- If you'd like, I can add a small seed script to populate the `vendors` table from the existing local dataset.
