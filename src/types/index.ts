// Type definitions for the video switching application

export type Mode = "non_switching" | "switching";
export type VideoSet = 'A' | 'B';
export type TrainingType = 'short' | 'full';

export interface User {
  id: string;
  participantId: string;
  condition: Mode;
  videoSet: VideoSet;
  trainingType: TrainingType;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  durationSec?: number;
  set?: VideoSet;
}

export interface SessionState {
  completed: string[];
  current: string | null;
  playbackPositions: Record<string, number>;
}

export interface Participant {
  id: string;
  participantId: string;
  condition: Mode;
  videoSet: VideoSet;
  trainingType: TrainingType;
  createdAt: string;
  _count?: {
    sessions: number;
  };
}
