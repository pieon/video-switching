// Video grid component for displaying video thumbnails
import React from 'react';
import { Video, Mode } from '@/types';
import { VideoThumbnail } from './VideoThumbnail';

interface VideoGridProps {
  videos: Video[];
  completed: string[];
  current: string | null;
  mode: Mode;
  onSelectVideo: (videoId: string) => void;
}

export function VideoGrid({
  videos,
  completed,
  current,
  mode,
  onSelectVideo,
}: VideoGridProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Pick a video</h2>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {videos.map((video) => {
          const isCompleted = completed.includes(video.id);
          const isCurrent = current === video.id;
          const disabled =
            isCompleted ||
            (mode === "non-switching" && current !== null && !isCurrent);

          return (
            <VideoThumbnail
              key={video.id}
              video={video}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              disabled={disabled}
              onClick={() => onSelectVideo(video.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
