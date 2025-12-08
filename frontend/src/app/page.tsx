"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState, useMemo, useEffect } from "react";
import { OrbitControls, Stars, useGLTF, Html } from "@react-three/drei";
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import { generateMedicalLog } from "./actions";
import { triggerKestraWorkflow } from "./kestra-action";
import * as THREE from "three";
import {
  Activity, Code, ShieldCheck, Terminal,
  FileText, ClipboardList, Download, CheckCircle, Clock, Zap,
  AlertTriangle, XCircle, Eye, Brain, Droplet, Filter, Cpu, Scan, Mic, Timer, Lock, Network, Database, FileCode, Server, Heart
} from "lucide-react";


type SurgeryType = "NEURO" | "OCULAR" | "RENAL";


const DOCTORS = {
    NEURO: "Dr. Cnu",
    OCULAR: "Dr. Deepika",
    RENAL: "Dr. Radha",
    GENERAL: "Dr. DEEPS-AI"
};

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: "M" | "F";
  type: SurgeryType;
  vitals: {
    bp: string;
    hr: number;
    glucose: number;
    temp: number;
    specificMetric: string;
    bloodType: string;
    weight: number;
  };
  history: string[];
  condition: string;
  allergies: string[];
  scanInfo: { type: string; date: string; resolution: string };
  tumorPos: THREE.Vector3;
  scheduledTime: string;
  status: "WAITING" | "PREPPING" | "SURGERY" | "RECOVERY" | "COMPLETED" | "CANCELLED";
  risk: "CRITICAL" | "HIGH" | "MODERATE";
};


const TOOLS = {
  IDLE: { name: "STANDBY", color: "text-gray-500", icon: <Cpu size={14} /> },
  VISION: { name: "TOGETHER AI", color: "text-blue-400", icon: <Scan size={14} /> },
  OUMI: { name: "OUMI AGENT", color: "text-purple-400", icon: <Brain size={14} /> },
  CLINE: { name: "CLINE CLI", color: "text-orange-400", icon: <Terminal size={14} /> },
  RABBIT: { name: "CODE RABBIT", color: "text-green-400", icon: <ShieldCheck size={14} /> },
  KESTRA: { name: "KESTRA ORCH", color: "text-pink-400", icon: <Activity size={14} /> },
  LEARNING: { name: "RLHF TRAINING", color: "text-yellow-400", icon: <Database size={14} /> }
};


const INSIGHTS = [
  "Refined vascular avoidance trajectory weights by +0.04.",
  "Optimized laser pulse duration for dense tissue (-12ms).",
  "Updated depth-perception weights for ocular refraction.",
  "Reduced latency in renal fragment tracking loop.",
  "New anomaly pattern added to Global Neural Network.",
  "Calibrated haptic feedback based on tissue resistance."
];


const generatePatients = (count: number): Patient[] => {
  const names = ["Sarah Connor", "John Smith", "Elena Rodriguez", "Akira Sato", "Marcus Aurelius", "Wei Chen", "Priya Patel", "Lars Jensen", "Amara Diallo", "David Kim", "Neo Anderson", "Trinity Moss"];
  const configs = [
    { type: "NEURO", conditions: ["Glioblastoma", "Meningioma"], metric: "ICP: 12mmHg", scan: "MRI T2-Weighted" },
    { type: "OCULAR", conditions: ["Retinal Detachment", "Cataract", "Macular Hole"], metric: "IOP: 15mmHg", scan: "OCT (Optical Coherence)" },
    { type: "RENAL", conditions: ["Staghorn Calculus", "Uric Acid Stone"], metric: "Creatinine: 1.1", scan: "CT Urogram" }
  ];
  const bloodTypes = ["A+", "O+", "B-", "AB+", "O-"];

  return Array.from({ length: count }).map((_, i) => {
    const config = configs[Math.floor(Math.random() * configs.length)];
    const isCritical = Math.random() > 0.8;
    let specificMetric = config.metric;

    if (isCritical) {
      if (config.type === "NEURO") specificMetric = "ICP: 28mmHg (CRITICAL)";
      if (config.type === "OCULAR") specificMetric = "IOP: 35mmHg (GLAUCOMA RISK)";
      if (config.type === "RENAL") specificMetric = "Creatinine: 5.2 (FAILURE)";
    }

    let pos = new THREE.Vector3();
    if (config.type === "NEURO") {
      pos.set((Math.random() * 0.5) + 0.2, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
    } else if (config.type === "OCULAR") {
      pos.set(0.6, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
    } else if (config.type === "RENAL") {
      pos.set(0, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.2);
    }

    return {
      id: `PX-${Math.floor(Math.random() * 8999) + 1000}`,
      name: names[i % names.length],
      age: 20 + Math.floor(Math.random() * 65),
      gender: Math.random() > 0.5 ? "M" : "F",
      type: config.type as SurgeryType,
      vitals: {
        bp: `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 15)}`,
        hr: 60 + Math.floor(Math.random() * 40),
        glucose: 80 + Math.floor(Math.random() * 60),
        temp: 98 + Math.random(),
        specificMetric: specificMetric,
        bloodType: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
        weight: 60 + Math.floor(Math.random() * 40)
      },
      history: ["Hypertension", "None", "Asthma", "Diabetes"][Math.floor(Math.random() * 4)],
      condition: config.conditions[Math.floor(Math.random() * config.conditions.length)],
      allergies: ["None", "Penicillin", "Latex"][Math.floor(Math.random() * 3)],
      scanInfo: { type: config.scan, date: "2023-10-24", resolution: "0.5mm Slice" },
      tumorPos: pos,
      scheduledTime: `${8 + i}:00`,
      status: "WAITING",
      risk: isCritical ? "CRITICAL" : "MODERATE"
    };
  });
};

const ROBOT_BASE_POSITION = new THREE.Vector3(3.5, 0, 1.5);


const RealisticBrain = () => {
  const { scene } = useGLTF("/brain.glb");
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  useMemo(() => {
    clonedScene.traverse((child: any) => {
      if (child.isMesh) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: "#00ff88", emissive: "#001105", roughness: 0.1, metalness: 0.1, transmission: 0.5, transparent: true, opacity: 0.3, side: THREE.DoubleSide
        });
      }
    });
  }, [clonedScene]);
  return <primitive object={clonedScene} position={[0, -0.5, 0]} scale={1.8} />;
};

const RealisticEye = () => {
  return (
    <group scale={1.2} rotation={[0, -Math.PI / 2, 0]}>
      <mesh><sphereGeometry args={[1, 32, 32]} /><meshPhysicalMaterial color="#ffffff" transmission={0.2} roughness={0.1} /></mesh>
      <mesh position={[0, 0, 0.9]}><circleGeometry args={[0.4, 32]} /><meshStandardMaterial color="#3b82f6" /></mesh>
      <mesh position={[0, 0, 0.91]}><circleGeometry args={[0.15, 32]} /><meshStandardMaterial color="#000000" /></mesh>
      <mesh position={[0, 0, 0.8]}><sphereGeometry args={[0.6, 32, 32]} /><meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={0.3} transparent roughness={0} /></mesh>
    </group>
  );
};


const RealisticKidney = () => {
  return (
    <group scale={1.4} rotation={[0, 0, Math.PI / 3]} position={[0, 0, 0]}>
      <mesh position={[0, 0, 0]} scale={[1, 1.6, 0.8]}>
        <sphereGeometry args={[0.5, 64, 64]} />
        <meshPhysicalMaterial
          color="#8a3324"
          roughness={0.2}
          metalness={0.1}
          transmission={0.4}
          transparent={true}
          opacity={0.5}
          thickness={1}
        />
      </mesh>
      <mesh position={[0, 0, 0]} scale={[0.6, 1.2, 0.5]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ffaa00" wireframe transparent opacity={0.1} />
      </mesh>
      <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.2, 0.5]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh position={[-0.6, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 1]} /><meshStandardMaterial color="#3b82f6" /></mesh>
      <mesh position={[-0.6, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 1]} /><meshStandardMaterial color="#ef4444" /></mesh>
    </group>
  );
};

const TargetMass = ({ position, destroyed, type, visible }: { position: THREE.Vector3, destroyed: boolean, type: SurgeryType, visible: boolean }) => {
  const ref = useRef<any>();
  useFrame((state) => {
    if (ref.current) {
      if (!destroyed && visible) {
        const t = state.clock.elapsedTime;
        const s = 1 + Math.sin(t * 15) * 0.1;
        ref.current.scale.set(s, s, s);
      }
      if (destroyed) ref.current.scale.multiplyScalar(0.9);
      ref.current.visible = visible || destroyed;
    }
  });
  const color = type === "NEURO" ? "#ff0000" : type === "RENAL" ? "#fbbf24" : "#ffffff";

  return (
    <group position={position}>
      {visible && !destroyed && (
        <Html distanceFactor={8} zIndexRange={[100, 0]}>
          <div className="bg-red-500/80 border border-red-500 text-white text-[8px] px-2 py-1 font-bold animate-pulse whitespace-nowrap backdrop-blur-md rounded">
            {type === "RENAL" ? "CALCULUS DETECTED" : "TUMOR DETECTED"}
          </div>
        </Html>
      )}
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.12, 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={8}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};


const RobotArm = ({ targetPos, laserState, type }: { targetPos: THREE.Vector3, laserState: string, type: SurgeryType }) => {
  const groupRef = useRef<any>();
  const laserRef = useRef<any>();
  const laserColor = type === "NEURO" ? "#00ff00" : type === "OCULAR" ? "#00ffff" : "#fb923c";

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.lookAt(targetPos);
    }
    
    if (!laserRef.current) return;
    
    const maxDist = ROBOT_BASE_POSITION.distanceTo(targetPos);
    const penetrationDepth = 0.2; 
    const targetScale = maxDist + penetrationDepth; 
    const speed = 8 * delta;

    if (laserState === "GROWING") {
      laserRef.current.scale.z = Math.min(targetScale, laserRef.current.scale.z + speed);
      laserRef.current.visible = true;
    } else if (laserState === "SHRINKING") {
      laserRef.current.scale.z = Math.max(0, laserRef.current.scale.z - speed);
      if (laserRef.current.scale.z < 0.1) laserRef.current.visible = false;
    } else if (laserState === "OFF") {
      laserRef.current.scale.z = 0;
      laserRef.current.visible = false;
    }
  });

  return (
    <group position={ROBOT_BASE_POSITION}>
        <group ref={groupRef}>
            <mesh position={[0, 0, 0.5]}><boxGeometry args={[0.2, 0.2, 1]} /><meshStandardMaterial color="#222" /></mesh>
            <group position={[0, 0, 1]}> 
                <mesh ref={laserRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
                    <cylinderGeometry args={[0.02, 0.05, 1]} translate={[0, 0.5, 0]} />
                    <meshStandardMaterial color={laserColor} emissive={laserColor} emissiveIntensity={5} transparent opacity={0.9} />
                </mesh>
            </group>
        </group>
    </group>
  )
}


const MissionControl = ({ patient, active }: { patient: Patient, active: boolean }) => {
    
    const [hr, setHr] = useState(patient.vitals.hr);
    const [bpSys, setBpSys] = useState(parseInt(patient.vitals.bp.split('/')[0]));
    const [bpDia, setBpDia] = useState(parseInt(patient.vitals.bp.split('/')[1]));
    const [o2, setO2] = useState(98);
    
    const [latency, setLatency] = useState(12);
    const [gpu, setGpu] = useState(42);
    const [precision, setPrecision] = useState(99.9);

    useEffect(() => {
        if (!active) return;
        const interval = setInterval(() => {
            
            setHr(prev => prev + (Math.random() > 0.5 ? 1 : -1));
            setBpSys(prev => prev + (Math.random() > 0.5 ? 1 : -1));
            setO2(prev => Math.min(100, Math.max(95, prev + (Math.random() > 0.8 ? 1 : -1))));
            
           
            setLatency(prev => Math.max(4, prev + (Math.random() > 0.5 ? 1 : -1)));
            setGpu(prev => Math.min(98, Math.max(20, prev + Math.floor(Math.random() * 5 - 2))));
            setPrecision(prev => Math.min(100, prev + (Math.random() * 0.02 - 0.01)));
        }, 1000);
        return () => clearInterval(interval);
    }, [active]);

    return (
        <div className="absolute bottom-6 right-6 z-20 flex bg-black/90 border border-gray-800 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md">
            
            
            <div className="w-48 p-4 border-r border-gray-800">
                <div className="flex items-center gap-2 text-cyan-400 mb-4 text-[10px] font-bold tracking-wider">
                    <Server size={12}/> KERNEL STATS
                </div>
                <div className="space-y-4">
                    <div>
                        <div className="text-[9px] text-gray-500 mb-1">LATENCY</div>
                        <div className="text-xl font-mono text-white">{latency}<span className="text-[10px] text-gray-600 ml-1">ms</span></div>
                    </div>
                    <div>
                        <div className="text-[9px] text-gray-500 mb-1">GPU LOAD</div>
                        <div className="text-xl font-mono text-purple-400">{gpu}<span className="text-[10px] text-gray-600 ml-1">%</span></div>
                        <div className="w-full bg-gray-900 h-1 mt-1 rounded overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${gpu}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-gray-500 mb-1">CONFIDENCE</div>
                        <div className="text-xl font-mono text-green-400">{precision.toFixed(1)}<span className="text-[10px] text-gray-600 ml-1">%</span></div>
                    </div>
                </div>
            </div>

            
            <div className="w-56 p-4 bg-gray-900/30">
                <div className="flex items-center gap-2 text-green-400 mb-4 text-[10px] font-bold tracking-wider">
                    <Activity className="animate-pulse" size={12}/> LIVE VITALS
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div>
                        <div className="text-[9px] text-gray-500 mb-1">HEART RATE</div>
                        <div className="text-2xl font-mono text-white">{hr} <span className="text-[10px] text-gray-600">BPM</span></div>
                    </div>
                    <div>
                        <div className="text-[9px] text-gray-500 mb-1">BP</div>
                        <div className="text-2xl font-mono text-yellow-400">{bpSys}/{bpDia}</div>
                    </div>
                    <div>
                        <div className="text-[9px] text-gray-500 mb-1">O2 SAT</div>
                        <div className="text-2xl font-mono text-cyan-400">{o2}%</div>
                    </div>
                    <div>
                        <div className="text-[9px] text-gray-500 mb-1">TEMP</div>
                        <div className="text-2xl font-mono text-white">{typeof patient.vitals.temp === 'number' ? patient.vitals.temp.toFixed(1) : patient.vitals.temp}°</div>
                    </div>
                </div>
            </div>
        </div>
    )
}


export default function DeepsHospitalOS() {
  const [patients, setPatients] = useState<Patient[]>(() => generatePatients(15));
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [logs, setLogs] = useState<{ msg: string, source: string }[]>([]);
  const [view, setView] = useState<"LIST" | "DETAIL" | "SURGERY">("LIST");
  const [filter, setFilter] = useState<"ALL" | SurgeryType>("ALL");

  
  const [showSuccessReport, setShowSuccessReport] = useState(false);
  const [showAbortReport, setShowAbortReport] = useState(false);
  const [abortReason, setAbortReason] = useState("");
  const [version, setVersion] = useState("4.2.0");
  const [learnedInsight, setLearnedInsight] = useState("");

  
  const [activeTool, setActiveTool] = useState<keyof typeof TOOLS>("IDLE");
  const [destroyed, setDestroyed] = useState(false);
  const [targetVisible, setTargetVisible] = useState(false);
  const [laserState, setLaserState] = useState("OFF");
  const [progress, setProgress] = useState(0);
  const [panicMode, setPanicMode] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [logs]);

  
  useEffect(() => {
   
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      if (transcript.includes("initiate") || transcript.includes("start")) {
        if (selectedPatient && selectedPatient.status !== "COMPLETED") {
          const btn = document.getElementById("initiate-btn");
          if (btn) btn.click();
        }
      }
      else if (transcript.includes("abort") || transcript.includes("stop")) {
        setPanicMode(true);
        setAbortReason("USER ABORTED via VOICE COMMAND");
        setShowAbortReport(true);
      }
      else if (transcript.includes("close")) {
        setShowSuccessReport(false);
        setShowAbortReport(false);
        setView("LIST");
      }
    };
    if (isListening) recognition.start();
    else recognition.stop();
    return () => recognition.stop();
  }, [isListening, selectedPatient]);

  const addLog = async (source: string, manualMsg?: string) => {
    let msg = manualMsg;
    if (!msg) {
      const context = selectedPatient ? `${selectedPatient.type} surgery` : "system check";
      msg = await generateMedicalLog("PLANNING", context);
    }
    setLogs(prev => [...prev, { source, msg: msg || "Processing..." }]);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
  const filteredPatients = patients.filter(p => filter === "ALL" ? true : p.type === filter);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setView("DETAIL");
    setLogs([]);
    setProgress(0);
    setShowSuccessReport(false);
    setShowAbortReport(false);
    setPanicMode(false);
    setTargetVisible(false);
  };

  const downloadReport = (type: "PATIENT_SUCCESS" | "AI_LOGS" | "REFERRAL") => {
    if (!selectedPatient) return;

    let content = "";
    let filename = "";
    
    const operatingDoc = DOCTORS[selectedPatient.type as keyof typeof DOCTORS];

    if (type === "REFERRAL") {
      let specialist = "GENERAL SURGEON";
      let refDoc = "Dr. DEEPS";
      
      if (abortReason.includes("BP") || abortReason.includes("TACHYCARDIA")) { specialist = "CARDIOLOGY"; refDoc = "Dr. Heart"; }
      else if (abortReason.includes("ICP")) { specialist = DOCTORS.NEURO; refDoc = DOCTORS.NEURO; }
      else if (abortReason.includes("Creatinine")) { specialist = DOCTORS.RENAL; refDoc = DOCTORS.RENAL; }
      else if (abortReason.includes("IOP")) { specialist = DOCTORS.OCULAR; refDoc = DOCTORS.OCULAR; }

      content = `DEEPS-OS URGENT REFERRAL LETTER
--------------------------------------------------
DATE: ${new Date().toLocaleString()}
HOSPITAL ID: GEN-442-ALPHA
PATIENT: ${selectedPatient.name} (ID: ${selectedPatient.id})

REFERRING PHYSICIAN: ${operatingDoc}
REASON FOR ABORTION: ${abortReason}

DIRECT REFERRAL TO:
>>> ${specialist} (${refDoc}) <<<

NOTES:
Patient unstable for laser intervention. Immediate stabilization required.`;
      filename = `${selectedPatient.id}_REFERRAL.txt`;
    }
    else if (type === "PATIENT_SUCCESS") {
      content = `DEEPS-OS PATIENT DISCHARGE SUMMARY
--------------------------------------------------
PATIENT: ${selectedPatient.name}
PROCEDURE: ${selectedPatient.type} LASER ABLATION
STATUS: SUCCESSFUL
SURGEON: ${operatingDoc}
DATE: ${new Date().toLocaleDateString()}

PRESCRIPTION (Rx):
1. Amoxicillin 500mg - 1 tab every 8 hrs (7 days)
2. Acetaminophen 325mg - As needed for pain

FOLLOW-UP PLAN:
- Return for ${selectedPatient.scanInfo.type} in 2 weeks.
- Emergency Contact: 555-0199`;
      filename = `${selectedPatient.id}_DISCHARGE.txt`;
    }
    else if (type === "AI_LOGS") {
      content = `DEEPS-OS // KERNEL TRAINING LOG\nMODEL VERSION: ${version}\nTARGET: ${selectedPatient.condition}\n\nLEARNED INSIGHT:\n"${learnedInsight}"\n\nVECTOR UPDATES:\n[weights_layer_4]: +0.0024\n[weights_layer_9]: -0.0011`;
      filename = `DEEPS_KERNEL_V${version}.log`;
    }

    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
  };

  const checkSafety = (p: Patient): { safe: boolean, reason: string } => {
    const metric = p.vitals.specificMetric || "";
    if (p.vitals.hr > 125) return { safe: false, reason: "SEVERE TACHYCARDIA" };
    if (p.type === "NEURO" && metric.includes("28mmHg")) return { safe: false, reason: "ICP CRITICAL" };
    if (p.type === "OCULAR" && metric.includes("35mmHg")) return { safe: false, reason: "IOP CRITICAL" };
    if (p.type === "RENAL" && metric.includes("5.2")) return { safe: false, reason: "RENAL FAILURE" };
    return { safe: true, reason: "" };
  };

  const executeSurgerySequence = async () => {
    if (!selectedPatient || selectedPatient.status === "COMPLETED") return;

    setView("SURGERY");
    setDestroyed(false);
    setLaserState("OFF");
    setPanicMode(false);
    setTargetVisible(false);
    setProgress(0);
    setLogs([]);

    setActiveTool("KESTRA");
    addLog("KESTRA", `Orchestrating Workflow for ${selectedPatient.type}...`);
    const kestraResult = await triggerKestraWorkflow(selectedPatient.id, selectedPatient.type);
    if (kestraResult.success) addLog("KESTRA", `Pipeline Triggered. ID: ${kestraResult.executionId}`);
    else addLog("KESTRA", "Local Orchestrator Busy. Switching to Failover...");
    await delay(1000);

    setActiveTool("VISION");
    addLog("VISION_AI", "Ingesting 3D Volumetric Scan...");
    await delay(1500);
    await addLog("VISION_MODEL");
    setTargetVisible(true);
    addLog("VISION_MODEL", `ANOMALY DETECTED. Vector Locked.`);
    setProgress(20);

    setActiveTool("IDLE");
    const safetyCheck = checkSafety(selectedPatient);
    if (!safetyCheck.safe) {
      setPanicMode(true);
      addLog("CRITICAL", `${safetyCheck.reason} DETECTED.`);
      addLog("SYSTEM", "ABORTING PROCEDURE.");
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? { ...p, status: "CANCELLED" } : p));
      setAbortReason(safetyCheck.reason);
      await delay(2000);
      setShowAbortReport(true);
      return;
    }
    addLog("SAFETY", "Vitals Nominal. Authorization Granted.");

    setActiveTool("OUMI");
    addLog("OUMI", "Calculating Collision-Free Path...");
    await delay(2000);
    addLog("OUMI", "Trajectory Optimized (PPO Algorithm).");
    setProgress(40);

    setActiveTool("CLINE");
    addLog("CLINE", "Generating Control Script...");
    await delay(1500);
    setActiveTool("RABBIT");
    addLog("CODE_RABBIT", "Security Audit: PASS.");
    setProgress(60);

    setActiveTool("IDLE");
    setPatients(prev => prev.map(p => p.id === selectedPatient.id ? { ...p, status: "SURGERY" } : p));

    let laserType = "KTP (532nm)";
    if (selectedPatient.type === "OCULAR") laserType = "ArF Excimer (193nm)";
    if (selectedPatient.type === "RENAL") laserType = "Ho:YAG (2100nm)";

    addLog("VITALIS", `Arming ${laserType} Laser Array...`);
    await delay(2000);
    addLog("SYSTEM", "FIRING LASER.");
    setLaserState("GROWING");

    for (let i = 0; i < 10; i++) {
      await delay(800);
      setProgress(60 + (i * 4));
      if (i === 5) addLog("SENSOR", "Tissue Temp: 42°C (Optimal)");
    }

    setDestroyed(true);
    addLog("SYSTEM", "Target Eliminated.");
    await delay(1000);
    setLaserState("SHRINKING");
    await delay(1000);
    setLaserState("OFF");
    setProgress(100);

    setActiveTool("LEARNING");
    addLog("RLHF", "Ingesting Telemetry for Model Training...");
    await delay(1500);
    const newInsight = INSIGHTS[Math.floor(Math.random() * INSIGHTS.length)];
    setLearnedInsight(newInsight);
    setVersion(v => {
      const parts = v.split('.');
      return `${parts[0]}.${parts[1]}.${parseInt(parts[2]) + 1}`;
    });
    addLog("RLHF", `Model Updated. Accuracy +0.003%. New Version: ${version}`);

    addLog("SYSTEM", "Procedure Complete.");
    setPatients(prev => prev.map(p => p.id === selectedPatient.id ? { ...p, status: "COMPLETED" } : p));

    await delay(1500);
    
    
    setView("DETAIL"); 
    setShowSuccessReport(true);
  };

  const isLocked = selectedPatient?.status === "COMPLETED" || selectedPatient?.status === "CANCELLED";

  return (
    <div className="w-screen h-screen bg-black overflow-hidden font-mono text-xs flex relative">
      <button
        onClick={() => setIsListening(!isListening)}
        className={`fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-2xl transition-all border border-gray-800 flex items-center gap-2 ${isListening ? 'bg-red-600/90 text-white animate-pulse' : 'bg-gray-900 text-gray-500 hover:text-white'}`}>
        <Mic size={18} /><span className="font-bold">{isListening ? "LISTENING" : "VOICE"}</span>
      </button>

      {view !== "SURGERY" && (
        <>
          <div className="w-1/4 h-full border-r border-green-900/50 bg-[#050505] flex flex-col z-20">
            <div className="p-6 border-b border-green-900/50">
              <h1 className="text-2xl font-black text-white tracking-widest">DEEPS<span className="text-cyan-400">.OS</span></h1>
              <div className="flex justify-between items-center mt-1">
                <div className="text-gray-500 text-[10px]">TRAUMA UNIT</div>
                <div className="text-yellow-500 font-bold text-[10px] animate-pulse">KERNEL v{version}</div>
              </div>
            </div>
            <div className="flex p-2 gap-1 border-b border-gray-900">
              {["ALL", "NEURO", "OCULAR", "RENAL"].map((f) => (
                <button key={f} onClick={() => setFilter(f as any)} className={`flex-1 py-2 text-[10px] font-bold rounded ${filter === f ? 'bg-cyan-900 text-cyan-400' : 'text-gray-600 hover:bg-gray-900'}`}>{f}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredPatients.map(p => (
                <button key={p.id} onClick={() => handleSelectPatient(p)} className={`w-full text-left p-4 rounded border transition-all ${selectedPatient?.id === p.id ? 'bg-cyan-900/20 border-cyan-500 text-white' : 'bg-gray-900/20 border-gray-800 text-gray-400 hover:bg-gray-800'} ${p.risk === "CRITICAL" ? "border-l-4 border-l-red-500" : ""}`}>
                  <div className="flex justify-between items-center mb-1"><span className="font-bold text-sm flex items-center gap-2">{p.type === "NEURO" && <Brain size={12} />}{p.type === "OCULAR" && <Eye size={12} />}{p.type === "RENAL" && <Droplet size={12} />}{p.scheduledTime}</span><span className={`${p.risk === "CRITICAL" ? "text-red-500 animate-pulse" : "text-yellow-500"}`}>{p.risk}</span></div>
                  <div className="font-bold mb-1">{p.name}</div>
                  <div className="flex justify-between text-[10px] opacity-70"><span>{p.condition}</span><span className={p.status === "CANCELLED" ? "text-red-500" : p.status === "COMPLETED" ? "text-green-500" : "text-gray-500"}>{p.status}</span></div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-[#020202] relative p-12 flex flex-col">
            {selectedPatient ? (
              <div className="animate-in fade-in h-full flex flex-col">
                <div className="flex justify-between items-start mb-8 border-b border-gray-800 pb-4">
                  <div><h2 className="text-5xl text-white font-bold mb-2">{selectedPatient.name}</h2><div className="flex gap-6 text-gray-400 text-sm"><span>ID: {selectedPatient.id}</span><span>TYPE: {selectedPatient.type}</span></div></div>
                  <div className="text-right"><div className="text-red-500 font-bold text-2xl flex items-center gap-2 justify-end"><ShieldCheck size={24} /> {selectedPatient.risk}</div></div>
                </div>
                <div className="grid grid-cols-2 gap-8 flex-1">
                  <div className="bg-gray-900/30 border border-gray-800 p-8 rounded">
                    <h3 className="text-cyan-400 flex items-center gap-2 mb-6 text-lg"><Activity size={20} /> BIO-METRICS</h3>
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">SPECIFIC METRIC</span><span className={`font-bold text-xl ${selectedPatient.vitals.specificMetric?.includes("HIGH") || selectedPatient.vitals.specificMetric?.includes("DANGEROUS") ? 'text-red-500 animate-pulse' : 'text-white'}`}>{selectedPatient.vitals.specificMetric}</span></div>
                      <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">BLOOD TYPE</span><span className="text-white font-bold">{selectedPatient.vitals.bloodType}</span></div>
                      <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">WEIGHT</span><span className="text-white font-bold">{selectedPatient.vitals.weight} KG</span></div>
                    </div>
                  </div>
                  <div className="bg-gray-900/30 border border-gray-800 p-8 rounded">
                    <h3 className="text-cyan-400 flex items-center gap-2 mb-6 text-lg"><Scan size={20} /> SCAN DATA</h3>
                    <ul className="list-disc list-inside text-gray-300 space-y-3 text-sm">
                      <li>Scan: {selectedPatient.scanInfo.type}</li>
                      <li>Resolution: {selectedPatient.scanInfo.resolution}</li>
                      <li>Primary Condition: {selectedPatient.condition}</li>
                      <li className="text-yellow-500">Allergies: {selectedPatient.allergies}</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-4">
                    
                    {selectedPatient.status === "COMPLETED" ? (
                        <>
                            <button onClick={() => setShowSuccessReport(true)} className="px-8 py-6 rounded font-bold tracking-widest text-lg flex items-center gap-3 shadow-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-600">
                                <FileText/> VIEW PATIENT REPORT
                            </button>
                            <button onClick={() => downloadReport("AI_LOGS")} className="px-8 py-6 rounded font-bold tracking-widest text-lg flex items-center gap-3 shadow-lg bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-600">
                                <Database/> DOWNLOAD AI LOGS
                            </button>
                        </>
                    ) : (
                        <button 
                            id="initiate-btn" 
                            onClick={executeSurgerySequence} 
                            disabled={selectedPatient.status === "CANCELLED"} 
                            className={`px-12 py-6 rounded font-bold tracking-widest text-lg flex items-center gap-3 shadow-lg transition-all ${selectedPatient.status === "CANCELLED" ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-cyan-700 hover:bg-cyan-600 text-white"}`}
                        >
                            {selectedPatient.status === "CANCELLED" ? <><XCircle /> ABORTED</> : <><Zap /> INITIATE SURGERY</>}
                        </button>
                    )}
                </div>
              </div>
            ) : <div className="flex items-center justify-center h-full text-gray-700">SELECT A PATIENT</div>}
          </div>
        </>
      )}

      {view === "SURGERY" && selectedPatient && (
        <div className="flex w-full h-full animate-in fade-in">
          <div className={`w-1/2 border-r border-gray-800 p-8 flex flex-col relative overflow-hidden transition-colors duration-500 ${panicMode ? 'bg-[#220000]' : 'bg-[#0a0a0a]'}`}>
            <div className="mb-6 border-b border-gray-800 pb-4 flex justify-between items-center">
              <div className={`${panicMode ? 'text-red-500' : 'text-cyan-500'} font-bold text-2xl flex items-center gap-3`}><Terminal size={24} /> {selectedPatient.type} KERNEL</div>
              <div className="flex gap-2"><div className={`flex items-center gap-2 px-3 py-1 rounded border border-gray-800 ${TOOLS[activeTool].color} bg-gray-900`}>{TOOLS[activeTool].icon}<span className="font-bold">{TOOLS[activeTool].name}</span></div></div>
            </div>
            <div className="flex-1 bg-black p-4 font-mono text-sm overflow-y-auto border border-gray-800 rounded shadow-inner">
              {logs.map((l, i) => (<div key={i} className="mb-2 flex gap-3"><span className={`${panicMode ? 'text-red-500' : 'text-cyan-700'} font-bold w-24 shrink-0`}>[{l.source}]</span><span className="text-white">{l.msg}</span></div>))}
              <div ref={logsEndRef} />
            </div>
          </div>
          <div className="w-1/2 relative bg-black">
            
           
            <MissionControl patient={selectedPatient} active={true} />
            
            <Canvas camera={{ position: [0, 2, 6], fov: 40 }}>
              <color attach="background" args={["#000"]} />
              <EffectComposer disableNormalPass><Bloom luminanceThreshold={0.1} mipmapBlur intensity={1.5} radius={0.4} /><Noise opacity={0.02} /><Vignette eskil={false} offset={0.1} darkness={1.1} /></EffectComposer>
              <Stars radius={50} count={1000} factor={4} fade />
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} color="#00ff00" />
              <group rotation={[0, 0, 0.1]}>
                {selectedPatient.type === "NEURO" && <RealisticBrain />}
                {selectedPatient.type === "OCULAR" && <RealisticEye />}
                {selectedPatient.type === "RENAL" && <RealisticKidney />}
                <TargetMass position={selectedPatient.tumorPos} destroyed={destroyed} type={selectedPatient.type} visible={targetVisible} />
              </group>
              <RobotArm targetPos={selectedPatient.tumorPos} laserState={laserState} type={selectedPatient.type} />
              <OrbitControls enableZoom={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
            </Canvas>
          </div>
        </div>
      )}

      
      {showSuccessReport && selectedPatient && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen bg-black flex items-end justify-start p-16">
          <div className="bg-white text-black p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(255,255,255,0.2)] relative font-mono border-t-8 border-cyan-600 rounded-lg animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="flex justify-between border-b-2 border-black pb-4 mb-4">
              <div><h1 className="text-3xl font-black tracking-tighter">DEEPS<span className="text-cyan-600">.OS</span> FINAL REPORT</h1><div className="text-xs font-bold text-gray-500">LEVEL 1 TRAUMA UNIT | SURGICAL LOG</div></div>
              <div className="text-right"><div className="text-4xl font-black">{selectedPatient.id}</div><div className="text-xs font-bold bg-green-200 px-2">STATUS: DISCHARGED</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div><div className="font-bold text-gray-500">PATIENT IDENTITY</div><div className="text-lg font-bold">{selectedPatient.name}</div></div>
              <div><div className="font-bold text-gray-500">PROCEDURE</div><div className="text-lg font-bold">{selectedPatient.type} ABLATION</div></div>
              <div><div className="font-bold text-gray-500">OPERATION DATE</div><div className="font-bold">{new Date().toLocaleDateString()}</div></div>
              <div><div className="font-bold text-gray-500">SYSTEM OUTCOME</div><div className="text-green-600 font-black">SUCCESSFUL</div></div>
            </div>
            <div className="bg-gray-100 p-4 border-l-4 border-yellow-500 mb-6 shadow-inner">
              <div className="text-[10px] font-black text-gray-500 flex items-center gap-2 mb-1"><Database size={12} /> NEURAL FEEDBACK LOOP</div>
              <div className="font-bold text-sm text-gray-800">"{learnedInsight}"</div>
              <div className="text-[10px] text-gray-400 mt-2 font-mono">Global Model Weights Updated - Kernel v{version}</div>
            </div>
            <div className="flex gap-4 border-t-2 border-black pt-4">
              <button onClick={() => downloadReport("PATIENT_SUCCESS")} className="flex-1 bg-black text-white px-6 py-4 font-bold hover:bg-gray-800 flex items-center justify-center gap-2 rounded transition-all"><FileText size={18} /> PATIENT RX</button>
              <button onClick={() => downloadReport("AI_LOGS")} className="flex-1 border-2 border-black bg-white text-black px-6 py-4 font-bold hover:bg-gray-100 flex items-center justify-center gap-2 rounded transition-all"><FileCode size={18} /> KERNEL LOGS</button>
              <button onClick={() => {setShowSuccessReport(false);}} className="px-6 py-4 text-gray-400 hover:text-black font-bold transition-colors">CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {showAbortReport && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen bg-black flex items-end justify-start p-16">
          <div className="bg-white border-4 border-red-600 p-10 rounded-lg max-w-lg shadow-[0_0_100px_rgba(255,0,0,0.4)] animate-in slide-in-from-bottom-10 fade-in duration-300 relative">
            <AlertTriangle className="absolute top-4 right-4 text-red-100" size={100} />
            <div className="relative z-10">
                <h1 className="text-5xl text-red-600 mb-2 font-black tracking-tighter">ABORTED</h1>
                <div className="text-xl font-bold text-black mb-6 border-b border-gray-300 pb-4">SAFETY PROTOCOL TRIGGERED</div>
                <div className="mb-8"><div className="text-xs text-gray-500 font-bold mb-1">PRIMARY CAUSE</div><div className="text-2xl font-mono bg-red-100 text-red-800 p-2 border-l-4 border-red-600">{abortReason}</div></div>
                <div className="space-y-3">
                    <button onClick={() => downloadReport("REFERRAL")} className="bg-red-600 text-white px-8 py-4 rounded font-bold hover:bg-red-700 w-full flex items-center justify-center gap-3 transition-all shadow-lg"><FileText size={20} /> DOWNLOAD SPECIALIST REFERRAL</button>
                    <button onClick={() => { setShowAbortReport(false); setView("LIST"); }} className="bg-gray-200 text-gray-600 px-8 py-4 rounded font-bold hover:bg-gray-300 w-full transition-all">ACKNOWLEDGE & RETURN</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}