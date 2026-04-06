import { useState } from 'react';

export default function JobSearch({ onBack }) {
  const [step, setStep] = useState('input');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!location.trim()) { setError("Where are you looking, Nathan?"); return; }
    setError(''); setStep('loading');
    try {
      const res = await fetch('/api/jobs', {
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
          <p className="loading-title">Finding jobs...</p>
          <p className="loading-sub">Time to earn some money, Nathan 💷</p>
        </div>
      )}

      {step === 'input' && (
        <div className="card">
          <span className="badge">💷 Part-Time Jobs</span>
          <label className="field-label">Where are you looking?</label>
          <input className="field-input" placeholder="e.g. Manchester, Leeds..." value={location} onChange={e => setLocation(e.target.value)} />
          <label className="field-label" style={{ marginTop: 14 }}>Any skills or interests? (optional)</label>
          <input className="field-input" placeholder="e.g. tech, retail, food, customer service..." value={interests} onChange={e => setInterests(e.target.value)} />
          {error && <p className="error-msg" style={{ marginTop: 12 }}>{error}</p>}
          <button className="btn-primary" onClick={handleSearch} style={{ marginTop: 16 }}>Find Jobs 🔍</button>
          <button className="btn-reset" onClick={onBack}>← Back</button>
        </div>
      )}

      {step === 'results' && results && (
        <div className="card">
          <span className="badge">💷 Part-Time Jobs</span>
          {results.tip && <div className="app-tips-box"><p className="app-tips-text">💡 {results.tip}</p></div>}
          <div className="app-list">
            {(results.jobs || []).map(job => (
              <div key={job.id} className="app-card">
                <div className="app-card-header">
                  <span className="app-level-badge" style={{ background: '#95E1D3' }}>{job.type}</span>
                  <span className="app-sector">{job.pay}</span>
                </div>
                <h3 className="activity-name">{job.title}</h3>
                <p className="app-employer">{job.company}</p>
                <p className="app-description">{job.description}</p>
                <div className="app-details">
                  <span>⏱ {job.hours}</span>
                </div>
                <div className="activity-tags">
                  {(job.tags || []).map(tag => <span key={tag} className="activity-tag">{tag}</span>)}
                </div>
                {job.searchUrl && <a href={job.searchUrl} target="_blank" rel="noreferrer" className="btn-apply">Search & Apply →</a>}
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
