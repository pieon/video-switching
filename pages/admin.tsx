// Admin/Settings page - Next.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { Mode, VideoSet } from '@/types';
import { readDisplay, getCalibrationDisplay, describeDisplayChange } from '@/utils/displayInfo';
import { useControlActions } from '@/utils/controlChannel';

export default function AdminPage() {
  const router = useRouter();
  const { user, setMode, setVideoSet, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Compare the current display with the one calibration was trained on.
  // null = matches; [] = no calibration in this tab; otherwise what changed.
  // Re-checked on resize so the warning clears once the researcher fixes it.
  const [displayChanges, setDisplayChanges] = useState<string[] | null>(null);
  useEffect(() => {
    const check = () => {
      const calibration = getCalibrationDisplay();
      if (!calibration) {
        setDisplayChanges([]);
        return;
      }
      const changes = describeDisplayChange(calibration, readDisplay());
      setDisplayChanges(changes.length ? changes : null);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // One participant ID = one condition. A crossover is run by creating a
  // second participant ID with the opposite assignment.
  const currentMode: Mode = user?.condition ?? 'non_switching';
  const currentSet: VideoSet = user?.videoSet ?? 'A';

  const handleStart = () => {
    if (!user) return;
    setMode(currentMode);
    setVideoSet(currentSet);
    // Clear stale session state so the player always starts fresh
    localStorage.removeItem(`video_switching_${currentMode}`);
    router.push(`/training?mode=${currentMode}&set=${currentSet}&trainingType=${user.trainingType ?? 'full'}`);
  };

  useControlActions(
    [
      { id: 'start', label: 'Start Session', run: handleStart },
      ...(displayChanges
        ? [{ id: 'recalibrate', label: 'Recalibrate', variant: 'secondary' as const, run: () => router.push('/calibrate') }]
        : []),
    ],
    displayChanges === null
      ? []
      : displayChanges.length === 0
      ? ['⚠ No calibration in this tab — gaze will not be reliable.']
      : ['⚠ Display changed since calibration:', ...displayChanges]
  );

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth={600} style={{ marginTop: 40 }}>
      <div style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
        Participant: {user.participantId}
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 32 }}>
        Session Setup
      </h1>

      {displayChanges && (
        <Card style={{ marginBottom: 16, border: '2px solid #ff9800', background: '#fff8e1' }}>
          <h3 style={{ marginTop: 0, color: '#e65100' }}>
            {displayChanges.length === 0
              ? '⚠ No calibration in this tab'
              : '⚠ Display changed since calibration'}
          </h3>
          {displayChanges.length === 0 ? (
            <p style={{ fontSize: 14, color: '#5d4037' }}>
              Eye tracking has not been calibrated since this tab was opened, so gaze
              coordinates will not be reliable.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 14, color: '#5d4037', marginBottom: 8 }}>
                Gaze coordinates may be offset. Restore the original window (e.g. press F11,
                reset browser zoom) or recalibrate:
              </p>
              <ul style={{ fontSize: 13, color: '#5d4037', marginTop: 0 }}>
                {displayChanges.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 12,
            border: '2px solid #007AFF',
            background: '#E3F2FF',
            marginTop: 15,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>Mode</div>
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#007AFF' }}>
              {currentMode === 'switching' ? 'Switching' : 'Non-Switching'}
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 12,
            border: `2px solid ${currentSet === 'A' ? '#4caf50' : '#e91e63'}`,
            background: currentSet === 'A' ? '#E8F5E9' : '#FCE4EC',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>Video Set</div>
            </div>
            <span style={{
              fontWeight: 700,
              fontSize: 18,
              color: currentSet === 'A' ? '#2E7D32' : '#C62828',
            }}>
              Set {currentSet}
            </span>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}
