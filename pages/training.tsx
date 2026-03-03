// Training session page - familiarizes participants with both modes
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { VideoPlayer, VideoGrid } from '@/components/video';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { TRAINING_VIDEOS } from '@/utils/constants';
import { Mode } from '@/types';

type Phase = 'intro-non-switching' | 'non-switching' | 'intro-switching' | 'switching' | 'complete';

const NON_SWITCHING_VIDEO_IDS = ['t1', 't2'];
const SWITCHING_VIDEO_IDS = ['t3', 't4'];

export default function TrainingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [phase, setPhase] = useState<Phase>('intro-non-switching');
  const [completed, setCompleted] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const activeMode: Mode = (phase === 'intro-switching' || phase === 'switching')
    ? 'switching'
    : 'non-switching';

  const videos = useMemo(() => {
    if (activeMode === 'non-switching') {
      return TRAINING_VIDEOS.filter(v => NON_SWITCHING_VIDEO_IDS.includes(v.id));
    }
    return TRAINING_VIDEOS.filter(v => SWITCHING_VIDEO_IDS.includes(v.id));
  }, [activeMode]);

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

  // Auto-transition when all videos in a phase are completed
  useEffect(() => {
    if (phase === 'non-switching') {
      const allDone = NON_SWITCHING_VIDEO_IDS.every(id => completed.includes(id));
      if (allDone) {
        setPhase('intro-switching');
        setCurrent(null);
      }
    } else if (phase === 'switching') {
      const allDone = SWITCHING_VIDEO_IDS.every(id => completed.includes(id));
      if (allDone) {
        setPhase('complete');
        setCurrent(null);
      }
    }
  }, [phase, completed, user]);

  const handleSelectVideo = (id: string) => {
    if (activeMode === 'non-switching' && current && current !== id) return;
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

  // No-ops for training (no tracking service)
  const noop = () => {};

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </PageLayout>
    );
  }

  // Intro screen for non-switching phase
  if (phase === 'intro-non-switching') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0 }}>Training Session</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Before the experiment begins, you'll practice with both video modes so you know what to expect.
          </p>
          <div style={{
            background: '#e3f2fd',
            border: '1px solid #2196F3',
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <h3 style={{ marginTop: 0, color: '#1565c0' }}>Phase 1: Non-Switching Mode</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#333', lineHeight: 1.8 }}>
              <li>You must watch each video completely before moving on</li>
              <li>No seeking or fast-forwarding allowed</li>
              <li>You cannot switch to another video while one is playing</li>
            </ul>
          </div>
          <Button onClick={() => setPhase('non-switching')} size="large">
            Start Non-Switching Training
          </Button>
        </Card>
      </PageLayout>
    );
  }

  // Intro screen for switching phase
  if (phase === 'intro-switching') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: '#4caf50' }}>
            Non-Switching Training Complete!
          </h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Now let's try the switching mode.
          </p>
          <div style={{
            background: '#e8f5e9',
            border: '1px solid #4caf50',
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <h3 style={{ marginTop: 0, color: '#2e7d32' }}>Phase 2: Switching Mode</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#333', lineHeight: 1.8 }}>
              <li>Full video controls are available (play, pause, seek)</li>
              <li>You can freely switch between videos at any time</li>
              <li>You can fast-forward or rewind within a video</li>
            </ul>
          </div>
          <Button onClick={() => setPhase('switching')} size="large">
            Start Switching Training
          </Button>
        </Card>
      </PageLayout>
    );
  }

  // Training complete
  if (phase === 'complete') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: '#4caf50' }}>
            Training Complete!
          </h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            You've practiced both modes. You're now ready for the experiment.
          </p>
          <Button onClick={() => router.push('/admin')} size="large">
            Continue to Settings
          </Button>
        </Card>
      </PageLayout>
    );
  }

  // Active training phase (non-switching or switching)
  const phaseLabel = activeMode === 'non-switching'
    ? 'Training: Non-Switching Mode'
    : 'Training: Switching Mode';

  const phaseCompleted = activeMode === 'non-switching'
    ? completed.filter(id => NON_SWITCHING_VIDEO_IDS.includes(id)).length
    : completed.filter(id => SWITCHING_VIDEO_IDS.includes(id)).length;

  const phaseTotal = activeMode === 'non-switching'
    ? NON_SWITCHING_VIDEO_IDS.length
    : SWITCHING_VIDEO_IDS.length;

  return (
    <PageLayout maxWidth={1400}>
      {/* Phase indicator */}
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
          background: activeMode === 'non-switching' ? '#e3f2fd' : '#e8f5e9',
          color: activeMode === 'non-switching' ? '#1565c0' : '#2e7d32',
          border: `1px solid ${activeMode === 'non-switching' ? '#2196F3' : '#4caf50'}`,
        }}>
          {phaseLabel} ({phaseCompleted}/{phaseTotal} videos)
        </span>
      </div>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VideoPlayer
            mode={activeMode}
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
          mode={activeMode}
          onSelectVideo={handleSelectVideo}
        />
      </main>
    </PageLayout>
  );
}
