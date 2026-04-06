/**
 * Cloudflare Pages Function: /api/cv
 * Generates CV content and cover letters via Groq.
 *
 * POST /api/cv
 * Body: { action: "generate-cv"|"generate-letter", answers: {...}, apprenticeship?: string }
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

  const { action, answers, apprenticeship } = body;

  if (action === 'generate-cv') {
    return generateCV(apiKey, answers);
  } else if (action === 'generate-letter') {
    return generateLetter(apiKey, answers, apprenticeship);
  } else {
    return jsonError('Invalid action. Use "generate-cv" or "generate-letter".', 400);
  }
}

async function generateCV(apiKey, answers) {
  if (!answers) return jsonError('Please provide answers.', 400);

  const systemPrompt = `You are a professional UK CV writer specialising in apprenticeship applications for young people.
Write a clean, professional CV suitable for Level 4-6 apprenticeship applications.
Always use British English. Keep it to one page worth of content.
Respond ONLY with valid JSON — no markdown, no backticks, no preamble.`;

  const userPrompt = `Write a professional CV for Nathan based on these details:

Full name: ${answers.fullName || 'Nathan'}
Email: ${answers.email || 'Not provided'}
Phone: ${answers.phone || 'Not provided'}
Location: ${answers.location || 'Not provided'}
Date of birth: ${answers.dob || 'Not provided'}

Education: ${answers.education || 'Not provided'}
Qualifications/grades: ${answers.qualifications || 'Not provided'}

Work experience: ${answers.workExperience || 'None yet'}
Volunteering/extra-curricular: ${answers.volunteering || 'None'}

Skills: ${answers.skills || 'Not provided'}
Interests/hobbies: ${answers.interests || 'Not provided'}

Career goals: ${answers.careerGoals || 'Not provided'}

Return this exact JSON structure:
{
  "cv": {
    "personalStatement": "A compelling 3-4 sentence personal statement",
    "education": [
      { "institution": "School/college name", "dates": "2020 - 2024", "details": "Qualifications and grades" }
    ],
    "experience": [
      { "role": "Job title", "company": "Company", "dates": "Date range", "bullets": ["Achievement 1", "Achievement 2"] }
    ],
    "skills": ["Skill 1", "Skill 2", "Skill 3"],
    "interests": "Brief interests section",
    "references": "Available upon request"
  }
}

If Nathan hasn't provided much detail, fill in sensible content based on what a typical 18-year-old applying for apprenticeships might include. Make it sound professional but authentic.`;

  const data = await callGroq(apiKey, systemPrompt, userPrompt);
  if (data.error) return jsonError(data.error, data.status);

  return jsonResponse(data.parsed);
}

async function generateLetter(apiKey, answers, apprenticeship) {
  if (!answers) return jsonError('Please provide answers.', 400);

  const systemPrompt = `You are a professional UK cover letter writer specialising in apprenticeship applications.
Write a compelling, professional cover letter suitable for apprenticeship applications.
Always use British English. Keep it concise — around 300-400 words.
Respond ONLY with valid JSON — no markdown, no backticks, no preamble.`;

  const userPrompt = `Write a cover letter for Nathan applying for this apprenticeship:
Apprenticeship: ${apprenticeship || 'A Level 4-6 apprenticeship'}

Nathan's details:
Name: ${answers.fullName || 'Nathan'}
Education: ${answers.education || 'Not provided'}
Qualifications: ${answers.qualifications || 'Not provided'}
Work experience: ${answers.workExperience || 'None yet'}
Skills: ${answers.skills || 'Not provided'}
Career goals: ${answers.careerGoals || 'Not provided'}
Why this apprenticeship: ${answers.whyApprenticeship || 'Not provided'}

Return this exact JSON structure:
{
  "letter": "The full cover letter text with proper paragraphs separated by \\n\\n",
  "tips": "2-3 brief tips for Nathan to personalise the letter further"
}

Make it enthusiastic, professional, and highlight transferable skills. Show genuine interest in the role.`;

  const data = await callGroq(apiKey, systemPrompt, userPrompt);
  if (data.error) return jsonError(data.error, data.status);

  return jsonResponse(data.parsed);
}

async function callGroq(apiKey, systemPrompt, userPrompt) {
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
    return { error: `Failed to reach Groq API: ${err.message}`, status: 502 };
  }

  if (!groqResponse.ok) {
    const errText = await groqResponse.text();
    return { error: `Groq API error ${groqResponse.status}: ${errText}`, status: 502 };
  }

  const groqData = await groqResponse.json();
  const rawText = groqData.choices?.[0]?.message?.content ?? '';

  try {
    const clean = rawText.replace(/```json|```/g, '').trim();
    return { parsed: JSON.parse(clean) };
  } catch {
    return { error: 'Groq returned invalid JSON. Try again!', status: 502 };
  }
}

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
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
