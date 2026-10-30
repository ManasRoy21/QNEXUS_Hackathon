"""Actual PQ primitives, controlled fault injection, and an atomic sandbox ledger.

This is a custom demonstration protocol, not a reviewed banking or TLS protocol.
All parties run on one backend; only fake funds exist. Never export secret seeds.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import secrets
import sqlite3
import time
from uuid import uuid4
import statistics
from contextlib import contextmanager
import cryptography
from cryptography.exceptions import InvalidSignature, InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.mldsa import MLDSA65PrivateKey
from cryptography.hazmat.primitives.asymmetric.mlkem import MLKEM768PrivateKey
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from fastapi import HTTPException
from app.core.config import settings
from app.schemas.payments import PaymentInstruction, PaymentEnvelope, SUITE

PAYMENT_CONTEXT = b'QNEXUS_PAYMENT_V1'
RECEIPT_CONTEXT = b'QNEXUS_RECEIPT_V1'
SCOPE = 'Fake funds only. Single-backend mock banks; instance-local temporary SQLite ledger. No UPI/NPCI connection, independent bank identity, or production-security certification.'
INITIAL = {'alice@demo': 1_000_000, 'rahul@demo': 200_000, 'mallory@demo': 0}


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode()


def b64(value):
    return base64.b64encode(value).decode()


def unb64(value):
    return base64.b64decode(value, validate=True)


@contextmanager
def connection():
    path = Path(settings.QDS_DATABASE_PATH).with_name('payment-sandbox.sqlite3')
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path, timeout=10)
    os.chmod(path, 0o600)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    con.executescript('''
      CREATE TABLE IF NOT EXISTS payment_sessions (
        id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, expires INTEGER NOT NULL,
        a_seed BLOB NOT NULL, b_seed BLOB NOT NULL, kem_seed BLOB NOT NULL,
        balances TEXT NOT NULL, requests INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS payment_ledger (
        session_id TEXT NOT NULL REFERENCES payment_sessions(id) ON DELETE CASCADE,
        transaction_id TEXT NOT NULL, nonce TEXT NOT NULL, receipt TEXT NOT NULL,
        signature TEXT NOT NULL, PRIMARY KEY(session_id,transaction_id), UNIQUE(session_id,nonce));
    ''')
    try:
        with con:
            yield con
    finally:
        con.close()


def key_id(key):
    return hashlib.sha256(key.public_key().public_bytes_raw()).hexdigest()[:24]


def keys(row):
    return (MLDSA65PrivateKey.from_seed_bytes(row['a_seed']),
            MLDSA65PrivateKey.from_seed_bytes(row['b_seed']),
            MLKEM768PrivateKey.from_seed_bytes(row['kem_seed']))


def session(con, sid, token, charge=True):
    row = con.execute('SELECT * FROM payment_sessions WHERE id=?', (sid,)).fetchone()
    if not row or not token or not secrets.compare_digest(row['token_hash'], hashlib.sha256(token.encode()).hexdigest()):
        raise HTTPException(401, 'Sandbox unavailable on this instance or the session credential is invalid. Create a new sandbox; no transfer was performed.')
    if row['expires'] <= int(time.time()):
        raise HTTPException(410, 'Sandbox expired. Create a new sandbox; no transfer was performed.')
    if charge:
        if row['requests'] >= 100:
            raise HTTPException(429, 'Sandbox request limit reached. Create a new sandbox.')
        con.execute('UPDATE payment_sessions SET requests=requests+1 WHERE id=?', (sid,))
    return row


def public_session(row):
    a, b, kem = keys(row)
    return dict(session_id=row['id'], expires_at=row['expires'], balances=json.loads(row['balances']),
        public_keys={'bank_a_signing': b64(a.public_key().public_bytes_raw()),
                     'bank_b_receipts': b64(b.public_key().public_bytes_raw()),
                     'bank_b_kem': b64(kem.public_key().public_bytes_raw())},
        key_ids={'bank_a': key_id(a), 'bank_b': key_id(b), 'bank_b_kem': key_id(kem)},
        suite=SUITE, scope=SCOPE, storage='instance-local-temporary')


def create_session():
    a, b, kem = MLDSA65PrivateKey.generate(), MLDSA65PrivateKey.generate(), MLKEM768PrivateKey.generate()
    sid, token = uuid4().hex, secrets.token_urlsafe(32)
    with connection() as con:
        con.execute('BEGIN IMMEDIATE')
        con.execute('DELETE FROM payment_sessions WHERE expires<=?', (int(time.time()),))
        if con.execute('SELECT count(*) FROM payment_sessions').fetchone()[0] >= 128:
            raise HTTPException(429, 'This demo instance is at capacity. Try again later.')
        con.execute('INSERT INTO payment_sessions(id,token_hash,expires,a_seed,b_seed,kem_seed,balances) VALUES(?,?,?,?,?,?,?)',
            (sid, hashlib.sha256(token.encode()).hexdigest(), int(time.time())+1800,
             a.private_bytes_raw(), b.private_bytes_raw(), kem.private_bytes_raw(), json.dumps(INITIAL)))
        row = con.execute('SELECT * FROM payment_sessions WHERE id=?', (sid,)).fetchone()
    return {**public_session(row), 'session_token': token}


def snapshot(sid, token):
    with connection() as con:
        row = session(con, sid, token, charge=False)
        ledger = [dict(receipt=json.loads(r['receipt']), signature=r['signature']) for r in con.execute(
            'SELECT receipt,signature FROM payment_ledger WHERE session_id=? ORDER BY rowid DESC', (sid,))]
    return dict(balances=json.loads(row['balances']), ledger=ledger, scope=SCOPE)


def timed(fn):
    start = time.perf_counter_ns()
    value = fn()
    return value, (time.perf_counter_ns()-start)/1e6


def aes_key(shared, header):
    return HKDF(algorithm=hashes.SHA256(), length=32,
        salt=hashlib.sha256(canonical(header)).digest(), info=b'QNEXUS_PAYMENT_AES_V1').derive(shared)


def wrap(payload, signature, row):
    a, _, kem = keys(row)
    header = dict(version='qnexus-envelope/v1', suite=SUITE, session_id=row['id'],
                  sender_key_id=key_id(a), receiver_key_id=key_id(kem))
    (shared, encapsulated), kem_ms = timed(kem.public_key().encapsulate)
    nonce = secrets.token_bytes(12)
    aad = canonical({**header, 'kem_ciphertext': b64(encapsulated)})
    ciphertext, encrypt_ms = timed(lambda: AESGCM(aes_key(shared, header)).encrypt(
        nonce, canonical(dict(instruction=payload, signature=signature)), aad))
    envelope = {**header, 'kem_ciphertext': b64(encapsulated), 'nonce': b64(nonce), 'ciphertext': b64(ciphertext)}
    return envelope, dict(encapsulate_ms=kem_ms, encrypt_ms=encrypt_ms, signature_bytes=3309,
        kem_ciphertext_bytes=len(encapsulated), ciphertext_bytes=len(ciphertext), wire_bytes=len(canonical(envelope)))


def unwrap(envelope, row):
    value = envelope.model_dump() if isinstance(envelope, PaymentEnvelope) else envelope
    a, _, kem = keys(row)
    if value['session_id'] != row['id'] or value['sender_key_id'] != key_id(a) or value['receiver_key_id'] != key_id(kem):
        raise ValueError('Untrusted routing or key identifiers')
    header = {k: value[k] for k in ('version', 'suite', 'session_id', 'sender_key_id', 'receiver_key_id')}
    shared, decap_ms = timed(lambda: kem.decapsulate(unb64(value['kem_ciphertext'])))
    aad = canonical({**header, 'kem_ciphertext': value['kem_ciphertext']})
    plain, decrypt_ms = timed(lambda: AESGCM(aes_key(shared, header)).decrypt(
        unb64(value['nonce']), unb64(value['ciphertext']), aad))
    signed = json.loads(plain)
    if set(signed) != {'instruction', 'signature'}:
        raise ValueError('Invalid signed record')
    payload = PaymentInstruction.model_validate(signed['instruction']).model_dump()
    signature = unb64(signed['signature'])
    if len(signature) != 3309:
        raise ValueError('Invalid signature length')
    return payload, signature, dict(decapsulate_ms=decap_ms, decrypt_ms=decrypt_ms)


def prepare(sid, token, request):
    with connection() as con:
        row = session(con, sid, token)
    a, _, _ = keys(row)
    now = int(time.time())
    payload = PaymentInstruction(session_id=sid, transaction_id=uuid4().hex, nonce=secrets.token_hex(16),
        payee=request.payee, amount_paise=request.amount_paise, issued_at=now, expires_at=now+120).model_dump()
    signature, sign_ms = timed(lambda: a.sign(canonical(payload), context=PAYMENT_CONTEXT))
    envelope, metrics = wrap(payload, b64(signature), row)
    return dict(instruction=payload, envelope=envelope, metrics={**metrics, 'sign_ms': sign_ms},
                explanation='Bank A signed the exact instruction; the wire envelope contains encrypted signed data. Private keys and the shared key remain on the server.')


def inject(sid, token, request):
    with connection() as con:
        row = session(con, sid, token)
    envelope = request.envelope.model_dump()
    if request.kind == 'ciphertext':
        cipher = bytearray(unb64(envelope['ciphertext'])); cipher[0] ^= 1
        return dict(envelope={**envelope, 'ciphertext':b64(cipher)}, kind=request.kind,
                    model='The test harness flips one encrypted byte without updating its authentication tag.')
    try:
        payload, signature, _ = unwrap(envelope, row)
    except Exception:
        raise HTTPException(422, 'Supply an intact draft envelope for controlled fault injection.') from None
    if request.kind == 'amount':
        payload['amount_paise'] = payload['amount_paise']+100 if payload['amount_paise'] <= 999_900 else payload['amount_paise']-100
    elif request.kind == 'beneficiary':
        payload['payee'] = 'mallory@demo' if payload['payee'] == 'rahul@demo' else 'rahul@demo'
    else:
        payload['issued_at'] = int(time.time())-180
        payload['expires_at'] = int(time.time())-60
        a, _, _ = keys(row)
        signature = a.sign(canonical(payload), context=PAYMENT_CONTEXT)
    attacked, _ = wrap(payload, b64(signature), row)
    return dict(envelope=attacked, kind=request.kind, model=(
        'Controlled stale-message test: the mock sender signs an already-expired instruction.' if request.kind == 'expired'
        else 'Controlled plaintext-aware injection: re-encrypt changed data with the receiver’s public key while keeping the original sender signature. This does not model breaking encryption.'))


def receive(sid, token, envelope):
    started = time.perf_counter_ns()
    with connection() as con:
        row = session(con, sid, token)
    metrics = {}
    def rejected(verdict, explanation):
        return dict(accepted=False, verdict=verdict, explanation=explanation,
                    balances=snapshot(sid, token)['balances'], metrics=metrics, receipt=None, scope=SCOPE)
    try:
        payload, signature, metrics = unwrap(envelope, row)
    except (ValueError, TypeError, KeyError, InvalidTag):
        return rejected('ENVELOPE_REJECTED', 'Encrypted packet authentication or trusted routing failed. No ledger entry was created.')
    a, b, _ = keys(row)
    try:
        _, metrics['verify_ms'] = timed(lambda: a.public_key().verify(signature, canonical(payload), context=PAYMENT_CONTEXT))
    except InvalidSignature:
        return rejected('SIGNATURE_REJECTED', 'The amount, beneficiary or signed instruction was altered. Bank A’s signature does not verify.')
    now = int(time.time())
    if payload['session_id'] != sid or payload['issued_at'] > now+5 or payload['expires_at'] <= now or not 0 < payload['expires_at']-payload['issued_at'] <= 120:
        return rejected('EXPIRED_OR_INVALID_TIME', 'The authenticated instruction is expired, future-dated, or outside the permitted lifetime.')
    with connection() as con:
        con.execute('BEGIN IMMEDIATE')
        current = session(con, sid, token, charge=False)
        balances = json.loads(current['balances'])
        duplicate = con.execute('SELECT 1 FROM payment_ledger WHERE session_id=? AND (transaction_id=? OR nonce=?)',
                                (sid, payload['transaction_id'], payload['nonce'])).fetchone()
        if duplicate:
            return dict(accepted=False, verdict='REPLAY_REJECTED', explanation='This transaction ID or nonce was already settled. No second debit or credit occurred.', balances=balances, receipt=None, metrics=metrics, scope=SCOPE)
        if balances[payload['payer']] < payload['amount_paise']:
            return dict(accepted=False, verdict='INSUFFICIENT_FUNDS', explanation='The sender has insufficient demo funds. Balances are unchanged.', balances=balances, receipt=None, metrics=metrics, scope=SCOPE)
        balances[payload['payer']] -= payload['amount_paise']
        balances[payload['payee']] += payload['amount_paise']
        receipt = dict(version='qnexus-payment-receipt/v1', session_id=sid,
            transaction_id=payload['transaction_id'], instruction_sha256=hashlib.sha256(canonical(payload)).hexdigest(),
            payer=payload['payer'], payee=payload['payee'], amount_paise=payload['amount_paise'], currency='INR',
            settled_at=now, balances_after=balances, bank_b_key_id=key_id(b))
        receipt_signature = b64(b.sign(canonical(receipt), context=RECEIPT_CONTEXT))
        con.execute('INSERT INTO payment_ledger VALUES(?,?,?,?,?)', (sid, payload['transaction_id'], payload['nonce'], json.dumps(receipt), receipt_signature))
        con.execute('UPDATE payment_sessions SET balances=? WHERE id=?', (json.dumps(balances), sid))
    metrics['receiver_total_ms'] = (time.perf_counter_ns()-started)/1e6
    return dict(accepted=True, verdict='SETTLED', explanation='Bank B verified the encrypted signed instruction and atomically moved demo funds exactly once.',
                balances=balances, receipt=dict(receipt=receipt, signature=receipt_signature), metrics=metrics, scope=SCOPE)


def verify_receipt(sid, token, request):
    with connection() as con:
        row = session(con, sid, token)
    _, b, _ = keys(row)
    try:
        if request.receipt.get('session_id') != sid or request.receipt.get('bank_b_key_id') != key_id(b):
            raise ValueError()
        b.public_key().verify(unb64(request.signature), canonical(request.receipt), context=RECEIPT_CONTEXT)
    except (ValueError, InvalidSignature):
        return dict(valid=False, algorithm='ML-DSA-65')
    return dict(valid=True, algorithm='ML-DSA-65', key_id=key_id(b))


def benchmark(sid, token):
    with connection() as con:
        row = session(con, sid, token)
    pq, _, kem = keys(row)
    classical = Ed25519PrivateKey.generate()
    xa, xb = X25519PrivateKey.generate(), X25519PrivateKey.generate()
    message = canonical({'payer':'alice@demo', 'payee':'rahul@demo', 'amount_paise':100000, 'currency':'INR'})
    def sample(signing, keypair, pq_mode):
        signs, verifies, agreements = [], [], []
        for _ in range(10):
            sig, s = timed(lambda: signing.sign(message))
            _, v = timed(lambda: signing.public_key().verify(sig, message))
            if pq_mode:
                (shared, ciphertext), e = timed(keypair.public_key().encapsulate)
                recovered, d = timed(lambda: keypair.decapsulate(ciphertext))
            else:
                shared, e = timed(lambda: xa.exchange(xb.public_key()))
                recovered, d = timed(lambda: xb.exchange(xa.public_key()))
            assert shared == recovered
            signs.append(s); verifies.append(v); agreements.append(e+d)
        def stats(values):
            warmed = sorted(values[1:])
            return dict(median_ms=statistics.median(warmed), p95_ms=warmed[-1])
        return dict(sign=stats(signs), verify=stats(verifies), key_establishment=stats(agreements),
                    signature_bytes=len(sig), signing_public_key_bytes=len(signing.public_key().public_bytes_raw()),
                    key_exchange_wire_bytes=1088 if pq_mode else 32)
    return dict(classical=sample(classical, None, False), post_quantum=sample(pq, kem, True), samples=9,
        cryptography_version=cryptography.__version__,
        note='Measured on this server: one warm-up discarded, nine serial samples; p95 uses nearest rank (the maximum of nine). Key generation, networking, authentication and database work are excluded. Classical: Ed25519/X25519. PQ: ML-DSA-65/ML-KEM-768. Wire bytes refer to one KEM ciphertext or one X25519 public key, not a complete handshake. No quantum-speedup or production-capacity claim.')
