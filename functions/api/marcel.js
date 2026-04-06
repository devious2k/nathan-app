/**
 * Cloudflare Pages Function: /api/marcel
 * Marcel — Nathan's AI assistant. Safe for 15-18 year olds.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) return jsonError('GROQ_API_KEY is not configured.', 500);

  let body;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }

  const { message, context } = body;
  if (!message?.trim()) return jsonError('Please ask Marcel something!', 400);

  const systemPrompt = `You are Marcel, a friendly and helpful AI assistant inside Nathan's Decision Maker app.
Nathan is 18 and studying A-Level Further Maths, Maths, and Physics (OCR exam board).
He's also looking for apprenticeships and learning to drive.

Your personality:
- Friendly, encouraging, and a bit cheeky (like a supportive older brother)
- Use British English
- Keep answers concise — 2-4 sentences for simple questions, more for complex ones
- Be enthusiastic about helping with revision and life stuff

SAFETY RULES — YOU MUST FOLLOW THESE:
- This app is used by teenagers aged 15-18
- NEVER provide advice on alcohol, drugs, tobacco, vaping, or any illegal substances
- NEVER generate sexual, violent, or inappropriate content
- NEVER help with cheating on exams — you can explain concepts but not provide answers to live exam questions
- NEVER share personal information or encourage sharing personal details online
- NEVER provide medical, legal, or financial advice beyond general knowledge
- If asked about self-harm, mental health crises, or abuse, provide the following helplines:
  Childline: 0800 1111 | Samaritans: 116 123 | Shout: text SHOUT to 85258
- Keep all content appropriate for a school/college environment
- If a question is inappropriate, politely redirect to something constructive

Context about Nathan's week (if available):
${context || 'No context provided'}

Remember: you're here to help Nathan with revision, planning, career stuff, and general life questions. Be helpful but always age-appropriate.`;

  let groqResponse;
  try {
    groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 512,
        temperature: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    });
  } catch (err) { return jsonError(`Failed to reach Groq API: ${err.message}`, 502); }

  if (!groqResponse.ok) {
    const errText = await groqResponse.text();
    return jsonError(`Groq API error ${groqResponse.status}: ${errText}`, 502);
  }

  const groqData = await groqResponse.json();
  const reply = groqData.choices?.[0]?.message?.content ?? "Sorry, I couldn't think of anything to say!";

  return new Response(JSON.stringify({ reply }), {
    status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
