/**
 * Cloudflare Pages Function: /api/apprenticeships
 * Uses Groq to find relevant apprenticeship opportunities for Nathan.
 *
 * POST /api/apprenticeships
 * Body: { interests: string, location: string }
 * Returns: { apprenticeships: [...] }
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
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body.', 400);
  }

  const { interests = '', location = '' } = body;

  const systemPrompt = `You are a UK careers adviser specialising in apprenticeships for 18-year-olds.
You have expert knowledge of Level 4, 5, and 6 apprenticeships available in the UK.
Always use British English. Be encouraging and practical.
Respond ONLY with valid JSON — no markdown, no backticks, no preamble.`;

  const userPrompt = `Nathan is 18 and looking for Level 4, 5, and 6 apprenticeships in the UK.
His interests: ${interests || 'not specified'}
Preferred location: ${location || 'anywhere in the UK'}

Find 8 relevant apprenticeship opportunities across Levels 4, 5, and 6. For each one provide:
- A real, specific apprenticeship standard/title that exists in the UK
- The level (4, 5, or 6)
- A well-known employer or training provider that typically offers this
- A brief description (1-2 sentences)
- The typical duration
- The typical salary range
- A direct URL to search for this on one of these real UK apprenticeship sites:
  - https://www.findapprenticeship.service.gov.uk
  - https://www.gov.uk/apply-apprenticeship
  - https://www.indeed.co.uk
  - https://uk.indeed.com
  - https://www.reed.co.uk/jobs/apprenticeships
  - https://www.totaljobs.com

Return this exact JSON structure:
{
  "apprenticeships": [
    {
      "id": 1,
      "title": "Apprenticeship standard title",
      "level": 4,
      "employer": "Example employer or 'Various employers'",
      "description": "Brief description of the role and what you'd learn",
      "duration": "18-24 months",
      "salary": "£18,000 - £22,000",
      "applyUrl": "https://www.findapprenticeship.service.gov.uk/apprenticeships?SearchTerm=...",
      "sector": "e.g. Technology, Engineering, Business"
    }
  ],
  "tips": "2-3 sentences of practical advice for Nathan about applying for apprenticeships"
}

Make sure to include a mix of levels and sectors relevant to his interests. Use real apprenticeship standard titles from the Institute for Apprenticeships.`;

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
        max_tokens: 2048,
        temperature: 0.7,
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

  if (!parsed.apprenticeships || !Array.isArray(parsed.apprenticeships)) {
    return jsonError('Unexpected response shape from Groq.', 502);
  }

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
