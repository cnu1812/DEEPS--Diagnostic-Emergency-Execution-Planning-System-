import requests

KESTRA_ENDPOINT = "http://localhost:8080/api/v1/executions/trigger/com.deeps.medical/deeps_surgery_pipeline"

payload = {
    "patient_id": "TEST-PATIENT-AUTH",
    "surgery_type": "NEURO"
}

print(f"🔍 DEBUGGING WITH AUTH TO: {KESTRA_ENDPOINT}")

try:
    
    response = requests.post(
        KESTRA_ENDPOINT, 
        data=payload, 
        auth=('kestra', 'kestra') 
    )
    
    print(f"📊 STATUS CODE: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ SUCCESS! Authentication accepted.")
        print(f"🆔 EXECUTION ID: {response.json().get('id')}")
    else:
        print(f"❌ FAILURE: {response.text}")

except Exception as e:
    print(f"⚠️ EXCEPTION: {e}")