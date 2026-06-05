// Shared gaze data type. The WebGazer instance is now owned by a single
// persistent provider — see src/context/WebGazerContext.tsx.
export interface GazeData {
  x: number;
  y: number;
  timestamp: number;
}
