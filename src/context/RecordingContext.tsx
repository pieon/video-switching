// Recording context — owns the single screen+webcam recorder above the page
// level so it survives navigation. Recording is started on the EEG page and
// stops when the participant leaves the player page (same point as before).
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';

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

  // Stop recording when leaving the player page (the experiment is over).
  // At routeChangeStart, router.pathname is still the departing route.
  useEffect(() => {
    const handleRouteChange = () => {
      if (router.pathname === '/player') {
        stopRecording();
      }
    };
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, stopRecording]);

  return (
    <RecordingContext.Provider value={{ isRecording, startRecording, stopRecording }}>
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
