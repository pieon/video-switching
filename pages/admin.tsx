// Admin/Settings page - Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { Mode } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const { user, mode, setMode, isLoading } = useAuth();
  const [selectedMode, setSelectedMode] = useState<Mode>(mode);

  // Redirect to login if not authenticated, or to calibration if not calibrated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleStartPlayer = () => {
    setMode(selectedMode);
    localStorage.setItem('video_player_mode', selectedMode);
    router.push('/player');
  };

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth={600} style={{ marginTop: 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 14, color: '#666' }}>
            Participant ID: {user.participantId}
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>
            Condition: {user.condition}
          </div>
        </div>
        <Button variant="danger" size="small">
          Logout
        </Button>
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: 32 }}>Setting Page</h1>

      <Card>
        <h2 style={{ marginTop: 0 }}>Select Mode</h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Non-Switching Mode */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: 16,
              border: '2px solid',
              borderColor:
                selectedMode === 'non-switching' ? '#007AFF' : '#ddd',
              borderRadius: 12,
              cursor: 'pointer',
              background:
                selectedMode === 'non-switching' ? '#E3F2FF' : '#fff',
            }}
          >
            <input
              type="radio"
              name="mode"
              value="non-switching"
              checked={selectedMode === 'non-switching'}
              onChange={(e) => setSelectedMode(e.target.value as Mode)}
              style={{ marginRight: 12, width: 20, height: 20 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 18, color: 'black' }}>
                Non-Switching Mode
              </div>
              <div style={{ fontSize: 14, color: 'black', marginTop: 4 }}>
                Must watch videos completely, no seeking forward, can't switch
                between videos
              </div>
            </div>
          </label>

          {/* Switching Mode */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: 16,
              border: '2px solid',
              borderColor: selectedMode === 'switching' ? '#007AFF' : '#ddd',
              borderRadius: 12,
              cursor: 'pointer',
              background: selectedMode === 'switching' ? '#E3F2FF' : '#fff',
            }}
          >
            <input
              type="radio"
              name="mode"
              value="switching"
              checked={selectedMode === 'switching'}
              onChange={(e) => setSelectedMode(e.target.value as Mode)}
              style={{ marginRight: 12, width: 20, height: 20 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 18, color: 'black' }}>
                Switching Mode
              </div>
              <div style={{ fontSize: 14, color: 'black', marginTop: 4 }}>
                Full controls available, can switch between videos freely
              </div>
            </div>
          </label>
        </div>

        <Button onClick={handleStartPlayer} fullWidth size="large">
          Start Video Player
        </Button>
      </Card>
    </PageLayout>
  );
}
