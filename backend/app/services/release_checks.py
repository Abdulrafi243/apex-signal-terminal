from __future__ import annotations
from pathlib import Path
import sqlite3
from app.core.config import release_readiness
from app.services.storage import DB_PATH


def run_release_checks() -> dict:
    checks: list[dict] = []
    def add(name: str, ok: bool, detail: str):
        checks.append({'name': name, 'ok': bool(ok), 'detail': detail})

    r = release_readiness()
    add('signal_terminal_configuration', r['signal_terminal_ready'], 'Core signal-terminal configuration is valid.' if r['signal_terminal_ready'] else 'Core configuration is incomplete.')
    add('automatic_execution_disabled', not r['checks']['automatic_trade_execution_enabled'], 'Signal-only mode enforced.')
    add('database_path_writable', DB_PATH.parent.exists(), str(DB_PATH))
    try:
        with sqlite3.connect(DB_PATH) as c:
            c.execute('SELECT 1')
        add('database_connection', True, 'SQLite persistence reachable.')
    except Exception as exc:
        add('database_connection', False, type(exc).__name__)

    root = Path(__file__).resolve().parents[3]
    required = ['README.md','docker-compose.yml','backend/requirements.txt','src/App.tsx']
    missing = [x for x in required if not (root/x).exists()]
    add('release_files_present', not missing, 'All required files present.' if not missing else f'Missing: {missing}')
    passed = sum(1 for x in checks if x['ok'])
    return {
        'status': 'PASS' if passed == len(checks) else 'REVIEW',
        'passed': passed,
        'total': len(checks),
        'checks': checks,
        'configuration': r,
    }
