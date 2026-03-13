import { generateRecoveryPlan } from '../../../../lib/gemini';

export async function POST(request) {
  try {
    const { stressData, userProfile } = await request.json();
    const plan = await generateRecoveryPlan(stressData, userProfile);
    return Response.json(plan);
  } catch (error) {
    console.error('Recovery plan error:', error);
    return Response.json(
      { error: 'Failed to generate recovery plan', raw: error.message },
      { status: 500 }
    );
  }
}
