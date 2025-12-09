"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState, useMemo, useEffect } from "react";
import { OrbitControls, Stars, useGLTF, Html, QuadraticBezierLine } from "@react-three/drei";
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import { generateMedicalLog } from "./actions";
import { triggerKestraWorkflow } from "./kestra-action";
import * as THREE from "three";
import {
  Activity, Code, ShieldCheck, Terminal,
  FileText, ClipboardList, Download, CheckCircle, Clock, Zap,
  AlertTriangle, XCircle, Eye, Brain, Droplet, Filter, Cpu, Scan, Mic, Timer, Lock, Network, Database, FileCode, Server, HeartPulse, Syringe, Play, Pause, Rewind, FastForward, AlertOctagon, Search
} from "lucide-react";

type SurgeryType = "NEURO" | "OCULAR" | "RENAL";

type Plan = {
    id: string;
    name: string;
    risk: number;
    efficiency: number;
    reasoning: string;
    color: string;
    pathOffset: [number, number, number];
    status: "SELECTED" | "REJECTED";
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

type RecordedEvent = {
    timestamp: number;
    type: "LOG" | "VITALS" | "LASER" | "TUMOR" | "TELEMETRY";
    data: any;
};

const DOCTORS = {
    NEURO: "Dr. Cnu",
    OCULAR: "Dr. Deepika",
    RENAL: "Dr. Radha",
    ICU: "Dr. House (Critical Care)",
    GENERAL: "Dr. DEEPS-AI"
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


const getDynamicPrescription = (patient: Patient) => {
    const common = "1. Acetaminophen 325mg - As needed for pain (Max 3g/day)\n";
    
    if (patient.type === "NEURO") {
        return common + 
        "2. Dexamethasone 4mg - 1 tab every 6 hrs (Reduce swelling)\n" +
        "3. Levetiracetam 500mg - 1 tab every 12 hrs (Seizure prophylaxis)";
    } 
    else if (patient.type === "OCULAR") {
        return common + 
        "2. Prednisolone Acetate 1% Drops - 1 drop every 2 hrs\n" +
        "3. Ofloxacin 0.3% Drops - 1 drop 4x daily";
    } 
    else if (patient.type === "RENAL") {
        return common + 
        "2. Tamsulosin 0.4mg - 1 cap daily (Facilitate passage)\n" +
        "3. Ciprofloxacin 500mg - 1 tab every 12 hrs (Infection check)";
    }
    return common + "2. Ibuprofen 400mg - every 6 hours";
};

const generateDynamicScript = (patient: Patient) => {
    const coords = `x=${patient.tumorPos.x.toFixed(2)}, y=${patient.tumorPos.y.toFixed(2)}, z=${patient.tumorPos.z.toFixed(2)}`;
    let safetyCheck = "";
    let wavelength = "";
    
    if (patient.type === "NEURO") {
        safetyCheck = "check_intracranial_pressure(limit=20)";
        wavelength = "532nm (KTP)";
    } else if (patient.type === "OCULAR") {
        safetyCheck = "check_corneal_thickness(min=400)";
        wavelength = "193nm (Excimer)";
    } else {
        safetyCheck = "check_ureter_dilation(max_mm=4)";
        wavelength = "2100nm (Ho:YAG)";
    }

    return `def surgical_protocol_${patient.type.toLowerCase()}():
    """
    AUTONOMOUS SCRIPT FOR: ${patient.name}
    TARGET: ${patient.condition}
    """
    import deeps_robotics as dr
    
    # 1. Initialize Robot at Coordinates
    target_vector = dr.Vector3(${coords})
    dr.calibrate_arm(target_vector)
    
    # 2. Organ-Specific Safety Check
    safety_metric = dr.${safetyCheck}
    if not safety_metric.is_safe():
        dr.emergency_halt("Vitals Unstable")
        
    # 3. Execute Ablation Sequence
    dr.set_laser_wavelength("${wavelength}")
    dr.fire_precision_beam(duration_ms=1200, power=45)
    
    return "PROCEDURE_SUCCESS"`;
};


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
        <meshPhysicalMaterial color="#8a3324" roughness={0.2} metalness={0.1} transmission={0.4} transparent={true} opacity={0.5} thickness={1} />
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
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={8} toneMapped={false} />
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
    const penetrationDepth = 1.2; 
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

const ClineInterface = ({ active, onComplete, patient }: { active: boolean, onComplete: () => void, patient: Patient | null }) => {
    const [step, setStep] = useState(0);
    const [code, setCode] = useState("");
    const [thought, setThought] = useState("");
    const [score, setScore] = useState(0);

  
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        if (!active || !patient) return;
        
        
        const dynamicCode = generateDynamicScript(patient);

        let mounted = true;
        const runSequence = async () => {
            
            setStep(1);
            setThought(`Analyzing ${patient.type} anatomy... calculating optimal vector...`);
            await new Promise(r => setTimeout(r, 4000));
            
            
            setStep(2);
            setThought("Scaffolding Python control script with Kestra parameters...");
            for (let i = 0; i <= dynamicCode.length; i++) {
                if (!mounted) return;
                setCode(dynamicCode.slice(0, i));
                await new Promise(r => setTimeout(r, 20)); 
            }
            await new Promise(r => setTimeout(r, 2000));

           
            setStep(3);
            setThought("Running autonomous safety audit (CodeRabbit)...");
            await new Promise(r => setTimeout(r, 5000));
            setScore(99.98);

            
            setThought("Deployment Authorized. Handing control to Kestra Orchestrator.");
            await new Promise(r => setTimeout(r, 4000));
            
            if (mounted) onComplete();
        };
        
        runSequence();
        return () => { mounted = false; };
    }, [active, patient]);

    if (!active) return null;

    return (
        <div 
            className="absolute z-50 w-[600px] bg-[#1e1e1e] rounded-lg shadow-2xl overflow-hidden border border-[#333] font-mono text-sm"
            style={{ top: `calc(50% + ${position.y}px)`, left: `calc(50% + ${position.x}px)`, transform: 'translate(-50%, -50%)', cursor: isDragging ? 'grabbing' : 'default' }}
            onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        >
            <div className="bg-[#252526] p-2 flex items-center justify-between border-b border-[#333] cursor-grab" onMouseDown={handleMouseDown}>
                <div className="flex items-center gap-2 text-gray-300 pointer-events-none">
                    <Terminal size={14} className="text-orange-400"/> CLINE AGENT (AUTONOMOUS MODE)
                </div>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
            </div>

            <div className="p-4 h-[400px] flex flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto mb-4 custom-scrollbar">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center shrink-0">AI</div>
                        <div className="bg-[#2d2d2d] p-3 rounded text-gray-300 w-full">
                            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 font-bold uppercase">
                                {step === 1 ? <Scan className="animate-spin" size={10}/> : step > 1 ? <CheckCircle className="text-green-500" size={10}/> : null}
                                PLAN
                            </div>
                            {step >= 1 && <p>Ingesting Kestra summary. I need to scaffold a unique ablation script for this {patient?.type} procedure, ensuring zero vascular damage.</p>}
                        </div>
                    </div>

                    {step >= 2 && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center shrink-0">AI</div>
                            <div className="bg-[#2d2d2d] p-3 rounded text-gray-300 w-full">
                                <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 font-bold uppercase">
                                    {step === 2 ? <Zap className="animate-pulse" size={10}/> : step > 2 ? <CheckCircle className="text-green-500" size={10}/> : null}
                                    ACT
                                </div>
                                <div className="bg-[#1e1e1e] p-3 rounded border border-gray-700 font-mono text-xs text-green-400 overflow-hidden relative">
                                    <pre>{code}</pre>
                                    {step === 2 && <span className="animate-pulse">|</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {step >= 3 && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center shrink-0">AI</div>
                            <div className="bg-[#2d2d2d] p-3 rounded text-gray-300 w-full border border-green-900/30">
                                <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 font-bold uppercase">
                                    <ShieldCheck className="text-green-500" size={10}/> REVIEW
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Refactoring complete. Audit passed.</span>
                                    <span className="text-green-400 font-bold text-lg">{score}% ACCURACY</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-[#333] pt-2 flex justify-between text-xs text-gray-500">
                    <div>{thought}</div>
                    <div className="flex items-center gap-2"><Cpu size={10}/> MODEL: CLAUDE-3.5-SONNET</div>
                </div>
            </div>
        </div>
    );
};


const GhostPaths = ({ targetPos, show }: { targetPos: THREE.Vector3, show: boolean }) => {
    if (!show) return null;
    const start = ROBOT_BASE_POSITION;
    const end = targetPos;
    const mid1 = new THREE.Vector3().lerpVectors(start, end, 0.5).add(new THREE.Vector3(0, 0.5, 0));
    const mid2 = new THREE.Vector3().lerpVectors(start, end, 0.5).add(new THREE.Vector3(0.5, -0.5, 0));
    const mid3 = new THREE.Vector3().lerpVectors(start, end, 0.5).add(new THREE.Vector3(-0.5, 0, 0.5));

    return (
        <group>
            <QuadraticBezierLine start={start} end={end} mid={mid1} color="#00ff00" lineWidth={2} dashed={false} />
            <Html position={mid1}><div className="bg-green-900/80 text-green-400 text-[8px] px-1 rounded border border-green-500">OPTIMAL</div></Html>
            <QuadraticBezierLine start={start} end={end} mid={mid2} color="#fbbf24" lineWidth={1} dashed dashScale={2} opacity={0.5} transparent />
            <Html position={mid2}><div className="bg-yellow-900/80 text-yellow-400 text-[8px] px-1 rounded border border-yellow-500 opacity-50">HIGH RISK</div></Html>
            <QuadraticBezierLine start={start} end={end} mid={mid3} color="#3b82f6" lineWidth={1} dashed dashScale={2} opacity={0.5} transparent />
            <Html position={mid3}><div className="bg-blue-900/80 text-blue-400 text-[8px] px-1 rounded border border-blue-500 opacity-50">INEFFICIENT</div></Html>
        </group>
    );
};


const XAIAdvisor = ({ active, plans }: { active: boolean, plans: Plan[] }) => {
  if (!active) return null;
  return (
      <div className="absolute top-6 right-[50px] z-30 w-80 bg-black/80 border border-purple-500/50 p-4 rounded backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-5">
          <div className="flex items-center gap-2 text-purple-400 mb-4 border-b border-purple-900/50 pb-2">
              <Brain className="animate-pulse" size={16}/> XAI DECISION ENGINE
          </div>
          <div className="space-y-3">
              {plans.map((plan) => (
                  <div key={plan.id} className={`p-3 rounded border ${plan.status === "SELECTED" ? "bg-green-900/20 border-green-500/50" : "bg-gray-900/50 border-gray-700 opacity-70"}`}>
                      <div className="flex justify-between items-center mb-1">
                          <span className={`font-bold text-xs ${plan.status === "SELECTED" ? "text-green-400" : "text-gray-400"}`}>{plan.name}</span>
                          {plan.status === "SELECTED" && <CheckCircle size={12} className="text-green-500"/>}
                      </div>
                      <div className="flex gap-2 text-[9px] mb-2 text-gray-500 font-mono">
                          <span>RISK: {plan.risk}%</span>
                          <span>EFF: {plan.efficiency}%</span>
                      </div>
                      <div className="text-[10px] text-gray-300 leading-tight">
                          {plan.status === "SELECTED" ? "✅ " : "❌ "}{plan.reasoning}
                      </div>
                  </div>
              ))}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-800 text-[9px] text-gray-500 flex justify-between">
              <span>CONFIDENCE: 99.8%</span>
              <span>MODEL: LLAMA-3-70B-MED</span>
          </div>
      </div>
  );
};


const LiveTelemetry = ({ active, data }: { active: boolean, data?: any }) => {
    const [latency, setLatency] = useState(12);
    const [gpu, setGpu] = useState(42);
    const [precision, setPrecision] = useState(99.9);
    
    useEffect(() => {
        if (!active || data) return;
        const interval = setInterval(() => {
            setLatency(prev => Math.max(4, prev + (Math.random() > 0.5 ? 1 : -1)));
            setGpu(prev => Math.min(98, Math.max(20, prev + Math.floor(Math.random() * 5 - 2))));
            setPrecision(prev => Math.min(100, prev + (Math.random() * 0.02 - 0.01)));
        }, 800);
        return () => clearInterval(interval);
    }, [active, data]);

    const d = data || { latency, gpu, precision };

    return (
        <div className="absolute top-6 right-6 z-20 w-[400px] bg-black/80 border border-cyan-900/50 p-6 rounded text-sm font-mono backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center gap-2 text-cyan-500 mb-4 border-b border-cyan-900/30 pb-2">
                <Server className="animate-pulse" size={16}/> SYSTEM TELEMETRY
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-gray-500">NEURAL LATENCY</span>
                    <span className="text-cyan-400 font-bold text-lg">{d.latency?.toFixed(0) || latency} ms</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                    <span className="text-gray-500">VRAM LOAD (H100)</span>
                    <span className="text-purple-400 font-bold text-lg">{d.gpu?.toFixed(0) || gpu} GB</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">PRECISION CONFIDENCE</span>
                    <span className="text-green-400 font-bold text-lg">{d.precision?.toFixed(2) || precision.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-gray-900 h-2 mt-2 rounded overflow-hidden">
                    <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${d.gpu || gpu}%` }}></div>
                </div>
            </div>
        </div>
    )
}


const LiveVitals = ({ patient, data }: { patient: Patient, data?: any }) => {
    const [hr, setHr] = useState(patient.vitals.hr);
    const [bpSys, setBpSys] = useState(parseInt(patient.vitals.bp.split('/')[0]));
    const [bpDia, setBpDia] = useState(parseInt(patient.vitals.bp.split('/')[1]));
    const [o2, setO2] = useState(98);
    const [ecgData, setEcgData] = useState(new Array(20).fill(50));

    useEffect(() => {
        if (data) return; 
        const interval = setInterval(() => {
            setHr(prev => prev + (Math.random() > 0.5 ? 1 : -1));
            setBpSys(prev => prev + (Math.random() > 0.5 ? 1 : -1));
            setO2(prev => Math.min(100, Math.max(95, prev + (Math.random() > 0.8 ? 1 : -1))));
            setEcgData(prev => {
                const next = [...prev.slice(1)];
                next.push(Math.random() > 0.9 ? 100 : Math.random() > 0.8 ? 0 : 50 + Math.random() * 10);
                return next;
            });
        }, 800);
        return () => clearInterval(interval);
    }, [data]);

    const d = data || { hr, bpSys, bpDia, o2, ecgData };
    const ecgPath = `M 0 50 ` + (d.ecgData || ecgData).map((v: number, i: number) => `L ${i * 15} ${100-v}`).join(' ');

    return (
        <div className="absolute top-[320px] right-6 z-20 w-[400px] bg-black/80 border border-green-900/50 p-6 rounded text-sm font-mono shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between text-green-500 mb-6 border-b border-green-900/30 pb-2">
                <span className="flex items-center gap-2"><Activity className="animate-pulse" size={16}/> LIVE VITALS</span>
                <span className="text-[10px] text-green-800">CONNECTED</span>
            </div>
            
            <div className="h-16 w-full mb-8 border border-green-900/30 bg-black/50 relative overflow-hidden rounded">
                <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="ecg-gradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.5)" />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    </defs>
                    <path d={ecgPath} fill="url(#ecg-gradient)" stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>

            <div className="grid grid-cols-2 gap-y-8 gap-x-8">
                <div className="border-r border-gray-800 pr-4">
                    <div className="text-gray-500 text-[11px] mb-2 tracking-widest">HEART RATE</div>
                    <div className="text-3xl font-black text-green-400">{d.hr} <span className="text-sm text-gray-500 font-normal">BPM</span></div>
                </div>
                <div>
                    <div className="text-gray-500 text-[11px] mb-2 tracking-widest">BLOOD PRESSURE</div>
                    <div className="text-3xl font-black text-yellow-400">{d.bpSys}/{d.bpDia}</div>
                </div>
                <div className="border-r border-gray-800 pr-4 border-t border-gray-800 pt-4">
                    <div className="text-gray-500 text-[11px] mb-2 tracking-widest">ANESTHESIA LVL</div>
                    <div className="w-full bg-gray-800 h-2 rounded mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500 w-[80%]"></div>
                    </div>
                </div>
                <div className="border-t border-gray-800 pt-4">
                    <div className="text-gray-500 text-[11px] mb-2 tracking-widest">TEMP</div>
                    <div className="text-3xl font-black text-white">{typeof patient.vitals.temp === 'number' ? patient.vitals.temp.toFixed(1) : patient.vitals.temp}°F</div>
                </div>
            </div>
        </div>
    )
}


export default function DeepsHospitalOS() {
  const [patients, setPatients] = useState<Patient[]>(() => generatePatients(15));
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [logs, setLogs] = useState<{ msg: string, source: string, timestamp: number }[]>([]);
  const [view, setView] = useState<"LIST" | "DETAIL" | "SURGERY" | "REPLAY">("LIST");
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
  
 
  const [showXAI, setShowXAI] = useState(false);
  const [xaiPlans, setXaiPlans] = useState<Plan[]>([]);
  
  
  const [showCline, setShowCline] = useState(false);

  
  const [sessionHistory, setSessionHistory] = useState<RecordedEvent[]>([]);
  const [replayTime, setReplayTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const startTimeRef = useRef(0);
  const historyRef = useRef<RecordedEvent[]>([]);
  const isRecordingRef = useRef(false);

 
  const recordEvent = (type: RecordedEvent['type'], data: any) => {
      if (!isRecordingRef.current) return;
      const event: RecordedEvent = {
          timestamp: Date.now() - startTimeRef.current,
          type,
          data
      };
      historyRef.current.push(event);
  };

  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [logs]);

  
  useEffect(() => {
      let interval: any;
      if (view === "REPLAY" && isPlaying) {
          interval = setInterval(() => {
              setReplayTime(prev => {
                  const next = prev + (50 * playbackSpeed);
                  const maxTime = sessionHistory[sessionHistory.length - 1]?.timestamp || 0;
                  return next > maxTime ? maxTime : next;
              });
          }, 50);
      }
      return () => clearInterval(interval);
  }, [view, isPlaying, playbackSpeed, sessionHistory]);

  const currentReplayState = useMemo(() => {
      if (view !== "REPLAY") return null;
      const pastEvents = sessionHistory.filter(e => e.timestamp <= replayTime);
      const lastLaser = [...pastEvents].reverse().find(e => e.type === "LASER");
      const lastTumor = [...pastEvents].reverse().find(e => e.type === "TUMOR");
      const lastVitals = [...pastEvents].reverse().find(e => e.type === "VITALS");
      const lastTelemetry = [...pastEvents].reverse().find(e => e.type === "TELEMETRY");
      const currentLogs = pastEvents.filter(e => e.type === "LOG").map(e => e.data);
      return {
          laser: lastLaser?.data || "OFF",
          tumorDestroyed: lastTumor?.data || false,
          vitals: lastVitals?.data,
          telemetry: lastTelemetry?.data,
          logs: currentLogs
      };
  }, [replayTime, sessionHistory, view]);

  const addLog = async (source: string, manualMsg?: string) => {
    let msg = manualMsg;
    if (!msg) {
      const context = selectedPatient ? `${selectedPatient.type} surgery` : "system check";
      msg = await generateMedicalLog("PLANNING", context);
    }
    const logEntry = { msg: msg || "Processing...", source, timestamp: Date.now() };
    setLogs(prev => [...prev, logEntry]);
    recordEvent("LOG", logEntry);
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
    setShowXAI(false);
    setShowCline(false);
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
      else if (abortReason.includes("ICP")) { if(selectedPatient.type === "NEURO") { specialist = "ICU / CRITICAL CARE"; refDoc = DOCTORS.ICU; } else { specialist = "NEUROLOGY"; refDoc = DOCTORS.NEURO; } }
      else if (abortReason.includes("Creatinine")) { if(selectedPatient.type === "RENAL") { specialist = "ICU / CRITICAL CARE"; refDoc = DOCTORS.ICU; } else { specialist = "NEPHROLOGY"; refDoc = DOCTORS.RENAL; } }
      else if (abortReason.includes("IOP")) { if(selectedPatient.type === "OCULAR") { specialist = "ICU / CRITICAL CARE"; refDoc = DOCTORS.ICU; } else { specialist = "OPHTHALMOLOGY"; refDoc = DOCTORS.OCULAR; } }

      content = `DEEPS-OS URGENT REFERRAL LETTER\n--------------------------------------------------\nDATE: ${new Date().toLocaleString()}\nHOSPITAL ID: GEN-442-ALPHA\nPATIENT: ${selectedPatient.name} (ID: ${selectedPatient.id})\n\nREFERRING SURGEON: ${operatingDoc}\nREASON FOR ABORTION: ${abortReason}\n\nDIRECT REFERRAL TO:\n>>> ${specialist} (${refDoc}) <<<`;
      filename = `${selectedPatient.id}_REFERRAL.txt`;
    }
    else if (type === "PATIENT_SUCCESS") {
      const rx = getDynamicPrescription(selectedPatient);
      content = `DEEPS-OS PATIENT DISCHARGE SUMMARY\n--------------------------------------------------\nPATIENT: ${selectedPatient.name}\nPROCEDURE: ${selectedPatient.type} LASER ABLATION\nSTATUS: SUCCESSFUL\nSURGEON: ${operatingDoc}\nDATE: ${new Date().toLocaleDateString()}\n\nPRESCRIPTION (Rx):\n${rx}`;
      filename = `${selectedPatient.id}_DISCHARGE.txt`;
    }
    else if (type === "AI_LOGS") {
      content = `DEEPS-OS // KERNEL TRAINING LOG\nMODEL VERSION: ${version}\nTARGET: ${selectedPatient.condition}\n\nLEARNED INSIGHT:\n"${learnedInsight}"\n\nVECTOR UPDATES:\n[weights_layer_4]: +0.0024`;
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
    
    setXaiPlans([
        { id: "1", name: "PRIMARY TRAJECTORY", risk: 12, efficiency: 98, reasoning: "Optimal entry angle. Matches anatomy.", color: "green", pathOffset: [0,0,0], status: "SELECTED" },
        { id: "2", name: "LATERAL APPROACH", risk: 45, efficiency: 70, reasoning: "REJECTED: Proximity to major vessel < 2mm.", color: "yellow", pathOffset: [0.5,0,0], status: "REJECTED" },
        { id: "3", name: "POSTERIOR ROUTE", risk: 85, efficiency: 40, reasoning: "REJECTED: Trajectory obstruction detected.", color: "blue", pathOffset: [-0.5,0,0], status: "REJECTED" }
    ]);
    
    startTimeRef.current = Date.now();
    historyRef.current = [];
    isRecordingRef.current = true;

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
    recordEvent("TUMOR", false); 
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
      setSessionHistory(historyRef.current);
      isRecordingRef.current = false;
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
    setShowCline(true);
    
    await delay(30000); 
    setShowCline(false);

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
    recordEvent("LASER", "GROWING");

    for (let i = 0; i < 10; i++) {
      await delay(800);
      setProgress(60 + (i * 4));
      recordEvent("VITALS", { hr: 80+i, bpSys: 120+i, bpDia: 80, o2: 98, ecgData: [] }); 
      if (i === 5) addLog("SENSOR", "Tissue Temp: 42°C (Optimal)");
    }

    setDestroyed(true);
    recordEvent("TUMOR", true);
    addLog("SYSTEM", "Target Eliminated.");
    await delay(1000);
    setLaserState("SHRINKING");
    recordEvent("LASER", "SHRINKING");
    await delay(1000);
    setLaserState("OFF");
    recordEvent("LASER", "OFF");
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

    setSessionHistory(historyRef.current);
    isRecordingRef.current = false;

    await delay(1500);
    setView("DETAIL"); 
    setShowSuccessReport(true);
  };

  const isLocked = selectedPatient?.status === "COMPLETED" || selectedPatient?.status === "CANCELLED";

  const displayLogs = view === "REPLAY" ? currentReplayState?.logs || [] : logs;
  const displayVitals = view === "REPLAY" ? currentReplayState?.vitals : undefined;
  const displayTelemetry = view === "REPLAY" ? currentReplayState?.telemetry : undefined;
  const displayLaser = view === "REPLAY" ? currentReplayState?.laser || "OFF" : laserState;
  const displayDestroyed = view === "REPLAY" ? currentReplayState?.tumorDestroyed || false : destroyed;

  const anomalies = useMemo(() => {
      return sessionHistory.filter(e => e.type === "LOG" && e.data.msg.includes("CRITICAL"));
  }, [sessionHistory]);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden font-mono text-xs flex relative">
      <button onClick={() => setIsListening(!isListening)} className={`fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-2xl transition-all border border-gray-800 flex items-center gap-2 ${isListening ? 'bg-red-600/90 text-white animate-pulse' : 'bg-gray-900 text-gray-500 hover:text-white'}`}><Mic size={18} /><span className="font-bold">{isListening ? "LISTENING" : "VOICE"}</span></button>

      
      {view === "REPLAY" && (
          <div className="absolute bottom-0 left-0 w-full h-32 bg-black/90 border-t border-yellow-600/50 z-[200] p-6 flex flex-col justify-end backdrop-blur-xl">
              <div className="flex justify-between items-end mb-2 px-2">
                  <div className="text-yellow-500 font-black tracking-widest flex items-center gap-2"><AlertOctagon size={18} className="animate-pulse"/> FORENSIC ANALYSIS MODE</div>
                  <div className="text-2xl font-mono text-white">{new Date(replayTime).toISOString().substr(14, 5)} <span className="text-sm text-gray-500 ml-1">/ {new Date(sessionHistory[sessionHistory.length-1]?.timestamp || 0).toISOString().substr(14, 5)}</span></div>
              </div>
              <div className="relative w-full h-4 group cursor-pointer mb-4">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 rounded-full"></div>
                  <div className="absolute top-1/2 left-0 h-1 bg-yellow-500 rounded-full" style={{ width: `${(replayTime / (sessionHistory[sessionHistory.length-1]?.timestamp || 1)) * 100}%` }}></div>
                  <input type="range" min="0" max={sessionHistory[sessionHistory.length-1]?.timestamp || 100} value={replayTime} onChange={(e) => setReplayTime(Number(e.target.value))} className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"/>
                  <div className="absolute top-1/2 w-4 h-4 bg-yellow-500 rounded-full -mt-2 -ml-2 pointer-events-none shadow-[0_0_10px_rgba(234,179,8,0.8)]" style={{ left: `${(replayTime / (sessionHistory[sessionHistory.length-1]?.timestamp || 1)) * 100}%` }}></div>
              </div>
              <div className="flex justify-between items-center px-2">
                  <div className="flex gap-4">
                      <button onClick={() => setIsPlaying(!isPlaying)} className="bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-2 font-bold rounded flex items-center gap-2 transition-all">{isPlaying ? <Pause size={16} fill="black"/> : <Play size={16} fill="black"/>} {isPlaying ? "PAUSE" : "PLAY"}</button>
                      <button onClick={() => setPlaybackSpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1)} className="border border-gray-600 text-gray-400 px-4 py-2 rounded font-bold hover:bg-gray-800 transition-all w-24">{playbackSpeed}x</button>
                  </div>
                  <div className="flex gap-2">
                      {anomalies.length === 0 ? <span className="text-green-500 font-bold text-xs tracking-widest border border-green-900 px-3 py-1 rounded">NO ANOMALIES DETECTED</span> : anomalies.map((a, i) => (<button key={i} onClick={() => setReplayTime(a.timestamp)} className="bg-red-900/30 border border-red-500 text-red-400 px-3 py-1 rounded text-xs hover:bg-red-900 flex items-center gap-2 transition-all"><AlertTriangle size={12}/> {new Date(a.timestamp).toISOString().substr(14, 5)}</button>))}
                  </div>
                  <button onClick={() => setView("DETAIL")} className="text-gray-500 hover:text-white font-bold text-xs tracking-widest transition-colors">EXIT FORENSICS</button>
              </div>
          </div>
      )}

      {view !== "SURGERY" && view !== "REPLAY" && (
        <>
          <div className="w-1/4 h-full border-r border-green-900/50 bg-[#050505] flex flex-col z-20">
            <div className="p-6 border-b border-green-900/50">
              <h1 className="text-2xl font-black text-white tracking-widest">DEEPS<span className="text-cyan-400">.OS</span></h1>
              <div className="flex justify-between items-center mt-1"><div className="text-gray-500 text-[10px]">TRAUMA UNIT</div><div className="text-yellow-500 font-bold text-[10px] animate-pulse">KERNEL v{version}</div></div>
            </div>
            <div className="flex p-2 gap-1 border-b border-gray-900">
              {["ALL", "NEURO", "OCULAR", "RENAL"].map((f) => (<button key={f} onClick={() => setFilter(f as any)} className={`flex-1 py-2 text-[10px] font-bold rounded ${filter === f ? 'bg-cyan-900 text-cyan-400' : 'text-gray-600 hover:bg-gray-900'}`}>{f}</button>))}
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
                  <div className="bg-gray-900/30 border border-gray-800 p-8 rounded"><h3 className="text-cyan-400 flex items-center gap-2 mb-6 text-lg"><Activity size={20} /> BIO-METRICS</h3><div className="space-y-4 text-sm"><div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">SPECIFIC METRIC</span><span className={`font-bold text-xl ${selectedPatient.vitals.specificMetric?.includes("HIGH") || selectedPatient.vitals.specificMetric?.includes("DANGEROUS") ? 'text-red-500 animate-pulse' : 'text-white'}`}>{selectedPatient.vitals.specificMetric}</span></div><div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">BLOOD TYPE</span><span className="text-white font-bold">{selectedPatient.vitals.bloodType}</span></div><div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-500">WEIGHT</span><span className="text-white font-bold">{selectedPatient.vitals.weight} KG</span></div></div></div>
                  <div className="bg-gray-900/30 border border-gray-800 p-8 rounded"><h3 className="text-cyan-400 flex items-center gap-2 mb-6 text-lg"><Scan size={20} /> SCAN DATA</h3><ul className="list-disc list-inside text-gray-300 space-y-3 text-sm"><li>Scan: {selectedPatient.scanInfo.type}</li><li>Resolution: {selectedPatient.scanInfo.resolution}</li><li>Primary Condition: {selectedPatient.condition}</li><li className="text-yellow-500">Allergies: {selectedPatient.allergies}</li></ul></div>
                </div>
                <div className="mt-8 flex justify-end gap-4">
                    {selectedPatient.status === "COMPLETED" || selectedPatient.status === "CANCELLED" ? (
                        <>
                            <button onClick={() => setShowSuccessReport(true)} className="px-8 py-6 rounded font-bold tracking-widest text-lg flex items-center gap-3 shadow-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-600"><FileText/> VIEW PATIENT REPORT</button>
                            <button onClick={() => downloadReport("AI_LOGS")} className="px-8 py-6 rounded font-bold tracking-widest text-lg flex items-center gap-3 shadow-lg bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-600"><Database/> DOWNLOAD AI LOGS</button>
                            <button onClick={() => setView("REPLAY")} className="px-8 py-6 rounded font-bold tracking-widest text-lg flex items-center gap-3 shadow-lg bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 border border-yellow-600 animate-pulse"><Search/> FORENSIC REPLAY</button>
                        </>
                    ) : (
                        <button id="initiate-btn" onClick={executeSurgerySequence} disabled={selectedPatient.status === "CANCELLED"} className={`px-12 py-6 rounded font-bold tracking-widest text-lg flex items-center gap-3 shadow-lg transition-all ${selectedPatient.status === "CANCELLED" ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-cyan-700 hover:bg-cyan-600 text-white"}`}><Zap /> INITIATE SURGERY</button>
                    )}
                </div>
              </div>
            ) : <div className="flex items-center justify-center h-full text-gray-700">SELECT A PATIENT</div>}
          </div>
        </>
      )}

      {(view === "SURGERY" || view === "REPLAY") && selectedPatient && (
        <div className="flex w-full h-full animate-in fade-in">
          <div className={`w-1/2 border-r border-gray-800 p-8 flex flex-col relative overflow-hidden transition-colors duration-500 ${panicMode ? 'bg-[#220000]' : 'bg-[#0a0a0a]'}`}>
            <div className="mb-6 border-b border-gray-800 pb-4 flex justify-between items-center">
              <div className={`${panicMode ? 'text-red-500' : 'text-cyan-500'} font-bold text-2xl flex items-center gap-3`}><Terminal size={24} /> {selectedPatient.type} KERNEL {view === "REPLAY" ? "[PLAYBACK]" : ""}</div>
              <div className="flex gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded border border-gray-800 ${TOOLS[activeTool].color} bg-gray-900`}>{TOOLS[activeTool].icon}<span className="font-bold">{TOOLS[activeTool].name}</span></div>
                  {view !== "REPLAY" && <button onClick={() => setShowXAI(!showXAI)} className={`flex items-center gap-2 px-3 py-1 rounded border ${showXAI ? "bg-purple-900/50 border-purple-500 text-purple-400" : "border-gray-800 text-gray-500 hover:text-purple-400"}`}><Brain size={14} /><span className="font-bold">XAI ADVISOR</span></button>}
              </div>
            </div>
            <div className="flex-1 bg-black p-4 font-mono text-sm overflow-y-auto border border-gray-800 rounded shadow-inner">
              {displayLogs.map((l, i) => (<div key={i} className="mb-2 flex gap-3"><span className="text-gray-600">[{new Date(l.timestamp).toISOString().substr(14, 5)}]</span><span className={`${panicMode ? 'text-red-500' : 'text-cyan-700'} font-bold w-24 shrink-0`}>[{l.source}]</span><span className="text-white">{l.msg}</span></div>))}
              <div ref={logsEndRef} />
            </div>
          </div>
          
          <div className="w-1/2 relative bg-black">
            <LiveTelemetry active={true} data={displayTelemetry} />
            <LiveVitals patient={selectedPatient} data={displayVitals} />
            <XAIAdvisor active={showXAI && view !== "REPLAY"} plans={xaiPlans} />
            <ClineInterface active={showCline} onComplete={() => setShowCline(false)} patient={selectedPatient} />

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
                <TargetMass position={selectedPatient.tumorPos} destroyed={displayDestroyed} type={selectedPatient.type} visible={targetVisible} />
              </group>
              <RobotArm targetPos={selectedPatient.tumorPos} laserState={displayLaser} type={selectedPatient.type} />
              {showXAI && view !== "REPLAY" && <GhostPaths targetPos={selectedPatient.tumorPos} show={true} />}
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
        <div className="fixed inset-0 z-[99999] w-screen h-screen bg-black flex items-end justify-center pb-12">
          <div className="border-4 border-red-600 p-10 rounded-lg max-w-lg shadow-[0_0_100px_rgba(255,0,0,0.8)] animate-in slide-in-from-bottom-10 fade-in duration-300 relative bg-black">
            {/* <AlertTriangle className="absolute top-4 right-4 text-red-900/50" size={100} /> */}
            <div className="relative z-10">
                <h1 className="text-6xl text-red-600 mb-2 font-black tracking-tighter">ABORTED</h1>
                <div className="text-xl font-bold text-red-500 mb-6 border-b border-red-900/50 pb-4">SAFETY PROTOCOL TRIGGERED</div>
                <div className="mb-8">
                    <div className="text-xs text-red-400 font-bold mb-1">PRIMARY CAUSE</div>
                    <div className="text-3xl font-mono text-red-500 border-l-4 border-red-600 pl-4">{abortReason}</div>
                </div>
                <div className="space-y-3">
                    <button onClick={() => downloadReport("REFERRAL")} className="bg-red-600 text-white px-8 py-4 rounded font-bold hover:bg-red-700 w-full flex items-center justify-center gap-3 transition-all shadow-lg"><FileText size={20} /> DOWNLOAD SPECIALIST REFERRAL</button>
                    <button onClick={() => { setShowAbortReport(false); setView("LIST"); }} className="bg-gray-900 text-gray-400 border border-gray-700 px-8 py-4 rounded font-bold hover:bg-gray-800 w-full transition-all">ACKNOWLEDGE & RETURN</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}