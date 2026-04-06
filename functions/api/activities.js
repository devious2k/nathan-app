/**
 * Cloudflare Pages Function: /api/activities
 * Finds things to do near Nathan based on location and interests.
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

  const { location = '', interests = '' } = body;

  const today = new Date();
  const twoWeeks = new Date(today);
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  const dateRange = `${today.toLocaleDateString('en-GB')} to ${twoWeeks.toLocaleDateString('en-GB')}`;

  const systemPrompt = `You are a local activities and events expert for the UK. You help 18-year-olds find fun things to do.
Always use British English. Be enthusiastic and suggest a mix of free and paid activities.
Respond ONLY with valid JSON — no markdown, no backticks, no preamble.`;

  const userPrompt = `Find 8 things for Nathan (18) to do in the next two weeks (${dateRange}).
Location: ${location || 'UK (anywhere)'}
Interests: ${interests || 'anything fun'}

Include a mix of:
- Local events happening in the next 2 weeks
- Regular activities he could join
- Day trips or outings
- Social activities good for someone his age

Return this exact JSON structure:
{
  "activities": [
    {
      "id": 1,
      "name": "Activity name",
      "type": "Event / Activity / Day Trip / Social",
      "description": "2-3 sentences about what it is and why it's good",
      "location": "Specific venue or area",
      "date": "When — specific date, 'Every Saturday', or 'Anytime'",
      "cost": "Free / £5-10 / £15+ etc",
      "link": "A real URL to find out more (Google Maps, Eventbrite, venue website, etc)",
      "tags": ["outdoor", "social", "creative"]
    }
  ],
  "tip": "A fun encouraging tip for Nathan about getting out and doing stuff"
}

Use real venues and locations near ${location || 'major UK cities'}. Be specific, not generic.`;

  let groqResponse;
  try {
    groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL, max_tokens: 2048, temperature: 0.8,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      }),
    });
  } catch (err) { return jsonError(`Failed to reach Groq API: ${err.message}`, 502); }

  if (!groqResponse.ok) {
    const errText = await groqResponse.text();
    return jsonError(`Groq API error ${groqResponse.status}: ${errText}`, 502);
  }

  const groqData = await groqResponse.json();
  const rawText = groqData.choices?.[0]?.message?.content ?? '';

  let parsed;
  try { parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim()); }
  catch { return jsonError('Groq returned invalid JSON. Try again!', 502); }

  return new Response(JSON.stringify(parsed), {
    status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
