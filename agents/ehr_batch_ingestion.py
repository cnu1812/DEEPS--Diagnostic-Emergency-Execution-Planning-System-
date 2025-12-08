import requests
import random
import time
import uuid
from datetime import datetime


KESTRA_ENDPOINT = "http://localhost:8080/api/v1/executions/trigger/com.deeps.medical/deeps_surgery_pipeline"

AUTH = ('admin@kestra.io', 'Admin12345') 

conditions = [
    {"type": "NEURO", "diagnosis": "Glioblastoma Multiforme", "priority": "P1"},
    {"type": "OCULAR", "diagnosis": "Retinal Detachment", "priority": "P2"},
    {"type": "RENAL", "diagnosis": "Renal Cell Carcinoma", "priority": "P1"}
]

print(f"🔵 [DEEPS-OS] CONNECTING TO HOSPITAL DATABASE...")
print(f"🔑 AUTH: {AUTH[0]}")

for i in range(1, 21): 
    case = random.choice(conditions)
    patient_id = f"PX-{random.randint(10000, 99999)}"
    timestamp = datetime.now().strftime("%H:%M:%S")

    payload = {
        "patient_id": (None, patient_id),
        "surgery_type": (None, case["type"])
    }

    print(f"[{timestamp}] 📥 INGESTING: {patient_id} | {case['type']}")
    
    try:
        
        response = requests.post(
            KESTRA_ENDPOINT, 
            files=payload, 
            auth=AUTH
        )
        
        if response.status_code == 200:
            exec_id = response.json().get('id', 'UNK')
            print(f"[{timestamp}] 🚀 SUCCESS: Workflow ID {exec_id}")
        else:
            print(f"[{timestamp}] ❌ FAIL {response.status_code}: {response.text}")

    except Exception as e:
        print(f"[{timestamp}] ⚠️ NETWORK ERROR: {e}")
        break
        
    time.sleep(0.5)

print("="*60)
print(f"✅ [DEEPS-OS] BATCH COMPLETE.")