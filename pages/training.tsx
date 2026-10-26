// Training session page — short (one phase) or full (three phases), per user.trainingType
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { VideoPlayer, VideoGrid } from '@/components/video';
import { Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useExperimentTheme } from '@/hooks/useExperimentTheme';
import { useWebGazerContext } from '@/context/WebGazerContext';
import { usePhaseLog } from '@/hooks/usePhaseLog';
import { useControlActions } from '@/utils/controlChannel';
import {
  TRAINING_VIDEOS_PHASE_2,
  TRAINING_VIDEOS_PHASE_3,
  TRAINING_VIDEOS_ONE_MIN_A,
  TRAINING_VIDEOS_ONE_MIN_B,
} from '@/utils/constants';
import { Mode, TrainingType, Video } from '@/types';

const TRAINING_PHASES: number = 1;

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

  const trainingType =
    (router.query.trainingType as TrainingType | undefined) ??
    user.trainingType ??
    'full';

  return trainingType === 'short' ? <TrainingShort /> : <TrainingFull />;
}

function TrainingShort() {
  const router = useRouter();
  const { videoSet } = useAuth();
  const trainingMode = (router.query.mode as Mode) || 'non_switching';

  type Phase = 'intro' | 'playing' | 'complete';
  const [phase, setPhase] = useState<Phase>('intro');

  // Whole-training span: arriving here through reaching the completion screen.
  const { startPhase, endPhase } = usePhaseLog('training');
  useEffect(() => {
    startPhase();
  }, [startPhase]);
  useEffect(() => {
    if (phase === 'complete') endPhase();
  }, [phase, endPhase]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  useTrainingGaze(current);
  const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});

  // 1-min videos of the participant's assigned experiment set.
  const videos = videoSet === 'B' ? TRAINING_VIDEOS_ONE_MIN_B : TRAINING_VIDEOS_ONE_MIN_A;

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

  const forceSkip = () => {
    setPhase('complete');
    setCurrent(null);
  };
  useControlActions(
    phase === 'intro'
      ? [{ id: 'start', label: 'Start Training', run: () => setPhase('playing') }]
      : phase === 'playing'
      ? [{ id: 'skip', label: 'Skip to next step', variant: 'warning', run: forceSkip }]
      : [{ id: 'experiment', label: 'Start Experiment', run: () => router.push('/player') }],
    phase === 'playing' ? [`${completed.length} / ${videos.length} videos watched`] : []
  );

  if (phase === 'intro') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0, color: '#333' }}>Training</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Before the experiment begins, you'll practice with the {isSwitching ? 'switching' : 'non-switching'} mode so you know what to expect.
          </p>
          <ModeBlurb isSwitching={isSwitching} />
        </Card>
      </PageLayout>
    );
  }

  if (phase === 'complete') {
    return <TrainingCompleteCard />;
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
      updatePlaybackPosition={updatePlaybackPosition}
      getPlaybackPosition={getPlaybackPosition}
    />
  );
}

function TrainingFull() {
  const router = useRouter();
  const { videoSet } = useAuth();
  const trainingMode = (router.query.mode as Mode) || 'non_switching';

  // Phase 1 uses the 1-min videos of the participant's assigned experiment set.
  const phase1Videos = videoSet === 'B' ? TRAINING_VIDEOS_ONE_MIN_B : TRAINING_VIDEOS_ONE_MIN_A;

  type Phase =
    | 'intro1' | 'playing1'
    | 'intro2' | 'playing2'
    | 'intro3' | 'playing3'
    | 'complete';

  const [phase, setPhase] = useState<Phase>('intro1');

  // Whole-training span: arriving here through reaching the completion screen.
  const { startPhase, endPhase } = usePhaseLog('training');
  useEffect(() => {
    startPhase();
  }, [startPhase]);
  useEffect(() => {
    if (phase === 'complete') endPhase();
  }, [phase, endPhase]);
  const [completed1, setCompleted1] = useState<string[]>([]);
  const [completed2, setCompleted2] = useState<string[]>([]);
  const [completed3, setCompleted3] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  useTrainingGaze(current);
  const [playbackPositions, setPlaybackPositions] = useState<Record<string, number>>({});

  const phaseVideos =
    phase === 'intro1' || phase === 'playing1' ? phase1Videos :
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
    if (phase === 'playing1' && phase1Videos.every(v => completed1.includes(v.id))) {
      setPhase(TRAINING_PHASES >= 2 ? 'intro2' : 'complete');
      setCurrent(null);
      setPlaybackPositions({});
    } else if (phase === 'playing2' && TRAINING_VIDEOS_PHASE_2.every(v => completed2.includes(v.id))) {
      setPhase(TRAINING_PHASES >= 3 ? 'intro3' : 'complete');
      setCurrent(null);
      setPlaybackPositions({});
    } else if (phase === 'playing3' && TRAINING_VIDEOS_PHASE_3.every(v => completed3.includes(v.id))) {
      setPhase('complete');
      setCurrent(null);
    }
  }, [phase, completed1, completed2, completed3]);

  const isSwitching = trainingMode === 'switching';

  const forceSkip = () => {
    if (phase === 'playing1') { setPhase(TRAINING_PHASES >= 2 ? 'intro2' : 'complete'); setPlaybackPositions({}); }
    else if (phase === 'playing2') { setPhase(TRAINING_PHASES >= 3 ? 'intro3' : 'complete'); setPlaybackPositions({}); }
    else if (phase === 'playing3') { setPhase('complete'); }
    setCurrent(null);
  };
  const introNumber = phase === 'intro1' ? 1 : phase === 'intro2' ? 2 : phase === 'intro3' ? 3 : null;
  useControlActions(
    introNumber !== null
      ? [{ id: 'start', label: `Start Training ${introNumber}`, run: () => setPhase(`playing${introNumber}` as Phase) }]
      : phase === 'complete'
      ? [{ id: 'experiment', label: 'Start Experiment', run: () => router.push('/player') }]
      : [{ id: 'skip', label: 'Skip to next step', variant: 'warning', run: forceSkip }],
    phase.startsWith('playing') ? [`${completed.length} / ${phaseVideos.length} videos watched`] : []
  );

  if (phase === 'intro1') {
    return (
      <PageLayout maxWidth={700}>
        <Card style={{ marginTop: 48, textAlign: 'center' }}>
          <h1 style={{ marginTop: 0, color: '#333' }}>Training 1 of {TRAINING_PHASES}</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
            Before the experiment begins, you'll practice with the {isSwitching ? 'switching' : 'non-switching'} mode so you know what to expect.
          </p>
          <ModeBlurb isSwitching={isSwitching} />
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
        </Card>
      </PageLayout>
    );
  }

  if (phase === 'complete') {
    return <TrainingCompleteCard message={TRAINING_PHASES > 1 ? "You've completed all three training sessions. You're now ready for the experiment." : "You've completed training. You're now ready for the experiment."} />;
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
      updatePlaybackPosition={updatePlaybackPosition}
      getPlaybackPosition={getPlaybackPosition}
    />
  );
}

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

// Gaze itself is logged continuously by the WebGazer context (tagged
// "training" on this page); this just tells it which training video is on
// screen so each sample carries the right videoId.
function useTrainingGaze(currentVideoId: string | null) {
  const { setGazeVideoId } = useWebGazerContext();

  useEffect(() => {
    setGazeVideoId(currentVideoId);
  }, [currentVideoId, setGazeVideoId]);

  useEffect(() => () => setGazeVideoId(null), [setGazeVideoId]);
}

function TrainingCompleteCard({ message }: { message?: string }) {
  return (
    <PageLayout maxWidth={700}>
      <Card style={{ marginTop: 48, textAlign: 'center' }}>
        <h2 style={{ marginTop: 0, color: '#4caf50' }}>Training Complete!</h2>
        <p style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
          {message ?? "You're now ready for the experiment."}
        </p>
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
  updatePlaybackPosition: (id: string, position: number) => void;
  getPlaybackPosition: (id: string) => number;
}

function PlayingView({
  phaseLabel, isSwitching, videos, completed, current, currentVideo, trainingMode,
  onSelectVideo, onVideoEnded, updatePlaybackPosition, getPlaybackPosition,
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
      </div>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VideoPlayer
            mode={trainingMode}
            video={currentVideo}
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
