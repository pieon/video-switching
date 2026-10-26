// Hook for screen and webcam recording
import { useState, useRef, useCallback, useEffect } from 'react';
import { appendChunk, getPendingChunks, clearChunks } from '@/utils/recordingStore';
import { trackingService } from '@/services/trackingService';
import { readDisplay } from '@/utils/displayInfo';

// The screen being recorded, exposed so the control panel (opened by this
// window) can show the same screen without a second share prompt.
declare global {
  interface Window {
    participantScreen?: MediaStream | null;
  }
}

interface UseMediaRecorderOptions {
  participantId?: string;
  cameraDeviceId?: string;
}

interface UseMediaRecorderReturn {
  isRecording: boolean;
  isInitializing: boolean;
  error: string | null;
  startRecording: (overrideDeviceId?: string) => Promise<boolean>;
  stopRecording: () => void;
}

export function useMediaRecorder({
  participantId,
  cameraDeviceId,
}: UseMediaRecorderOptions = {}): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const webcamChunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // Keep the participantId in a ref so filenames are correct even when
  // stopRecording is triggered from a closure created before login (the
  // provider mounts before the participant is known).
  //
  // Only ever overwrite it with a real id: logging out sets user to null, and
  // stopRecording runs on the navigation that logout triggers — clearing the
  // ref first would name the files "unknown_webcam.webm".
  const participantIdRef = useRef<string>('unknown');
  if (participantId) {
    participantIdRef.current = participantId;
  }

  // Identifies the current recording run. Only used to group crash-recovery
  // chunks — filenames are <participantId>_<kind>.webm with no timestamp.
  const stampRef = useRef('');

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // On mount, recover any recording a previous tab left behind. Chunks only
  // survive here if stopRecording() never ran (tab closed, crash, power loss).
  useEffect(() => {
    (async () => {
      const pending = await getPendingChunks();
      if (pending.length === 0) return;

      // One file per (kind, participant, session) — chunks are in write order.
      // The stamp is only a grouping key; it is not part of the filename.
      const groups = new Map<string, { kind: string; participant: string; blobs: Blob[] }>();
      for (const c of pending) {
        const key = `${c.kind}|${c.participant}|${c.stamp}`;
        const group = groups.get(key);
        if (group) {
          group.blobs.push(c.blob);
        } else {
          groups.set(key, { kind: c.kind, participant: c.participant, blobs: [c.blob] });
        }
      }

      for (const { kind, participant, blobs } of groups.values()) {
        downloadBlob(
          new Blob(blobs, { type: 'video/webm' }),
          `${participant}_${kind}_recovered.webm`
        );
      }
      console.warn(
        `[useMediaRecorder] recovered ${groups.size} unsaved recording(s) from a previous session`
      );
      await clearChunks();
    })();
  }, [downloadBlob]);

  const startRecording = useCallback(async (overrideDeviceId?: string): Promise<boolean> => {
    setIsInitializing(true);
    setError(null);
    screenChunksRef.current = [];
    webcamChunksRef.current = [];
    stampRef.current = new Date().toISOString().replace(/[:.]/g, '-');
    await clearChunks();

    try {
      // Request screen capture
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = screenStream;
      window.participantScreen = screenStream;

      // The recording's frame size is set by the captured surface, not the
      // browser viewport. Log both so gaze (viewport CSS px) can be mapped onto
      // the .webm frames afterwards.
      const captured = screenStream.getVideoTracks()[0]?.getSettings();
      trackingService.logDisplay('recording', {
        ...readDisplay(),
        recordedWidth: captured?.width,
        recordedHeight: captured?.height,
      });

      // Request webcam (may already be in use by WebGazer, so we get a new stream)
      const deviceId = overrideDeviceId ?? cameraDeviceId;
      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : true as any;
      const webcamStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      webcamStreamRef.current = webcamStream;

      // Set up screen recorder
      const screenRecorder = new MediaRecorder(screenStream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      screenRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          screenChunksRef.current.push(e.data);
          appendChunk({
            kind: 'screen',
            participant: participantIdRef.current,
            stamp: stampRef.current,
            blob: e.data,
          });
        }
      };
      screenRecorderRef.current = screenRecorder;

      // Set up webcam recorder
      const webcamRecorder = new MediaRecorder(webcamStream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      webcamRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          webcamChunksRef.current.push(e.data);
          appendChunk({
            kind: 'webcam',
            participant: participantIdRef.current,
            stamp: stampRef.current,
            blob: e.data,
          });
        }
      };
      webcamRecorderRef.current = webcamRecorder;

      // Handle screen share stop (user clicks "Stop sharing")
      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // Start both recorders
      screenRecorder.start(1000); // Collect data every second
      webcamRecorder.start(1000);

      setIsRecording(true);
      setIsInitializing(false);
      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsInitializing(false);
      return false;
    }
  }, [cameraDeviceId]);

  const stopRecording = useCallback(() => {
    const participant = participantIdRef.current;

    // Stop screen recorder
    if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
      screenRecorderRef.current.onstop = () => {
        const blob = new Blob(screenChunksRef.current, { type: 'video/webm' });
        downloadBlob(blob, `${participant}_screen.webm`);
      };
      screenRecorderRef.current.stop();
    }

    // Stop webcam recorder
    if (webcamRecorderRef.current && webcamRecorderRef.current.state !== 'inactive') {
      webcamRecorderRef.current.onstop = () => {
        const blob = new Blob(webcamChunksRef.current, { type: 'video/webm' });
        downloadBlob(blob, `${participant}_webcam.webm`);
        // Files are on disk now, so the crash-recovery copy is no longer needed.
        clearChunks();
      };
      webcamRecorderRef.current.stop();
    }

    // Stop all tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      window.participantScreen = null;
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }

    setIsRecording(false);
  }, [downloadBlob]);

  return {
    isRecording,
    isInitializing,
    error,
    startRecording,
    stopRecording,
  };
}
