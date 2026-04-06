import { useState, useEffect, useCallback } from 'react';

const CLIENT_ID = 'ea05b7bce4914f5d9b39c28eeabc9f37';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/` : '';
const SCOPES = 'user-read-playback-state user-modify-playback-state playlist-read-private';

function getTokenFromHash() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (token) {
    sessionStorage.setItem('spotify_token', token);
    window.history.replaceState(null, '', window.location.pathname);
  }
  return token || sessionStorage.getItem('spotify_token');
}

export default function SpotifyPicker({ onBack }) {
  const [token, setToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = getTokenFromHash();
    if (t) {
      setToken(t);
      fetchPlaylists(t);
    }
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

  function handleLogin() {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
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
      // Player may not be active — open in Spotify instead
      window.open(playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`, '_blank');
    }
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
