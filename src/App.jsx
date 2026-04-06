import { useState } from 'react';
import SpinWheel from './components/SpinWheel.jsx';
import FurtherMaths from './components/FurtherMaths.jsx';
import Apprenticeships from './components/Apprenticeships.jsx';
import CVGenerator from './components/CVGenerator.jsx';
import Dashboard from './components/Dashboard.jsx';
import SpotifyPicker from './components/SpotifyPicker.jsx';
import LunchPlanner from './components/LunchPlanner.jsx';
import DrivingCalendar from './components/DrivingCalendar.jsx';

// This option is ALWAYS first on the wheel — non-negotiable
const MANDATORY_FIRST = "Check Jamie has Coca Cola and go to Simon's 🥤";

const STEPS = { INPUT: 'input', LOADING: 'loading', RESULTS: 'results' };

export default function App() {
  const [step, setStep] = useState(STEPS.INPUT);
  const [mode, setMode] = useState('decision');
  const [subject, setSubject] = useState(null);
  const [interests, setInterests] = useState('');
  const [goals, setGoals] = useState('');
  const [plan, setPlan] = useState('');
  const [wheelOptions, setWheelOptions] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState('');

  const goHome = () => { setMode('decision'); setSubject(null); };

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

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      // Mandatory first option is always prepended client-side
      const options = [MANDATORY_FIRST, ...data.wheelOptions.slice(0, 7)];
      setWheelOptions(options);
      setPlan(data.plan);
      setStep(STEPS.RESULTS);
    } catch (err) {
      setError(`Something went wrong: ${err.message}. Try again!`);
      setStep(STEPS.INPUT);
    }
  };

  const handleSpin = () => {
    if (spinning) return;
    setWinner(null);
    setSpinning(true);
  };

  const handleSpinEnd = (result) => {
    setSpinning(false);
    setWinner(result);
  };

  const handleReset = () => {
    setStep(STEPS.INPUT);
    setWinner(null);
    setSpinning(false);
    setError('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title" onClick={goHome} style={{ cursor: 'pointer' }}>
          🎲 Nathan's Decision Maker
        </h1>
        <p className="app-subtitle">Because Nathan will NEVER decide on his own 😂</p>
      </header>

      <main className="app-main">

        {/* ─── STUDY MODE ─── */}
        {mode === 'study' && (
          <FurtherMaths key={subject} subject={subject} onBack={goHome} />
        )}

        {/* ─── APPRENTICESHIPS ─── */}
        {mode === 'apprenticeships' && (
          <Apprenticeships onBack={goHome} />
        )}

        {/* ─── CV GENERATOR ─── */}
        {mode === 'cv' && (
          <CVGenerator onBack={goHome} />
        )}

        {/* ─── DASHBOARD ─── */}
        {mode === 'dashboard' && (
          <Dashboard onBack={goHome} />
        )}

        {/* ─── SPOTIFY ─── */}
        {mode === 'spotify' && (
          <SpotifyPicker onBack={goHome} />
        )}

        {/* ─── LUNCH PLANNER ─── */}
        {mode === 'lunch' && (
          <LunchPlanner onBack={goHome} />
        )}

        {/* ─── DRIVING CALENDAR ─── */}
        {mode === 'driving' && (
          <DrivingCalendar onBack={goHome} />
        )}

        {/* ─── INPUT STEP ─── */}
        {mode === 'decision' && step === STEPS.INPUT && (
          <div className="card">
            <span className="badge">⏳ Stop. Overthinking. Now.</span>

            <label className="field-label" htmlFor="interests">
              What are you into today?
            </label>
            <textarea
              id="interests"
              className="field-textarea"
              rows={3}
              placeholder="e.g. gaming, going out, food, music, chilling..."
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
            />

            <label className="field-label" htmlFor="goals">
              What do you actually want to achieve?
            </label>
            <textarea
              id="goals"
              className="field-textarea"
              rows={3}
              placeholder="e.g. be productive, have fun, get some fresh air, eat something good..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
            />

            {error && <p className="error-msg">{error}</p>}

            <button className="btn-primary" onClick={handleGenerate}>
              Sort My Day Out 🚀
            </button>

            <div className="divider">
              <span className="divider-text">or revise</span>
            </div>

            <div className="subject-buttons">
              <button className="btn-subject btn-further-maths" onClick={() => { setSubject('further-maths'); setMode('study'); }}>
                📐 Further Maths
              </button>
              <button className="btn-subject btn-maths-subject" onClick={() => { setSubject('maths'); setMode('study'); }}>
                📊 Maths
              </button>
              <button className="btn-subject btn-physics" onClick={() => { setSubject('physics'); setMode('study'); }}>
                ⚛️ Physics
              </button>
            </div>

            <div className="divider">
              <span className="divider-text">or sort your career</span>
            </div>

            <div className="career-buttons">
              <button className="btn-career btn-apprenticeships" onClick={() => setMode('apprenticeships')}>
                💼 Find Apprenticeships
              </button>
              <button className="btn-career btn-cv-btn" onClick={() => setMode('cv')}>
                📝 CV Generator
              </button>
            </div>

            <div className="divider">
              <span className="divider-text">or sort your life</span>
            </div>

            <div className="life-buttons">
              <button className="btn-life btn-lunch" onClick={() => setMode('lunch')}>
                🥪 Lunch Planner
              </button>
              <button className="btn-life btn-driving" onClick={() => setMode('driving')}>
                🚗 Driving Lessons
              </button>
              <button className="btn-life btn-spotify-btn" onClick={() => setMode('spotify')}>
                🎵 Spotify
              </button>
              <button className="btn-life btn-dashboard" onClick={() => setMode('dashboard')}>
                📊 Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ─── LOADING STEP ─── */}
        {mode === 'decision' && step === STEPS.LOADING && (
          <div className="card card-center">
            <div className="spinner" />
            <p className="loading-title">Figuring out your life...</p>
            <p className="loading-sub">
              (This still took less time than Nathan deciding what to eat 😂)
            </p>
          </div>
        )}

        {/* ─── RESULTS STEP ─── */}
        {mode === 'decision' && step === STEPS.RESULTS && (
          <div className="card">
            {/* Day plan */}
            <div className="plan-box">
              <p className="plan-title">📋 Your Day Plan</p>
              <p className="plan-text">{plan}</p>
            </div>

            {/* Wheel section */}
            <div className="wheel-section">
              <div className="wheel-header">
                <span className="badge">🎡 The Wheel of Fate</span>
                <p className="wheel-sub">Spin it. Do what it says. No backsies.</p>
              </div>

              <SpinWheel
                options={wheelOptions}
                spinning={spinning}
                onSpinEnd={handleSpinEnd}
              />

              <button
                className="btn-spin"
                onClick={handleSpin}
                disabled={spinning}
              >
                {spinning ? 'Spinning... 🌀' : 'SPIN THE WHEEL 🎯'}
              </button>

              {winner && (
                <div className="winner-box">
                  <p className="winner-title">The Wheel Has Spoken! 🎉</p>
                  <p className="winner-text">{winner}</p>
                </div>
              )}

              <button className="btn-reset" onClick={handleReset}>
                ← Start Over (yes, again)
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Made with 💛 by <a href="https://gameonsolutions.uk" target="_blank" rel="noreferrer">Game On Solutions</a></p>
      </footer>
    </div>
  );
}
