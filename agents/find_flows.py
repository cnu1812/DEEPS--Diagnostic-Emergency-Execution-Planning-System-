import requests


AUTH = ('admin@kestra.io', 'Admin12345') 
URL = "http://localhost:8080/api/v1/flows/search?q=*"

print(f"🔍 CONNECTING TO KESTRA WITH {AUTH[0]}...")

try:
    response = requests.get(URL, auth=AUTH)
    
    if response.status_code == 200:
        flows = response.json().get('results', [])
        print(f"\n✅ FOUND {len(flows)} FLOWS:")
        print("="*60)
        for f in flows:
            print(f"🆔 ID:        {f['id']}")
            print(f"📦 NAMESPACE: {f['namespace']}")
            print(f"🔗 API URL:   /api/v1/executions/trigger/{f['namespace']}/{f['id']}")
            print("-" * 60)
    else:
        print(f"❌ ERROR {response.status_code}: {response.text}")

except Exception as e:
    print(f"⚠️ EXCEPTION: {e}")