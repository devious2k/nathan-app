import { useState, useEffect } from 'react';

const STORAGE_KEY = 'nathan_goals';

const CATEGORIES = [
  { id: 'career', label: 'Career', icon: '💼', colour: '#FF6B6B' },
  { id: 'study', label: 'Study', icon: '📐', colour: '#AA96DA' },
  { id: 'fitness', label: 'Fitness', icon: '💪', colour: '#4ECDC4' },
  { id: 'life', label: 'Life', icon: '🌟', colour: '#FFE66D' },
  { id: 'money', label: 'Money', icon: '💷', colour: '#95E1D3' },
];

export default function Goals({ onBack }) {
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('life');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  function addGoal() {
    if (!title.trim()) return;
    setGoals(prev => [...prev, {
      id: Date.now(),
      title,
      category,
      deadline: deadline || null,
      completed: false,
      createdAt: new Date().toISOString(),
    }]);
    setTitle(''); setDeadline(''); setAdding(false);
  }

  function toggleGoal(id) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  }

  function deleteGoal(id) {
    setGoals(prev => prev.filter(g => g.id !== id));
  }

  const active = goals.filter(g => !g.completed);
  const completed = goals.filter(g => g.completed);
  const progress = goals.length > 0 ? Math.round((completed.length / goals.length) * 100) : 0;

  return (
    <div className="card">
      <span className="badge">🎯 Nathan's Goals</span>

      {goals.length > 0 && (
        <div className="goals-progress">
          <div className="goals-progress-bar">
            <div className="goals-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="goals-progress-text">{completed.length}/{goals.length} completed ({progress}%)</p>
        </div>
      )}

      {/* Active goals */}
      {active.length > 0 && (
        <div className="goals-section">
          {active.map(goal => {
            const cat = CATEGORIES.find(c => c.id === goal.category);
            const isOverdue = goal.deadline && new Date(goal.deadline) < new Date();
            return (
              <div key={goal.id} className="goal-item" style={{ borderLeftColor: cat?.colour }}>
                <button className="goal-check" onClick={() => toggleGoal(goal.id)}>○</button>
                <div className="goal-info">
                  <span className="goal-title">{goal.title}</span>
                  <div className="goal-meta">
                    <span className="goal-cat" style={{ color: cat?.colour }}>{cat?.icon} {cat?.label}</span>
                    {goal.deadline && (
                      <span className={`goal-deadline ${isOverdue ? 'overdue' : ''}`}>
                        📅 {new Date(goal.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <button className="cal-lesson-delete" onClick={() => deleteGoal(goal.id)}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <div className="goal-add-form">
          <input className="field-input" placeholder="What's the goal?" value={title} onChange={e => setTitle(e.target.value)} />
          <div className="goal-form-row">
            <select className="lunch-select" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
            <input className="field-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="cal-form-actions" style={{ marginTop: 8 }}>
            <button className="cal-save-btn" onClick={addGoal}>Add Goal</button>
            <button className="cal-cancel-btn" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-spin" onClick={() => setAdding(true)} style={{ marginTop: active.length > 0 ? 12 : 0 }}>
          + Add a Goal 🎯
        </button>
      )}

      {/* Completed goals */}
      {completed.length > 0 && (
        <div className="goals-section" style={{ marginTop: 20 }}>
          <p className="goals-completed-title">Completed 🎉</p>
          {completed.map(goal => {
            const cat = CATEGORIES.find(c => c.id === goal.category);
            return (
              <div key={goal.id} className="goal-item goal-done" style={{ borderLeftColor: cat?.colour }}>
                <button className="goal-check done" onClick={() => toggleGoal(goal.id)}>✓</button>
                <div className="goal-info">
                  <span className="goal-title">{goal.title}</span>
                </div>
                <button className="cal-lesson-delete" onClick={() => deleteGoal(goal.id)}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {goals.length === 0 && !adding && (
        <p className="maths-empty" style={{ marginTop: 12 }}>No goals yet. Set some targets, Nathan! 💪</p>
      )}

      <button className="btn-reset" onClick={onBack}>← Back</button>
    </div>
  );
}
