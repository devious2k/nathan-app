import { useState, useEffect } from 'react';

const STAT_KEYS = {
  questionsAttempted: 'nathan_questions_attempted',
  apprenticeshipsFound: 'nathan_apprenticeships_found',
  coverLettersWritten: 'nathan_cover_letters_written',
};

export function getStats() {
  return {
    questionsAttempted: parseInt(localStorage.getItem(STAT_KEYS.questionsAttempted) || '0', 10),
    apprenticeshipsFound: parseInt(localStorage.getItem(STAT_KEYS.apprenticeshipsFound) || '0', 10),
    coverLettersWritten: parseInt(localStorage.getItem(STAT_KEYS.coverLettersWritten) || '0', 10),
  };
}

export function incrementStat(key, amount = 1) {
  const current = parseInt(localStorage.getItem(STAT_KEYS[key]) || '0', 10);
  localStorage.setItem(STAT_KEYS[key], String(current + amount));
}

export default function Dashboard({ onBack }) {
  const [stats, setStats] = useState(getStats());

  useEffect(() => {
    setStats(getStats());
  }, []);

  const cards = [
    { label: 'Questions Attempted', value: stats.questionsAttempted, icon: '📐', colour: '#AA96DA' },
    { label: 'Apprenticeships Found', value: stats.apprenticeshipsFound, icon: '💼', colour: '#FF6B6B' },
    { label: 'Cover Letters Written', value: stats.coverLettersWritten, icon: '✉️', colour: '#95E1D3' },
  ];

  return (
    <div className="card">
      <span className="badge">📊 Nathan's Dashboard</span>

      <div className="dash-grid">
        {cards.map((card) => (
          <div key={card.label} className="dash-card" style={{ borderColor: card.colour }}>
            <span className="dash-icon">{card.icon}</span>
            <span className="dash-value" style={{ color: card.colour }}>{card.value}</span>
            <span className="dash-label">{card.label}</span>
          </div>
        ))}
      </div>

      <button className="btn-reset" onClick={onBack}>
        ← Back to Decision Maker
      </button>
    </div>
  );
}
