// App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import './App.css'

type Mode = "non-switching" | "switching";

type Video = {
  id: string;
  title: string;
  url: string;        // Replace with your mp4/HLS
  thumbnail: string;  // Replace with images
  durationSec?: number;
};

const MOCK_VIDEOS: Video[] = [
  { id: "a", title: "Lamp", url: "/videos/a.MOV", thumbnail: "/thumbs/a.png" },
  { id: "b", title: "Bowl", url: "/videos/b.MOV", thumbnail: "/thumbs/b.png" },
  { id: "c", title: "Dragon",  url: "/videos/c.MOV", thumbnail: "/thumbs/c.png" },
];

function useSession(mode: Mode) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    const key = `video_switching_${mode}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        setCompleted(s.completed ?? []);
        setCurrent(s.current ?? null);
      } catch {}
    }
  }, [mode]);

  useEffect(() => {
    const key = `video_switching_${mode}`;
    localStorage.setItem(key, JSON.stringify({ completed, current }));
  }, [mode, completed, current]);

  const markCompleted = (id: string) => {
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  return { completed, current, setCurrent, markCompleted };
}

const App: React.FC = () => {
  // Toggle this to see both behaviors, or build a parent setup page
  const [mode, setMode] = useState<Mode>("non-switching");
  const { completed, current, setCurrent, markCompleted } = useSession(mode);

  const videos = useMemo<Video[]>(() => MOCK_VIDEOS, []);
  const currentVideo = useMemo(
    () => videos.find((v) => v.id === current) ?? null,
    [videos, current]
  );

  const handleSelectVideo = (id: string) => {
    // Block clicking other videos in non-switching mode while something is playing
    if (mode === "non-switching" && current && current !== id) return;

    if (completed.includes(id)) return; // never allow rewatch
    setCurrent(id);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Video Switching</h1>
        <div>
          <label style={{ fontWeight: 600, marginRight: 8 }}>Mode:</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="non-switching">Non-switching</option>
            <option value="switching">Switching</option>
          </select>
        </div>
      </header>

      <main style={{ marginTop: 16 }}>
        <Player
          mode={mode}
          video={currentVideo}
          onEnded={() => {
            if (currentVideo) {
              markCompleted(currentVideo.id);
              // In non-switching, clear current so the child must choose the next one
              // In switching mode, also clear (so next pick is explicit)
              setCurrent(null);
            }
          }}
        />

        <h2 style={{ marginTop: 24 }}>Pick a video</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {videos.map((v) => {
            const isCompleted = completed.includes(v.id);
            const isCurrent = current === v.id;
            const disabled =
              isCompleted ||
              (mode === "non-switching" && current !== null && !isCurrent);

            return (
              <button
                key={v.id}
                onClick={() => handleSelectVideo(v.id)}
                disabled={disabled}
                aria-disabled={disabled}
                style={{
                  textAlign: "left",
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 8,
                  background: disabled ? "#f4f4f4" : "#fff",
                  opacity: disabled ? 0.6 : 1,
                  cursor: disabled ? "not-allowed" : "pointer"
                }}
              >
                <img src={v.thumbnail} alt="" style={{ width: "100%", borderRadius: 8 }} />
                <div style={{ marginTop: 8, fontWeight: 600 }}>
                  {v.title} {isCompleted ? "✓" : ""}
                </div>
                {isCurrent && <div style={{ fontSize: 12 }}>Now playing…</div>}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

const Player: React.FC<{
  mode: Mode;
  video: Video | null;
  onEnded: () => void;
}> = ({ mode, video, onEnded }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    if (ref.current) {
      ref.current.currentTime = 0;
      // Auto-play when a new video is selected
      if (video) {
        ref.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // Auto-play might be blocked by browser, handle silently
          setIsPlaying(false);
        });
      }
    }
  }, [video?.id]);

  // In non-switching mode, block seeking/fast-forward
  const handleSeeking = () => {
    if (mode === "non-switching" && ref.current) {
      const el = ref.current;
      // Snap back to the last known safe point (we use 'timeupdate' tracking)
      // Simpler: just revert to previousTime if user tries to scrub forward
      if (el.seeking && el.currentTime > previousTime) {
        el.currentTime = previousTime;
      }
    }
  };

  // Track “last safe time”
  const [previousTime, setPreviousTime] = useState(0);
  const handleTimeUpdate = () => {
    if (!ref.current) return;
    const t = ref.current.currentTime;
    // In non-switching, only allow increasing naturally
    if (mode === "non-switching") {
      // accept natural progression
      if (t > previousTime) setPreviousTime(t);
    }
  };

  const showNativeControls = mode === "switching";

  if (!video) {
    return (
      <div
        aria-live="polite"
        style={{
          border: "2px dashed #bbb",
          borderRadius: 16,
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 360
        }}
      >
        Choose a video to start
      </div>
    );
  }

  return (
    <div>
      <div 
        style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000" }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <video
          ref={ref}
          src={video.url}
          onEnded={onEnded}
          onSeeking={handleSeeking}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          controls={showNativeControls}
          controlsList={showNativeControls ? "nodownload" : "nodownload noplaybackrate"}
          style={{ width: "100%", height: "360px", objectFit: "cover" }}
          playsInline
        />
        {!showNativeControls && isHovering && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none"
            }}
          >
            {/* Minimal custom controls: play/pause toggle */}
            <div style={{ pointerEvents: "auto", display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  const el = ref.current;
                  if (!el) return;
                  
                  if (isPlaying) {
                    el.pause();
                    setIsPlaying(false);
                  } else {
                    el.play();
                    setIsPlaying(true);
                  }
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={ btnStyle }
              >
                {isPlaying ? "❚❚" : "▶︎"}
              </button>
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, fontWeight: 600 }}>{video.title}</div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  fontSize: 20,
  padding: "10px 14px",
  borderRadius: 12,
  border: "2px solid black",
  background: "black",
  cursor: "pointer"
};

export default App;

