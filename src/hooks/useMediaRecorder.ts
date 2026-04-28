// Hook for screen and webcam recording
import { useState, useRef, useCallback } from 'react';

interface UseMediaRecorderOptions {
  participantId?: string;
  cameraDeviceId?: string;
}

interface UseMediaRecorderReturn {
  isRecording: boolean;
  isInitializing: boolean;
  error: string | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
}

export function useMediaRecorder({
  participantId = 'unknown',
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

  const startRecording = useCallback(async (): Promise<boolean> => {
    setIsInitializing(true);
    setError(null);
    screenChunksRef.current = [];
    webcamChunksRef.current = [];

    try {
      // Request screen capture
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = screenStream;

      // Request webcam (may already be in use by WebGazer, so we get a new stream)
      const videoConstraints: MediaTrackConstraints = cameraDeviceId
        ? { deviceId: { exact: cameraDeviceId } }
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
  }, []);

  const stopRecording = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Stop screen recorder
    if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
      screenRecorderRef.current.onstop = () => {
        const blob = new Blob(screenChunksRef.current, { type: 'video/webm' });
        downloadBlob(blob, `screen_${participantId}_${timestamp}.webm`);
      };
      screenRecorderRef.current.stop();
    }

    // Stop webcam recorder
    if (webcamRecorderRef.current && webcamRecorderRef.current.state !== 'inactive') {
      webcamRecorderRef.current.onstop = () => {
        const blob = new Blob(webcamChunksRef.current, { type: 'video/webm' });
        downloadBlob(blob, `webcam_${participantId}_${timestamp}.webm`);
      };
      webcamRecorderRef.current.stop();
    }

    // Stop all tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }

    setIsRecording(false);
  }, [downloadBlob, participantId]);

  return {
    isRecording,
    isInitializing,
    error,
    startRecording,
    stopRecording,
  };
}
