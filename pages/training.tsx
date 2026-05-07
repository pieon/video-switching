// Training session page - two back-to-back trainings before the experiment
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { VideoPlayer, VideoGrid } from '@/components/video';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useExperimentTheme } from '@/hooks/useExperimentTheme';
import { TRAINING_VIDEOS_1, TRAINING_VIDEOS_2, MOCK_VIDEOS } from '@/utils/constants';
import { Mode, VideoSet, TrainingGroup } from '@/types';

type Phase = 'intro1' | 'playing1' | 'intro2' | 'playing2' | 'complete';

export default function TrainingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useExperimentTheme();

  const trainingMode = (router.query.mode as Mode) || 'non_switching';
  const sessionSet = (router.query.set as VideoSet) || 'A';
  const trainingGroup = (router.query.group as TrainingGroup) || '1';

  const [phase, setPhase] = useState<Phase>('intro1');
  const [completed1, setCompleted1] = useState<string[]>([]);
  const [completed2, setCompleted2] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const training1Videos = TRAINING_VIDEOS_1;
  const training2Videos = useMemo(
    () => (trainingGroup === '1' ? TRAINING_VIDEOS_2 : MOCK_VIDEOS.filter(v => v.set === sessionSet)),
    [trainingGroup, sessionSet]
  );

  const isPhase2 = phase === 'intro2' || phase === 'playing2';
  const videos = isPhase2 ? training2Videos : training1Videos;
  const completed = isPhase2 ? completed2 : completed1;
  const setCompleted = isPhase2 ? setCompleted2 : setCompleted1;
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

  // Auto-advance Training 1 → intro2, and Training 2 → complete
  useEffect(() => {
    if (phase === 'playing1') {
      const allDone = training1Videos.every(v => completed1.includes(v.id));
      if (allDone) {
        setPhase('intro2');
        setCurrent(null);
        // Clear playback positions so Group 1's repeated videos start fresh in Training 2
        setPlaybackPositions({});
      }
    } else if (phase === 'playing2') {
      const allDone = training2Videos.every(v => completed2.includes(v.id));
      if (allDone) {
        setPhase('complete');
        setCurrent(null);
      }
    }
  }, [phase, completed1, completed2, training1Videos, training2Videos]);

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
    if (phase === 'playing1') {
      setPhase('intro2');
      setCurrent(null);
      setPlaybackPositions({});
    } else if (phase === 'playing2') {
      setPhase('complete');
      setCurrent(null);
    }
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

  // Intro 1 — first training
  if (phase === 'intro1') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0, color: '#333' }}>Training 1 of 2</h1>
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
          <Button onClick={() => setPhase('playing1')} size="large">
            Start Training 1
          </Button>
        </Card>
      </PageLayout>
    );
  }

  // Intro 2 — second training transition
  if (phase === 'intro2') {
    const group2Text = `You will now practice with the videos you will see in the experiment.`;
    const group1Text = `You will now practice again with the same videos.`;
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0, color: '#333' }}>Training 2 of 2</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            {trainingGroup === '2' ? group2Text : group1Text}
          </p>
          <Button onClick={() => setPhase('playing2')} size="large">
            Start Training 2
          </Button>
        </Card>
      </PageLayout>
    );
  }

  // Complete — go to experiment
  if (phase === 'complete') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: '#4caf50' }}>
            Training Complete!
          </h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            You've completed both training sessions. You're now ready for the experiment.
          </p>
          <Button onClick={() => router.push('/player')} size="large">
            Start Experiment
          </Button>
        </Card>
      </PageLayout>
    );
  }

  // Active training (playing1 or playing2)
  const trainingNumber = phase === 'playing2' ? 2 : 1;
  const phaseLabel = `Training ${trainingNumber}: ${isSwitching ? 'Switching' : 'Non-Switching'} Mode`;

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
