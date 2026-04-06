/**
 * Cloudflare Pages Function: /api/jobs
 * Finds part-time jobs for Nathan based on location and interests.
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

  const systemPrompt = `You are a UK careers adviser helping an 18-year-old find part-time work.
Focus on realistic part-time jobs suitable for someone studying A-Levels.
Always use British English. Be practical and encouraging.
Respond ONLY with valid JSON — no markdown, no backticks, no preamble.`;

  const userPrompt = `Find 8 part-time job opportunities for Nathan (18, studying A-Levels).
Location: ${location || 'UK (anywhere)'}
Interests/skills: ${interests || 'not specified'}

Include a mix of:
- Retail and hospitality (realistic for 18-year-olds)
- Jobs related to his interests if possible
- Weekend and evening work that fits around studying
- Both well-known chains and local opportunities

Return this exact JSON structure:
{
  "jobs": [
    {
      "id": 1,
      "title": "Job title",
      "company": "Company or type of business",
      "type": "Part-time / Weekend / Evening / Flexible",
      "description": "2 sentences about the role and why it suits Nathan",
      "pay": "£6.40-£11.44/hr or specific rate",
      "hours": "8-16 hrs/week",
      "searchUrl": "A real URL to search for this job (Indeed, Reed, company careers page)",
      "tags": ["retail", "customer-service", "flexible"]
    }
  ],
  "tip": "Practical advice for Nathan about finding part-time work while studying"
}

Use real companies and realistic pay rates for the UK. Include direct search URLs from Indeed, Reed, or company career pages.`;

  let groqResponse;
  try {
    groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL, max_tokens: 2048, temperature: 0.7,
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
