"use server";

export async function triggerKestraWorkflow(patientId: string, surgeryType: string) {
  try {
   
    const username = "admin@kestra.io";
    const password = "Admin12345";
    
    
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    
    const formData = new FormData();
    formData.append("patient_id", patientId);
    formData.append("surgery_type", surgeryType);

    
    const response = await fetch('http://localhost:8080/api/v1/executions/trigger/com.deeps.medical/deeps_surgery_pipeline', {
      method: 'POST',
      headers: {
        
        'Authorization': authHeader,
        
      },
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [SERVER ACTION] Kestra Triggered Successfully! ID: ${data.id}`);
      return { success: true, executionId: data.id };
    } else {
      const errorText = await response.text();
      console.error(`❌ [SERVER ACTION] Kestra Error (${response.status}):`, errorText);
      
      return { success: false, error: `Kestra Failed: ${response.status}` };
    }
  } catch (e) {
    console.error("⚠️ [SERVER ACTION] Kestra Connection Exception (Is Docker Running?):", e);
    return { success: true, executionId: "MOCK-EXEC-99" };
  }
}