import { useState } from 'react';

const TYPE_COLOURS = { 'Event': '#FF6B6B', 'Activity': '#4ECDC4', 'Day Trip': '#FFE66D', 'Social': '#AA96DA' };

export default function Activities({ onBack }) {
  const [step, setStep] = useState('input');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!location.trim() && !interests.trim()) { setError("Give us something to work with, Nathan!"); return; }
    setError(''); setStep('loading');
    try {
      const res = await fetch('/api/activities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, interests }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(data); setStep('results');
    } catch (err) { setError(`Search failed: ${err.message}`); setStep('input'); }
  }

  return (
    <div>
      {step === 'loading' && (
        <div className="card card-center">
          <div className="spinner" />
          <p className="loading-title">Finding fun stuff...</p>
          <p className="loading-sub">Getting Nathan off the sofa 🛋️</p>
        </div>
      )}

      {step === 'input' && (
        <div className="card">
          <span className="badge">🎯 Things To Do</span>
          <label className="field-label">Where are you?</label>
          <input className="field-input" placeholder="e.g. Manchester, Leeds, London..." value={location} onChange={e => setLocation(e.target.value)} />
          <label className="field-label" style={{ marginTop: 14 }}>What are you into?</label>
          <input className="field-input" placeholder="e.g. cinema, bowling, hiking, food..." value={interests} onChange={e => setInterests(e.target.value)} />
          {error && <p className="error-msg" style={{ marginTop: 12 }}>{error}</p>}
          <button className="btn-primary" onClick={handleSearch} style={{ marginTop: 16 }}>Find Things To Do 🔍</button>
          <button className="btn-reset" onClick={onBack}>← Back</button>
        </div>
      )}

      {step === 'results' && results && (
        <div className="card">
          <span className="badge">🎯 Things To Do</span>
          {results.tip && <div className="app-tips-box"><p className="app-tips-text">💡 {results.tip}</p></div>}
          <div className="app-list">
            {(results.activities || []).map(act => (
              <div key={act.id} className="activity-card">
                <div className="app-card-header">
                  <span className="app-level-badge" style={{ background: TYPE_COLOURS[act.type] || '#4ECDC4' }}>{act.type}</span>
                  <span className="app-sector">{act.cost}</span>
                </div>
                <h3 className="activity-name">{act.name}</h3>
                <p className="activity-location">📍 {act.location}</p>
                <p className="activity-date">📅 {act.date}</p>
                <p className="app-description">{act.description}</p>
                <div className="activity-tags">
                  {(act.tags || []).map(tag => <span key={tag} className="activity-tag">{tag}</span>)}
                </div>
                {act.link && <a href={act.link} target="_blank" rel="noreferrer" className="btn-apply">Find Out More →</a>}
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setStep('input')} style={{ marginTop: 12 }}>Search Again 🔄</button>
          <button className="btn-reset" onClick={onBack}>← Back</button>
        </div>
      )}
    </div>
  );
}
