// Hook to log every raw gaze sample (x, y) and upload it to the backend.
import { useRef, useCallback, useEffect } from 'react';
import { GazeData } from './useWebGazer';
import { trackingService } from '@/services/trackingService';

// Flush buffered gaze samples this often during a session. Keeps each upload
// small so data lands incrementally and the final unload flush never grows
// past the browser's ~64KB keepalive body limit (which is silently dropped).
const FLUSH_INTERVAL_MS = 5000;

interface GazeSample {
  videoId: string;
  x: number;
  y: number;
  timestamp: number;
}

interface UseGazeLoggerOptions {
  participantId?: string;
}

export function useGazeLogger({ participantId }: UseGazeLoggerOptions = {}) {
  const samplesRef = useRef<GazeSample[]>([]);
  // Read via ref so saveAndClearSamples stays stable across participantId loads.
  const participantIdRef = useRef(participantId);
  participantIdRef.current = participantId;

  /** Record one gaze sample. Pass the id of the video being watched (or '' if none). */
  const logSample = useCallback((data: GazeData, videoId = '') => {
    if (data && typeof data.x === 'number' && typeof data.y === 'number') {
      samplesRef.current.push({
        videoId,
        x: Math.round(data.x),
        y: Math.round(data.y),
        timestamp: data.timestamp,
      });
    }
  }, []);

  /**
   * Upload buffered samples to the backend and clear the buffer. On failure the
   * samples are re-buffered so a later flush retries (no data loss).
   * Pass keepalive=true when flushing during page unload.
   */
  const saveAndClearSamples = useCallback((keepalive = false) => {
    if (!participantIdRef.current || samplesRef.current.length === 0) return;

    const batch = samplesRef.current;
    samplesRef.current = [];

    trackingService.saveGazeBatch(batch, keepalive).catch((err) => {
      console.error('[GazeLogger] upload failed, re-buffering', err);
      samplesRef.current = batch.concat(samplesRef.current);
    });
  }, []);

  // Flush on a timer during the session (like event tracking) so gaze data is
  // persisted incrementally rather than all-at-once on page exit.
  useEffect(() => {
    const id = setInterval(() => saveAndClearSamples(), FLUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [saveAndClearSamples]);

  return { logSample, saveAndClearSamples };
}
