// Next.js App wrapper with AuthProvider
import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RecordingProvider, useRecording } from '@/context/RecordingContext';
import { WebGazerProvider } from '@/context/WebGazerContext';
import { useConfirmedLogout } from '@/hooks/useConfirmedLogout';
import { postControl, useControlMessages } from '@/utils/controlChannel';
import '../src/styles/globals.css';

// Participant-window side of the control panel: follows navigate/logout
// commands and reports where the participant is. Inert in the panel itself.
function ControlReceiver() {
  const router = useRouter();
  const { user, mode } = useAuth();
  const { isRecording } = useRecording();
  const confirmLogout = useConfirmedLogout();
  const isPanel = router.pathname === '/control';

  const sendStatus = () => {
    if (isPanel) return;
    postControl({
      type: 'status',
      path: router.asPath,
      participantId: user?.participantId ?? null,
      isRecording,
    });
  };
  useEffect(sendStatus, [isPanel, router.asPath, user, isRecording]);

  useControlMessages((msg) => {
    if (isPanel) return;
    if (msg.type === 'ping') sendStatus();
    if (msg.type === 'logout') confirmLogout({ confirm: false });
    if (msg.type === 'navigate') {
      if (msg.path === '/training' && user) {
        // Same as admin.tsx "Start Session", built from this window's user
        // (the panel's may be stale once the next participant logs in).
        localStorage.removeItem(`video_switching_${mode}`);
        router.push(`/training?mode=${mode}&set=${user.videoSet ?? 'A'}&trainingType=${user.trainingType ?? 'full'}`);
      } else {
        router.push(msg.path);
      }
    }
  });

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <RecordingProvider>
        <WebGazerProvider>
          <ControlReceiver />
          <Component {...pageProps} />
        </WebGazerProvider>
      </RecordingProvider>
    </AuthProvider>
  );
}
