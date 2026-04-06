/**
 * Cloudflare Pages Function: /api/worksheet
 * Generates topic-specific revision worksheets and marks answers.
 *
 * POST /api/worksheet
 * Body: { subject, topic } — generates questions
 * Body: { action: "mark", subject, problems: [...] } — marks answers
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SUBJECT_NAMES = {
  'further-maths': 'Further Mathematics A (OCR H245)',
  'maths': 'Mathematics A (OCR H240)',
  'physics': 'Physics A (OCR H556)',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) return jsonError('GROQ_API_KEY is not configured.', 500);

  let body;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }

  if (body.action === 'mark') {
    return markAnswers(apiKey, body.subject, body.problems);
  }
  return generateWorksheet(apiKey, body.subject, body.topic);
}

async function generateWorksheet(apiKey, subject, topic) {
  const subjectName = SUBJECT_NAMES[subject] || subject;

  const systemPrompt = `You are an A-Level ${subjectName} examiner creating a focused revision worksheet.
Generate exam-style questions on a specific topic. Match OCR past paper style and difficulty.
Always use British English.
Respond ONLY with valid JSON — no markdown, no backticks, no preamble.`;

  const userPrompt = `Create a revision worksheet for ${subjectName} on the topic: "${topic}"

Generate exactly 5 questions, progressing from easier to harder:
- Q1-Q2: Foundation (2-3 marks each) — test basic understanding
- Q3-Q4: Standard (4-5 marks each) — exam-level application
- Q5: Challenge (6 marks) — harder problem requiring deeper thinking

Return this exact JSON structure:
{
  "questions": [
    { "id": 1, "question": "Full question text", "marks": 2, "difficulty": "foundation" },
    { "id": 2, "question": "Full question text", "marks": 3, "difficulty": "foundation" },
    { "id": 3, "question": "Full question text", "marks": 4, "difficulty": "standard" },
    { "id": 4, "question": "Full question text", "marks": 5, "difficulty": "standard" },
    { "id": 5, "question": "Full question text", "marks": 6, "difficulty": "challenge" }
  ]
}

${subject === 'physics' ? 'Include values of constants where needed. Use proper SI units.' : 'Use proper mathematical notation where possible (e.g. x², √, π, ∫, Σ, ∞, θ, ≤, ≥, dy/dx).'}
All questions must be specifically about "${topic}" — not general ${subjectName} questions.`;

  const data = await callGroq(apiKey, systemPrompt, userPrompt);
  if (data.error) return jsonError(data.error, data.status);

  if (!data.parsed.questions || !Array.isArray(data.parsed.questions)) {
    return jsonError('Unexpected response shape from Groq.', 502);
  }

  return jsonResponse({ questions: data.parsed.questions.slice(0, 5) });
}

async function markAnswers(apiKey, subject, problems) {
  if (!Array.isArray(problems) || problems.length === 0) {
    return jsonError('Please provide problems with answers to mark.', 400);
  }

  const subjectName = SUBJECT_NAMES[subject] || subject;

  const systemPrompt = `You are a rigorous but encouraging OCR A-Level ${subjectName} examiner marking a revision worksheet.
Mark each answer carefully following OCR mark scheme conventions, awarding method marks (M), accuracy marks (A), and bonus marks (B) where appropriate.
Award partial marks for correct working even if the final answer is wrong.
Use British English. Be specific about where marks are awarded or lost.
Respond ONLY with valid JSON — no markdown, no backticks, no preamble.`;

  const problemsText = problems.map((p, i) =>
    `Question ${i + 1} (${p.marks} marks): ${p.question}\nStudent's working: ${p.working || '(no working shown)'}\nStudent's answer: ${p.answer || '(no answer given)'}`
  ).join('\n\n');

  const userPrompt = `Mark this revision worksheet:

${problemsText}

Return this exact JSON structure:
{
  "results": [
    {
      "id": 1,
      "marksAwarded": 2,
      "marksAvailable": 3,
      "correctAnswer": "The full correct solution with steps",
      "feedback": "Specific feedback — what was right, where marks were awarded/lost"
    }
  ],
  "totalMarks": 12,
  "totalAvailable": 20,
  "overallFeedback": "Encouraging summary with specific advice on what to revise next"
}`;

  const data = await callGroq(apiKey, systemPrompt, userPrompt);
  if (data.error) return jsonError(data.error, data.status);

  if (!data.parsed.results || !Array.isArray(data.parsed.results)) {
    return jsonError('Unexpected response shape from Groq.', 502);
  }

  return jsonResponse(data.parsed);
}

async function callGroq(apiKey, systemPrompt, userPrompt) {
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
  } catch (err) { return { error: `Failed to reach Groq API: ${err.message}`, status: 502 }; }

  if (!groqResponse.ok) {
    const errText = await groqResponse.text();
    return { error: `Groq API error ${groqResponse.status}: ${errText}`, status: 502 };
  }

  const groqData = await groqResponse.json();
  const rawText = groqData.choices?.[0]?.message?.content ?? '';

  try {
    return { parsed: JSON.parse(rawText.replace(/```json|```/g, '').trim()) };
  } catch {
    return { error: 'Groq returned invalid JSON. Try again!', status: 502 };
  }
}

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
