import { useState, useEffect } from 'react';

const STORAGE_KEY = 'nathan_revision_plan';

const SUBJECTS = [
  { id: 'further-maths', name: 'Further Maths', colour: '#AA96DA', icon: '📐', spec: 'H245' },
  { id: 'maths', name: 'Maths', colour: '#FFE66D', icon: '📊', spec: 'H240' },
  { id: 'physics', name: 'Physics', colour: '#4ECDC4', icon: '⚛️', spec: 'H556' },
];

const EXAM_DATES = [
  { subject: 'further-maths', paper: 'Pure Core (Paper 1)', date: '2026-05-12', time: '09:00' },
  { subject: 'further-maths', paper: 'Pure Core (Paper 2)', date: '2026-05-21', time: '09:00' },
  { subject: 'further-maths', paper: 'Optional Papers', date: '2026-06-05', time: '13:30' },
  { subject: 'maths', paper: 'Pure Mathematics (Paper 1)', date: '2026-05-14', time: '09:00' },
  { subject: 'maths', paper: 'Pure & Statistics (Paper 2)', date: '2026-05-28', time: '09:00' },
  { subject: 'maths', paper: 'Pure & Mechanics (Paper 3)', date: '2026-06-09', time: '09:00' },
  { subject: 'physics', paper: 'Modelling Physics (Paper 1)', date: '2026-05-15', time: '13:30' },
  { subject: 'physics', paper: 'Exploring Physics (Paper 2)', date: '2026-05-29', time: '13:30' },
  { subject: 'physics', paper: 'Unified Physics (Paper 3)', date: '2026-06-12', time: '09:00' },
];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatDisplay(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function generateDefaultPlan() {
  const plan = {};
  const start = new Date('2026-04-07');
  const end = new Date('2026-06-12');
  const topics = {
    'further-maths': [
      'Complex numbers — argand diagrams',
      'Complex numbers — de Moivre',
      'Matrices — transformations',
      'Matrices — eigenvalues',
      'Further calculus — Maclaurin series',
      'Further calculus — improper integrals',
      'Proof by induction',
      'Polar coordinates',
      'Hyperbolic functions',
      'Differential equations',
      'Vectors — planes & products',
      'Past paper practice',
    ],
    'maths': [
      'Algebra & functions',
      'Coordinate geometry',
      'Sequences & series',
      'Trigonometry identities',
      'Exponentials & logarithms',
      'Differentiation',
      'Integration',
      'Numerical methods',
      'Statistics — distributions',
      'Statistics — hypothesis testing',
      'Mechanics — kinematics',
      'Mechanics — forces & moments',
    ],
    'physics': [
      'Forces & motion',
      'Energy & power',
      'Materials & Newton\'s laws',
      'Electrical circuits',
      'Waves & quantum physics',
      'Thermal physics',
      'Circular motion & oscillations',
      'Gravitational fields',
      'Electric fields & capacitors',
      'Electromagnetism',
      'Nuclear & particle physics',
      'Astrophysics & cosmology',
    ],
  };

  const subjectIds = Object.keys(topics);
  let topicIndex = { 'further-maths': 0, 'maths': 0, 'physics': 0 };
  let current = new Date(start);
  let dayCount = 0;

  while (current <= end) {
    const key = formatDate(current);
    const dow = current.getDay();

    if (dow !== 0) { // No Sunday sessions
      const subjectId = subjectIds[dayCount % 3];
      const topicList = topics[subjectId];
      const topic = topicList[topicIndex[subjectId] % topicList.length];
      topicIndex[subjectId]++;

      const isExamDay = EXAM_DATES.some(e => e.date === key);

      if (!isExamDay) {
        plan[key] = plan[key] || [];
        plan[key].push({
          id: Date.now() + dayCount,
          subject: subjectId,
          topic,
          time: dow === 6 ? '10:00' : '16:00',
          duration: '90 mins',
        });
      }
      dayCount++;
    }
    current.setDate(current.getDate() + 1);
  }

  return plan;
}

export default function RevisionCalendar({ onBack }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [plan, setPlan] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { return JSON.parse(saved); } catch {}
    return generateDefaultPlan();
  });
  const [editing, setEditing] = useState(null);
  const [formSubject, setFormSubject] = useState('further-maths');
  const [formTopic, setFormTopic] = useState('');
  const [formTime, setFormTime] = useState('16:00');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }, [plan]);

  const weekDays = getWeekDays(weekStart);
  const today = formatDate(new Date());

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }

  function addSession(dateKey) {
    if (!formTopic.trim()) return;
    setPlan(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), {
        id: Date.now(),
        subject: formSubject,
        topic: formTopic,
        time: formTime,
        duration: '90 mins',
      }].sort((a, b) => a.time.localeCompare(b.time)),
    }));
    setEditing(null);
    setFormTopic('');
  }

  function deleteSession(dateKey, sessionId) {
    setPlan(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter(s => s.id !== sessionId),
    }));
  }

  function resetPlan() {
    const fresh = generateDefaultPlan();
    setPlan(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }

  // Upcoming exams
  const upcomingExams = EXAM_DATES
    .filter(e => daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <div className="card">
      <span className="badge">📅 Revision Calendar</span>

      {/* Exam countdown */}
      {upcomingExams.length > 0 && (
        <div className="rev-exams">
          <p className="rev-exams-title">Upcoming Exams</p>
          {upcomingExams.map((exam, i) => {
            const sub = SUBJECTS.find(s => s.id === exam.subject);
            const days = daysUntil(exam.date);
            return (
              <div key={i} className="rev-exam-row" style={{ borderLeftColor: sub?.colour }}>
                <div className="rev-exam-info">
                  <span className="rev-exam-name">{sub?.icon} {exam.paper}</span>
                  <span className="rev-exam-date">
                    {new Date(exam.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {exam.time}
                  </span>
                </div>
                <span className={`rev-exam-countdown ${days <= 7 ? 'urgent' : ''}`}>
                  {days === 0 ? 'TODAY' : `${days}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Week nav */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevWeek}>← Prev</button>
        <span className="cal-nav-label">
          {formatDisplay(weekDays[0])} — {formatDisplay(weekDays[6])}
        </span>
        <button className="cal-nav-btn" onClick={nextWeek}>Next →</button>
      </div>

      {/* Week grid */}
      <div className="rev-week">
        {weekDays.map(day => {
          const key = formatDate(day);
          const sessions = plan[key] || [];
          const exams = EXAM_DATES.filter(e => e.date === key);
          const isToday = key === today;
          const isPast = key < today;

          return (
            <div key={key} className={`rev-day ${isToday ? 'rev-today' : ''} ${isPast ? 'rev-past' : ''}`}>
              <div className="rev-day-header">
                <span className="rev-day-name">
                  {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                </span>
                <span className="rev-day-date">{day.getDate()}</span>
              </div>

              {exams.map((exam, i) => {
                const sub = SUBJECTS.find(s => s.id === exam.subject);
                return (
                  <div key={i} className="rev-exam-badge" style={{ background: sub?.colour, color: '#1a1a2e' }}>
                    🎓 {exam.paper}
                  </div>
                );
              })}

              {sessions.map(session => {
                const sub = SUBJECTS.find(s => s.id === session.subject);
                return (
                  <div key={session.id} className="rev-session" style={{ borderLeftColor: sub?.colour }}>
                    <div className="rev-session-top">
                      <span className="rev-session-time">{session.time}</span>
                      <button className="cal-lesson-delete" onClick={() => deleteSession(key, session.id)}>×</button>
                    </div>
                    <span className="rev-session-subject" style={{ color: sub?.colour }}>
                      {sub?.icon} {sub?.name}
                    </span>
                    <span className="rev-session-topic">{session.topic}</span>
                  </div>
                );
              })}

              {!isPast && editing === key ? (
                <div className="rev-add-form">
                  <select className="lunch-select" value={formSubject} onChange={e => setFormSubject(e.target.value)}>
                    {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                  </select>
                  <input className="cal-note-input" placeholder="Topic" value={formTopic} onChange={e => setFormTopic(e.target.value)} />
                  <input className="cal-time-input" type="time" value={formTime} onChange={e => setFormTime(e.target.value)} />
                  <div className="cal-form-actions">
                    <button className="cal-save-btn" onClick={() => addSession(key)}>Add</button>
                    <button className="cal-cancel-btn" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : !isPast && (
                <button className="cal-add-btn" onClick={() => setEditing(key)}>+ Add Session</button>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn-reset" onClick={resetPlan} style={{ marginTop: 12 }}>
        Reset to Default Plan 🔄
      </button>
      <button className="btn-reset" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

export { EXAM_DATES, SUBJECTS };
