"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState, useMemo, useEffect } from "react";
import { OrbitControls, Stars, useGLTF, Html } from "@react-three/drei";
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import { generateMedicalLog } from "./actions";
import * as THREE from "three";
import { 
  Activity, Code, ShieldCheck, Terminal,
  FileText, ClipboardList, Download, CheckCircle, Clock, Zap, 
  AlertTriangle, XCircle, Eye, Brain, Droplet, Filter, Cpu, Scan, Lock
} from "lucide-react";


type SurgeryType = "NEURO" | "OCULAR" | "RENAL";

type Patient = {
    id: string;
    name: string;
    age: number;
    gender: "M" | "F";
    type: SurgeryType;
    vitals: { bp: string; hr: number; glucose: number; temp: number; specificMetric: string }; 
    history: string[];
    condition: string;
    allergies: string[]; 
    tumorPos: THREE.Vector3;
    scheduledTime: string;
    status: "WAITING" | "PREPPING" | "SURGERY" | "RECOVERY" | "COMPLETED" | "CANCELLED";
    risk: "CRITICAL" | "HIGH" | "MODERATE";
};


const TOOLS = {
    IDLE: { name: "STANDBY", color: "text-gray-500", icon: <Cpu size={14}/> },
    VISION: { name: "TOGETHER AI", color: "text-blue-400", icon: <Scan size={14}/> },
    OUMI: { name: "OUMI AGENT", color: "text-purple-400", icon: <Brain size={14}/> },
    CLINE: { name: "CLINE CLI", color: "text-orange-400", icon: <Terminal size={14}/> },
    RABBIT: { name: "CODE RABBIT", color: "text-green-400", icon: <ShieldCheck size={14}/> },
    KESTRA: { name: "KESTRA ORCH", color: "text-pink-400", icon: <Activity size={14}/> }
};


const generatePatients = (count: number): Patient[] => {
    const names = ["Sarah Connor", "John Smith", "Elena Rodriguez", "Akira Sato", "Marcus Aurelius", "Wei Chen", "Priya Patel", "Lars Jensen", "Amara Diallo", "David Kim", "Neo Anderson", "Trinity Moss"];
    
    const configs = [
        { type: "NEURO", conditions: ["Glioblastoma", "Meningioma"], metric: "ICP: 12mmHg" },
        { type: "OCULAR", conditions: ["Retinal Detachment", "Cataract", "Macular Hole"], metric: "IOP: 15mmHg" },
        { type: "RENAL", conditions: ["Staghorn Calculus", "Uric Acid Stone"], metric: "Creatinine: 1.1" }
    ];

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
            pos.set((Math.random()*0.5)+0.2, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5);
        } else if (config.type === "OCULAR") {
            pos.set(0.6, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3);
        } else if (config.type === "RENAL") {
            pos.set((Math.random()*0.3)+0.1, (Math.random()-0.5)*0.8, (Math.random()-0.5)*0.3);
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
                specificMetric: specificMetric
            },
            history: ["Hypertension", "None", "Asthma", "Diabetes"][Math.floor(Math.random() * 4)],
            condition: config.conditions[Math.floor(Math.random() * config.conditions.length)],
            allergies: ["None", "Penicillin", "Latex"][Math.floor(Math.random() * 3)],
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
        <group scale={1.2} rotation={[0, -Math.PI/2, 0]}> {/* Rotated to face robot */}
            <mesh><sphereGeometry args={[1, 32, 32]} /><meshPhysicalMaterial color="#ffffff" transmission={0.2} roughness={0.1} /></mesh>
            <mesh position={[0, 0, 0.9]}><circleGeometry args={[0.4, 32]} /><meshStandardMaterial color="#3b82f6" /></mesh>
            <mesh position={[0, 0, 0.91]}><circleGeometry args={[0.15, 32]} /><meshStandardMaterial color="#000000" /></mesh>
             <mesh position={[0, 0, 0.8]}><sphereGeometry args={[0.6, 32, 32]} /><meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={0.3} transparent roughness={0} /></mesh>
        </group>
    )
}

const RealisticKidney = () => {
    return (
        <group scale={1.5} rotation={[0,0,Math.PI/4]}>
            <mesh><capsuleGeometry args={[0.5, 1.2, 4, 8]} /><meshPhysicalMaterial color="#7c2d12" emissive="#451a03" roughness={0.4} metalness={0.1} transparent opacity={0.8} /></mesh>
        </group>
    )
}

const TargetMass = ({ position, destroyed, type, visible }: { position: THREE.Vector3, destroyed: boolean, type: SurgeryType, visible: boolean }) => {
    const ref = useRef<any>();
    
    useFrame((state) => {
        if (ref.current) {
            if (!destroyed && visible) {
                const t = state.clock.elapsedTime;
                const s = 1 + Math.sin(t * 10) * 0.05;
                ref.current.scale.set(s, s, s);
            }
            
            if (destroyed) {
                ref.current.scale.multiplyScalar(0.9);
            }
            
            ref.current.visible = visible || destroyed; 
        }
    });

    const color = type === "NEURO" ? "#ff0000" : type === "RENAL" ? "#fbbf24" : "#ffffff";

    return (
        <group position={position}>
            {visible && !destroyed && (
                <Html distanceFactor={10}>
                    <div className="bg-red-500/20 border border-red-500 text-red-500 text-[8px] px-1 animate-pulse">TARGET DETECTED</div>
                </Html>
            )}
            <mesh ref={ref}>
                <icosahedronGeometry args={[0.12, 1]} /> 
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
            </mesh>
        </group>
    );
}

const RobotArm = ({ targetPos, laserState, type }: { targetPos: THREE.Vector3, laserState: string, type: SurgeryType }) => {
    const groupRef = useRef<any>();
    const laserRef = useRef<any>();
    const laserColor = type === "NEURO" ? "#00ff00" : type === "OCULAR" ? "#00ffff" : "#fb923c"; // Green, Cyan, Orange

    useFrame((state, delta) => {
        if (groupRef.current) {
            const dummy = new THREE.Object3D();
            dummy.position.copy(groupRef.current.position);
            dummy.lookAt(targetPos); 
            groupRef.current.quaternion.slerp(dummy.quaternion, 0.05);
        }

        if (!laserRef.current) return;
        const maxDist = ROBOT_BASE_POSITION.distanceTo(targetPos); 
        const speed = 5 * delta;

        if (laserState === "GROWING") {
            laserRef.current.scale.y = Math.min(maxDist, laserRef.current.scale.y + speed);
            laserRef.current.visible = true;
        } else if (laserState === "SHRINKING") {
            laserRef.current.scale.y = Math.max(0, laserRef.current.scale.y - speed);
            if (laserRef.current.scale.y === 0) laserRef.current.visible = false;
        } else if (laserState === "OFF") {
            laserRef.current.scale.y = 0;
            laserRef.current.visible = false;
        }
    });

    return (
        <group ref={groupRef} position={ROBOT_BASE_POSITION}>
            <mesh position={[0, 0, 0.5]}><boxGeometry args={[0.6, 0.6, 2]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0, 0, 1.5]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.2, 0.25, 0.2, 32]} /><meshStandardMaterial color={laserColor} emissive={laserColor} emissiveIntensity={0.5} /></mesh>
            <mesh ref={laserRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 1.6]} visible={false}>
                <cylinderGeometry args={[0.01, 0.03, 1]} translate={[0, 0.5, 0]} />
                <meshStandardMaterial color={laserColor} emissive={laserColor} emissiveIntensity={20} toneMapped={false} transparent opacity={0.8} />
            </mesh>
        </group>
    )
}

export default function DeepsHospitalOS() {
  const [patients, setPatients] = useState<Patient[]>(() => generatePatients(15));
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [logs, setLogs] = useState<{msg: string, source: string}[]>([]);
  const [view, setView] = useState<"LIST" | "DETAIL" | "SURGERY">("LIST");
  const [filter, setFilter] = useState<"ALL" | SurgeryType>("ALL"); 
  
  const [showSuccessReport, setShowSuccessReport] = useState(false);
  const [showAbortReport, setShowAbortReport] = useState(false); 
  const [abortReason, setAbortReason] = useState(""); 
  
  
  const [activeTool, setActiveTool] = useState<keyof typeof TOOLS>("IDLE");
  const [destroyed, setDestroyed] = useState(false);
  const [targetVisible, setTargetVisible] = useState(false); 
  const [laserState, setLaserState] = useState("OFF"); 
  const [progress, setProgress] = useState(0);
  const [panicMode, setPanicMode] = useState(false); 

  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [logs]);

  const addLog = async (source: string, manualMsg?: string) => {
    let msg = manualMsg;
    if (!msg) msg = await generateMedicalLog("PLANNING"); 
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

  const downloadReport = (type: "SUCCESS" | "REFERRAL") => {
      if (!selectedPatient) return;
      const content = type === "SUCCESS" 
      ? `DEEPS-OS SURGICAL SUCCESS RECORD
------------------------------------------------
PATIENT: ${selectedPatient.name}
ID: ${selectedPatient.id}
TYPE: ${selectedPatient.type} INTERVENTION
TARGET: ${selectedPatient.condition}
------------------------------------------------
METRICS:
- Precision: 99.8%
- Duration: 58s
- Vitals: Stable

POST-OP:
- Monitor ${selectedPatient.vitals.specificMetric.split(':')[0]}
- Discharged to Recovery.
------------------------------------------------
SIGNED: DEEPS_AI_CORE`
      : `DEEPS-OS REFERRAL LETTER (ABORTED)
------------------------------------------------
PATIENT: ${selectedPatient.name}
REASON: ${abortReason}
STATUS: URGENT REFERRAL REQUIRED`;
      
      const element = document.createElement("a");
      const file = new Blob([content], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${selectedPatient.id}_${type}.txt`;
      document.body.appendChild(element);
      element.click();
  };

  const checkSafety = (p: Patient): { safe: boolean, reason: string } => {
      const metric = p.vitals.specificMetric || "";
      if (p.vitals.hr > 125) return { safe: false, reason: "SEVERE TACHYCARDIA" };
      if (p.type === "NEURO" && metric.includes("28mmHg")) return { safe: false, reason: "ICP CRITICAL (Brain Swelling)" };
      if (p.type === "OCULAR" && metric.includes("35mmHg")) return { safe: false, reason: "IOP CRITICAL (Glaucoma Risk)" };
      if (p.type === "RENAL" && metric.includes("5.2")) return { safe: false, reason: "RENAL FAILURE DETECTED" };
      return { safe: true, reason: "" };
  };

  const executeSurgerySequence = async () => {
      if (!selectedPatient || selectedPatient.status === "COMPLETED" || selectedPatient.status === "CANCELLED") return;

      setView("SURGERY");
      setDestroyed(false);
      setLaserState("OFF");
      setPanicMode(false);
      setTargetVisible(false); 
      setProgress(0);
      setLogs([]);
      
      setActiveTool("KESTRA");
      addLog("KESTRA", `Orchestrating Workflow for ${selectedPatient.type}...`);
      await delay(1000);
      addLog("KESTRA", "Triggering Pre-Op Containers...");
      await delay(1000);
      
      setActiveTool("VISION");
      addLog("TOGETHER_AI", "Ingesting 3D Volumetric Scan...");
      await delay(1500);
      addLog("VISION_MODEL", "Analysing Tissue Density...");
      await delay(1500);
      
      setTargetVisible(true); 
      addLog("VISION_MODEL", `ANOMALY DETECTED. Vector Locked.`);
      setProgress(20);

      addLog("SAFETY", `Verifying ${selectedPatient.type} Parameters...`);
      await delay(1500);
      const safetyCheck = checkSafety(selectedPatient);

      if (!safetyCheck.safe) {
          setPanicMode(true); 
          addLog("CRITICAL", `${safetyCheck.reason} DETECTED.`);
          addLog("SYSTEM", "ABORTING PROCEDURE.");
          setPatients(prev => prev.map(p => p.id === selectedPatient.id ? {...p, status: "CANCELLED"} : p));
          setActiveTool("IDLE");
          setAbortReason(safetyCheck.reason);
          await delay(2000);
          setShowAbortReport(true); 
          return; 
      }

      setActiveTool("OUMI");
      addLog("OUMI", "Calculating Collision-Free Path...");
      await delay(2000); 
      addLog("OUMI", "Trajectory Optimized via RL.");
      setProgress(40);

      setActiveTool("CLINE");
      addLog("CLINE", "Generating Real-Time Control Code...");
      await delay(1500);
      setActiveTool("RABBIT");
      addLog("CODE_RABBIT", "Code Audit: PASS. 0 Errors.");
      setProgress(60);

      setActiveTool("IDLE");
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? {...p, status: "SURGERY"} : p));
      
      addLog("VITALIS", "Hardware Armed.");
      await delay(1000);
      
      addLog("SYSTEM", "FIRING LASER.");
      setLaserState("GROWING");
      
      for(let i=0; i<10; i++) {
          await delay(800);
          setProgress(60 + (i*4));
      }

      setDestroyed(true); 
      addLog("SYSTEM", "Target Eliminated.");
      await delay(1000);
      setLaserState("SHRINKING");
      await delay(1000);
      setLaserState("OFF");
      setProgress(100);

      addLog("SYSTEM", "Procedure Complete.");
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? {...p, status: "COMPLETED"} : p));
      
      await delay(1500);
      setShowSuccessReport(true); 
  };

  const isLocked = selectedPatient?.status === "COMPLETED" || selectedPatient?.status === "CANCELLED";

  return (
    <div className="w-screen h-screen bg-black overflow-hidden font-mono text-xs flex">
      {view !== "SURGERY" && (
        <>
            <div className="w-1/4 h-full border-r border-green-900/50 bg-[#050505] flex flex-col z-20">
                <div className="p-6 border-b border-green-900/50">
                    <h1 className="text-2xl font-black text-white tracking-widest">DEEPS<span className="text-cyan-400">.OS</span></h1>
                    <div className="text-gray-500 text-[10px] mt-1">MULTI-SPECIALTY TRAUMA UNIT</div>
                </div>
                
                
                <div className="flex p-2 gap-1 border-b border-gray-900">
                    {["ALL", "NEURO", "OCULAR", "RENAL"].map((f) => (
                        <button 
                            key={f} 
                            onClick={() => setFilter(f as any)}
                            className={`flex-1 py-2 text-[10px] font-bold rounded ${filter === f ? 'bg-cyan-900 text-cyan-400' : 'text-gray-600 hover:bg-gray-900'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredPatients.map(p => (
                        <button key={p.id} onClick={() => handleSelectPatient(p)} className={`w-full text-left p-4 rounded border transition-all ${selectedPatient?.id === p.id ? 'bg-cyan-900/20 border-cyan-500 text-white' : 'bg-gray-900/20 border-gray-800 text-gray-400 hover:bg-gray-800'} ${p.risk === "CRITICAL" ? "border-l-4 border-l-red-500" : ""}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-sm flex items-center gap-2">
                                    {p.type === "NEURO" && <Brain size={12}/>}
                                    {p.type === "OCULAR" && <Eye size={12}/>}
                                    {p.type === "RENAL" && <Droplet size={12}/>}
                                    {p.scheduledTime}
                                </span>
                                <span className={`${p.risk === "CRITICAL" ? "text-red-500 animate-pulse" : "text-yellow-500"}`}>{p.risk}</span>
                            </div>
                            <div className="font-bold mb-1">{p.name}</div>
                            <div className="flex justify-between text-[10px] opacity-70">
                                <span>{p.condition}</span>
                                <span className={p.status === "CANCELLED" ? "text-red-500" : p.status === "COMPLETED" ? "text-green-500" : "text-gray-500"}>{p.status}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            
            <div className="flex-1 bg-[#020202] relative p-12 flex flex-col">
                {selectedPatient ? (
                    <div className="animate-in fade-in h-full flex flex-col">
                        <div className="flex justify-between items-start mb-8 border-b border-gray-800 pb-4">
                            <div>
                                <h2 className="text-5xl text-white font-bold mb-2">{selectedPatient.name}</h2>
                                <div className="flex gap-6 text-gray-400 text-sm"><span>ID: {selectedPatient.id}</span><span>TYPE: {selectedPatient.type}</span></div>
                            </div>
                            <div className="text-right">
                                <div className="text-red-500 font-bold text-2xl flex items-center gap-2 justify-end"><ShieldCheck size={24}/> {selectedPatient.risk}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 flex-1">
                             <div className="bg-gray-900/30 border border-gray-800 p-8 rounded">
                                <h3 className="text-cyan-400 flex items-center gap-2 mb-6 text-lg"><Activity size={20}/> ORGAN VITALS</h3>
                                <div className="space-y-6 text-sm">
                                    <div className="flex justify-between border-b border-gray-800 pb-2">
                                        <span className="text-gray-500">SPECIFIC METRIC</span>
                                        <span className={`font-bold text-xl ${selectedPatient.vitals.specificMetric?.includes("HIGH") || selectedPatient.vitals.specificMetric?.includes("DANGEROUS") ? 'text-red-500 animate-pulse' : 'text-white'}`}>{selectedPatient.vitals.specificMetric}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-800 pb-2">
                                        <span className="text-gray-500">BP</span>
                                        <span className="text-white font-bold text-xl">{selectedPatient.vitals.bp}</span>
                                    </div>
                                </div>
                             </div>
                             <div className="bg-gray-900/30 border border-gray-800 p-8 rounded">
                                <h3 className="text-cyan-400 flex items-center gap-2 mb-6 text-lg"><FileText size={20}/> DIAGNOSIS</h3>
                                <ul className="list-disc list-inside text-gray-300 space-y-3 text-sm">
                                    <li>Primary: {selectedPatient.condition}</li>
                                    <li>History: {selectedPatient.history}</li>
                                    <li className="text-yellow-500">Allergies: {selectedPatient.allergies}</li>
                                </ul>
                             </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={executeSurgerySequence}
                                disabled={isLocked}
                                className={`px-12 py-6 rounded font-bold tracking-widest text-lg flex items-center gap-3 shadow-lg transition-all ${isLocked ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-cyan-700 hover:bg-cyan-600 text-white"}`}
                            >
                                {selectedPatient.status === "CANCELLED" ? <><XCircle/> ABORTED</> : selectedPatient.status === "COMPLETED" ? <><CheckCircle/> COMPLETED</> : <><Zap/> START {selectedPatient.type} SURGERY</>}
                            </button>
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
                      <div className={`${panicMode ? 'text-red-500' : 'text-cyan-500'} font-bold text-2xl flex items-center gap-3`}><Terminal size={24}/> {selectedPatient.type} KERNEL</div>
                      
                      
                      <div className="flex gap-2">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded border border-gray-800 ${TOOLS[activeTool].color} bg-gray-900`}>
                              {TOOLS[activeTool].icon}
                              <span className="font-bold">{TOOLS[activeTool].name}</span>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex-1 bg-black p-4 font-mono text-sm overflow-y-auto border border-gray-800 rounded shadow-inner">
                      {logs.map((l, i) => (
                          <div key={i} className="mb-2 flex gap-3"><span className={`${panicMode ? 'text-red-500' : 'text-cyan-700'} font-bold w-24 shrink-0`}>[{l.source}]</span><span className="text-white">{l.msg}</span></div>
                      ))}
                      <div ref={logsEndRef} />
                  </div>
              </div>

              <div className="w-1/2 relative bg-black">
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
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in zoom-in-95">
                <div className="bg-white text-black p-8 max-w-2xl w-full shadow-2xl relative font-mono">
                   
                    <div className="flex justify-between border-b-2 border-black pb-4 mb-4">
                        <div>
                            <h1 className="text-3xl font-black">DEEPS<span className="text-cyan-600">.OS</span> MED_REPORT</h1>
                            <div className="text-xs">LEVEL 1 TRAUMA CENTER | ID: 994-22</div>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold">{selectedPatient.id}</div>
                            <div className="text-xs">DIGITAL RECORD</div>
                        </div>
                    </div>

                   
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div>
                            <div className="font-bold">PATIENT NAME</div>
                            <div>{selectedPatient.name}</div>
                        </div>
                        <div>
                            <div className="font-bold">PROCEDURE</div>
                            <div>LASER ABLATION ({selectedPatient.type})</div>
                        </div>
                        <div>
                            <div className="font-bold">DATE</div>
                            <div>{new Date().toLocaleDateString()}</div>
                        </div>
                        <div>
                            <div className="font-bold">OUTCOME</div>
                            <div className="bg-green-200 inline-block px-2 font-bold">SUCCESSFUL</div>
                        </div>
                    </div>

                    <div className="border-t-2 border-black pt-4 mb-6">
                        <div className="font-bold mb-2">POST-OP INSTRUCTIONS (AI GENERATED):</div>
                        <ul className="list-disc list-inside text-sm space-y-1">
                            <li>Monitor {selectedPatient.vitals.specificMetric.split(':')[0]} levels every 4 hours.</li>
                            <li>Administer prophylactic antibiotics.</li>
                            <li>Schedule follow-up MRI in 24 hours.</li>
                        </ul>
                    </div>

                    
                    <div className="flex justify-between items-end border-t-2 border-black pt-4">
                        <div className="text-xs">
                            AUTHORIZED BY:<br/>
                            <span className="font-bold text-lg font-script">Dr. DEEPS AI CORE</span>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => downloadReport("SUCCESS")} className="bg-black text-white px-6 py-3 font-bold hover:bg-gray-800 flex items-center gap-2">
                                <Download size={16}/> PRINT REPORT
                            </button>
                            <button onClick={() => {setShowSuccessReport(false); setView("LIST");}} className="border-2 border-black px-6 py-3 font-bold hover:bg-gray-100">
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            </div>
      )}

      
      {showAbortReport && (
            <div className="fixed inset-0 z-[100] bg-red-950/90 flex items-center justify-center">
                <div className="bg-black border-2 border-red-500 p-8 rounded max-w-lg text-center">
                    <AlertTriangle size={64} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-3xl text-red-500 mb-2 font-bold">PROCEDURE ABORTED</h1>
                    <p className="text-white mb-6 text-lg">{abortReason}</p>
                    <button onClick={() => {setShowAbortReport(false); setView("LIST");}} className="bg-red-600 text-white px-8 py-3 rounded font-bold hover:bg-red-500">ACKNOWLEDGE</button>
                </div>
            </div>
      )}
    </div>
  );
}