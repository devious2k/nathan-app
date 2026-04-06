import { useState, useEffect } from 'react';
import { addToCalendar } from '../utils/calendar.js';

const STORAGE_KEY = 'nathan_driving_lessons';

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
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function DrivingCalendar({ onBack }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [lessons, setLessons] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { return JSON.parse(saved); } catch {}
    return {};
  });
  const [editing, setEditing] = useState(null);
  const [formTime, setFormTime] = useState('');
  const [formNote, setFormNote] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
  }, [lessons]);

  const weekDays = getWeekDays(weekStart);

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  function openAdd(date) {
    setEditing(formatDate(date));
    setFormTime('');
    setFormNote('');
  }

  function saveLesson() {
    if (!formTime) return;
    const key = editing;
    const dayLessons = lessons[key] || [];
    setLessons(prev => ({
      ...prev,
      [key]: [...dayLessons, { time: formTime, note: formNote, id: Date.now() }]
        .sort((a, b) => a.time.localeCompare(b.time)),
    }));
    setEditing(null);
  }

  function deleteLesson(dateKey, lessonId) {
    setLessons(prev => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter(l => l.id !== lessonId),
    }));
  }

  const today = formatDate(new Date());

  return (
    <div className="card">
      <span className="badge">🚗 Driving Lessons</span>

      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevWeek}>← Prev</button>
        <span className="cal-nav-label">
          {formatDisplay(weekDays[0])} — {formatDisplay(weekDays[6])}
        </span>
        <button className="cal-nav-btn" onClick={nextWeek}>Next →</button>
      </div>

      <div className="cal-week">
        {weekDays.map(day => {
          const key = formatDate(day);
          const dayLessons = lessons[key] || [];
          const isToday = key === today;

          return (
            <div key={key} className={`cal-day ${isToday ? 'cal-today' : ''}`}>
              <div className="cal-day-header">
                <span className="cal-day-name">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                <span className="cal-day-date">{day.getDate()}</span>
              </div>

              {dayLessons.map(lesson => (
                <div key={lesson.id} className="cal-lesson">
                  <span className="cal-lesson-time">🚗 {lesson.time}</span>
                  {lesson.note && <span className="cal-lesson-note">{lesson.note}</span>}
                  <button
                    className="wo-cal-btn"
                    onClick={() => addToCalendar({ title: 'Driving Lesson', description: lesson.note || 'Driving lesson', date: key, time: lesson.time, durationMins: 60 })}
                    title="Add to Calendar"
                  >📅</button>
                  <button
                    className="cal-lesson-delete"
                    onClick={() => deleteLesson(key, lesson.id)}
                    title="Remove"
                  >×</button>
                </div>
              ))}

              {editing === key ? (
                <div className="cal-add-form">
                  <input
                    type="time"
                    className="cal-time-input"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                  <input
                    type="text"
                    className="cal-note-input"
                    placeholder="Note (optional)"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                  />
                  <div className="cal-form-actions">
                    <button className="cal-save-btn" onClick={saveLesson}>Save</button>
                    <button className="cal-cancel-btn" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="cal-add-btn" onClick={() => openAdd(day)}>+ Add Lesson</button>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn-reset" onClick={onBack}>
        ← Back to Decision Maker
      </button>
    </div>
  );
}
