// Video player component with controls
import React, { useRef, useState, useEffect, CSSProperties } from 'react';
import { Mode, Video } from '@/types';

interface VideoPlayerProps {
  mode: Mode;
  video: Video | null;
  onEnded: () => void;
  onPlay?: (position: number) => void;
  onPause?: (position: number) => void;
  onPauseEnd?: (position: number) => void;
  updatePlaybackPosition: (id: string, time: number) => void;
  getPlaybackPosition: (id: string) => number;
}

const btnStyle: CSSProperties = {
  fontSize: 20,
  padding: "10px 14px",
  borderRadius: 12,
  border: "2px solid black",
  background: "black",
  cursor: "pointer",
  color: "white",
};

export function VideoPlayer({
  mode,
  video,
  onEnded,
  onPlay,
  onPause,
  onPauseEnd,
  updatePlaybackPosition,
  getPlaybackPosition,
}: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [wasPaused, setWasPaused] = useState(false);
  const [previousTime, setPreviousTime] = useState(0);

  // Restore playback position and auto-play when video changes
  useEffect(() => {
    setIsPlaying(false);
    if (ref.current && video) {
      const savedPosition = getPlaybackPosition(video.id);
      ref.current.currentTime = savedPosition;

      ref.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [video?.id]);

  // Block seeking/fast-forward in non-switching mode
  const handleSeeking = () => {
    if (mode === "non_switching" && ref.current) {
      const el = ref.current;
      if (el.seeking && el.currentTime > previousTime) {
        el.currentTime = previousTime;
      }
    }
  };

  // Track time updates and save position
  const handleTimeUpdate = () => {
    if (!ref.current || !video) return;
    const t = ref.current.currentTime;

    updatePlaybackPosition(video.id, t);

    if (mode === "non_switching") {
      if (t > previousTime) setPreviousTime(t);
    }
  };

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
          height: 648,
          width: 1200,
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
          controls={false}
          style={{ width: "1200px", height: "648px", objectFit: "cover" }}
          playsInline
        />

        {/* Play/Pause button in center */}
        {isHovering && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
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
                style={btnStyle}
              >
                {isPlaying ? "❚❚" : "▶︎"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
