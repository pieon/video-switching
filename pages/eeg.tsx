// EEG setup page - Next.js
// Shown after login, before eye-tracking calibration. First the researcher
// selects the camera (so the system knows which device to record/calibrate
// with), then a baseline video plays while the EEG device is fitted.
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useRecording } from '@/context/RecordingContext';
import { usePhaseLog } from '@/hooks/usePhaseLog';
import { useControlActions } from '@/utils/controlChannel';

const CAMERA_STORAGE_KEY = 'selected_camera_device_id';

export default function EEGPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { startRecording } = useRecording();

  type Phase = 'camera' | 'video';
  const [phase, setPhase] = useState<Phase>('camera');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [startError, setStartError] = useState<string | null>(null);

  // Baseline video exposure: first play through natural end.
  const { startPhase, endPhase } = usePhaseLog('eeg_baseline');

  // The baseline video is played/paused from the control panel with one
  // toggle. play() is allowed because this window already got a click
  // (Start Recording).
  const baselineRef = useRef<HTMLVideoElement>(null);
  const [isBaselinePlaying, setIsBaselinePlaying] = useState(false);
  // "Full screen" fills the browser window with the video. Real fullscreen
  // (requestFullscreen) needs a click in this window, which a panel message
  // isn't — so put the window itself in fullscreen (F11) for a full monitor.
  const [isBaselineFull, setIsBaselineFull] = useState(false);
  const toggleBaseline = () => {
    const v = baselineRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  useControlActions(
    phase === 'video'
      ? [
          { id: 'playback', label: isBaselinePlaying ? '❚❚ Pause' : '▶︎ Play', variant: 'secondary', run: toggleBaseline },
          {
            id: 'fullscreen',
            label: isBaselineFull ? 'Exit full screen' : '⛶ Full screen',
            variant: 'secondary',
            run: () => setIsBaselineFull((f) => !f),
          },
          { id: 'continue', label: 'Continue to Calibration', run: () => router.push('/calibrate') },
        ]
      : []
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Load available cameras on mount
  useEffect(() => {
    async function loadCameras() {
      try {
        // Need permission first to get labels
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(t => t.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoCameras = devices.filter(d => d.kind === 'videoinput');
        setCameras(videoCameras);

        // Restore previously selected camera or default to first
        const saved = localStorage.getItem(CAMERA_STORAGE_KEY);
        const savedExists = videoCameras.some(c => c.deviceId === saved);
        setSelectedCameraId(savedExists && saved ? saved : (videoCameras[0]?.deviceId ?? ''));
      } catch (err) {
        console.error('Failed to enumerate cameras:', err);
      }
    }
    loadCameras();
  }, []);

  const handleConfirmAndRecord = async () => {
    if (selectedCameraId) {
      localStorage.setItem(CAMERA_STORAGE_KEY, selectedCameraId);
    }
    setStartError(null);
    // Starts screen + webcam recording with the chosen camera. Must run from
    // this click so the browser's screen-capture gesture requirement is met.
    const started = await startRecording(selectedCameraId || undefined);
    if (started) {
      setPhase('video');
    } else {
      setStartError('Recording did not start (screen share was cancelled or blocked). Please try again.');
    }
  };

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </PageLayout>
    );
  }

  if (phase === 'camera') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Select Camera</h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 16 }}>
            Choose which camera to use for recording and eye tracking.
            The same camera is used for calibration.
          </p>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            style={{
              width: '100%',
              maxWidth: 400,
              padding: '10px 12px',
              fontSize: 16,
              borderRadius: 8,
              border: '2px solid #ddd',
              marginBottom: 24,
              cursor: 'pointer',
            }}
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
              </option>
            ))}
          </select>
          <div>
            <Button onClick={handleConfirmAndRecord} size="large" disabled={!selectedCameraId}>
              Confirm Camera and Start Recording
            </Button>
          </div>
          {startError && (
            <p style={{ color: '#d32f2f', fontSize: 14, marginTop: 16, marginBottom: 0 }}>
              {startError}
            </p>
          )}
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth={2000} style={{ marginTop: 40 }}>
      <Card>
        <video
          ref={baselineRef}
          src="/videos/training/EEG_Baseline_Video.mp4"
          playsInline
          onPlay={() => {
            setIsBaselinePlaying(true);
            startPhase();
          }}
          onPause={() => setIsBaselinePlaying(false)}
          onEnded={() => endPhase()}
          style={
            isBaselineFull
              ? { position: 'fixed', inset: 0, width: '100vw', height: '100vh', objectFit: 'contain', background: '#000', zIndex: 2000 }
              : { width: '100%', borderRadius: 12, background: '#000', display: 'block' }
          }
        />
      </Card>
    </PageLayout>
  );
}
