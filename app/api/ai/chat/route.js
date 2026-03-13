import { chatWithAI } from '../../../../lib/gemini';

export async function POST(request) {
  try {
    const { messages, userContext } = await request.json();
    const response = await chatWithAI(messages, userContext);
    return Response.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    return Response.json(
      { response: 'I apologize, but I\'m having trouble right now. Please try again in a moment.' },
      { status: 500 }
    );
  }
}
