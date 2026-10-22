// Hook to log every raw gaze sample (x, y) and upload it to the backend.
import { useRef, useCallback, useEffect } from 'react';
import { GazeData } from './useWebGazer';
import { trackingService } from '@/services/trackingService';

// Flush buffered gaze samples this often during a session. Keeps each upload
// small so data lands incrementally and the final unload flush never grows
// past the browser's ~64KB keepalive body limit (which is silently dropped).
const FLUSH_INTERVAL_MS = 5000;

export type GazePhase = 'calibration' | 'training' | 'experiment';

interface GazeSample {
  videoId: string;
  phase: GazePhase;
  x: number;
  y: number;
  /** WebGazer clock: ms since begin(). No epoch, so not comparable across loads. */
  timestamp: number;
  /** Wall clock (epoch ms) at capture — what aligns gaze to video and events. */
  clientTime: number;
}

interface UseGazeLoggerOptions {
  participantId?: string;
  /** Which stage these samples belong to. Defaults to the experiment (player). */
  phase?: GazePhase;
}

export function useGazeLogger({ participantId, phase = 'experiment' }: UseGazeLoggerOptions = {}) {
  const samplesRef = useRef<GazeSample[]>([]);
  // Read via ref so saveAndClearSamples stays stable across participantId loads.
  const participantIdRef = useRef(participantId);
  participantIdRef.current = participantId;

  /**
   * Record one gaze sample. Pass the id of the video being watched (or '' if
   * none), and the phase when it varies per sample (e.g. by route).
   */
  const logSample = useCallback((data: GazeData, videoId = '', samplePhase: GazePhase = phase) => {
    if (data && typeof data.x === 'number' && typeof data.y === 'number') {
      samplesRef.current.push({
        videoId,
        phase: samplePhase,
        x: Math.round(data.x),
        y: Math.round(data.y),
        timestamp: data.timestamp,
        clientTime: Date.now(),
      });
    }
  }, [phase]);

  /**
   * Upload buffered samples to the backend and clear the buffer. On failure the
   * samples are re-buffered so a later flush retries (no data loss).
   * Pass keepalive=true when flushing during page unload.
   */
  const saveAndClearSamples = useCallback((keepalive = false) => {
    if (!participantIdRef.current || samplesRef.current.length === 0) return;

    const batch = samplesRef.current;
    samplesRef.current = [];

    // Re-buffer a failed upload only while the same session is active. If the
    // participant logged out meanwhile, retrying would send their samples
    // under the next participant's token.
    const token = trackingService.getToken();
    trackingService.saveGazeBatch(batch, keepalive).catch((err) => {
      if (trackingService.getToken() === token) {
        console.error('[GazeLogger] upload failed, re-buffering', err);
        samplesRef.current = batch.concat(samplesRef.current);
      } else {
        console.error('[GazeLogger] upload failed after logout; dropping batch', err);
      }
    });
  }, []);

  // Flush on a timer during the session (like event tracking) so gaze data is
  // persisted incrementally rather than all-at-once on page exit.
  useEffect(() => {
    const id = setInterval(() => saveAndClearSamples(), FLUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [saveAndClearSamples]);

  // Flush whatever is left when leaving the page (navigation or tab close), so
  // the last few seconds of a stage aren't lost between timer ticks.
  useEffect(() => {
    const onBeforeUnload = () => saveAndClearSamples(true); // keepalive during unload
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      saveAndClearSamples();
    };
  }, [saveAndClearSamples]);

  return { logSample, saveAndClearSamples };
}
