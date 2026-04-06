import { useState, useRef, useEffect } from 'react';

export default function Marcel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'marcel', text: "Oi Nathan. I'm Marcel. Ask me anything about your week, revision, careers, or whatever. 😼" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function getContext() {
    const parts = [];
    try {
      const today = new Date().toISOString().split('T')[0];
      const rev = JSON.parse(localStorage.getItem('nathan_revision_plan') || '{}');
      const todaySessions = rev[today] || [];
      if (todaySessions.length > 0) {
        parts.push(`Today's revision: ${todaySessions.map(s => `${s.topic} at ${s.time}`).join(', ')}`);
      }
    } catch {}
    try {
      const today = new Date().toISOString().split('T')[0];
      const driving = JSON.parse(localStorage.getItem('nathan_driving_lessons') || '{}');
      const todayLessons = driving[today] || [];
      if (todayLessons.length > 0) {
        parts.push(`Today's driving lessons: ${todayLessons.map(l => `${l.time}${l.note ? ' — ' + l.note : ''}`).join(', ')}`);
      }
    } catch {}
    try {
      const goals = JSON.parse(localStorage.getItem('nathan_goals') || '[]');
      const active = goals.filter(g => !g.completed).slice(0, 3);
      if (active.length > 0) {
        parts.push(`Active goals: ${active.map(g => g.title).join(', ')}`);
      }
    } catch {}
    return parts.join('\n') || 'No specific context available.';
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/marcel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context: getContext() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setMessages(prev => [...prev, { role: 'marcel', text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'marcel', text: `Mrrr... something broke: ${err.message}. Try again! 😿` }]);
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button className="marcel-fab" onClick={() => setOpen(true)}>
          <img src="/marcel.png" alt="Marcel" className="marcel-fab-img" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="marcel-panel">
          <div className="marcel-header">
            <img src="/marcel.png" alt="Marcel" className="marcel-header-img" />
            <div className="marcel-header-info">
              <span className="marcel-header-name">Marcel</span>
              <span className="marcel-header-status">Your grumpy assistant 😼</span>
            </div>
            <button className="marcel-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="marcel-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`marcel-msg ${msg.role}`}>
                {msg.role === 'marcel' && (
                  <img src="/marcel.png" alt="" className="marcel-msg-avatar" />
                )}
                <div className={`marcel-bubble ${msg.role}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="marcel-msg marcel">
                <img src="/marcel.png" alt="" className="marcel-msg-avatar" />
                <div className="marcel-bubble marcel marcel-typing">
                  <span className="marcel-dot" />
                  <span className="marcel-dot" />
                  <span className="marcel-dot" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="marcel-input-bar">
            <input
              className="marcel-input"
              placeholder="Ask Marcel anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
            />
            <button className="marcel-send" onClick={handleSend} disabled={loading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
