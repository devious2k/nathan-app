import { useState } from 'react';
import { jsPDF } from 'jspdf';

const QUESTIONS = [
  { key: 'fullName', label: 'Full name', placeholder: 'Nathan...', type: 'input' },
  { key: 'email', label: 'Email address', placeholder: 'nathan@example.com', type: 'input' },
  { key: 'phone', label: 'Phone number', placeholder: '07...', type: 'input' },
  { key: 'location', label: 'Where do you live?', placeholder: 'e.g. Manchester', type: 'input' },
  { key: 'education', label: 'Where did you go to school/college?', placeholder: 'e.g. Sixth Form College, 2022-2024', type: 'textarea' },
  { key: 'qualifications', label: 'Qualifications & grades', placeholder: 'e.g. A-Level Further Maths (B), Physics (B), Maths (A)...', type: 'textarea' },
  { key: 'workExperience', label: 'Any work experience? (paid or unpaid)', placeholder: "e.g. Part-time at Tesco, summer internship... or 'None yet' — that's fine!", type: 'textarea' },
  { key: 'volunteering', label: 'Volunteering or extra-curricular activities?', placeholder: 'e.g. Duke of Edinburgh, coding club, sports teams...', type: 'textarea' },
  { key: 'skills', label: 'What skills do you have?', placeholder: 'e.g. Python, teamwork, problem solving, communication...', type: 'textarea' },
  { key: 'interests', label: 'Hobbies & interests', placeholder: 'e.g. gaming, football, music production...', type: 'textarea' },
  { key: 'careerGoals', label: 'What do you want to do with your career?', placeholder: 'e.g. get into software development, work in data science...', type: 'textarea' },
];

const LETTER_QUESTION = {
  key: 'whyApprenticeship',
  label: 'Why do you want this apprenticeship? What excites you about it?',
  placeholder: 'e.g. I want to learn on the job, gain real experience, the company does interesting work...',
  type: 'textarea',
};

export default function CVGenerator({ onBack }) {
  const [step, setStep] = useState('questions'); // questions, generating, cv, letter-input, letter-generating, letter
  const [answers, setAnswers] = useState({});
  const [cvData, setCvData] = useState(null);
  const [letterData, setLetterData] = useState(null);
  const [apprenticeshipTarget, setApprenticeshipTarget] = useState('');
  const [error, setError] = useState('');

  function handleChange(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  async function handleGenerateCV() {
    if (!answers.fullName?.trim()) {
      setError("At least tell us your name, Nathan! 😅");
      return;
    }
    setError('');
    setStep('generating');

    try {
      const res = await fetch('/api/cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-cv', answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCvData(data.cv);
      setStep('cv');
    } catch (err) {
      setError(`Failed to generate CV: ${err.message}`);
      setStep('questions');
    }
  }

  async function handleGenerateLetter() {
    setError('');
    setStep('letter-generating');

    try {
      const res = await fetch('/api/cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-letter',
          answers: { ...answers, whyApprenticeship: answers.whyApprenticeship || '' },
          apprenticeship: apprenticeshipTarget,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setLetterData(data);
      setStep('letter');
    } catch (err) {
      setError(`Failed to generate letter: ${err.message}`);
      setStep('letter-input');
    }
  }

  function downloadCV() {
    if (!cvData) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    let y = 20;

    // Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 50);
    doc.text(answers.fullName || 'Nathan', w / 2, y, { align: 'center' });
    y += 8;

    // Contact
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 120);
    const contact = [answers.email, answers.phone, answers.location].filter(Boolean).join('  |  ');
    doc.text(contact, w / 2, y, { align: 'center' });
    y += 10;

    // Line
    doc.setDrawColor(170, 150, 218);
    doc.setLineWidth(0.5);
    doc.line(15, y, w - 15, y);
    y += 8;

    // Personal statement
    y = addSection(doc, 'Personal Statement', y, w);
    y = addWrapped(doc, cvData.personalStatement, y, w);
    y += 6;

    // Education
    y = addSection(doc, 'Education', y, w);
    (cvData.education || []).forEach(edu => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 50);
      doc.text(edu.institution, 15, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 120);
      doc.text(edu.dates, w - 15, y, { align: 'right' });
      y += 5;
      y = addWrapped(doc, edu.details, y, w);
      y += 4;
    });

    // Experience
    if (cvData.experience && cvData.experience.length > 0) {
      y = addSection(doc, 'Experience', y, w);
      cvData.experience.forEach(exp => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 50);
        doc.text(`${exp.role} — ${exp.company}`, 15, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 120);
        doc.text(exp.dates, w - 15, y, { align: 'right' });
        y += 5;
        (exp.bullets || []).forEach(b => {
          y = addWrapped(doc, `• ${b}`, y, w);
        });
        y += 4;
      });
    }

    // Skills
    y = addSection(doc, 'Skills', y, w);
    y = addWrapped(doc, (cvData.skills || []).join('  •  '), y, w);
    y += 6;

    // Interests
    if (cvData.interests) {
      y = addSection(doc, 'Interests', y, w);
      y = addWrapped(doc, cvData.interests, y, w);
      y += 6;
    }

    // References
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(130, 130, 150);
    doc.text(cvData.references || 'References available upon request', 15, y);

    doc.save(`${(answers.fullName || 'Nathan').replace(/\s+/g, '_')}_CV.pdf`);
  }

  function downloadLetter() {
    if (!letterData) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    let y = 25;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 50);

    const paragraphs = letterData.letter.split('\n\n');
    paragraphs.forEach(para => {
      const lines = doc.splitTextToSize(para.trim(), w - 30);
      lines.forEach(line => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 15, y);
        y += 5.5;
      });
      y += 4;
    });

    doc.save(`${(answers.fullName || 'Nathan').replace(/\s+/g, '_')}_Cover_Letter.pdf`);
  }

  return (
    <div className="cv-container">
      {/* Questions */}
      {step === 'questions' && (
        <div className="card">
          <span className="badge">📝 CV Generator</span>
          <p className="cv-intro">Answer these questions and we'll build you a proper CV, Nathan.</p>

          {QUESTIONS.map(q => (
            <div key={q.key} className="cv-field">
              <label className="field-label" htmlFor={`cv-${q.key}`}>{q.label}</label>
              {q.type === 'textarea' ? (
                <textarea
                  id={`cv-${q.key}`}
                  className="field-textarea"
                  rows={3}
                  placeholder={q.placeholder}
                  value={answers[q.key] || ''}
                  onChange={(e) => handleChange(q.key, e.target.value)}
                />
              ) : (
                <input
                  id={`cv-${q.key}`}
                  className="field-input"
                  type="text"
                  placeholder={q.placeholder}
                  value={answers[q.key] || ''}
                  onChange={(e) => handleChange(q.key, e.target.value)}
                />
              )}
            </div>
          ))}

          {error && <p className="error-msg">{error}</p>}

          <button className="btn-primary" onClick={handleGenerateCV} style={{ marginTop: 12 }}>
            Generate My CV 🚀
          </button>
          <button className="btn-reset" onClick={onBack}>
            ← Back to Decision Maker
          </button>
        </div>
      )}

      {/* Generating CV */}
      {step === 'generating' && (
        <div className="card card-center">
          <div className="spinner" />
          <p className="loading-title">Writing your CV...</p>
          <p className="loading-sub">Making Nathan sound employable 😏</p>
        </div>
      )}

      {/* CV Preview */}
      {step === 'cv' && cvData && (
        <div className="card">
          <span className="badge">📝 Your CV</span>

          <div className="cv-preview">
            <h2 className="cv-preview-name">{answers.fullName || 'Nathan'}</h2>
            <p className="cv-preview-contact">
              {[answers.email, answers.phone, answers.location].filter(Boolean).join(' | ')}
            </p>

            <div className="cv-section">
              <h3 className="cv-section-title">Personal Statement</h3>
              <p className="cv-section-text">{cvData.personalStatement}</p>
            </div>

            {cvData.education?.map((edu, i) => (
              <div key={i} className="cv-section">
                {i === 0 && <h3 className="cv-section-title">Education</h3>}
                <p className="cv-entry-header">
                  <strong>{edu.institution}</strong> <span className="cv-dates">{edu.dates}</span>
                </p>
                <p className="cv-section-text">{edu.details}</p>
              </div>
            ))}

            {cvData.experience?.length > 0 && cvData.experience.map((exp, i) => (
              <div key={i} className="cv-section">
                {i === 0 && <h3 className="cv-section-title">Experience</h3>}
                <p className="cv-entry-header">
                  <strong>{exp.role} — {exp.company}</strong> <span className="cv-dates">{exp.dates}</span>
                </p>
                <ul className="cv-bullets">
                  {exp.bullets?.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}

            <div className="cv-section">
              <h3 className="cv-section-title">Skills</h3>
              <p className="cv-section-text">{cvData.skills?.join(' • ')}</p>
            </div>

            {cvData.interests && (
              <div className="cv-section">
                <h3 className="cv-section-title">Interests</h3>
                <p className="cv-section-text">{cvData.interests}</p>
              </div>
            )}
          </div>

          <button className="btn-certificate" onClick={downloadCV}>
            Download CV as PDF 📄
          </button>

          <button className="btn-spin" onClick={() => setStep('letter-input')}>
            Generate Cover Letter ✉️
          </button>

          <button className="btn-primary" onClick={() => setStep('questions')} style={{ marginTop: 10 }}>
            Edit Answers ✏️
          </button>
          <button className="btn-reset" onClick={onBack}>
            ← Back to Decision Maker
          </button>
        </div>
      )}

      {/* Cover letter input */}
      {step === 'letter-input' && (
        <div className="card">
          <span className="badge">✉️ Cover Letter</span>

          <label className="field-label" htmlFor="cv-apprenticeship">
            What apprenticeship are you applying for?
          </label>
          <input
            id="cv-apprenticeship"
            className="field-input"
            type="text"
            placeholder="e.g. Level 4 Software Developer at BT"
            value={apprenticeshipTarget}
            onChange={(e) => setApprenticeshipTarget(e.target.value)}
          />

          <div className="cv-field" style={{ marginTop: 16 }}>
            <label className="field-label" htmlFor="cv-why">{LETTER_QUESTION.label}</label>
            <textarea
              id="cv-why"
              className="field-textarea"
              rows={4}
              placeholder={LETTER_QUESTION.placeholder}
              value={answers.whyApprenticeship || ''}
              onChange={(e) => handleChange('whyApprenticeship', e.target.value)}
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button className="btn-primary" onClick={handleGenerateLetter}>
            Generate Cover Letter 🚀
          </button>
          <button className="btn-reset" onClick={() => setStep('cv')}>
            ← Back to CV
          </button>
        </div>
      )}

      {/* Generating letter */}
      {step === 'letter-generating' && (
        <div className="card card-center">
          <div className="spinner" />
          <p className="loading-title">Writing your cover letter...</p>
          <p className="loading-sub">Convincing them to hire Nathan 🤞</p>
        </div>
      )}

      {/* Letter preview */}
      {step === 'letter' && letterData && (
        <div className="card">
          <span className="badge">✉️ Your Cover Letter</span>

          <div className="cv-preview letter-preview">
            {letterData.letter.split('\n\n').map((para, i) => (
              <p key={i} className="letter-paragraph">{para}</p>
            ))}
          </div>

          {letterData.tips && (
            <div className="app-tips-box">
              <p className="app-tips-text">💡 {letterData.tips}</p>
            </div>
          )}

          <button className="btn-certificate" onClick={downloadLetter}>
            Download Cover Letter as PDF 📄
          </button>

          <button className="btn-primary" onClick={() => setStep('letter-input')} style={{ marginTop: 10 }}>
            Try Different Apprenticeship ✏️
          </button>
          <button className="btn-reset" onClick={() => setStep('cv')}>
            ← Back to CV
          </button>
        </div>
      )}
    </div>
  );
}

function addSection(doc, title, y, w) {
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(170, 150, 218);
  doc.text(title.toUpperCase(), 15, y);
  y += 2;
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.line(15, y, w - 15, y);
  y += 5;
  return y;
}

function addWrapped(doc, text, y, w) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 60);
  const lines = doc.splitTextToSize(text || '', w - 30);
  lines.forEach(line => {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.text(line, 15, y);
    y += 5;
  });
  return y;
}
