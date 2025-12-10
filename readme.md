# How to Run

![deeps-archi](https://github.com/user-attachments/assets/9b885ad1-ba69-4196-8c1a-f2a9e413c027)

` git clone https://github.com/cnu1812/DEEPS--Diagnostic-Emergency-Execution-Planning-System-.git`

This is a hybrid system, you need to start the Backend before the Frontend.

### Prerequisites

- Docker Desktop (Running)
- Node.js 18+

### Step 1: Start the Backend (Kestra)

We use Kestra to orchestrate the surgical logic. Run this command to spin up the local container:

```
docker run -d -p 8080:8080 --name kestra kestra/kestra:latest server standalone
```

Authentication Note: To ensure a smooth experience, I have intentionally left the default credentials active.

- URL: http://localhost:8080

- Username: admin@kestra.io 

- Password: Admin12345 

### Step 2: Import the Surgery Workflow
For the frontend to trigger the backend, Kestra needs the logic flow definition.

Open http://localhost:8080 in your browser.

Go to Flows -> Create.

Paste the Kestra Code provided below and click Save.

```
id: deeps_surgery_pipeline
namespace: com.deeps.medical

inputs:
  - id: patient_id
    type: STRING
    defaults: "PATIENT-X-ALPHA"
  - id: surgery_type
    type: STRING
    defaults: "NEURO"

tasks:
  - id: vision_scan_analysis
    type: io.kestra.plugin.scripts.python.Script
    containerImage: python:3.9
    outputFiles:
      - scan_result.json
    script: |
      import json
      import time
      import random
      
      surgery_type = "{{ inputs.surgery_type }}"
      print(f"DEEPS-VISION: Initializing 3D Volumetric Scan for {surgery_type}...")
      time.sleep(random.uniform(0.5, 1.5))
      
      # DYNAMIC FINDINGS based on Organ Type
      if surgery_type == "OCULAR":
          # Eye: Retina Target
          target = [0.5, 0.01, 0.02] 
          notes = "Retinal detachment detected. Macula intact."
      elif surgery_type == "RENAL":
          # Kidney: Pelvis Target
          target = [0.2, -0.4, 0.0]
          notes = "Calculus density: 1200 HU (Hard). Fragmentation required."
      else:
          # Brain: Deep Cortex
          target = [
              round(random.uniform(0.1, 0.8), 2),
              round(random.uniform(-0.5, 0.5), 2),
              round(random.uniform(-0.5, 0.5), 2)
          ]
          notes = "Glioblastoma near eloquent cortex. Vascular avoidance critical."
      
      scan_data = {
          "patient": "{{ inputs.patient_id }}",
          "surgery_type": surgery_type,
          "target_coordinates": target,
          "clinical_notes": notes,
          "risk_level": "CRITICAL"
      }
      
      print(f"✅ ANOMALY DETECTED at Vector: {target}")
      print(f"📋 NOTES: {notes}")
      
      with open('scan_result.json', 'w') as f:
          json.dump(scan_data, f)

  - id: analyze_risk_and_trigger_brain
    type: io.kestra.core.tasks.flows.Switch
    value: "CRITICAL" 
    cases:
      CRITICAL:
        - id: activate_deeps_mind
          type: io.kestra.plugin.scripts.python.Script
          containerImage: python:3.9
          inputFiles:
            scan_result.json: "{{ outputs.vision_scan_analysis.outputFiles['scan_result.json'] }}"
          outputFiles:
            - surgery_plan.json
          script: |
            import json
            import time
            import math
            
            print("🧠 DEEPS-MIND (OUMI): Loading Organ-Specific Policy Network...")
            time.sleep(1)
            
            
            with open('scan_result.json', 'r') as f:
                data = json.load(f)
            
            stype = data['surgery_type']
            target = data['target_coordinates']
            print(f"📥 CONFIGURING STRATEGY FOR: {stype}")
            
            path = []
            
            
            if stype == "OCULAR":
                print("👁️ STRATEGY: Trans-pupillary Approach")
                print("📐 CALCULATION: Adjusting for Refractive Index (1.336)")
                # Straight line through pupil
                pupil_entry = [0.8, 0, 0]
                path = [
                    {"step": 1, "vector": pupil_entry, "action": "ALIGN_PUPIL"},
                    {"step": 2, "vector": target, "action": "FIRE_EXCIMER_LASER"}
                ]
                
            elif stype == "RENAL":
                print("💧 STRATEGY: Percutaneous Lithotripsy")
                print("🔨 CALCULATION: Multi-angle Fragmentation Grid")
                # Hit stone from 3 angles
                path = [
                    {"step": 1, "vector": [target[0]+0.1, target[1], target[2]], "action": "PULSE_1"},
                    {"step": 2, "vector": [target[0]-0.1, target[1], target[2]], "action": "PULSE_2"},
                    {"step": 3, "vector": target, "action": "PULSE_FINAL"}
                ]
                
            else: # NEURO
                print("🧠 STRATEGY: Stereotactic Navigation")
                print("⚠️ CALCULATION: Avoiding Vascular Structures (Safety Margin 2mm)")
                # Curved path (Arc)
                start = [0, 0, 0]
                midpoint = [target[0]/2, target[1] + 0.2, target[2]/2]
                path = [
                    {"step": 1, "vector": start, "action": "CRANIOTOMY_ENTRY"},
                    {"step": 2, "vector": midpoint, "action": "NAVIGATE_SULCUS"},
                    {"step": 3, "vector": target, "action": "ABLATE_TUMOR"}
                ]
            
            time.sleep(1.5) 
            
            print(f"SURGICAL PLAN FINALIZED: {len(path)} Steps generated.")
            
            with open('surgery_plan.json', 'w') as f:
                json.dump(path, f)

```

### Step 3: Start the Frontend
Now that the backend is alive, start the interface.

```
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` to begin the simulation.

# Troubleshooting

"The Surgery Won't Start or Nothing Happens"
This usually means the Frontend cannot talk to the Backend Docker container.

Check if Kestra is running: Open `http://localhost:8080`. If this fails, Docker is not running.

CORS or Network Issues: Open the browser console.

If you see Connection Refused, ensure your Docker container mapped port 8080 correctly.

Fix: Ensure you ran the docker command with `-p 8080:8080`.

## API Error Codes (401 & 404)

If you see these errors in your browser console or terminal, here is how to fix them:

401 Unauthorized 
This means the Frontend is reaching Kestra, but authentication is failing.

Cause: The Kestra Docker container expects the default credentials (admin), but your environment might be sending something else, or Basic Auth headers are missing.

The Fix:

Ensure you started Docker with the exact command in Step 1.

Check frontend/app/kestra-action.ts. It is hardcoded to send Basic YWRtaW46a2VzdHJh (which is admin:kestra in base64).

Pro Tip: If you changed the Kestra password, you must update the Authorization header in the frontend code.

404 Not Found 
This means the Frontend reached Kestra, but the specific Surgery Workflow does not exist yet.

Cause: You started the backend, but you forgot Step 2 (Importing the Workflow). The API endpoint /api/v1/executions/trigger/deeps.os/surgery_flow is only created after the flow is registered.

The Fix:

Go to http://localhost:8080.

Check the Flows tab.

If it is empty, create a new flow and paste the YAML code provided in "Step 2" above.

Once saved, the 404 error will vanish immediately.

I have documented the engineering struggles, the medical research, and the architecture in detail:

01. [The Mission: Saving Lives with Code](https://github.com/cnu1812/DEEPS--Diagnostic-Emergency-Execution-Planning-System-/blob/main/documentation/01-the-silent-crisis.md)

02. [Architecture: Anatomy of a Digital Surgeon](https://github.com/cnu1812/DEEPS--Diagnostic-Emergency-Execution-Planning-System-/blob/main/documentation/02-anatomy-of-a-digital-surgeon.md)

03. [The Details: Physics & Pharmacology](https://github.com/cnu1812/DEEPS--Diagnostic-Emergency-Execution-Planning-System-/blob/main/documentation/03-the-obsessive-details.md)

04. [Kestra & Cline](https://github.com/cnu1812/DEEPS--Diagnostic-Emergency-Execution-Planning-System-/blob/main/documentation/04-the-ai-architects.md)

05. [Engineering Challenges](https://github.com/cnu1812/DEEPS--Diagnostic-Emergency-Execution-Planning-System-/blob/main/documentation/05-war-stories-from-the-console.md)