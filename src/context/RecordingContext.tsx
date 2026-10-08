// Recording context — owns the single screen+webcam recorder above the page
// level so it survives navigation. Recording is started on the EEG page and
// stops when the participant leaves the player page (same point as before).
import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { usePhaseLog } from '@/hooks/usePhaseLog';

interface RecordingContextType {
  isRecording: boolean;
  startRecording: (overrideDeviceId?: string) => Promise<boolean>;
  stopRecording: () => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  const { isRecording, startRecording, stopRecording } = useMediaRecorder({
    participantId: user?.participantId,
  });

  // The .webm itself starts at t=0 with no absolute time, so log when recording
  // began and ended. gaze.clientTime minus this start gives a sample's offset
  // into the recording.
  const { startPhase, endPhase } = usePhaseLog('recording');

  const startAndLog = useCallback(
    async (overrideDeviceId?: string) => {
      const started = await startRecording(overrideDeviceId);
      if (started) startPhase();
      return started;
    },
    [startRecording, startPhase]
  );

  const stopAndLog = useCallback(() => {
    stopRecording();
    endPhase();
  }, [stopRecording, endPhase]);

  // Stop recording when leaving the player page (the experiment is over).
  // At routeChangeStart, router.pathname is still the departing route.
  useEffect(() => {
    const handleRouteChange = () => {
      if (router.pathname === '/player') {
        stopAndLog();
      }
    };
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, stopAndLog]);

  return (
    <RecordingContext.Provider
      value={{ isRecording, startRecording: startAndLog, stopRecording: stopAndLog }}
    >
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}
