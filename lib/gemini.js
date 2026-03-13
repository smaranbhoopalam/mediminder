import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateRecoveryPlan(stressData, userProfile) {
  const prompt = `You are a compassionate wellness advisor. Based on the following user data, generate a personalized recovery plan.

USER PROFILE:
- Name: ${userProfile.full_name}
- Age: ${userProfile.age}
- Health Issues: ${userProfile.health_issues?.join(', ') || 'None reported'}

TODAY'S STRESS DATA:
- Wake time: ${stressData.wake_time}
- Sleep time: ${stressData.sleep_time}
- Food habits: ${stressData.food_habits}
- Protein intake: ${stressData.protein_intake}g
- Nutrient intake: ${stressData.nutrient_intake}%
- Typing speed indicator: ${stressData.typing_speed}
- Anxiousness level (1-10): ${stressData.anxiousness}
- Nervousness level (1-10): ${stressData.nervousness}
${stressData.custom_factors ? `- Additional factors: ${JSON.stringify(stressData.custom_factors)}` : ''}
- STRESS SCORE: ${stressData.stress_score}/100

Please provide a structured response in the following JSON format:
{
  "recovery_plan": {
    "right_now": "immediate actionable steps",
    "this_afternoon": "afternoon recovery activities",
    "tonight": "evening wind-down plan"
  },
  "nutrition_advice": {
    "next_meal": "specific meal suggestion",
    "supplements": "supplement recommendations",
    "hydration": "hydration tips"
  },
  "mindset_tips": {
    "breathing_exercise": "specific breathing technique",
    "cognitive_reframe": "a reframing exercise",
    "evening_ritual": "a calming evening ritual"
  },
  "sleep_optimization": {
    "wind_down_time": "when to start winding down",
    "protocol": "step by step wind-down protocol",
    "environment": "bedroom environment tips"
  },
  "overall_message": "an encouraging, personalized message"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  try {
    const text = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(text);
  } catch {
    return { raw: response.text };
  }
}

export async function chatWithAI(messages, userContext) {
  const systemPrompt = `You are a compassionate, knowledgeable wellness AI companion called "WellBot". 
You help users manage stress, improve their mental health, and develop healthy habits.
You know the user's health context: ${JSON.stringify(userContext)}.
Be warm, supportive, and practical. Give actionable advice. If the user seems in crisis, 
encourage them to reach out to a mental health professional or crisis helpline.
Keep responses concise but caring.`;

  const chatHistory = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I\'m WellBot, your wellness companion. I\'m here to help you manage stress and build healthier habits. How can I help you today?' }] },
      ...chatHistory,
    ],
  });

  return response.text;
}

export async function generateDailyRecommendations(userProfile, recentStressData) {
  const prompt = `Based on this user's profile and recent stress patterns, give brief daily recommendations.

User: ${userProfile.full_name}, Age: ${userProfile.age}, Health: ${userProfile.health_issues?.join(', ') || 'None'}
Recent avg stress score: ${recentStressData.avgScore}/100

Give 3-5 short, actionable recommendations for today covering routine, food, and mindset. Return as JSON array of strings.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  try {
    const text = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(text);
  } catch {
    return [response.text];
  }
}
