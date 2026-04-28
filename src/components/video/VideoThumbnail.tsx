// Video thumbnail component for video selection
import React, { CSSProperties } from 'react';
import { Video } from '@/types';

interface VideoThumbnailProps {
  video: Video;
  isCompleted: boolean;
  isCurrent: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function VideoThumbnail({
  video,
  isCurrent,
  disabled,
  onClick,
}: VideoThumbnailProps) {
  const buttonStyle: CSSProperties = {
    textAlign: "left",
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 8,
    background: disabled ? "#f4f4f4" : "#fff",
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
    width: 320,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      style={buttonStyle}
    >
      <img
        src={video.thumbnail}
        alt={video.title}
        style={{ width: "100%", borderRadius: 8, display: "block" }}
      />
      {isCurrent && <div style={{ fontSize: 12 }}>Now playing…</div>}
    </button>
  );
}
