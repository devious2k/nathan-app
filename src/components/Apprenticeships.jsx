import { useState } from 'react';
import { incrementStat } from './Dashboard.jsx';

const LEVEL_COLOURS = { 4: '#AA96DA', 5: '#4ECDC4', 6: '#FFE66D' };

export default function Apprenticeships({ onBack }) {
  const [step, setStep] = useState('input');
  const [interests, setInterests] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!interests.trim()) {
      setError("Tell us what you're into, Nathan! Even roughly.");
      return;
    }
    setError('');
    setStep('loading');

    try {
      const res = await fetch('/api/apprenticeships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data);
      setStep('results');
      incrementStat('apprenticeshipsFound', data.apprenticeships?.length || 0);
    } catch (err) {
      setError(`Search failed: ${err.message}`);
      setStep('input');
    }
  }

  return (
    <div className="apprenticeships-container">
      {step === 'loading' && (
        <div className="card card-center">
          <div className="spinner" />
          <p className="loading-title">Searching for apprenticeships...</p>
          <p className="loading-sub">Finding your future career, Nathan 💼</p>
        </div>
      )}

      {step === 'input' && (
        <div className="card">
          <span className="badge">💼 Apprenticeship Finder</span>

          <label className="field-label" htmlFor="app-interests">
            What kind of work interests you?
          </label>
          <textarea
            id="app-interests"
            className="field-textarea"
            rows={3}
            placeholder="e.g. IT, software development, engineering, business, finance, data..."
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />

          <label className="field-label" htmlFor="app-location">
            Preferred location (optional)
          </label>
          <input
            id="app-location"
            className="field-input"
            type="text"
            placeholder="e.g. London, Manchester, remote, anywhere..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          {error && <p className="error-msg" style={{ marginTop: 14 }}>{error}</p>}

          <button className="btn-primary" onClick={handleSearch} style={{ marginTop: 18 }}>
            Find Apprenticeships 🔍
          </button>

          <button className="btn-reset" onClick={onBack}>
            ← Back to Decision Maker
          </button>
        </div>
      )}

      {step === 'results' && results && (
        <div className="card">
          <span className="badge">💼 Apprenticeships Found</span>

          {results.tips && (
            <div className="app-tips-box">
              <p className="app-tips-text">💡 {results.tips}</p>
            </div>
          )}

          <div className="app-list">
            {results.apprenticeships.map((app) => (
              <div key={app.id} className="app-card">
                <div className="app-card-header">
                  <span
                    className="app-level-badge"
                    style={{ background: LEVEL_COLOURS[app.level] || '#AA96DA' }}
                  >
                    Level {app.level}
                  </span>
                  <span className="app-sector">{app.sector}</span>
                </div>

                <h3 className="app-title">{app.title}</h3>
                <p className="app-employer">{app.employer}</p>
                <p className="app-description">{app.description}</p>

                <div className="app-details">
                  <span>⏱ {app.duration}</span>
                  <span>💰 {app.salary}</span>
                </div>

                <a
                  href={app.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-apply"
                >
                  Search & Apply →
                </a>
              </div>
            ))}
          </div>

          <button className="btn-primary" onClick={() => setStep('input')} style={{ marginTop: 16 }}>
            Search Again 🔄
          </button>
          <button className="btn-reset" onClick={onBack}>
            ← Back to Decision Maker
          </button>
        </div>
      )}
    </div>
  );
}
