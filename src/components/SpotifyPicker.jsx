import { useState, useEffect, useCallback } from 'react';

const CLIENT_ID = 'ea05b7bce4914f5d9b39c28eeabc9f37';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/` : '';
const SCOPES = 'user-read-playback-state user-modify-playback-state playlist-read-private';

// PKCE helpers
async function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function exchangeCode(code) {
  const verifier = sessionStorage.getItem('spotify_code_verifier');
  if (!verifier) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

function getStoredToken() {
  return sessionStorage.getItem('spotify_token');
}

export default function SpotifyPicker({ onBack }) {
  const [token, setToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // Check for auth code in URL (callback from Spotify)
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        window.history.replaceState(null, '', window.location.pathname);
        const accessToken = await exchangeCode(code);
        if (accessToken) {
          sessionStorage.setItem('spotify_token', accessToken);
          sessionStorage.removeItem('spotify_code_verifier');
          setToken(accessToken);
          fetchPlaylists(accessToken);
          setLoading(false);
          return;
        }
      }

      // Check for existing token
      const stored = getStoredToken();
      if (stored) {
        setToken(stored);
        fetchPlaylists(stored);
      }
      setLoading(false);
    }
    init();
  }, []);

  const fetchPlaylists = useCallback(async (accessToken) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=30', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem('spotify_token');
          setToken(null);
          return;
        }
        throw new Error(`Spotify API error ${res.status}`);
      }
      const data = await res.json();
      setPlaylists(data.items || []);
    } catch (err) {
      setError(`Failed to load playlists: ${err.message}`);
    }
  }, []);

  async function handleLogin() {
    const verifier = await generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem('spotify_code_verifier', verifier);

    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&code_challenge_method=S256` +
      `&code_challenge=${challenge}`;

    window.location.href = authUrl;
  }

  async function handlePlay(playlist) {
    setSelected(playlist);
    try {
      await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context_uri: playlist.uri }),
      });
    } catch {
      window.open(playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`, '_blank');
    }
  }

  if (loading) {
    return (
      <div className="card card-center">
        <div className="spinner" />
        <p className="loading-title">Connecting to Spotify...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <span className="badge">🎵 Spotify Day Playlist</span>

      {!token ? (
        <>
          <p className="spotify-intro">Connect Spotify to pick your playlist for the day, Nathan.</p>
          <button className="btn-spotify" onClick={handleLogin}>
            🎵 Login to Spotify
          </button>
        </>
      ) : (
        <>
          {error && <p className="error-msg">{error}</p>}

          {selected && (
            <div className="spotify-now-playing">
              <p className="spotify-np-label">Now Playing 🎶</p>
              <p className="spotify-np-name">{selected.name}</p>
            </div>
          )}

          <div className="spotify-list">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                className={`spotify-playlist ${selected?.id === pl.id ? 'active' : ''}`}
                onClick={() => handlePlay(pl)}
              >
                {pl.images?.[0]?.url && (
                  <img src={pl.images[0].url} alt="" className="spotify-cover" />
                )}
                <div className="spotify-pl-info">
                  <span className="spotify-pl-name">{pl.name}</span>
                  <span className="spotify-pl-tracks">{pl.tracks?.total || 0} tracks</span>
                </div>
              </button>
            ))}
          </div>

          {playlists.length === 0 && !error && (
            <p className="maths-empty">No playlists found. Create some on Spotify first!</p>
          )}
        </>
      )}

      <button className="btn-reset" onClick={onBack}>
        ← Back to Decision Maker
      </button>
    </div>
  );
}
