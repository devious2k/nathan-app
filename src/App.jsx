import { useState } from 'react';
import SpinWheel from './components/SpinWheel.jsx';
import FurtherMaths from './components/FurtherMaths.jsx';
import Apprenticeships from './components/Apprenticeships.jsx';
import CVGenerator from './components/CVGenerator.jsx';
import Dashboard from './components/Dashboard.jsx';
import SpotifyPicker from './components/SpotifyPicker.jsx';
import LunchPlanner from './components/LunchPlanner.jsx';
import DrivingCalendar from './components/DrivingCalendar.jsx';
import RevisionCalendar from './components/RevisionCalendar.jsx';
import Notifications from './components/Notifications.jsx';
import WeekOverview from './components/WeekOverview.jsx';
import NowPlaying from './components/NowPlaying.jsx';
import RevisionWorksheet from './components/RevisionWorksheet.jsx';
import Activities from './components/Activities.jsx';
import JobSearch from './components/JobSearch.jsx';
import Goals from './components/Goals.jsx';

// This option is ALWAYS first on the wheel — non-negotiable
const MANDATORY_FIRST = "Check Jamie has Coca Cola and go to Simon's 🥤";

const STEPS = { INPUT: 'input', LOADING: 'loading', RESULTS: 'results' };

const TABS = [
  { id: 'home', icon: '🎲', label: 'Home' },
  { id: 'study', icon: '📐', label: 'Study' },
  { id: 'career', icon: '💼', label: 'Career' },
  { id: 'life', icon: '🍽️', label: 'Life' },
  { id: 'dashboard', icon: '📊', label: 'Stats' },
];

export default function App() {
  const [tab, setTab] = useState('home');
  const [mode, setMode] = useState(null);
  const [subject, setSubject] = useState(null);
  const [step, setStep] = useState(STEPS.INPUT);
  const [interests, setInterests] = useState('');
  const [goals, setGoals] = useState('');
  const [plan, setPlan] = useState('');
  const [wheelOptions, setWheelOptions] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState('');
  const [activeWorksheet, setActiveWorksheet] = useState(null);

  const switchTab = (id) => { setTab(id); setMode(null); setSubject(null); setActiveWorksheet(null); };
  const goHome = () => { setTab('home'); setMode(null); setSubject(null); setStep(STEPS.INPUT); setActiveWorksheet(null); };
  const startSession = (session) => { setActiveWorksheet(session); };

  const handleGenerate = async () => {
    if (!interests.trim() && !goals.trim()) {
      setError("Oi Nathan, fill SOMETHING in! 😤 Even just one field.");
      return;
    }
    setError('');
    setStep(STEPS.LOADING);
    setWinner(null);

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, goals }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const options = [MANDATORY_FIRST, ...data.wheelOptions.slice(0, 7)];
      setWheelOptions(options);
      setPlan(data.plan);
      setStep(STEPS.RESULTS);
    } catch (err) {
      setError(`Something went wrong: ${err.message}. Try again!`);
      setStep(STEPS.INPUT);
    }
  };

  const handleSpin = () => { if (!spinning) { setWinner(null); setSpinning(true); } };
  const handleSpinEnd = (result) => { setSpinning(false); setWinner(result); };
  const handleReset = () => { setStep(STEPS.INPUT); setWinner(null); setSpinning(false); setError(''); };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title" onClick={goHome}>🎲 Nathan's Decision Maker</h1>
      </header>

      <main className="app-content">
        <Notifications />

        {/* ═══ ACTIVE WORKSHEET (overrides everything) ═══ */}
        {activeWorksheet && (
          <RevisionWorksheet
            session={activeWorksheet}
            onBack={() => setActiveWorksheet(null)}
          />
        )}

        {/* ═══ HOME TAB ═══ */}
        {!activeWorksheet && tab === 'home' && !mode && (
          <>
            <NowPlaying />
            <WeekOverview onStartSession={startSession} />

            {step === STEPS.INPUT && (
              <div className="card">
                <span className="badge">⏳ Stop. Overthinking. Now.</span>

                <label className="field-label" htmlFor="interests">What are you into today?</label>
                <textarea
                  id="interests" className="field-textarea" rows={3}
                  placeholder="e.g. gaming, going out, food, music, chilling..."
                  value={interests} onChange={(e) => setInterests(e.target.value)}
                />

                <label className="field-label" htmlFor="goals">What do you actually want to achieve?</label>
                <textarea
                  id="goals" className="field-textarea" rows={3}
                  placeholder="e.g. be productive, have fun, get some fresh air, eat something good..."
                  value={goals} onChange={(e) => setGoals(e.target.value)}
                />

                {error && <p className="error-msg">{error}</p>}

                <button className="btn-primary" onClick={handleGenerate}>
                  Sort My Day Out 🚀
                </button>
              </div>
            )}

            {step === STEPS.LOADING && (
              <div className="card card-center">
                <div className="spinner" />
                <p className="loading-title">Figuring out your life...</p>
                <p className="loading-sub">(This still took less time than Nathan deciding what to eat 😂)</p>
              </div>
            )}

            {step === STEPS.RESULTS && (
              <div className="card">
                <div className="plan-box">
                  <p className="plan-title">📋 Your Day Plan</p>
                  <p className="plan-text">{plan}</p>
                </div>
                <div className="wheel-section">
                  <div className="wheel-header">
                    <span className="badge">🎡 The Wheel of Fate</span>
                    <p className="wheel-sub">Spin it. Do what it says. No backsies.</p>
                  </div>
                  <SpinWheel options={wheelOptions} spinning={spinning} onSpinEnd={handleSpinEnd} />
                  <button className="btn-spin" onClick={handleSpin} disabled={spinning}>
                    {spinning ? 'Spinning... 🌀' : 'SPIN THE WHEEL 🎯'}
                  </button>
                  {winner && (
                    <div className="winner-box">
                      <p className="winner-title">The Wheel Has Spoken! 🎉</p>
                      <p className="winner-text">{winner}</p>
                    </div>
                  )}
                  <button className="btn-reset" onClick={handleReset}>← Start Over (yes, again)</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ STUDY TAB ═══ */}
        {!activeWorksheet && tab === 'study' && !mode && (
          <div className="tab-menu">
            <h2 className="tab-menu-title">📐 Revision</h2>
            <p className="tab-menu-sub">Pick a subject, Nathan. No more excuses.</p>
            <div className="tab-menu-grid">
              <button className="tab-menu-item tab-menu-featured" onClick={() => setMode('revision-calendar')}>
                <span className="tab-menu-icon">📅</span>
                <span className="tab-menu-label">Revision Calendar</span>
                <span className="tab-menu-desc">May & June exam timetable</span>
              </button>
              <button className="tab-menu-item" onClick={() => { setSubject('further-maths'); setMode('study'); }}>
                <span className="tab-menu-icon">📐</span>
                <span className="tab-menu-label">Further Maths</span>
                <span className="tab-menu-desc">OCR H245</span>
              </button>
              <button className="tab-menu-item" onClick={() => { setSubject('maths'); setMode('study'); }}>
                <span className="tab-menu-icon">📊</span>
                <span className="tab-menu-label">Maths</span>
                <span className="tab-menu-desc">OCR H240</span>
              </button>
              <button className="tab-menu-item" onClick={() => { setSubject('physics'); setMode('study'); }}>
                <span className="tab-menu-icon">⚛️</span>
                <span className="tab-menu-label">Physics</span>
                <span className="tab-menu-desc">OCR H556</span>
              </button>
            </div>
          </div>
        )}
        {!activeWorksheet && tab === 'study' && mode === 'study' && (
          <FurtherMaths key={subject} subject={subject} onBack={() => setMode(null)} />
        )}
        {!activeWorksheet && tab === 'study' && mode === 'revision-calendar' && (
          <RevisionCalendar onBack={() => setMode(null)} onStartSession={startSession} />
        )}

        {/* ═══ CAREER TAB ═══ */}
        {tab === 'career' && !mode && (
          <div className="tab-menu">
            <h2 className="tab-menu-title">💼 Career</h2>
            <p className="tab-menu-sub">Sort your future out, Nathan.</p>
            <div className="tab-menu-grid">
              <button className="tab-menu-item" onClick={() => setMode('apprenticeships')}>
                <span className="tab-menu-icon">🔍</span>
                <span className="tab-menu-label">Find Apprenticeships</span>
                <span className="tab-menu-desc">Level 4, 5 & 6</span>
              </button>
              <button className="tab-menu-item" onClick={() => setMode('jobs')}>
                <span className="tab-menu-icon">💷</span>
                <span className="tab-menu-label">Part-Time Jobs</span>
                <span className="tab-menu-desc">Search by location</span>
              </button>
              <button className="tab-menu-item" onClick={() => setMode('cv')}>
                <span className="tab-menu-icon">📝</span>
                <span className="tab-menu-label">CV Generator</span>
                <span className="tab-menu-desc">+ Cover Letters</span>
              </button>
            </div>
          </div>
        )}
        {tab === 'career' && mode === 'apprenticeships' && (
          <Apprenticeships onBack={() => setMode(null)} />
        )}
        {tab === 'career' && mode === 'jobs' && (
          <JobSearch onBack={() => setMode(null)} />
        )}
        {tab === 'career' && mode === 'cv' && (
          <CVGenerator onBack={() => setMode(null)} />
        )}

        {/* ═══ LIFE TAB ═══ */}
        {tab === 'life' && !mode && (
          <div className="tab-menu">
            <h2 className="tab-menu-title">🍽️ Life</h2>
            <p className="tab-menu-sub">The boring bits, sorted.</p>
            <div className="tab-menu-grid">
              <button className="tab-menu-item" onClick={() => setMode('activities')}>
                <span className="tab-menu-icon">🎯</span>
                <span className="tab-menu-label">Things To Do</span>
                <span className="tab-menu-desc">Next 2 weeks near you</span>
              </button>
              <button className="tab-menu-item" onClick={() => setMode('goals')}>
                <span className="tab-menu-icon">🏆</span>
                <span className="tab-menu-label">Goals</span>
                <span className="tab-menu-desc">Track your targets</span>
              </button>
              <button className="tab-menu-item" onClick={() => setMode('lunch')}>
                <span className="tab-menu-icon">🥪</span>
                <span className="tab-menu-label">Lunch Planner</span>
                <span className="tab-menu-desc">Sandwiches & Snacks</span>
              </button>
              <button className="tab-menu-item" onClick={() => setMode('driving')}>
                <span className="tab-menu-icon">🚗</span>
                <span className="tab-menu-label">Driving Lessons</span>
                <span className="tab-menu-desc">Weekly Calendar</span>
              </button>
              <button className="tab-menu-item" onClick={() => setMode('spotify')}>
                <span className="tab-menu-icon">🎵</span>
                <span className="tab-menu-label">Spotify</span>
                <span className="tab-menu-desc">Day Playlist</span>
              </button>
            </div>
          </div>
        )}
        {tab === 'life' && mode === 'activities' && <Activities onBack={() => setMode(null)} />}
        {tab === 'life' && mode === 'goals' && <Goals onBack={() => setMode(null)} />}
        {tab === 'life' && mode === 'lunch' && <LunchPlanner onBack={() => setMode(null)} />}
        {tab === 'life' && mode === 'driving' && <DrivingCalendar onBack={() => setMode(null)} />}
        {tab === 'life' && mode === 'spotify' && <SpotifyPicker onBack={() => setMode(null)} />}

        {/* ═══ DASHBOARD TAB ═══ */}
        {tab === 'dashboard' && <Dashboard onBack={goHome} />}

      </main>

      {/* ═══ BOTTOM TAB BAR ═══ */}
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-bar-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => switchTab(t.id)}
          >
            <span className="tab-bar-icon">{t.icon}</span>
            <span className="tab-bar-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
