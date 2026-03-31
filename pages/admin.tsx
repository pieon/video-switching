// Admin/Settings page - Next.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { Mode, VideoSet } from '@/types';

function getSessionNumber(participantId: string): 1 | 2 {
  const stored = localStorage.getItem(`session_number_${participantId}`);
  return stored === '2' ? 2 : 1;
}

function oppositeMode(m: Mode): Mode {
  return m === 'switching' ? 'non_switching' : 'switching';
}

function oppositeSet(s: VideoSet): VideoSet {
  return s === 'A' ? 'B' : 'A';
}

export default function AdminPage() {
  const router = useRouter();
  const { user, setMode, setVideoSet, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </PageLayout>
    );
  }

  const sessionNumber = getSessionNumber(user.participantId);
  const currentMode: Mode = sessionNumber === 1
    ? user.condition
    : oppositeMode(user.condition);
  const currentSet: VideoSet = sessionNumber === 1
    ? (user.videoSet ?? 'A')
    : oppositeSet(user.videoSet ?? 'A');

  const handleStart = () => {
    setMode(currentMode);
    setVideoSet(currentSet);
    // Clear stale session state so the player always starts fresh
    localStorage.removeItem(`video_switching_${currentMode}`);
    router.push(`/training?mode=${currentMode}`);
  };

  return (
    <PageLayout maxWidth={600} style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: '#666' }}>
          Participant: {user.participantId}
        </div>
        <Button variant="danger" size="small">Logout</Button>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 32 }}>
        Session {sessionNumber} of 2
      </h1>

      <Card>
        <h2 style={{ marginTop: 0 }}>Your Assignment</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 12,
            border: '2px solid #007AFF',
            background: '#E3F2FF',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Mode</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                {currentMode === 'switching'
                  ? 'Full controls — switch between videos freely'
                  : 'Must watch each video completely, no fast-forward'}
              </div>
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
              <div style={{ fontWeight: 600, fontSize: 16 }}>Video Set</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                {currentSet === 'A'
                  ? 'Cafe Chaos · One of These Goats · Buried Treasure · Building Bridges'
                  : 'Zadies Shell Shuffle · Pokey Plant · Lemonade Problem · Design Time'}
              </div>
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

        <Button onClick={handleStart} fullWidth size="large">
          Start Session {sessionNumber}
        </Button>
      </Card>
    </PageLayout>
  );
}
