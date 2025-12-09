import * as THREE from "three";

export type SurgeryType = "NEURO" | "OCULAR" | "RENAL";

export type Plan = {
    id: string;
    name: string;
    risk: number;
    efficiency: number;
    reasoning: string;
    color: string;
    pathOffset: [number, number, number];
    status: "SELECTED" | "REJECTED";
};

export type Patient = {
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

export type RecordedEvent = {
    timestamp: number;
    type: "LOG" | "VITALS" | "LASER" | "TUMOR" | "TELEMETRY" | "RESCUE";
    data: any;
};