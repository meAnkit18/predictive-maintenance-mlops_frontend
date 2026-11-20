# ForgeSense — Predictive Maintenance Dashboard

A lightweight React dashboard for the FastAPI predictive-maintenance inference API.

## Features

- API health monitoring (checks every 30 seconds)
- Machine type selector (L, M, H)
- Six model inputs matching the backend request schema
- Live prediction and failure-probability display
- Current-session prediction history
- Responsive dark industrial dashboard

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_API_BASE_URL` to the API origin, for example:

```env
VITE_API_BASE_URL=http://16.178.24.87:8000
```

## Deploy to Vercel

1. Import this GitHub repository in Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add `VITE_API_BASE_URL` in Project Settings → Environment Variables for Production, Preview, and Development.
6. Deploy. Pushes to `main` will automatically create Vercel deployments.

The repository includes `vercel.json` with an SPA rewrite.

## Backend contract

This dashboard uses the backend API contract:

- `GET /health`
- `GET /docs`
- `POST /predict`

Prediction request:

```json
{
  "machine_type": "M",
  "air_temperature": 298.1,
  "process_temperature": 308.6,
  "rotational_speed": 1551,
  "torque": 42.8,
  "tool_wear": 108
}
```

Expected response:

```json
{
  "machine_failure": 0,
  "prediction": "No failure detected",
  "failure_probability": 0.12
}
```

## Important backend configuration

The API must allow browser requests from the deployed Vercel origin using CORS. Add FastAPI `CORSMiddleware` with the Vercel production domain and preview domains you intend to use. The EC2 security group must allow inbound TCP 8000 from the internet or, preferably, from a restricted network path appropriate to your deployment.

The current API origin is configured as a fallback for demonstration. Override it with `VITE_API_BASE_URL` when deploying to a different API host.
