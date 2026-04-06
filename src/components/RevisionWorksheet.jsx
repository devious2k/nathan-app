import { useState, useEffect } from 'react';
import { incrementStat } from './Dashboard.jsx';

const STEPS = { LOADING: 'loading', WORKSHEET: 'worksheet', MARKING: 'marking', RESULTS: 'results' };

export default function RevisionWorksheet({ session, onBack }) {
  const [step, setStep] = useState(STEPS.LOADING);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Generate worksheet on mount
  useEffect(() => {
    generateWorksheet();
  }, []);

  // Timer
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  function formatTimer(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  async function generateWorksheet() {
    setStep(STEPS.LOADING);
    setError('');
    try {
      const res = await fetch('/api/worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: session.subject,
          topic: session.topic,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setQuestions(data.questions);
      const initial = {};
      data.questions.forEach(q => { initial[q.id] = { working: '', answer: '' }; });
      setAnswers(initial);
      setStep(STEPS.WORKSHEET);
      setTimer(0);
      setTimerRunning(true);
    } catch (err) {
      setError(`Failed to generate worksheet: ${err.message}`);
      setStep(STEPS.WORKSHEET);
    }
  }

  async function handleSubmit() {
    const attempted = questions.filter(q => answers[q.id]?.answer.trim());
    if (attempted.length === 0) {
      setError("Have a go at least one question, Nathan!");
      return;
    }
    setError('');
    setTimerRunning(false);
    setStep(STEPS.MARKING);

    try {
      const submission = questions.map(q => ({
        id: q.id,
        question: q.question,
        marks: q.marks,
        working: answers[q.id]?.working || '',
        answer: answers[q.id]?.answer || '',
      }));

      const res = await fetch('/api/worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark',
          subject: session.subject,
          problems: submission,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data);
      setStep(STEPS.RESULTS);
      incrementStat('questionsAttempted', questions.length);
    } catch (err) {
      setError(`Marking failed: ${err.message}`);
      setStep(STEPS.WORKSHEET);
      setTimerRunning(true);
    }
  }

  function handleChange(id, field, value) {
    setAnswers(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  const subjectColours = {
    'further-maths': '#AA96DA',
    'maths': '#FFE66D',
    'physics': '#4ECDC4',
  };
  const colour = subjectColours[session.subject] || '#AA96DA';

  return (
    <div>
      {/* Loading */}
      {step === STEPS.LOADING && (
        <div className="card card-center">
          <div className="spinner" />
          <p className="loading-title">Building your worksheet...</p>
          <p className="loading-sub">{session.topic}</p>
        </div>
      )}

      {/* Marking */}
      {step === STEPS.MARKING && (
        <div className="card card-center">
          <div className="spinner" />
          <p className="loading-title">Marking your work...</p>
          <p className="loading-sub">Completed in {formatTimer(timer)} ⏱</p>
        </div>
      )}

      {/* Worksheet */}
      {step === STEPS.WORKSHEET && (
        <div className="card">
          <div className="ws-header">
            <span className="badge" style={{ background: `${colour}20`, color: colour }}>
              📝 Revision Worksheet
            </span>
            <span className="ws-timer" style={{ color: colour }}>⏱ {formatTimer(timer)}</span>
          </div>

          <div className="ws-topic-bar" style={{ borderLeftColor: colour }}>
            <p className="ws-topic-subject">{session.subject.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
            <p className="ws-topic-name">{session.topic}</p>
          </div>

          {error && <p className="error-msg">{error}</p>}

          {questions.length === 0 && !error && (
            <p className="maths-empty">No questions loaded. Try again.</p>
          )}

          {questions.map((q, index) => (
            <div key={q.id} className="ws-question">
              <div className="ws-q-header">
                <span className="ws-q-num" style={{ color: colour }}>Q{index + 1}</span>
                <span className="ws-q-marks">[{q.marks} marks]</span>
              </div>
              <p className="ws-q-text">{q.question}</p>

              <label className="field-label" htmlFor={`ws-working-${q.id}`}>Working</label>
              <textarea
                id={`ws-working-${q.id}`}
                className="field-textarea maths-working"
                rows={4}
                placeholder="Show your working here..."
                value={answers[q.id]?.working || ''}
                onChange={(e) => handleChange(q.id, 'working', e.target.value)}
              />

              <label className="field-label" htmlFor={`ws-answer-${q.id}`}>Answer</label>
              <input
                id={`ws-answer-${q.id}`}
                className="field-input"
                type="text"
                placeholder="Your answer"
                value={answers[q.id]?.answer || ''}
                onChange={(e) => handleChange(q.id, 'answer', e.target.value)}
              />
            </div>
          ))}

          {questions.length > 0 && (
            <button className="btn-primary" onClick={handleSubmit}>
              Submit for Marking ✏️
            </button>
          )}

          <button className="btn-reset" onClick={onBack}>← Back</button>
        </div>
      )}

      {/* Results */}
      {step === STEPS.RESULTS && results && (
        <div className="card">
          <div className="ws-header">
            <span className="badge" style={{ background: `${colour}20`, color: colour }}>
              📊 Worksheet Results
            </span>
            <span className="ws-timer">⏱ {formatTimer(timer)}</span>
          </div>

          <div className="maths-score-box">
            <p className="maths-score">{results.totalMarks} / {results.totalAvailable}</p>
            <p className="maths-score-label">{session.topic}</p>
            <div className="maths-score-bar">
              <div className="maths-score-fill" style={{ width: `${(results.totalMarks / results.totalAvailable) * 100}%` }} />
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
              <p className="maths-problem-text">{questions[index]?.question}</p>
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

          <button className="btn-primary" onClick={generateWorksheet}>
            New Worksheet on Same Topic 🔄
          </button>
          <button className="btn-reset" onClick={onBack}>← Back</button>
        </div>
      )}
    </div>
  );
}
