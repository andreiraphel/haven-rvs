import os, requests, numpy as np
from dotenv import load_dotenv
load_dotenv('../.env.local')
url=os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key=os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
r=requests.get(f'{url}/rest/v1/risk_weights?select=weights&active=eq.true&order=created_at.desc&limit=1', headers={'apikey': key, 'Authorization': f'Bearer {key}'}).json()
print(r[0]['weights'])
