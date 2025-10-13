// App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import './App.css'

type Mode = "non-switching" | "switching";
type Page = "admin" | "player";

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

// Admin Page Component
const AdminPage: React.FC<{ onStart: (mode: Mode) => void }> = ({ onStart }) => {
  const [selectedMode, setSelectedMode] = useState<Mode>("non-switching");

  return (
    <div style={{ 
      maxWidth: 600, 
      margin: "0 auto", 
      fontFamily: "system-ui",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }}>
      <h1 style={{ textAlign: "center", marginBottom: 32 }}>Setting Page</h1>
      
      <div style={{ 
        background: "#f9f9f9", 
        padding: 32, 
        borderRadius: 16, 
        border: "1px solid #ddd" 
      }}>
        <h2 style={{ marginTop: 0 }}>Select Mode</h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            padding: 16, 
            border: "2px solid", 
            borderColor: selectedMode === "non-switching" ? "#007AFF" : "#ddd",
            borderRadius: 12,
            cursor: "pointer",
            background: selectedMode === "non-switching" ? "#E3F2FF" : "#fff"
          }}>
            <input
              type="radio"
              name="mode"
              value="non-switching"
              checked={selectedMode === "non-switching"}
              onChange={(e) => setSelectedMode(e.target.value as Mode)}
              style={{ marginRight: 12, width: 20, height: 20 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 18, color: "black" }}>Non-Switching Mode</div>
              <div style={{ fontSize: 14, color: "black", marginTop: 4 }}>
                Must watch videos completely, no seeking forward, can't switch between videos
              </div>
            </div>
          </label>

          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            padding: 16, 
            border: "2px solid", 
            borderColor: selectedMode === "switching" ? "#007AFF" : "#ddd",
            borderRadius: 12,
            cursor: "pointer",
            background: selectedMode === "switching" ? "#E3F2FF" : "#fff"
          }}>
            <input
              type="radio"
              name="mode"
              value="switching"
              checked={selectedMode === "switching"}
              onChange={(e) => setSelectedMode(e.target.value as Mode)}
              style={{ marginRight: 12, width: 20, height: 20 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 18, color: "black" }}>Switching Mode</div>
              <div style={{ fontSize: 14, color: "black", marginTop: 4 }}>
                Full controls available, can switch between videos freely
              </div>
            </div>
          </label>
        </div>

        <button
          onClick={() => onStart(selectedMode)}
          style={{
            width: "100%",
            padding: 16,
            fontSize: 18,
            fontWeight: 600,
            background: "#007AFF",
            color: "white",
            border: "none",
            borderRadius: 12,
            cursor: "pointer"
          }}
        >
          Start Video Player
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [page, setPage] = useState<Page>("admin");
  const [mode, setMode] = useState<Mode>("non-switching");

  // Load mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("video_player_mode");
    if (savedMode === "non-switching" || savedMode === "switching") {
      setMode(savedMode);
    }
  }, []);

  const handleStartPlayer = (selectedMode: Mode) => {
    setMode(selectedMode);
    localStorage.setItem("video_player_mode", selectedMode);
    setPage("player");
  };

  const handleBackToAdmin = () => {
    setPage("admin");
  };

  // Show admin page
  if (page === "admin") {
    return <AdminPage onStart={handleStartPlayer} />;
  }

  // Show player page
  return <PlayerPage mode={mode} onBackToAdmin={handleBackToAdmin} />;
};

// Player Page Component (the current main App content)
const PlayerPage: React.FC<{ mode: Mode; onBackToAdmin: () => void }> = ({ mode, onBackToAdmin }) => {
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
    <div style={{ maxWidth: 1400, margin: "0 auto", marginRight:-40, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0}}>Video Player - {mode === "non-switching" ? "Non-Switching" : "Switching"} Mode</h1>
        <button
          onClick={onBackToAdmin}
          style={{
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            background: "#424242ff",
            color: "#aaaaaaff",
            border: "1px solid #666666ff",
            borderRadius: 8,
            cursor: "pointer",
            marginLeft: 15
          }}
        >
          Settings
        </button>
      </header>

      <main style={{ marginTop: 16, display: "flex", gap: 48, alignItems: "flex-start" }}>
        {/* Left side - Player */}
        <div style={{ flex: "1 1 auto", minWidth: 0, maxWidth: "100%" }}>
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
        </div>

        {/* Right side - Video selection */}
        <div style={{ flex: "0 0 200px", display: "flex", flexDirection: "column", minWidth: 200, flexShrink: 0 }}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Pick a video</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
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
          height: 540,
          width: 1000
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
          style={{ width: "1000px", height: "540px", objectFit: "cover" }}
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

