"""Durable SQLite records with a fresh connection per operation.

Single API process owns the experiment executor. WAL permits concurrent reads
while trial results are committed. No image bytes or private signing keys live here.
"""
import hashlib
import json
import sqlite3
import time
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from app.core.config import settings


def encode(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False)


class Repository:
    def __init__(self, path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('PRAGMA journal_mode=WAL')
            db.executescript('''
                CREATE TABLE IF NOT EXISTS simulations (id TEXT PRIMARY KEY, created REAL NOT NULL, payload TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS experiments (
                    id TEXT PRIMARY KEY, request TEXT NOT NULL, request_hash TEXT NOT NULL,
                    idempotency_key TEXT UNIQUE, status TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
                    cancel_requested INTEGER NOT NULL DEFAULT 0,
                    created REAL NOT NULL, updated REAL NOT NULL, error TEXT, result TEXT
                );
                CREATE TABLE IF NOT EXISTS experiment_trials (
                    experiment_id TEXT NOT NULL, trial_index INTEGER NOT NULL, payload TEXT NOT NULL,
                    PRIMARY KEY(experiment_id, trial_index),
                    FOREIGN KEY(experiment_id) REFERENCES experiments(id)
                );
            ''')

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.path, timeout=15)
        connection.row_factory = sqlite3.Row
        connection.execute('PRAGMA foreign_keys=ON')
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def save_state(self, state):
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO simulations VALUES (?, ?, ?)',
                       (state.simulation_id, state.timestamp, state.model_dump_json()))

    def get_state(self, identifier):
        with self.connect() as db:
            row = db.execute('SELECT payload FROM simulations WHERE id=?', (identifier,)).fetchone()
        return json.loads(row['payload']) if row else None

    def list_states(self, limit=30):
        with self.connect() as db:
            return [json.loads(r['payload']) for r in db.execute('SELECT payload FROM simulations ORDER BY created DESC, id DESC LIMIT ?', (limit,))]

    def create_experiment(self, request, total, idempotency_key=None):
        payload = encode(request)
        digest = hashlib.sha256(payload.encode()).hexdigest()
        now = time.time()
        with self.connect() as db:
            # Serialize capacity and idempotency checks with insertion.
            db.execute('BEGIN IMMEDIATE')
            if idempotency_key:
                row = db.execute('SELECT * FROM experiments WHERE idempotency_key=?', (idempotency_key,)).fetchone()
                if row:
                    if row['request_hash'] != digest:
                        raise ValueError('Idempotency key was already used with different parameters.')
                    return self.decode_job(row), False
            pending = db.execute("SELECT COUNT(*) FROM experiments WHERE status IN ('queued','running')").fetchone()[0]
            if pending >= 6:
                raise OverflowError('Experiment queue is full. Wait for a run or cancel one.')
            identifier = 'exp-' + uuid4().hex
            db.execute('INSERT INTO experiments(id,request,request_hash,idempotency_key,status,total,created,updated) VALUES (?,?,?,?,?,?,?,?)',
                       (identifier, payload, digest, idempotency_key, 'queued', total, now, now))
            row = db.execute('SELECT * FROM experiments WHERE id=?', (identifier,)).fetchone()
            return self.decode_job(row), True

    @staticmethod
    def decode_job(row):
        data = dict(row)
        data['request'] = json.loads(data['request'])
        data['result'] = json.loads(data['result']) if data['result'] else None
        data['cancel_requested'] = bool(data['cancel_requested'])
        data.pop('idempotency_key', None)
        return data

    def get_job(self, identifier):
        with self.connect() as db:
            row = db.execute('SELECT * FROM experiments WHERE id=?', (identifier,)).fetchone()
        return self.decode_job(row) if row else None

    def list_jobs(self, limit=30):
        with self.connect() as db:
            return [self.decode_job(row) for row in db.execute('SELECT * FROM experiments ORDER BY created DESC, id DESC LIMIT ?', (limit,))]

    def start_job(self, identifier):
        with self.connect() as db:
            return db.execute("UPDATE experiments SET status='running',updated=? WHERE id=? AND status='queued' AND cancel_requested=0", (time.time(), identifier)).rowcount == 1

    def record_trial(self, identifier, trial_index, observation, state):
        with self.connect() as db:
            db.execute('INSERT INTO experiment_trials VALUES (?,?,?)', (identifier, trial_index, encode(observation)))
            db.execute('INSERT OR REPLACE INTO simulations VALUES (?,?,?)', (state.simulation_id, state.timestamp, state.model_dump_json()))
            db.execute('UPDATE experiments SET completed=completed+1,updated=? WHERE id=?', (time.time(), identifier))

    def trials(self, identifier):
        with self.connect() as db:
            return [json.loads(row['payload']) for row in db.execute('SELECT payload FROM experiment_trials WHERE experiment_id=? ORDER BY trial_index', (identifier,))]

    def finish_job(self, identifier, status, result=None, error=None):
        with self.connect() as db:
            db.execute('UPDATE experiments SET status=?,result=?,error=?,updated=? WHERE id=?',
                       (status, encode(result) if result is not None else None, error, time.time(), identifier))

    def request_cancel(self, identifier):
        with self.connect() as db:
            db.execute("UPDATE experiments SET cancel_requested=1,status=CASE WHEN status='queued' THEN 'cancelled' ELSE status END,updated=? WHERE id=? AND status IN ('queued','running')", (time.time(), identifier))
        return self.get_job(identifier)

    def recover_interrupted(self):
        with self.connect() as db:
            db.execute("UPDATE experiments SET status='interrupted',error='API process stopped before completion. Replay to rerun.',updated=? WHERE status IN ('queued','running')", (time.time(),))


@lru_cache(maxsize=8)
def repository_at(path):
    return Repository(path)


def repository():
    return repository_at(str(settings.QDS_DATABASE_PATH))
