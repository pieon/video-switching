// EEG setup page - Next.js
// Shown after login, before eye-tracking calibration. First the researcher
// selects the camera (so the system knows which device to record/calibrate
// with), then a baseline video plays while the EEG device is fitted.
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useRecording } from '@/context/RecordingContext';

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => router.push('/calibrate')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            background: 'transparent',
            color: '#000',
            border: '1px solid #000',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Continue to Calibration
        </button>
      </div>

      <Card>
        <video
          src="/videos/training/EEG_Baseline_Video.mp4"
          controls
          loop
          playsInline
          style={{
            width: '100%',
            borderRadius: 12,
            background: '#000',
            display: 'block',
          }}
        />
      </Card>
    </PageLayout>
  );
}
