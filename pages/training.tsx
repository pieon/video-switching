// Training session page — short (one phase) or full (three phases), per user.trainingType
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { VideoPlayer, VideoGrid } from '@/components/video';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useExperimentTheme } from '@/hooks/useExperimentTheme';
import {
  TRAINING_VIDEOS_SHORT,
  TRAINING_VIDEOS_PHASE_1,
  TRAINING_VIDEOS_PHASE_2,
  TRAINING_VIDEOS_PHASE_3,
} from '@/utils/constants';
import { Mode, TrainingType, Video } from '@/types';

export default function TrainingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  useExperimentTheme();

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

  // Prefer URL param (set by admin.tsx) over the user record so a researcher
  // can override per-run if needed; fall back to the user's assigned type.
  const trainingType =
    (router.query.trainingType as TrainingType | undefined) ??
    user.trainingType ??
    'full';

  return trainingType === 'short' ? <TrainingShort /> : <TrainingFull />;
}

// ---------------------------------------------------------------------------
// Short training — single phase
// ---------------------------------------------------------------------------
function TrainingShort() {
  const router = useRouter();
  const trainingMode = (router.query.mode as Mode) || 'non_switching';

  type Phase = 'intro' | 'playing' | 'complete';
  const [phase, setPhase] = useState<Phase>('intro');
  const [completed, setCompleted] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});

  const videos = TRAINING_VIDEOS_SHORT;

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

  useEffect(() => {
    if (phase === 'playing' && videos.every(v => completed.includes(v.id))) {
      setPhase('complete');
      setCurrent(null);
    }
  }, [phase, completed, videos]);

  const isSwitching = trainingMode === 'switching';

  if (phase === 'intro') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0, color: '#333' }}>Training</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Before the experiment begins, you'll practice with the {isSwitching ? 'switching' : 'non-switching'} mode so you know what to expect.
          </p>
          <ModeBlurb isSwitching={isSwitching} />
          <Button onClick={() => setPhase('playing')} size="large">
            Start Training
          </Button>
        </Card>
      </PageLayout>
    );
  }

  if (phase === 'complete') {
    return <TrainingCompleteCard onContinue={() => router.push('/player')} />;
  }

  return (
    <PlayingView
      phaseLabel={`Training: ${isSwitching ? 'Switching' : 'Non-Switching'} Mode`}
      isSwitching={isSwitching}
      videos={videos}
      completed={completed}
      current={current}
      currentVideo={currentVideo}
      trainingMode={trainingMode}
      onSelectVideo={(id) => {
        if (trainingMode === 'non_switching' && current && current !== id) return;
        if (completed.includes(id)) return;
        setCurrent(id);
      }}
      onVideoEnded={() => {
        if (currentVideo) {
          setCompleted(prev => [...prev, currentVideo.id]);
          setPlaybackPositions(prev => ({ ...prev, [currentVideo.id]: 0 }));
          setCurrent(null);
        }
      }}
      onForceSkip={() => {
        setPhase('complete');
        setCurrent(null);
      }}
      updatePlaybackPosition={updatePlaybackPosition}
      getPlaybackPosition={getPlaybackPosition}
    />
  );
}

// ---------------------------------------------------------------------------
// Full training — three phases
// ---------------------------------------------------------------------------
function TrainingFull() {
  const router = useRouter();
  const trainingMode = (router.query.mode as Mode) || 'non_switching';

  type Phase =
    | 'intro1' | 'playing1'
    | 'intro2' | 'playing2'
    | 'intro3' | 'playing3'
    | 'complete';

  const [phase, setPhase] = useState<Phase>('intro1');
  const [completed1, setCompleted1] = useState<string[]>([]);
  const [completed2, setCompleted2] = useState<string[]>([]);
  const [completed3, setCompleted3] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});

  const phaseVideos =
    phase === 'intro1' || phase === 'playing1' ? TRAINING_VIDEOS_PHASE_1 :
    phase === 'intro2' || phase === 'playing2' ? TRAINING_VIDEOS_PHASE_2 :
    TRAINING_VIDEOS_PHASE_3;

  const completed =
    phase === 'intro1' || phase === 'playing1' ? completed1 :
    phase === 'intro2' || phase === 'playing2' ? completed2 :
    completed3;

  const setCompleted =
    phase === 'intro1' || phase === 'playing1' ? setCompleted1 :
    phase === 'intro2' || phase === 'playing2' ? setCompleted2 :
    setCompleted3;

  const currentVideo = useMemo(
    () => phaseVideos.find(v => v.id === current) ?? null,
    [phaseVideos, current]
  );

  const updatePlaybackPosition = useCallback((videoId: string, position: number) => {
    setPlaybackPositions(prev => ({ ...prev, [videoId]: position }));
  }, []);

  const getPlaybackPosition = useCallback((videoId: string) => {
    return playbackPositions[videoId] || 0;
  }, [playbackPositions]);

  useEffect(() => {
    if (phase === 'playing1' && TRAINING_VIDEOS_PHASE_1.every(v => completed1.includes(v.id))) {
      setPhase('intro2');
      setCurrent(null);
      setPlaybackPositions({});
    } else if (phase === 'playing2' && TRAINING_VIDEOS_PHASE_2.every(v => completed2.includes(v.id))) {
      setPhase('intro3');
      setCurrent(null);
      setPlaybackPositions({});
    } else if (phase === 'playing3' && TRAINING_VIDEOS_PHASE_3.every(v => completed3.includes(v.id))) {
      setPhase('complete');
      setCurrent(null);
    }
  }, [phase, completed1, completed2, completed3]);

  const isSwitching = trainingMode === 'switching';

  if (phase === 'intro1') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0, color: '#333' }}>Training 1 of 3</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Before the experiment begins, you'll practice with the {isSwitching ? 'switching' : 'non-switching'} mode so you know what to expect.
          </p>
          <ModeBlurb isSwitching={isSwitching} />
          <Button onClick={() => setPhase('playing1')} size="large">
            Start Training 1
          </Button>
        </Card>
      </PageLayout>
    );
  }

  if (phase === 'intro2') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0, color: '#333' }}>Training 2 of 3</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Now you'll practice with shorter clips of the same videos.
          </p>
          <Button onClick={() => setPhase('playing2')} size="large">
            Start Training 2
          </Button>
        </Card>
      </PageLayout>
    );
  }

  if (phase === 'intro3') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0, color: '#333' }}>Training 3 of 3</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Now you'll practice with a different set of videos before the experiment.
          </p>
          <Button onClick={() => setPhase('playing3')} size="large">
            Start Training 3
          </Button>
        </Card>
      </PageLayout>
    );
  }

  if (phase === 'complete') {
    return <TrainingCompleteCard onContinue={() => router.push('/player')} message="You've completed all three training sessions. You're now ready for the experiment." />;
  }

  const trainingNumber = phase === 'playing3' ? 3 : phase === 'playing2' ? 2 : 1;

  return (
    <PlayingView
      phaseLabel={`Training ${trainingNumber}: ${isSwitching ? 'Switching' : 'Non-Switching'} Mode`}
      isSwitching={isSwitching}
      videos={phaseVideos}
      completed={completed}
      current={current}
      currentVideo={currentVideo}
      trainingMode={trainingMode}
      onSelectVideo={(id) => {
        if (trainingMode === 'non_switching' && current && current !== id) return;
        if (completed.includes(id)) return;
        setCurrent(id);
      }}
      onVideoEnded={() => {
        if (currentVideo) {
          setCompleted(prev => [...prev, currentVideo.id]);
          setPlaybackPositions(prev => ({ ...prev, [currentVideo.id]: 0 }));
          setCurrent(null);
        }
      }}
      onForceSkip={() => {
        if (phase === 'playing1') { setPhase('intro2'); setPlaybackPositions({}); }
        else if (phase === 'playing2') { setPhase('intro3'); setPlaybackPositions({}); }
        else if (phase === 'playing3') { setPhase('complete'); }
        setCurrent(null);
      }}
      updatePlaybackPosition={updatePlaybackPosition}
      getPlaybackPosition={getPlaybackPosition}
    />
  );
}

// ---------------------------------------------------------------------------
// Shared UI bits
// ---------------------------------------------------------------------------
function ModeBlurb({ isSwitching }: { isSwitching: boolean }) {
  return (
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
  );
}

function TrainingCompleteCard({ onContinue, message }: { onContinue: () => void; message?: string }) {
  return (
    <PageLayout maxWidth={700}>
      <Card style={{ marginTop: 48, textAlign: 'center' }}>
        <h2 style={{ marginTop: 0, color: '#4caf50' }}>Training Complete!</h2>
        <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
          {message ?? "You're now ready for the experiment."}
        </p>
        <Button onClick={onContinue} size="large">Start Experiment</Button>
      </Card>
    </PageLayout>
  );
}

interface PlayingViewProps {
  phaseLabel: string;
  isSwitching: boolean;
  videos: Video[];
  completed: string[];
  current: string | null;
  currentVideo: Video | null;
  trainingMode: Mode;
  onSelectVideo: (id: string) => void;
  onVideoEnded: () => void;
  onForceSkip: () => void;
  updatePlaybackPosition: (id: string, position: number) => void;
  getPlaybackPosition: (id: string) => number;
}

function PlayingView({
  phaseLabel, isSwitching, videos, completed, current, currentVideo, trainingMode,
  onSelectVideo, onVideoEnded, onForceSkip, updatePlaybackPosition, getPlaybackPosition,
}: PlayingViewProps) {
  const noop = () => {};
  return (
    <PageLayout maxWidth={1400}>
      <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 8 }}>
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
          onClick={onForceSkip}
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
            onEnded={onVideoEnded}
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
          onSelectVideo={onSelectVideo}
        />
      </main>
    </PageLayout>
  );
}
