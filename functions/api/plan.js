/**
 * Cloudflare Pages Function: /api/plan
 * Proxies requests to Groq, keeping the API key server-side.
 *
 * POST /api/plan
 * Body: { interests: string, goals: string }
 * Returns: { plan: string, wheelOptions: string[] }
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

  if (!apiKey) {
    return jsonError('GROQ_API_KEY is not configured.', 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const { interests = '', goals = '' } = body;

  if (!interests.trim() && !goals.trim()) {
    return jsonError('Please provide at least interests or goals.', 400);
  }

  const systemPrompt = `You are helping Nathan, an 18-year-old lad who is hilariously indecisive and takes AGES to make any decision. 
Your job is to give him a fun, no-nonsense day plan and a list of activity options.
Always use British English. Be enthusiastic, a little cheeky, and gently roast his indecisiveness.
Respond ONLY with a valid JSON object — no markdown, no backticks, no preamble. Just raw JSON.`;

  const userPrompt = `Nathan's interests today: ${interests || 'not specified'}
Nathan's goals today: ${goals || 'not specified'}

Return this exact JSON structure:
{
  "plan": "A fun, encouraging day plan in 3-4 sentences. Be enthusiastic and cheeky about his indecisiveness. British English.",
  "wheelOptions": ["option1", "option2", "option3", "option4", "option5", "option6", "option7"]
}

The wheelOptions must be exactly 7 items. Each option should be a short, specific activity (max 5 words) based on his interests and goals.
DO NOT include anything about Coca Cola, Jamie, or Simon — those are handled separately.
Be fun and specific to what he told you.`;

  let groqResponse;
  try {
    groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1024,
        temperature: 0.85,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
  } catch (err) {
    return jsonError(`Failed to reach Groq API: ${err.message}`, 502);
  }

  if (!groqResponse.ok) {
    const errText = await groqResponse.text();
    return jsonError(`Groq API error ${groqResponse.status}: ${errText}`, 502);
  }

  const groqData = await groqResponse.json();
  const rawText = groqData.choices?.[0]?.message?.content ?? '';

  let parsed;
  try {
    const clean = rawText.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    return jsonError('Groq returned invalid JSON. Try again!', 502);
  }

  if (!parsed.plan || !Array.isArray(parsed.wheelOptions)) {
    return jsonError('Unexpected response shape from Groq.', 502);
  }

  return new Response(
    JSON.stringify({
      plan: parsed.plan,
      wheelOptions: parsed.wheelOptions.slice(0, 7),
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    }
  );
}

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
