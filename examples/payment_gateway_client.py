"""Run against a local or deployed fake-money gateway; never prints its credential.

Usage: python examples/payment_gateway_client.py https://qnexus-hackathon.vercel.app
Requires requests. This example creates and settles only mock funds.
"""
import sys
import requests

base = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8000').rstrip('/') + '/api/v1/payments'
response = requests.post(base + '/sessions', json={}, timeout=60)
response.raise_for_status()
sandbox = response.json()
client = requests.Session()
client.headers['X-Sandbox-Token'] = sandbox['session_token']
path = base + '/sessions/' + sandbox['session_id']


def post(suffix, payload):
    response = client.post(path + suffix, json=payload, timeout=60)
    response.raise_for_status()
    return response.json()


draft = post('/draft', {'amount_paise': 100000, 'payee': 'rahul@demo'})
for kind in ['amount', 'beneficiary', 'expired', 'ciphertext']:
    attack = post('/attack', {'envelope': draft['envelope'], 'kind': kind})
    decision = post('/receive', {'envelope': attack['envelope']})
    assert not decision['accepted']
    print(kind, decision['verdict'])
accepted = post('/receive', {'envelope': draft['envelope']})
assert accepted['accepted']
print('original', accepted['verdict'], accepted['balances'])
replay = post('/receive', {'envelope': draft['envelope']})
assert replay['verdict'] == 'REPLAY_REJECTED'
assert replay['balances'] == accepted['balances']
assert post('/verify-receipt', accepted['receipt'])['valid']
print('replay', replay['verdict'], 'Bank B receipt verified')
