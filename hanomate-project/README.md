# HanoMate Project

This is a standalone sample project for the HanoMate data orchestration pipeline.

## Structure

- `backend/`
  - `models/Vendor.js` — Mongoose schema for vendor data
  - `routes/vendorRoutes.js` — Express CRUD routes for vendors
  - `server.js` — backend server bootstrapping
  - `package.json` — backend dependencies

- `tools/data_pipeline/master_orchestrator.py` — sample orchestration pipeline combining ShopeeFood, VietMap, TikTok/Facebook risk monitoring.

## Run backend

1. Install dependencies:
   ```bash
   cd hanomate-project/backend
   npm install
   ```

2. Start server:
   ```bash
   node server.js
   ```

3. If you want a custom MongoDB URI, set `MONGODB_URI` before running.

## Run pipeline

1. Ensure Python environment has `requests` installed.
2. Run:
   ```bash
   python hanomate-project/tools/data_pipeline/master_orchestrator.py
   ```

Output will be saved under `hanomate-project/output/`.
