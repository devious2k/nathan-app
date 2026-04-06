import { useState, useEffect } from 'react';
import { EXAM_DATES, SUBJECTS } from './RevisionCalendar.jsx';
import { addToCalendar } from '../utils/calendar.js';

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

export default function WeekOverview({ onStartSession }) {
  const [data, setData] = useState({ revision: {}, driving: {}, goals: [] });

  useEffect(() => {
    function load() {
      let revision = {}, driving = {}, goals = [];
      try { revision = JSON.parse(localStorage.getItem('nathan_revision_plan') || '{}'); } catch {}
      try { driving = JSON.parse(localStorage.getItem('nathan_driving_lessons') || '{}'); } catch {}
      try { goals = JSON.parse(localStorage.getItem('nathan_goals') || '[]'); } catch {}
      setData({ revision, driving, goals });
    }
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  const today = new Date();
  const todayStr = formatDate(today);
  const monday = getMonday(today);
  const weekDays = getWeekDays(monday);

  // Only show today + days that have items (skip empty past days)
  const visibleDays = weekDays.filter(day => {
    const key = formatDate(day);
    const isToday = key === todayStr;
    const isPast = key < todayStr;
    const revSessions = data.revision[key] || [];
    const driveLessons = data.driving[key] || [];
    const exams = EXAM_DATES.filter(e => e.date === key);
    const hasItems = revSessions.length > 0 || driveLessons.length > 0 || exams.length > 0;
    return isToday || (!isPast && hasItems);
  });

  const activeGoals = data.goals.filter(g => !g.completed).slice(0, 2);

  return (
    <div className="week-overview">
      <h2 className="wo-title">📅 This Week</h2>

      <div className="wo-days">
        {visibleDays.length === 0 && (
          <div className="wo-empty-week">Nothing scheduled this week. Enjoy the free time! 🎉</div>
        )}
        {visibleDays.map(day => {
          const key = formatDate(day);
          const isToday = key === todayStr;
          const revSessions = data.revision[key] || [];
          const driveLessons = data.driving[key] || [];
          const exams = EXAM_DATES.filter(e => e.date === key);

          return (
            <div key={key} className={`wo-day ${isToday ? 'wo-today' : ''}`}>
              <div className="wo-day-head">
                <span className="wo-day-name">{isToday ? 'Today' : day.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                <span className="wo-day-num">{day.getDate()}</span>
              </div>

              <div className="wo-day-items">
                {exams.map((exam, i) => {
                  const sub = SUBJECTS.find(s => s.id === exam.subject);
                  return (
                    <div key={`exam-${i}`} className="wo-item wo-exam" style={{ background: sub?.colour, color: '#1a1a2e' }}>
                      <span className="wo-item-text">{exam.paper.split(' ').slice(1).join(' ')}</span>
                      <button className="wo-cal-btn wo-cal-dark" onClick={(e) => { e.stopPropagation(); addToCalendar({ title: `EXAM: ${exam.paper}`, description: `${sub?.name} A-Level Exam`, date: key, time: exam.time, durationMins: 150 }); }}>📅</button>
                    </div>
                  );
                })}

                {revSessions.map(session => {
                  const sub = SUBJECTS.find(s => s.id === session.subject);
                  const clickable = onStartSession;
                  return (
                    <div
                      key={`rev-${session.id}`}
                      className={`wo-item wo-revision ${clickable ? 'wo-clickable' : ''}`}
                      style={{ borderLeftColor: sub?.colour }}
                      onClick={clickable ? () => onStartSession(session) : undefined}
                    >
                      <span className="wo-item-text">{sub?.icon} {session.topic}</span>
                      <button className="wo-cal-btn" onClick={(e) => { e.stopPropagation(); addToCalendar({ title: `Revision: ${session.topic}`, description: `${sub?.name} revision session`, date: key, time: session.time, durationMins: 90 }); }}>📅</button>
                    </div>
                  );
                })}

                {driveLessons.map(lesson => (
                  <div key={`drive-${lesson.id}`} className="wo-item wo-driving">
                    <span className="wo-item-text">🚗 {lesson.note || 'Driving lesson'}</span>
                    <button className="wo-cal-btn" onClick={(e) => { e.stopPropagation(); addToCalendar({ title: 'Driving Lesson', description: lesson.note || 'Driving lesson', date: key, time: lesson.time, durationMins: 60 }); }}>📅</button>
                  </div>
                ))}

                {isToday && exams.length === 0 && revSessions.length === 0 && driveLessons.length === 0 && (
                  <div className="wo-empty">Nothing today — relax or revise 😎</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeGoals.length > 0 && (
        <div className="wo-goals">
          <p className="wo-goals-title">🎯 Goals</p>
          {activeGoals.map(goal => (
            <div key={goal.id} className="wo-goal">
              <span className="wo-goal-dot">○</span>
              <span className="wo-goal-text">{goal.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
