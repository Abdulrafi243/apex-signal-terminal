from __future__ import annotations
import sqlite3, json
from pathlib import Path
from datetime import datetime, timezone

DB_PATH = Path(__file__).resolve().parents[2] / 'apex_signal.db'

class Storage:
    def __init__(self):
        self.db = DB_PATH
        self.init()

    def connect(self):
        con=sqlite3.connect(self.db)
        con.row_factory=sqlite3.Row
        return con

    def init(self):
        with self.connect() as c:
            c.executescript('''
            CREATE TABLE IF NOT EXISTS signals(
              id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL,
              symbol TEXT,timeframe TEXT,direction TEXT,grade TEXT,score INTEGER,
              state TEXT,entry_low REAL,entry_high REAL,stop_loss REAL,rr REAL,
              take_profits TEXT,setup TEXT,news_risk TEXT
            );
            CREATE TABLE IF NOT EXISTS trades(
              id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, closed_at TEXT,
              symbol TEXT,timeframe TEXT,direction TEXT,entry REAL,stop_loss REAL,
              exit_price REAL,pnl REAL DEFAULT 0,result TEXT DEFAULT 'OPEN',grade TEXT,
              score INTEGER,rr REAL,setup TEXT
            );
            CREATE TABLE IF NOT EXISTS notifications(
              id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL,
              kind TEXT,title TEXT,message TEXT,symbol TEXT,timeframe TEXT,
              severity TEXT DEFAULT 'INFO',read INTEGER DEFAULT 0
            );
            ''')

    def save_signal(self, s: dict) -> int:
        with self.connect() as c:
            cur=c.execute('''INSERT INTO signals(created_at,symbol,timeframe,direction,grade,score,state,entry_low,entry_high,stop_loss,rr,take_profits,setup,news_risk)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',(
                datetime.now(timezone.utc).isoformat(),s.get('symbol'),s.get('timeframe'),s.get('direction'),s.get('grade'),s.get('score'),s.get('state'),
                s.get('entry_low'),s.get('entry_high'),s.get('stop_loss'),s.get('rr'),json.dumps(s.get('take_profits',[])),json.dumps(s.get('setup',[])),s.get('news_risk')))
            return cur.lastrowid

    def save_signal_if_changed(self, s: dict, cooldown_seconds: int = 45) -> int | None:
        """Persist a signal only when it is materially new or the cooldown elapsed."""
        with self.connect() as c:
            row=c.execute('SELECT * FROM signals WHERE symbol=? AND timeframe=? ORDER BY id DESC LIMIT 1',
                          (s.get('symbol'),s.get('timeframe'))).fetchone()
        if row:
            d=dict(row)
            try:
                created=datetime.fromisoformat(d['created_at'])
                age=(datetime.now(timezone.utc)-created).total_seconds()
            except Exception:
                age=cooldown_seconds+1
            same=(d.get('direction')==s.get('direction') and d.get('state')==s.get('state') and
                  int(d.get('score') or 0)==int(s.get('score') or 0) and
                  abs(float(d.get('entry_low') or 0)-float(s.get('entry_low') or 0)) < 1e-9 and
                  abs(float(d.get('entry_high') or 0)-float(s.get('entry_high') or 0)) < 1e-9)
            if same and age < cooldown_seconds:
                return None
        return self.save_signal(s)

    def signals(self, limit=100):
        with self.connect() as c:
            rows=c.execute('SELECT * FROM signals ORDER BY id DESC LIMIT ?', (limit,)).fetchall()
        return [self._decode(dict(r), ('take_profits','setup')) for r in rows]

    def add_trade(self, t: dict) -> int:
        with self.connect() as c:
            cur=c.execute('''INSERT INTO trades(created_at,symbol,timeframe,direction,entry,stop_loss,exit_price,pnl,result,grade,score,rr,setup)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''',(
                datetime.now(timezone.utc).isoformat(),t['symbol'].upper(),t['timeframe'].upper(),t['direction'],t['entry'],t['stop_loss'],t.get('exit_price'),t.get('pnl',0),t.get('result','OPEN'),t.get('grade','B'),t.get('score',0),t.get('rr'),json.dumps(t.get('setup',[]))))
            return cur.lastrowid

    def close_trade(self, trade_id:int, exit_price:float, pnl:float, result:str):
        with self.connect() as c:
            c.execute('UPDATE trades SET closed_at=?,exit_price=?,pnl=?,result=? WHERE id=?',
                (datetime.now(timezone.utc).isoformat(),exit_price,pnl,result,trade_id))

    def trades(self, limit=200):
        with self.connect() as c:
            rows=c.execute('SELECT * FROM trades ORDER BY id DESC LIMIT ?', (limit,)).fetchall()
        return [self._decode(dict(r), ('setup',)) for r in rows]

    def notify(self, kind,title,message,symbol=None,timeframe=None,severity='INFO'):
        with self.connect() as c:
            cur=c.execute('INSERT INTO notifications(created_at,kind,title,message,symbol,timeframe,severity) VALUES(?,?,?,?,?,?,?)',
                (datetime.now(timezone.utc).isoformat(),kind,title,message,symbol,timeframe,severity))
            return cur.lastrowid


    def notify_once(self, kind,title,message,symbol=None,timeframe=None,severity='INFO',cooldown_seconds=900):
        now=datetime.now(timezone.utc)
        with self.connect() as c:
            row=c.execute('SELECT id,created_at,title FROM notifications WHERE kind=? AND symbol=? AND timeframe=? ORDER BY id DESC LIMIT 1',
                (kind,symbol,timeframe)).fetchone()
            if row:
                try:
                    age=(now-datetime.fromisoformat(row['created_at'])).total_seconds()
                    if age < cooldown_seconds and row['title']==title:
                        return None
                except Exception:
                    pass
            cur=c.execute('INSERT INTO notifications(created_at,kind,title,message,symbol,timeframe,severity) VALUES(?,?,?,?,?,?,?)',
                (now.isoformat(),kind,title,message,symbol,timeframe,severity))
            return cur.lastrowid

    def notifications(self, unread_only=False, limit=100):
        q='SELECT * FROM notifications' + (' WHERE read=0' if unread_only else '') + ' ORDER BY id DESC LIMIT ?'
        with self.connect() as c: rows=c.execute(q,(limit,)).fetchall()
        return [dict(r) for r in rows]

    def mark_read(self, notification_id:int):
        with self.connect() as c: c.execute('UPDATE notifications SET read=1 WHERE id=?',(notification_id,))

    def mark_all_read(self) -> int:
        with self.connect() as c:
            cur=c.execute('UPDATE notifications SET read=1 WHERE read=0')
            return cur.rowcount

    def summary(self):
        with self.connect() as c:
            signals=c.execute('SELECT COUNT(*) AS n, SUM(CASE WHEN grade="A+" THEN 1 ELSE 0 END) AS aplus FROM signals').fetchone()
            trades=c.execute('SELECT COUNT(*) AS n, SUM(CASE WHEN result!="OPEN" THEN 1 ELSE 0 END) AS closed, COALESCE(SUM(pnl),0) AS pnl, SUM(CASE WHEN pnl>0 AND result!="OPEN" THEN 1 ELSE 0 END) AS wins FROM trades').fetchone()
            unread=c.execute('SELECT COUNT(*) AS n FROM notifications WHERE read=0').fetchone()
        closed=int(trades['closed'] or 0); wins=int(trades['wins'] or 0)
        return {'signals':int(signals['n'] or 0),'a_plus_signals':int(signals['aplus'] or 0),'trades':int(trades['n'] or 0),'closed_trades':closed,'realized_pnl':float(trades['pnl'] or 0),'win_rate':round((wins/closed*100) if closed else 0,2),'unread_notifications':int(unread['n'] or 0)}

    @staticmethod
    def _decode(d, fields):
        for f in fields:
            try: d[f]=json.loads(d.get(f) or '[]')
            except Exception: d[f]=[]
        return d

storage=Storage()
