import { useState, useEffect } from 'react';
import { EXAM_DATES, SUBJECTS } from './RevisionCalendar.jsx';

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function getNotifications() {
  const notifications = [];
  const today = formatDate(new Date());
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Check revision sessions for today
  try {
    const revPlan = JSON.parse(localStorage.getItem('nathan_revision_plan') || '{}');
    const todaySessions = revPlan[today] || [];
    todaySessions.forEach(session => {
      const sub = SUBJECTS.find(s => s.id === session.subject);
      if (session.time >= currentTime) {
        notifications.push({
          id: `rev-${session.id}`,
          type: 'revision',
          icon: sub?.icon || '📐',
          title: `${sub?.name} revision at ${session.time}`,
          body: session.topic,
          colour: sub?.colour || '#AA96DA',
          priority: session.time <= currentTime ? 2 : 1,
        });
      }
    });
  } catch {}

  // Check driving lessons for today
  try {
    const drivingLessons = JSON.parse(localStorage.getItem('nathan_driving_lessons') || '{}');
    const todayLessons = drivingLessons[today] || [];
    todayLessons.forEach(lesson => {
      if (lesson.time >= currentTime) {
        notifications.push({
          id: `drive-${lesson.id}`,
          type: 'driving',
          icon: '🚗',
          title: `Driving lesson at ${lesson.time}`,
          body: lesson.note || 'Get your provisional ready!',
          colour: '#A8D8EA',
          priority: 2,
        });
      }
    });
  } catch {}

  // Check upcoming exams (within 3 days)
  EXAM_DATES.forEach(exam => {
    const days = daysUntil(exam.date);
    if (days >= 0 && days <= 3) {
      const sub = SUBJECTS.find(s => s.id === exam.subject);
      notifications.push({
        id: `exam-${exam.date}-${exam.paper}`,
        type: 'exam',
        icon: '🎓',
        title: days === 0 ? `EXAM TODAY: ${exam.paper}` : `Exam in ${days} day${days > 1 ? 's' : ''}: ${exam.paper}`,
        body: days === 0 ? `${exam.time} — Good luck Nathan!` : `${sub?.name} — ${new Date(exam.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} at ${exam.time}`,
        colour: days === 0 ? '#FF6B6B' : sub?.colour || '#FFE66D',
        priority: days === 0 ? 3 : 2,
      });
    }
  });

  // Sort by priority (highest first)
  return notifications.sort((a, b) => b.priority - a.priority);
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('nathan_dismissed_notifs') || '[]'); } catch { return []; }
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setNotifications(getNotifications());
    const interval = setInterval(() => {
      setNotifications(getNotifications());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  function dismiss(id) {
    const next = [...dismissed, id];
    setDismissed(next);
    sessionStorage.setItem('nathan_dismissed_notifs', JSON.stringify(next));
  }

  const visible = notifications.filter(n => !dismissed.includes(n.id));

  if (visible.length === 0) return null;

  const shown = expanded ? visible : visible.slice(0, 2);

  return (
    <div className="notif-container">
      {shown.map(n => (
        <div key={n.id} className="notif-item" style={{ borderLeftColor: n.colour }}>
          <div className="notif-content">
            <span className="notif-icon">{n.icon}</span>
            <div className="notif-text">
              <span className="notif-title">{n.title}</span>
              <span className="notif-body">{n.body}</span>
            </div>
          </div>
          <button className="notif-dismiss" onClick={() => dismiss(n.id)}>×</button>
        </div>
      ))}
      {visible.length > 2 && (
        <button className="notif-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : `+${visible.length - 2} more`}
        </button>
      )}
    </div>
  );
}
