"""Run against a local or deployed fake-money gateway; never prints its credential.

Usage: python examples/payment_gateway_client.py https://qnexus-hackathon.vercel.app
Requires requests. This example creates and settles only mock funds.
"""
import sys
import base64
import io
from PIL import Image
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


case = post('/cases', {'amount_paise': 100000, 'payee': 'rahul@demo', 'invoice_reference':'INV-204'})
stream=io.BytesIO()
Image.new('RGB',(64,64),'white').save(stream,format='PNG')
image=base64.b64encode(stream.getvalue()).decode()
case=post('/cases/'+case['case_id']+'/invoice', {'image_base64':image})
case=post('/cases/'+case['case_id']+'/approval', {'message':case['expected_approval']})
candidate={'image_base64':image,'approval_text':case['expected_approval']}
draft = post('/draft', {'amount_paise':100000, 'case_id':case['case_id'], 'candidate':candidate})
altered={**candidate,'approval_text':candidate['approval_text']+'!'}
assert post('/receive',{'envelope':draft['envelope'],'candidate':altered})['verdict']=='APPROVAL_REJECTED'
changed_image=Image.new('RGB',(64,64),'red'); changed_stream=io.BytesIO(); changed_image.save(changed_stream,format='PNG')
changed={**candidate,'image_base64':base64.b64encode(changed_stream.getvalue()).decode()}
assert post('/receive',{'envelope':draft['envelope'],'candidate':changed})['verdict']=='INVOICE_REJECTED'
print('Linked invoice and approval:', case['case_id'], 'edited candidates rejected')
for kind in ['amount', 'beneficiary', 'expired', 'ciphertext']:
    attack = post('/attack', {'envelope': draft['envelope'], 'kind': kind})
    decision = post('/receive', {'envelope': attack['envelope'],'candidate':candidate})
    assert not decision['accepted']
    print(kind, decision['verdict'])
accepted = post('/receive', {'envelope': draft['envelope'],'candidate':candidate})
assert accepted['accepted']
print('original', accepted['verdict'], accepted['balances'])
replay = post('/receive', {'envelope': draft['envelope'],'candidate':candidate})
assert replay['verdict'] == 'REPLAY_REJECTED'
assert replay['balances'] == accepted['balances']
assert accepted['receipt']['receipt']['evidence']==draft['instruction']['evidence']
assert accepted['receipt']['receipt']['transaction_id']==case['case_id']
assert post('/verify-receipt', accepted['receipt'])['valid']
print('replay', replay['verdict'], 'Bank B receipt verified')
