import { useState } from 'react';

const SANDWICH_OPTIONS = [
  { id: 1, name: 'BLT', emoji: '🥓', desc: 'Bacon, lettuce & tomato — classic' },
  { id: 2, name: 'Chicken & Bacon', emoji: '🍗', desc: 'With mayo, obviously' },
  { id: 3, name: 'Ham & Cheese', emoji: '🧀', desc: 'Simple. Reliable. Like Nathan isn\'t.' },
  { id: 4, name: 'Tuna Mayo', emoji: '🐟', desc: 'The meal deal staple' },
  { id: 5, name: 'Egg Mayo', emoji: '🥚', desc: 'Bold choice for a public place' },
  { id: 6, name: 'Chicken Caesar Wrap', emoji: '🌯', desc: 'Wrap counts as a sandwich, fight me' },
  { id: 7, name: 'Club Sandwich', emoji: '🥪', desc: 'Triple decker energy' },
  { id: 8, name: 'Ploughman\'s', emoji: '🫕', desc: 'Cheese, pickle, the works' },
];

const SNACK_OPTIONS = [
  { id: 1, name: 'Crisps (Cheese & Onion)', emoji: '🥔', desc: 'The king of crisp flavours' },
  { id: 2, name: 'Chocolate Bar', emoji: '🍫', desc: 'Dairy Milk or Snickers, dealer\'s choice' },
  { id: 3, name: 'Apple', emoji: '🍎', desc: 'For when you\'re pretending to be healthy' },
  { id: 4, name: 'Biscuits', emoji: '🍪', desc: 'Custard creams or bourbons' },
  { id: 5, name: 'Cereal Bar', emoji: '🥣', desc: 'It\'s basically chocolate in disguise' },
  { id: 6, name: 'Sausage Roll', emoji: '🥖', desc: 'Greggs or nothing' },
  { id: 7, name: 'Banana', emoji: '🍌', desc: 'Instant energy, no commitment' },
  { id: 8, name: 'Yoghurt', emoji: '🥛', desc: 'Muller Corner if you\'re feeling fancy' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function LunchPlanner({ onBack }) {
  const [plan, setPlan] = useState(() => {
    const saved = localStorage.getItem('nathan_lunch_plan');
    if (saved) try { return JSON.parse(saved); } catch {}
    return {};
  });

  function setDayChoice(day, type, item) {
    setPlan(prev => {
      const next = { ...prev, [day]: { ...prev[day], [type]: item } };
      localStorage.setItem('nathan_lunch_plan', JSON.stringify(next));
      return next;
    });
  }

  function randomise() {
    const next = {};
    DAYS.forEach(day => {
      next[day] = {
        sandwich: SANDWICH_OPTIONS[Math.floor(Math.random() * SANDWICH_OPTIONS.length)],
        snack: SNACK_OPTIONS[Math.floor(Math.random() * SNACK_OPTIONS.length)],
      };
    });
    localStorage.setItem('nathan_lunch_plan', JSON.stringify(next));
    setPlan(next);
  }

  return (
    <div className="card">
      <span className="badge">🥪 Lunch & Snack Planner</span>
      <p className="cv-intro">Plan your lunches for the week, Nathan. No more standing in Tesco for 20 minutes.</p>

      <button className="btn-spin" onClick={randomise} style={{ marginBottom: 18 }}>
        Randomise My Week 🎲
      </button>

      {DAYS.map(day => (
        <div key={day} className="lunch-day">
          <h3 className="lunch-day-title">{day}</h3>
          <div className="lunch-row">
            <div className="lunch-pick">
              <p className="lunch-pick-label">Sandwich</p>
              <select
                className="lunch-select"
                value={plan[day]?.sandwich?.id || ''}
                onChange={(e) => {
                  const item = SANDWICH_OPTIONS.find(s => s.id === Number(e.target.value));
                  if (item) setDayChoice(day, 'sandwich', item);
                }}
              >
                <option value="">Pick one...</option>
                {SANDWICH_OPTIONS.map(s => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                ))}
              </select>
              {plan[day]?.sandwich && (
                <p className="lunch-choice-desc">{plan[day].sandwich.desc}</p>
              )}
            </div>
            <div className="lunch-pick">
              <p className="lunch-pick-label">Snack</p>
              <select
                className="lunch-select"
                value={plan[day]?.snack?.id || ''}
                onChange={(e) => {
                  const item = SNACK_OPTIONS.find(s => s.id === Number(e.target.value));
                  if (item) setDayChoice(day, 'snack', item);
                }}
              >
                <option value="">Pick one...</option>
                {SNACK_OPTIONS.map(s => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                ))}
              </select>
              {plan[day]?.snack && (
                <p className="lunch-choice-desc">{plan[day].snack.desc}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      <button className="btn-reset" onClick={onBack}>
        ← Back to Decision Maker
      </button>
    </div>
  );
}
