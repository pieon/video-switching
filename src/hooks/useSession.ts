// Custom hook for managing video session state
import { useEffect, useState } from "react";
import { Mode, SessionState } from "@/types";

export function useSession(mode: Mode) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});

  // Load from localStorage
  useEffect(() => {
    const key = `video_switching_${mode}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const s: SessionState = JSON.parse(raw);
        setCompleted(s.completed ?? []);
        setCurrent(s.current ?? null);
        setPlaybackPositions(s.playbackPositions ?? {});
      } catch (error) {
        console.error('Failed to load session state:', error);
      }
    }
  }, [mode]);

  // Save to localStorage
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
