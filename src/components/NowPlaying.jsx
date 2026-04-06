import { useState, useEffect } from 'react';

export default function NowPlaying() {
  const [track, setTrack] = useState(null);

  useEffect(() => {
    function checkPlayer() {
      // Read from sessionStorage — the SpotifyPicker writes current track info here
      try {
        const data = sessionStorage.getItem('nathan_now_playing');
        if (data) setTrack(JSON.parse(data));
        else setTrack(null);
      } catch { setTrack(null); }
    }

    checkPlayer();
    const interval = setInterval(checkPlayer, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!track) return null;

  return (
    <div className="np-widget">
      {track.image && <img src={track.image} alt="" className="np-art" />}
      <div className="np-info">
        <span className="np-track">{track.name}</span>
        <span className="np-artist">{track.artist}</span>
      </div>
      <span className="np-badge">🎵</span>
    </div>
  );
}
