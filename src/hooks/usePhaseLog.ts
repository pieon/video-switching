// Records when a stage of the study (EEG baseline, training, experiment)
// starts and ends.
//
// The row is opened on the server as soon as the stage begins, so a participant
// who abandons midway still leaves a record with endedAt null. The end is also
// sent on page unload, so closing the tab closes the row.
import { useCallback, useEffect, useRef } from 'react';
import { trackingService } from '@/services/trackingService';

type Phase = 'eeg_baseline' | 'training' | 'experiment' | 'recording';

export function usePhaseLog(phase: Phase) {
  const idRef = useRef<string | null>(null);
  // Token the row was opened with, so it can still be closed after logout.
  const tokenRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const endedRef = useRef(false);

  const startPhase = useCallback(async () => {
    if (startedRef.current) return; // one span per visit
    startedRef.current = true;
    tokenRef.current = trackingService.getToken();
    idRef.current = await trackingService.startPhase(phase);
  }, [phase]);

  const endPhase = useCallback((keepalive = false) => {
    if (!idRef.current || endedRef.current) return;
    endedRef.current = true;
    trackingService.endPhase(idRef.current, keepalive, tokenRef.current);
  }, []);

  // Allow a fresh span. Only for callers that outlive one stage — the recording
  // provider never unmounts, so each participant's recording needs its own row.
  const resetPhase = useCallback(() => {
    idRef.current = null;
    tokenRef.current = null;
    startedRef.current = false;
    endedRef.current = false;
  }, []);

  // Close the row if the tab is closed mid-stage.
  useEffect(() => {
    const onBeforeUnload = () => endPhase(true);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [endPhase]);

  return { startPhase, endPhase, resetPhase };
}
