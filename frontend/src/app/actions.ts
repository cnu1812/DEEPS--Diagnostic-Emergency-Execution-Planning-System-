"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

export async function generateMedicalLog(stage: string) {
  
  if (!process.env.GEMINI_API_KEY) {
    const fallbacks = [
      "Analyzing cortical surface density...",
      "Detecting anomalous voxel cluster at vector [12, 4, 9]...",
      "Oumi RL Model converging: 99.8% confidence...",
      "Cline generating Python script for robotic arm..."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompts: any = {
    "SCANNING": "Generate a short, highly technical medical log line about scanning a brain MRI. Use terms like 'voxel', 'cortex', 'frontal lobe'. Max 10 words.",
    "PLANNING": "Generate a technical log line about an AI Reinforcement Learning agent calculating a surgical path. Use terms like 'gradient descent', 'vector', 'collision avoidance'. Max 10 words.",
    "CODING": "Generate a log line about an autonomous coding agent writing Python scripts for a robot. Use terms like 'runtime', 'latency', 'unit test'. Max 10 words.",
    "ABLATING": "Generate a dramatic log line about a laser destroying a tumor. Use terms like 'thermal ablation', 'tissue vaporization', 'target neutralized'. Max 10 words."
  };

  try {
    const result = await model.generateContent(prompts[stage]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    return "Connection instability detected. Retrying packet...";
  }
}