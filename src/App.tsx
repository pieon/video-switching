// App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import './App.css'
import { trackingService } from './services/trackingService';

type Mode = "non-switching" | "switching";
type Page = "login" | "admin" | "player" | "researcher";

interface User {
  id: string;
  participantId: string;
  condition: Mode;
}

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
  const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});

  // Persist to localStorage
  useEffect(() => {
    const key = `video_switching_${mode}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        setCompleted(s.completed ?? []);
        setCurrent(s.current ?? null);
        setPlaybackPositions(s.playbackPositions ?? {});
      } catch {}
    }
  }, [mode]);

  useEffect(() => {
    const key = `video_switching_${mode}`;
    localStorage.setItem(key, JSON.stringify({ completed, current, playbackPositions }));
  }, [mode, completed, current, playbackPositions]);

  const markCompleted = (id: string) => {
    setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const updatePlaybackPosition = (id: string, time: number) => {
    setPlaybackPositions((prev) => ({ ...prev, [id]: time }));
  };

  const getPlaybackPosition = (id: string): number => {
    return playbackPositions[id] ?? 0;
  };

  return { completed, current, setCurrent, markCompleted, updatePlaybackPosition, getPlaybackPosition };
}

// Login Page Component
const LoginPage: React.FC<{ onLogin: (user: User) => void; onResearcherMode: () => void }> = ({ onLogin, onResearcherMode }) => {
  const [participantId, setParticipantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { token, user } = await trackingService.login(participantId);
      console.log("Logged in:", user);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your Participant ID.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 500,
      margin: "100px auto",
      fontFamily: "system-ui",
      padding: 20
    }}>
      <h1 style={{ textAlign: "center", marginBottom: 32 }}>Video Watching Study</h1>

      <div style={{
        background: "#f9f9f9",
        padding: 32,
        borderRadius: 16,
        border: "1px solid #ddd"
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Welcome</h2>
        <p style={{ color: "#666", marginBottom: 24 }}>
          Please enter your Participant ID to begin the study.
        </p>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Participant ID (e.g., P001)"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value.toUpperCase())}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 16,
              boxSizing: "border-box"
            }}
            disabled={loading}
            required
          />

          {error && (
            <div style={{
              padding: 12,
              background: "#fee",
              color: "#c00",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !participantId}
            style={{
              width: "100%",
              padding: 16,
              fontSize: 18,
              fontWeight: 600,
              background: loading ? "#ccc" : "#007AFF",
              color: "white",
              border: "none",
              borderRadius: 12,
              cursor: loading || !participantId ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Logging in..." : "Start Study"}
          </button>
        </form>

        <p style={{
          marginTop: 24,
          fontSize: 12,
          color: "#999",
          textAlign: "center"
        }}>
          If you don't have a Participant ID, please contact the researcher.
        </p>
      </div>

      <button
        onClick={onResearcherMode}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 14,
          fontWeight: 600,
          background: "#6c757d",
          color: "white",
          border: "none",
          borderRadius: 12,
          cursor: "pointer",
          marginTop: 16
        }}
      >
        Researcher Dashboard
      </button>
    </div>
  );
};

// Admin Page Component
const AdminPage: React.FC<{ onStart: (mode: Mode) => void; user: User; onLogout: () => void }> = ({ onStart, user, onLogout }) => {
  const [selectedMode, setSelectedMode] = useState<Mode>(user.condition);

  return (
    <div style={{
      maxWidth: 600,
      margin: "0 auto",
      fontFamily: "system-ui",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "#666" }}>Participant ID: {user.participantId}</div>
          <div style={{ fontSize: 14, color: "#666" }}>Condition: {user.condition}</div>
        </div>
        <button
          onClick={onLogout}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            borderRadius: 8,
            border: "none",
            background: "#dc3545",
            color: "white",
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          Logout
        </button>
      </div>

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
              <div style={{ fontWeight: 600, fontSize: 18, color: "black"}}>Switching Mode</div>
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

// Researcher Page Component
const ResearcherPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchParticipants = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/all`);
      if (!response.ok) throw new Error("Failed to fetch participants");
      const data = await response.json();
      setParticipants(data);
    } catch (err: any) {
      setError(err.message || "Failed to load participants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const handleExportCSV = async (type: 'events' | 'sessions' | 'participants') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/analytics/export?type=${type}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  return (
    <div style={{
      maxWidth: 1200,
      margin: "40px auto",
      fontFamily: "system-ui",
      padding: 20
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1 style={{ margin: 0 }}>Researcher Dashboard</h1>
        <button
          onClick={onBack}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer"
          }}
        >
          Back to Login
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => handleExportCSV('events')}
          style={{
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            background: "#007AFF",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          Export Events
        </button>
        <button
          onClick={() => handleExportCSV('sessions')}
          style={{
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          Export Sessions
        </button>
        <button
          onClick={() => handleExportCSV('participants')}
          style={{
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            background: "#ffc107",
            color: "#000",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          Export Participants
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>Loading participants...</div>
      ) : error ? (
        <div style={{
          padding: 16,
          background: "#fee",
          color: "#c00",
          borderRadius: 8
        }}>
          {error}
        </div>
      ) : (
        <div style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid #ddd",
          overflow: "hidden"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 16,
            borderBottom: "1px solid #ddd",
            background: "#f9f9f9"
          }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Participants ({participants.length})</h2>
            <button
              onClick={fetchParticipants}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "white",
                cursor: "pointer"
              }}
            >
              Refresh
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9f9f9", borderBottom: "1px solid #ddd" }}>
                <th style={{ padding: 12, textAlign: "left" }}>Participant ID</th>
                <th style={{ padding: 12, textAlign: "left" }}>Condition</th>
                <th style={{ padding: 12, textAlign: "left" }}>Sessions</th>
                <th style={{ padding: 12, textAlign: "left" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{p.participantId}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      background: p.condition === "switching" ? "#E3F2FF" : "#FFF8DC",
                      color: p.condition === "switching" ? "#007AFF" : "#856404"
                    }}>
                      {p.condition === "switching" ? "Switching" : "Non-Switching"}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{p._count?.sessions || 0}</td>
                  <td style={{ padding: 12, color: "#666" }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [page, setPage] = useState<Page>("login");
  const [mode, setMode] = useState<Mode>("non-switching");
  const [user, setUser] = useState<User | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = trackingService.getToken();
      if (token) {
        try {
          const currentUser = await trackingService.getCurrentUser();
          setUser(currentUser);
          setMode(currentUser.condition);
          setPage("admin");
        } catch (error) {
          // Token invalid, stay on login
          trackingService.clearToken();
        }
      }
    };
    checkAuth();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setMode(loggedInUser.condition);
    setPage("admin");
  };

  const handleStartPlayer = (selectedMode: Mode) => {
    setMode(selectedMode);
    localStorage.setItem("video_player_mode", selectedMode);
    setPage("player");
  };

  const handleBackToAdmin = () => {
    setPage("admin");
  };

  const handleLogout = () => {
    trackingService.clearToken();
    setUser(null);
    setPage("login");
  };

  const handleResearcherMode = () => {
    setPage("researcher");
  };

  const handleBackToLogin = () => {
    setPage("login");
  };

  // Show researcher page
  if (page === "researcher") {
    return <ResearcherPage onBack={handleBackToLogin} />;
  }

  // Show login page
  if (page === "login" || !user) {
    return <LoginPage onLogin={handleLogin} onResearcherMode={handleResearcherMode} />;
  }

  // Show admin page
  if (page === "admin") {
    return <AdminPage onStart={handleStartPlayer} user={user} onLogout={handleLogout} />;
  }

  // Show player page
  return <PlayerPage mode={mode} onBackToAdmin={handleBackToAdmin} user={user} onLogout={handleLogout} />;
};

// Player Page Component (the current main App content)
const PlayerPage: React.FC<{ mode: Mode; onBackToAdmin: () => void; user: User; onLogout: () => void }> = ({ mode, onBackToAdmin, user, onLogout }) => {
  const { completed, current, setCurrent, markCompleted, updatePlaybackPosition, getPlaybackPosition } = useSession(mode);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);

  const videos = useMemo<Video[]>(() => MOCK_VIDEOS, []);
  const currentVideo = useMemo(
    () => videos.find((v) => v.id === current) ?? null,
    [videos, current]
  );

  const handleSelectVideo = async (id: string) => {
    // Block clicking other videos in non-switching mode while something is playing
    if (mode === "non-switching" && current && current !== id) return;

    if (completed.includes(id)) return; // never allow rewatch

    const previousVideo = current;

    // Start new session for the selected video
    try {
      const sessionId = await trackingService.startSession(id);
      setCurrentSessionId(sessionId);

      // Track switch event if switching from another video
      if (previousVideo && previousVideo !== id && mode === "switching") {
        trackingService.trackSwitch(
          sessionId,
          previousVideo,
          id,
          getPlaybackPosition(previousVideo)
        );
      }

      setCurrent(id);
    } catch (error) {
      console.error("Failed to start session:", error);
      // Still allow video to play even if tracking fails
      setCurrent(id);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", marginRight:-40, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0}}>Video Player - {mode === "non-switching" ? "Non-Switching" : "Switching"} Mode</h1>
          <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>Participant: {user.participantId}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
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
              cursor: "pointer"
            }}
          >
            Settings
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Player */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Player
            mode={mode}
            video={currentVideo}
            sessionId={currentSessionId}
            onEnded={() => {
              if (currentVideo && currentSessionId) {
                // Track completion
                trackingService.trackComplete(
                  currentSessionId,
                  getPlaybackPosition(currentVideo.id)
                );

                // Complete the session
                trackingService.completeSession(currentSessionId).catch(console.error);

                markCompleted(currentVideo.id);
                // Clear the saved position since video is completed
                updatePlaybackPosition(currentVideo.id, 0);
                // In non-switching, clear current so the child must choose the next one
                // In switching mode, also clear (so next pick is explicit)
                setCurrent(null);
                setCurrentSessionId(null);
              }
            }}
            onPlay={(position) => {
              if (currentSessionId) {
                trackingService.trackPlay(currentSessionId, position);
                if (pauseStartTime !== null) {
                  setPauseStartTime(null);
                }
              }
            }}
            onPause={(position) => {
              if (currentSessionId) {
                setPauseStartTime(Date.now());
              }
            }}
            onPauseEnd={(position) => {
              if (currentSessionId && pauseStartTime) {
                const pauseDuration = (Date.now() - pauseStartTime) / 1000; // Convert to seconds
                trackingService.trackPause(currentSessionId, pauseDuration, position);
                setPauseStartTime(null);
              }
            }}
            updatePlaybackPosition={updatePlaybackPosition}
            getPlaybackPosition={getPlaybackPosition}
          />
        </div>

        {/* Bottom - Video selection */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Pick a video</h2>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
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
                    cursor: disabled ? "not-allowed" : "pointer",
                    width: 200
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
  sessionId: string | null;
  onEnded: () => void;
  onPlay?: (position: number) => void;
  onPause?: (position: number) => void;
  onPauseEnd?: (position: number) => void;
  updatePlaybackPosition: (id: string, time: number) => void;
  getPlaybackPosition: (id: string) => number;
}> = ({ mode, video, sessionId, onEnded, onPlay, onPause, onPauseEnd, updatePlaybackPosition, getPlaybackPosition }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [wasPaused, setWasPaused] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    if (ref.current && video) {
      // Restore playback position
      const savedPosition = getPlaybackPosition(video.id);
      ref.current.currentTime = savedPosition;

      // Auto-play when a new video is selected
      ref.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Auto-play might be blocked by browser, handle silently
        setIsPlaying(false);
      });
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

  // Track "last safe time"
  const [previousTime, setPreviousTime] = useState(0);
  const handleTimeUpdate = () => {
    if (!ref.current || !video) return;
    const t = ref.current.currentTime;

    // Save playback position
    updatePlaybackPosition(video.id, t);

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
          onPlay={() => {
            setIsPlaying(true);
            if (ref.current && onPlay) {
              onPlay(ref.current.currentTime);
              // If resuming from pause, track pause end
              if (wasPaused && onPauseEnd) {
                onPauseEnd(ref.current.currentTime);
                setWasPaused(false);
              }
            }
          }}
          onPause={() => {
            setIsPlaying(false);
            if (ref.current && onPause) {
              onPause(ref.current.currentTime);
              setWasPaused(true);
            }
          }}
          controls={showNativeControls}
          controlsList="nodownload noplaybackrate"
          style={{ width: "1000px", height: "540px", objectFit: "cover" }}
          playsInline
        />
        {!showNativeControls && isHovering && (
          <>
            {/* Play/Pause button in center */}
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
              <div style={{ pointerEvents: "auto" }}>
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
            {/* Fullscreen button in bottom-right corner */}
            <div
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                pointerEvents: "auto"
              }}
            >
              <button
                onClick={() => {
                  const el = ref.current;
                  if (!el) return;

                  if (!document.fullscreenElement) {
                    el.requestFullscreen().catch((err) => {
                      console.error("Error attempting to enable fullscreen:", err);
                    });
                  } else {
                    document.exitFullscreen();
                  }
                }}
                aria-label="Fullscreen"
                style={ btnStyle }
              >
                ⛶
              </button>
            </div>
          </>
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

