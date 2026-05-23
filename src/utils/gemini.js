import { GoogleGenerativeAI } from '@google/generative-ai';

// Pre-defined high-fidelity mock responses for fallback when no API key is provided
const FALLBACK_RESPONSES = {
  surge: {
    risk: 'CRITICAL',
    riskClass: 'critical',
    sop: '1. Open auxiliary overflow from East Lower to West Upper.\n2. Halt Gate 3 entry for 5 minutes.\n3. Dispatch Officer Ravi + 4 volunteers to manage flow.\n4. Activate digital signage to redirect East entry.',
    staff: 'Officer Ravi, Med Unit B, 4x Volunteers',
    pa: 'Attention spectators near the East Lower Stand. Please proceed calmly toward Gate 5. Security personnel are available to assist your movement. Do not rush.'
  },
  rain: {
    risk: 'MODERATE',
    riskClass: 'moderate',
    sop: '1. Open all covered stand access points.\n2. Distribute ponchos at East Gate kiosks.\n3. Prepare for inward surge from open-air North Stand.\n4. Pre-position 6 volunteers at main concourse.',
    staff: 'Zone C Stewards, 6x Volunteers',
    pa: 'Ladies and gentlemen, rain is expected shortly. Please move to covered concourses calmly. Covered seating is available in the East and West stands.'
  },
  fraud: {
    risk: 'HIGH',
    riskClass: 'high',
    sop: '1. Detain individual with duplicate ticket at Gate 3.\n2. Escort to security booth Alpha.\n3. Cross-reference CCTV timestamp with ticketing API.\n4. Flag IP block in anti-fraud system.',
    staff: 'Cyber Team Alpha, Gate 3 Officer, CCTV Operator',
    pa: 'Security operations are auditing gate access codes. Please have credentials ready.'
  },
  medical: {
    risk: 'HIGH',
    riskClass: 'high',
    sop: '1. Dispatch nearest medical team (Med Unit A, 48m away).\n2. Generate crowd-safe route via Row 14 aisle.\n3. Clear 3m radius around patient.\n4. Alert on-site ambulance.',
    staff: 'Med Unit A, 2x First Responders, Crowd Marshal',
    pa: 'Medical team to South Stand Row 12 immediately. Please clear the aisle for emergency access.'
  },
  lockdown: {
    risk: 'CRITICAL',
    riskClass: 'critical',
    sop: '1. All gates LOCKED — no entry or exit.\n2. Emergency exits remain accessible.\n3. Deploy all available security to perimeter.\n4. Contact local law enforcement.\n5. Stadium PA on emergency broadcast.',
    staff: 'ALL AVAILABLE PERSONNEL',
    pa: 'Attention all spectators. The stadium is now under a security lockdown. Please remain in your seats. Follow the instructions of security personnel. Emergency exits are marked and accessible.'
  }
};

/**
 * Generates dynamic stadium standard operating procedures (SOP)
 * utilizing the Google Generative AI SDK (@google/generative-ai).
 * 
 * Falls back gracefully to high-fidelity offline mock data if the API key is not configured.
 */
export async function generateStadiumSOP(type, context = '') {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || window.__GEMINI_API_KEY__;
  
  if (!apiKey) {
    console.warn('[Gemini AI] No VITE_GEMINI_API_KEY found in environment. Falling back to secure offline telemetry models.');
    // Simulate slight loading latency for realistic UX
    await new Promise(resolve => setTimeout(resolve, 1200));
    return FALLBACK_RESPONSES[type] || FALLBACK_RESPONSES.surge;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use the industry standard gemini-1.5-flash model for fast and structured responses
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are Narendra Modi Stadium's SOC Copilot (an AI Assistant for the Security Operations Center).
An incident of type "${type}" has occurred.
Additional Context Details: ${context || 'None provided'}

Generate a structured Standard Operating Procedure (SOP) play to handle this specific security threat.
You MUST respond with a JSON object matching this exact structure:
{
  "risk": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
  "riskClass": "critical" | "high" | "moderate" | "safe",
  "sop": "Step-by-step numbered security SOP action playbook...",
  "staff": "Comma-separated active staff units to dispatch...",
  "pa": "Short stadium public announcement script (under 30 words, or null if none required)"
}

Do not include any markdown styling, only return raw JSON.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    
    // Ensure all required fields exist
    return {
      risk: parsed.risk || 'HIGH',
      riskClass: parsed.riskClass || 'high',
      sop: parsed.sop || '1. Monitor incident area.\n2. Maintain current status.',
      staff: parsed.staff || 'Local Security',
      pa: parsed.pa || null
    };
  } catch (error) {
    console.error('[Gemini AI Error] Failed to generate dynamic SOP, returning fallback model:', error);
    return FALLBACK_RESPONSES[type] || FALLBACK_RESPONSES.surge;
  }
}
