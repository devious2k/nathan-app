import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { incrementStat } from './Dashboard.jsx';

const STEPS = { LOADING: 'loading', PROBLEMS: 'problems', MARKING: 'marking', RESULTS: 'results' };

const SUBJECT_CONFIG = {
  'further-maths': { label: 'Further Maths A-Level', badge: '📐', colour: '#AA96DA' },
  'physics': { label: 'Physics A-Level', badge: '⚛️', colour: '#4ECDC4' },
  'maths': { label: 'Maths A-Level', badge: '📊', colour: '#FFE66D' },
};

export default function FurtherMaths({ onBack, subject = 'further-maths' }) {
  const config = SUBJECT_CONFIG[subject];
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
        body: JSON.stringify({ action: 'generate', subject }),
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
        body: JSON.stringify({ action: 'mark', subject, problems: submission }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data);
      setStep(STEPS.RESULTS);
      incrementStat('questionsAttempted', problems.length);
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

  async function loadImage(src) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return { data: canvas.toDataURL('image/jpeg', 0.85), width: img.width, height: img.height };
  }

  async function downloadCertificate() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // White background (saves ink!)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, w, h, 'F');

    // Thin elegant border
    doc.setDrawColor(60, 60, 80);
    doc.setLineWidth(2);
    doc.rect(10, 10, w - 20, h - 20);
    doc.setLineWidth(0.5);
    doc.rect(13, 13, w - 26, h - 26);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(38);
    doc.setTextColor(30, 30, 50);
    doc.text('CERTIFICATE OF ACHIEVEMENT', w / 2, 40, { align: 'center' });

    // Decorative line
    doc.setDrawColor(170, 150, 218);
    doc.setLineWidth(1);
    doc.line(w / 2 - 60, 46, w / 2 + 60, 46);

    // Smiley
    doc.setFontSize(28);
    doc.text(':)', w / 2, 58, { align: 'center' });

    // Well done
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(80, 60, 140);
    doc.text('Well Done Nathan!', w / 2, 72, { align: 'center' });

    // Score
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(60, 60, 80);
    doc.text(
      `You scored ${results.totalMarks} out of ${results.totalAvailable} marks`,
      w / 2, 85, { align: 'center' }
    );

    doc.setFontSize(14);
    doc.setTextColor(120, 100, 160);
    doc.text(`${config.label} Practice`, w / 2, 95, { align: 'center' });

    // Nathan's photo (left side)
    try {
      const nathan = await loadImage('/nathan.png');
      const imgH = 50;
      const imgW = imgH * (nathan.width / nathan.height);
      doc.addImage(nathan.data, 'JPEG', w / 2 - imgW - 15, 102, imgW, imgH);
    } catch {}

    // Marcel's photo (right side)
    try {
      const marcel = await loadImage('/marcel.png');
      const imgH = 50;
      const imgW = imgH * (marcel.width / marcel.height);
      doc.addImage(marcel.data, 'JPEG', w / 2 + 15, 102, imgW, imgH);
    } catch {}

    // Signed by Marcel section
    doc.setDrawColor(60, 60, 80);
    doc.setLineWidth(0.5);
    doc.line(w / 2 - 40, h - 38, w / 2 + 40, h - 38);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(80, 60, 140);
    doc.text('Marcel', w / 2, h - 32, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 150);
    doc.text('Signed by Marcel — Chief Examiner & Grumpy Cat', w / 2, h - 26, { align: 'center' });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 170);
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(today, w / 2, h - 18, { align: 'center' });
    doc.text("Nathan's Decision Maker — gameonsolutions.uk", w / 2, h - 14, { align: 'center' });

    doc.save('nathan-certificate.pdf');
  }

  return (
    <div className="maths-container">
      {/* Loading */}
      {step === STEPS.LOADING && (
        <div className="card card-center">
          <div className="spinner" />
          <p className="loading-title">Generating problems...</p>
          <p className="loading-sub">{config.label} isn't going to do itself, Nathan</p>
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
          <span className="badge">{config.badge} {config.label}</span>

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

          <button className="btn-certificate" onClick={downloadCertificate}>
            Download Certificate 🏆
          </button>

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
