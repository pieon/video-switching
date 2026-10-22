// The single logout routine behind every Logout button: confirm, stop the
// screen + webcam recording (saving the files), log out, and return to the
// login page — where WebGazer is torn down, releasing the eye-tracking camera.
import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useRecording } from '@/context/RecordingContext';
import { useWebGazerContext } from '@/context/WebGazerContext';

export function useConfirmedLogout() {
  const router = useRouter();
  const { logout } = useAuth();
  const { isRecording, stopRecording } = useRecording();
  const { stopGazeLogging } = useWebGazerContext();

  // confirm: false skips the dialog — used when the control panel already
  // confirmed, so no dialog is left open on the participant's screen.
  return useCallback(({ confirm = true }: { confirm?: boolean } = {}) => {
    const message = isRecording
      ? 'Log out? This stops the screen and webcam recording and saves the files.'
      : 'Log out?';
    if (confirm && !window.confirm(message)) return;

    // Stop first, while the participant id (filenames) and token (closing the
    // recording phase row, uploading the last gaze samples) are still set.
    stopRecording();
    stopGazeLogging();
    logout();
    // Client-side navigation, not a reload: the recorders' onstop handlers
    // build and download the files asynchronously and must not be cut off.
    router.push('/');
  }, [isRecording, stopRecording, stopGazeLogging, logout, router]);
}
