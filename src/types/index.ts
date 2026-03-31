// Type definitions for the video switching application

export type Mode = "non-switching" | "switching";
export type VideoSet = 'A' | 'B';
export type Page = "login" | "admin" | "player" | "researcher";

export interface User {
  id: string;
  participantId: string;
  condition: Mode;
  videoSet: VideoSet;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  durationSec?: number;
  set?: VideoSet;
}

export interface TrackingEvent {
  sessionId: string;
  eventType: 'play' | 'pause' | 'switch' | 'complete';
  timestamp: number;
  duration?: number;
  playbackPosition?: number;
  fromVideoId?: string;
  toVideoId?: string;
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
  createdAt: string;
  _count?: {
    sessions: number;
  };
}
