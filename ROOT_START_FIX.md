# Root-start fix (v1.0.2)

You can now start the backend directly from the project root:

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

No `cd backend` is required.

The backend configuration also loads `.env` explicitly from:

```text
backend/.env
```

So Forex configuration remains in one stable location regardless of the current working directory.

Convenience launchers are also included:

- `start-backend.ps1`
- `start-backend.bat`
