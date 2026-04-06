/**
 * Cloudflare Pages Function: /api/maths
 * Generates A-Level problems and marks answers for multiple subjects.
 *
 * POST /api/maths
 * Body: { action: "generate", subject: "further-maths"|"physics"|"maths" }
 * Body: { action: "mark", subject: "...", problems: [...] }
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SUBJECTS = {
  'further-maths': {
    name: 'Further Mathematics',
    spec: 'H245',
    topics: `- Complex numbers (including argand diagrams, loci, de Moivre's theorem)
- Matrices (including transformations, eigenvalues, eigenvectors, Cayley-Hamilton)
- Further calculus (Maclaurin/Taylor series, improper integrals, calculus of inverse trig functions)
- Proof (by induction, contradiction)
- Polar coordinates (sketching curves, areas)
- Hyperbolic functions (definitions, identities, calculus)
- Differential equations (first and second order, including auxiliary equations)
- Vectors (lines, planes, scalar and vector products)`,
    notation: 'Use proper mathematical notation where possible (e.g. x², √, π, ∫, Σ, ∞, θ, ≤, ≥).',
  },
  'physics': {
    name: 'Physics A',
    spec: 'H556',
    topics: `- Module 1: Development of practical skills in physics
- Module 2: Foundations of physics (physical quantities, SI units, estimation)
- Module 3: Forces and motion (motion, forces, work/energy/power, materials, Newton's laws, momentum)
- Module 4: Electrons, waves and photons (charge and current, energy/power/resistance, electrical circuits, waves, quantum physics)
- Module 5: Newtonian world and astrophysics (thermal physics, circular motion, oscillations, gravitational fields, astrophysics and cosmology)
- Module 6: Particles and medical physics (capacitors, electric fields, electromagnetism, nuclear and particle physics, medical imaging)`,
    notation: 'Use proper scientific notation and SI units. Include values of constants where needed (e.g. g = 9.81 m s⁻², c = 3.00 × 10⁸ m s⁻¹).',
  },
  'maths': {
    name: 'Mathematics A',
    spec: 'H240',
    topics: `- Pure Mathematics: proof, algebra and functions, coordinate geometry, sequences and series, trigonometry, exponentials and logarithms, differentiation, integration, numerical methods, vectors
- Statistics: statistical sampling, data presentation and interpretation, probability, statistical distributions (binomial, normal), statistical hypothesis testing
- Mechanics: quantities and units in mechanics, kinematics, forces and Newton's laws, moments`,
    notation: 'Use proper mathematical notation where possible (e.g. x², √, π, ∫, Σ, ∞, θ, ≤, ≥, dy/dx).',
  },
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

  const { action, subject = 'further-maths' } = body;
  const subjectConfig = SUBJECTS[subject];

  if (!subjectConfig) {
    return jsonError(`Unknown subject: ${subject}. Use: ${Object.keys(SUBJECTS).join(', ')}`, 400);
  }

  if (action === 'generate') {
    return generateProblems(apiKey, subjectConfig);
  } else if (action === 'mark') {
    return markAnswers(apiKey, subjectConfig, body.problems);
  } else {
    return jsonError('Invalid action. Use "generate" or "mark".', 400);
  }
}

async function generateProblems(apiKey, subject) {
  const systemPrompt = `You are an A-Level ${subject.name} examiner for the OCR exam board (specification ${subject.spec}).
Generate challenging but fair exam-style questions that match the OCR ${subject.name} A-Level syllabus.
Always use British English. Questions should match the style and difficulty of real OCR past papers.
Respond ONLY with valid JSON — no markdown, no backticks, no preamble.`;

  const userPrompt = `Generate exactly 4 A-Level ${subject.name} problems following the OCR ${subject.name} A-Level syllabus (${subject.spec}). Cover a mix of these OCR specification topics:
${subject.topics}

Each problem should be exam-style, worth 4-6 marks, and solvable in about 5 minutes.

Return this exact JSON structure:
{
  "problems": [
    { "id": 1, "question": "The full question text", "topic": "Topic name", "marks": 5 },
    { "id": 2, "question": "The full question text", "topic": "Topic name", "marks": 4 },
    { "id": 3, "question": "The full question text", "topic": "Topic name", "marks": 6 },
    { "id": 4, "question": "The full question text", "topic": "Topic name", "marks": 5 }
  ]
}

${subject.notation}`;

  const data = await callGroq(apiKey, systemPrompt, userPrompt);
  if (data.error) return jsonError(data.error, data.status);

  if (!data.parsed.problems || !Array.isArray(data.parsed.problems)) {
    return jsonError('Unexpected response shape from Groq.', 502);
  }

  return jsonResponse({ problems: data.parsed.problems.slice(0, 4) });
}

async function markAnswers(apiKey, subject, problems) {
  if (!Array.isArray(problems) || problems.length === 0) {
    return jsonError('Please provide problems with answers to mark.', 400);
  }

  const systemPrompt = `You are a rigorous but encouraging OCR A-Level ${subject.name} examiner marking student work.
Mark each answer carefully following OCR mark scheme conventions, awarding method marks (M), accuracy marks (A), and bonus marks (B) where appropriate. Award partial marks for correct working even if the final answer is wrong.
Use British English. Be specific about where marks are awarded or lost.
Respond ONLY with valid JSON — no markdown, no backticks, no preamble.`;

  const problemsText = problems.map((p, i) =>
    `Problem ${i + 1} (${p.marks} marks): ${p.question}\nStudent's working: ${p.working || '(no working shown)'}\nStudent's answer: ${p.answer || '(no answer given)'}`
  ).join('\n\n');

  const userPrompt = `Mark the following A-Level ${subject.name} answers:

${problemsText}

Return this exact JSON structure:
{
  "results": [
    {
      "id": 1,
      "marksAwarded": 3,
      "marksAvailable": 5,
      "correctAnswer": "The full correct solution",
      "feedback": "Specific feedback on what was right/wrong, where marks were awarded/lost"
    }
  ],
  "totalMarks": 12,
  "totalAvailable": 20,
  "overallFeedback": "A brief encouraging summary of performance with advice"
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
