// Hook to log every raw gaze sample (x, y) and upload it to the backend.
import { useRef, useCallback } from 'react';
import { GazeData } from './useWebGazer';
import { trackingService } from '@/services/trackingService';

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
    if (!participantId || samplesRef.current.length === 0) return;

    const batch = samplesRef.current;
    samplesRef.current = [];

    trackingService.saveGazeBatch(batch, keepalive).catch((err) => {
      console.error('[GazeLogger] upload failed, re-buffering', err);
      samplesRef.current = batch.concat(samplesRef.current);
    });
  }, [participantId]);

  return { logSample, saveAndClearSamples };
}
