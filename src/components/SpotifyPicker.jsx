import { useState, useEffect, useCallback, useRef } from 'react';

const CLIENT_ID = 'ea05b7bce4914f5d9b39c28eeabc9f37';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/` : '';
const SCOPES = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private';

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

// Load the Spotify Web Playback SDK script
function loadSpotifySDK() {
  return new Promise((resolve) => {
    if (window.Spotify) { resolve(); return; }
    if (document.getElementById('spotify-sdk')) {
      window.onSpotifyWebPlaybackSDKReady = resolve;
      return;
    }
    const script = document.createElement('script');
    script.id = 'spotify-sdk';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    window.onSpotifyWebPlaybackSDKReady = resolve;
    document.body.appendChild(script);
  });
}

export default function SpotifyPicker({ onBack }) {
  const [token, setToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const playerRef = useRef(null);
  const deviceIdRef = useRef(null);

  // Init auth
  useEffect(() => {
    async function init() {
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
      const stored = sessionStorage.getItem('spotify_token');
      if (stored) { setToken(stored); fetchPlaylists(stored); }
      setLoading(false);
    }
    init();
  }, []);

  // Init Web Playback SDK when we have a token
  useEffect(() => {
    if (!token) return;

    let player;
    async function initPlayer() {
      await loadSpotifySDK();

      player = new window.Spotify.Player({
        name: "Nathan's Decision Maker",
        getOAuthToken: cb => cb(token),
        volume: 0.8,
      });

      player.addListener('ready', ({ device_id }) => {
        deviceIdRef.current = device_id;
        setPlayerReady(true);
      });

      player.addListener('not_ready', () => {
        setPlayerReady(false);
      });

      player.addListener('player_state_changed', (state) => {
        if (!state) return;
        setIsPlaying(!state.paused);
        const track = state.track_window?.current_track;
        if (track) {
          const trackData = {
            name: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            image: track.album?.images?.[0]?.url,
          };
          setCurrentTrack(trackData);
          // Share with NowPlaying widget on home screen
          if (!state.paused) {
            sessionStorage.setItem('nathan_now_playing', JSON.stringify(trackData));
          } else {
            sessionStorage.removeItem('nathan_now_playing');
          }
        }
      });

      player.addListener('initialization_error', ({ message }) => {
        setError(`Player init failed: ${message}`);
      });

      player.addListener('authentication_error', () => {
        sessionStorage.removeItem('spotify_token');
        setToken(null);
      });

      await player.connect();
      playerRef.current = player;
    }

    initPlayer();

    return () => {
      if (player) player.disconnect();
    };
  }, [token]);

  const fetchPlaylists = useCallback(async (accessToken) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=30', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) { sessionStorage.removeItem('spotify_token'); setToken(null); return; }
        throw new Error(`Spotify API error ${res.status}`);
      }
      const data = await res.json();
      setPlaylists(data.items || []);
    } catch (err) { setError(`Failed to load playlists: ${err.message}`); }
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

    if (playerReady && deviceIdRef.current) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ context_uri: playlist.uri }),
        });
        if (res.ok) return;
      } catch {}
    }

    // Fallback: try any active device
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_uri: playlist.uri }),
      });
      if (res.ok) return;
    } catch {}

    // Last resort: open in Spotify
    window.open(playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`, '_blank');
  }

  async function togglePlayPause() {
    if (!playerRef.current) return;
    await playerRef.current.togglePlay();
  }

  async function skipNext() {
    if (!playerRef.current) return;
    await playerRef.current.nextTrack();
  }

  async function skipPrev() {
    if (!playerRef.current) return;
    await playerRef.current.previousTrack();
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
          <button className="btn-spotify" onClick={handleLogin}>🎵 Login to Spotify</button>
        </>
      ) : (
        <>
          {error && <p className="error-msg">{error}</p>}

          {/* Now Playing + Controls */}
          {currentTrack && (
            <div className="spotify-player-card">
              {currentTrack.image && (
                <img src={currentTrack.image} alt="" className="spotify-player-art" />
              )}
              <div className="spotify-player-info">
                <p className="spotify-player-track">{currentTrack.name}</p>
                <p className="spotify-player-artist">{currentTrack.artist}</p>
              </div>
              <div className="spotify-controls">
                <button className="spotify-ctrl-btn" onClick={skipPrev}>⏮</button>
                <button className="spotify-ctrl-btn spotify-ctrl-play" onClick={togglePlayPause}>
                  {isPlaying ? '⏸' : '▶️'}
                </button>
                <button className="spotify-ctrl-btn" onClick={skipNext}>⏭</button>
              </div>
            </div>
          )}

          {!currentTrack && selected && (
            <div className="spotify-now-playing">
              <p className="spotify-np-label">Selected 🎶</p>
              <p className="spotify-np-name">{selected.name}</p>
              {!playerReady && <p className="spotify-np-hint">Requires Spotify Premium for in-app playback</p>}
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

      <button className="btn-reset" onClick={onBack}>← Back</button>
    </div>
  );
}
