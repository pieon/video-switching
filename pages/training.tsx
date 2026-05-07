// Training session page - single training run before the experiment
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { VideoPlayer, VideoGrid } from '@/components/video';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useExperimentTheme } from '@/hooks/useExperimentTheme';
import { TRAINING_VIDEOS } from '@/utils/constants';
import { Mode } from '@/types';

type Phase = 'intro' | 'playing' | 'complete';

export default function TrainingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useExperimentTheme();

  const trainingMode = (router.query.mode as Mode) || 'non_switching';

  const [phase, setPhase] = useState<Phase>('intro');
  const [completed, setCompleted] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const videos = TRAINING_VIDEOS;

  const currentVideo = useMemo(
    () => videos.find(v => v.id === current) ?? null,
    [videos, current]
  );

  const updatePlaybackPosition = useCallback((videoId: string, position: number) => {
    setPlaybackPositions(prev => ({ ...prev, [videoId]: position }));
  }, []);

  const getPlaybackPosition = useCallback((videoId: string) => {
    return playbackPositions[videoId] || 0;
  }, [playbackPositions]);

  // Auto-advance when all training videos are completed
  useEffect(() => {
    if (phase === 'playing' && videos.every(v => completed.includes(v.id))) {
      setPhase('complete');
      setCurrent(null);
    }
  }, [phase, completed, videos]);

  const handleSelectVideo = (id: string) => {
    if (trainingMode === 'non_switching' && current && current !== id) return;
    if (completed.includes(id)) return;
    setCurrent(id);
  };

  const handleVideoEnded = () => {
    if (currentVideo) {
      setCompleted(prev => [...prev, currentVideo.id]);
      setPlaybackPositions(prev => ({ ...prev, [currentVideo.id]: 0 }));
      setCurrent(null);
    }
  };

  const handleForceSkip = () => {
    setPhase('complete');
    setCurrent(null);
  };

  const noop = () => {};

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </PageLayout>
    );
  }

  const isSwitching = trainingMode === 'switching';

  if (phase === 'intro') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0, color: '#333' }}>Training</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Before the experiment begins, you'll practice with the {isSwitching ? 'switching' : 'non-switching'} mode so you know what to expect.
          </p>
          <div style={{
            background: isSwitching ? '#e8f5e9' : '#e3f2fd',
            border: `1px solid ${isSwitching ? '#4caf50' : '#2196F3'}`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <h3 style={{ marginTop: 0, color: isSwitching ? '#2e7d32' : '#1565c0' }}>
              {isSwitching ? 'Switching Mode' : 'Non-Switching Mode'}
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#333', lineHeight: 1.8 }}>
              {isSwitching ? (
                <>
                  <li>Full video controls are available (play, pause, seek)</li>
                  <li>You can freely switch between videos at any time</li>
                  <li>You can fast-forward or rewind within a video</li>
                </>
              ) : (
                <>
                  <li>You must watch each video completely before moving on</li>
                  <li>No seeking or fast-forwarding allowed</li>
                  <li>You cannot switch to another video while one is playing</li>
                </>
              )}
            </ul>
          </div>
          <Button onClick={() => setPhase('playing')} size="large">
            Start Training
          </Button>
        </Card>
      </PageLayout>
    );
  }

  if (phase === 'complete') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: '#4caf50' }}>
            Training Complete!
          </h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            You're now ready for the experiment.
          </p>
          <Button onClick={() => router.push('/player')} size="large">
            Start Experiment
          </Button>
        </Card>
      </PageLayout>
    );
  }

  // Active training (phase === 'playing')
  const phaseLabel = `Training: ${isSwitching ? 'Switching' : 'Non-Switching'} Mode`;

  return (
    <PageLayout maxWidth={1400}>
      <div style={{
        textAlign: 'center',
        padding: '12px 0',
        marginBottom: 8,
      }}>
        <span style={{
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: 20,
          fontSize: 14,
          fontWeight: 600,
          background: isSwitching ? '#e8f5e9' : '#e3f2fd',
          color: isSwitching ? '#2e7d32' : '#1565c0',
          border: `1px solid ${isSwitching ? '#4caf50' : '#2196F3'}`,
        }}>
          {phaseLabel}
        </span>
        <button
          onClick={handleForceSkip}
          style={{
            marginLeft: 12,
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            background: 'transparent',
            color: '#fff',
            border: '1px solid #888',
            cursor: 'pointer',
          }}
        >
          Skip to next step →
        </button>
      </div>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VideoPlayer
            mode={trainingMode}
            video={currentVideo}
            sessionId={null}
            onEnded={handleVideoEnded}
            onPlay={noop}
            onPause={noop}
            onPauseEnd={noop}
            updatePlaybackPosition={updatePlaybackPosition}
            getPlaybackPosition={getPlaybackPosition}
          />
        </div>

        <VideoGrid
          videos={videos}
          completed={completed}
          current={current}
          mode={trainingMode}
          onSelectVideo={handleSelectVideo}
        />
      </main>
    </PageLayout>
  );
}
