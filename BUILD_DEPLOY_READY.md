# v1.0.11 Build / Deploy Readiness

## Frontend build
```powershell
npm install
npm run build
```

## Backend local
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Render backend
- Root Directory: `backend`
- Python: `3.12.11`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment: `FOREX_DATA_PROVIDER=twelvedata`, `TWELVE_DATA_API_KEY=<secret>`, `PYTHON_VERSION=3.12.11`

## Vercel frontend
- Framework: Vite
- Root Directory: project root
- Environment: `VITE_API_BASE_URL=https://<render-service>.onrender.com`
- Optional: `VITE_WS_BASE_URL=wss://<render-service>.onrender.com`

The API client normalizes the backend origin and appends `/api/v1` exactly once.
