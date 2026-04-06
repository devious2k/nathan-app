import { useState, useEffect } from 'react';
import { EXAM_DATES, SUBJECTS } from './RevisionCalendar.jsx';

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

function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function WeekOverview() {
  const [data, setData] = useState({ revision: {}, driving: {}, goals: [] });

  useEffect(() => {
    function load() {
      let revision = {};
      let driving = {};
      let goals = [];
      try { revision = JSON.parse(localStorage.getItem('nathan_revision_plan') || '{}'); } catch {}
      try { driving = JSON.parse(localStorage.getItem('nathan_driving_lessons') || '{}'); } catch {}
      try { goals = JSON.parse(localStorage.getItem('nathan_goals') || '[]'); } catch {}
      setData({ revision, driving, goals });
    }
    load();
    // Refresh when tab becomes visible
    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const today = new Date();
  const todayStr = formatDate(today);
  const monday = getMonday(today);
  const weekDays = getWeekDays(monday);

  const activeGoals = data.goals.filter(g => !g.completed).slice(0, 3);

  return (
    <div className="week-overview">
      <h2 className="wo-title">📅 This Week</h2>

      <div className="wo-days">
        {weekDays.map(day => {
          const key = formatDate(day);
          const isToday = key === todayStr;
          const isPast = key < todayStr;
          const revSessions = data.revision[key] || [];
          const driveLessons = data.driving[key] || [];
          const exams = EXAM_DATES.filter(e => e.date === key);
          const hasItems = revSessions.length > 0 || driveLessons.length > 0 || exams.length > 0;

          return (
            <div key={key} className={`wo-day ${isToday ? 'wo-today' : ''} ${isPast ? 'wo-past' : ''}`}>
              <div className="wo-day-head">
                <span className="wo-day-name">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                <span className="wo-day-num">{day.getDate()}</span>
              </div>

              <div className="wo-day-items">
                {exams.map((exam, i) => {
                  const sub = SUBJECTS.find(s => s.id === exam.subject);
                  return (
                    <div key={`exam-${i}`} className="wo-item wo-exam" style={{ background: sub?.colour, color: '#1a1a2e' }}>
                      <span className="wo-item-icon">🎓</span>
                      <span className="wo-item-text">{exam.paper.split(' ').slice(1).join(' ')}</span>
                      <span className="wo-item-time">{exam.time}</span>
                    </div>
                  );
                })}

                {revSessions.map(session => {
                  const sub = SUBJECTS.find(s => s.id === session.subject);
                  return (
                    <div key={`rev-${session.id}`} className="wo-item wo-revision" style={{ borderLeftColor: sub?.colour }}>
                      <span className="wo-item-icon">{sub?.icon}</span>
                      <span className="wo-item-text">{session.topic}</span>
                      <span className="wo-item-time">{session.time}</span>
                    </div>
                  );
                })}

                {driveLessons.map(lesson => (
                  <div key={`drive-${lesson.id}`} className="wo-item wo-driving">
                    <span className="wo-item-icon">🚗</span>
                    <span className="wo-item-text">{lesson.note || 'Driving lesson'}</span>
                    <span className="wo-item-time">{lesson.time}</span>
                  </div>
                ))}

                {!hasItems && !isPast && (
                  <div className="wo-empty">Free</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="wo-goals">
          <p className="wo-goals-title">🎯 Current Goals</p>
          {activeGoals.map(goal => (
            <div key={goal.id} className="wo-goal">
              <span className="wo-goal-dot">○</span>
              <span className="wo-goal-text">{goal.title}</span>
              {goal.deadline && (
                <span className="wo-goal-date">
                  {new Date(goal.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
