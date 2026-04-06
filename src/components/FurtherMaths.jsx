import { useState } from 'react';

const STEPS = { LOADING: 'loading', PROBLEMS: 'problems', MARKING: 'marking', RESULTS: 'results' };

export default function FurtherMaths({ onBack }) {
  const [step, setStep] = useState(STEPS.LOADING);
  const [problems, setProblems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // Generate problems on mount
  useState(() => {
    generateProblems();
  });

  async function generateProblems() {
    setStep(STEPS.LOADING);
    setError('');
    try {
      const res = await fetch('/api/maths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setProblems(data.problems);
      const initial = {};
      data.problems.forEach(p => {
        initial[p.id] = { working: '', answer: '' };
      });
      setAnswers(initial);
      setStep(STEPS.PROBLEMS);
    } catch (err) {
      setError(`Failed to load problems: ${err.message}`);
      setStep(STEPS.PROBLEMS);
    }
  }

  async function handleSubmit() {
    const unanswered = problems.filter(p => !answers[p.id]?.answer.trim());
    if (unanswered.length === problems.length) {
      setError("Come on Nathan, at least attempt ONE question! 😤");
      return;
    }
    setError('');
    setStep(STEPS.MARKING);

    try {
      const submission = problems.map(p => ({
        id: p.id,
        question: p.question,
        marks: p.marks,
        working: answers[p.id]?.working || '',
        answer: answers[p.id]?.answer || '',
      }));

      const res = await fetch('/api/maths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark', problems: submission }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data);
      setStep(STEPS.RESULTS);
    } catch (err) {
      setError(`Marking failed: ${err.message}`);
      setStep(STEPS.PROBLEMS);
    }
  }

  function handleAnswerChange(id, field, value) {
    setAnswers(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  return (
    <div className="maths-container">
      {/* Loading */}
      {step === STEPS.LOADING && (
        <div className="card card-center">
          <div className="spinner" />
          <p className="loading-title">Generating problems...</p>
          <p className="loading-sub">Further Maths isn't going to do itself, Nathan</p>
        </div>
      )}

      {/* Marking */}
      {step === STEPS.MARKING && (
        <div className="card card-center">
          <div className="spinner" />
          <p className="loading-title">Marking your answers...</p>
          <p className="loading-sub">The examiner is judging you 👀</p>
        </div>
      )}

      {/* Problems */}
      {step === STEPS.PROBLEMS && (
        <div className="card">
          <span className="badge">📐 Further Maths A-Level</span>

          {error && <p className="error-msg">{error}</p>}

          {problems.length === 0 && !error && (
            <p className="maths-empty">No problems loaded. Try again.</p>
          )}

          {problems.map((problem, index) => (
            <div key={problem.id} className="maths-problem">
              <div className="maths-problem-header">
                <span className="maths-problem-number">Q{index + 1}</span>
                <span className="maths-problem-topic">{problem.topic}</span>
                <span className="maths-problem-marks">[{problem.marks} marks]</span>
              </div>
              <p className="maths-problem-text">{problem.question}</p>

              <label className="field-label" htmlFor={`working-${problem.id}`}>
                Working
              </label>
              <textarea
                id={`working-${problem.id}`}
                className="field-textarea maths-working"
                rows={4}
                placeholder="Show your working here..."
                value={answers[problem.id]?.working || ''}
                onChange={(e) => handleAnswerChange(problem.id, 'working', e.target.value)}
              />

              <label className="field-label" htmlFor={`answer-${problem.id}`}>
                Final Answer
              </label>
              <input
                id={`answer-${problem.id}`}
                className="field-input"
                type="text"
                placeholder="Your answer"
                value={answers[problem.id]?.answer || ''}
                onChange={(e) => handleAnswerChange(problem.id, 'answer', e.target.value)}
              />
            </div>
          ))}

          {problems.length > 0 && (
            <button className="btn-primary" onClick={handleSubmit}>
              Submit for Marking ✏️
            </button>
          )}

          <button className="btn-reset" onClick={onBack}>
            ← Back to Decision Maker
          </button>
        </div>
      )}

      {/* Results */}
      {step === STEPS.RESULTS && results && (
        <div className="card">
          <span className="badge">📊 Your Results</span>

          <div className="maths-score-box">
            <p className="maths-score">
              {results.totalMarks} / {results.totalAvailable}
            </p>
            <p className="maths-score-label">Total Marks</p>
            <div className="maths-score-bar">
              <div
                className="maths-score-fill"
                style={{ width: `${(results.totalMarks / results.totalAvailable) * 100}%` }}
              />
            </div>
          </div>

          {results.overallFeedback && (
            <div className="maths-overall-feedback">
              <p>{results.overallFeedback}</p>
            </div>
          )}

          {results.results.map((result, index) => (
            <div key={result.id} className="maths-result">
              <div className="maths-result-header">
                <span className="maths-problem-number">Q{index + 1}</span>
                <span className={`maths-result-marks ${result.marksAwarded === result.marksAvailable ? 'full-marks' : result.marksAwarded === 0 ? 'no-marks' : 'partial-marks'}`}>
                  {result.marksAwarded} / {result.marksAvailable}
                </span>
              </div>

              <p className="maths-problem-text">{problems[index]?.question}</p>

              <div className="maths-feedback-box">
                <p className="maths-feedback-label">Feedback</p>
                <p className="maths-feedback-text">{result.feedback}</p>
              </div>

              <div className="maths-correct-box">
                <p className="maths-feedback-label">Correct Solution</p>
                <p className="maths-correct-text">{result.correctAnswer}</p>
              </div>
            </div>
          ))}

          <button className="btn-primary" onClick={() => { setResults(null); generateProblems(); }}>
            Try New Problems 🔄
          </button>
          <button className="btn-reset" onClick={onBack}>
            ← Back to Decision Maker
          </button>
        </div>
      )}
    </div>
  );
}
