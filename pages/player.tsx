// Video player page - Next.js
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { PageLayout, HamburgerMenu } from '@/components/layout';
import { VideoPlayer, VideoGrid } from '@/components/video';
import { useAuth } from '@/context/AuthContext';
import { useExperimentTheme } from '@/hooks/useExperimentTheme';
import { useSession } from '@/hooks/useSession';
import { useWebGazerContext } from '@/context/WebGazerContext';
import { usePhaseLog } from '@/hooks/usePhaseLog';
import { useConfirmedLogout } from '@/hooks/useConfirmedLogout';
import { trackingService } from '@/services/trackingService';
import { readDisplay, getCalibrationDisplay, describeDisplayChange } from '@/utils/displayInfo';
import { MOCK_VIDEOS } from '@/utils/constants';
import { postControl, useControlMessages } from '@/utils/controlChannel';

export default function PlayerPage() {
  const router = useRouter();
  const { user, mode, isLoading } = useAuth();
  const confirmLogout = useConfirmedLogout();
  useExperimentTheme();

  // Block the right-click menu while on the player — the video's native menu
  // offers loop, speed, picture-in-picture and download, any of which would
  // bypass the experiment's playback rules.
  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, []);

  // Display geometry: log it when the experiment starts and on every resize
  // (zoom, leaving fullscreen, display change), and flag a mismatch with the
  // calibration so the researcher can see gaze coordinates may be offset.
  const [displayWarning, setDisplayWarning] = useState<string | null>(null);
  const loggedExperimentDisplayRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    const evaluate = () => {
      const current = readDisplay();
      const calibration = getCalibrationDisplay();
      if (!calibration) {
        setDisplayWarning('Not calibrated in this tab');
      } else {
        const changes = describeDisplayChange(calibration, current);
        setDisplayWarning(changes.length ? 'Display changed since calibration' : null);
      }
      return current;
    };

    if (!loggedExperimentDisplayRef.current) {
      loggedExperimentDisplayRef.current = true;
      trackingService.logDisplay('experiment', evaluate());
    }

    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      // a resize fires many events; log once it settles
      timer = window.setTimeout(() => trackingService.logDisplay('change', evaluate()), 500);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer);
    };
  }, [user]);
  const {
    completed,
    current,
    setCurrent,
    markCompleted,
    updatePlaybackPosition,
    getPlaybackPosition,
  } = useSession(mode);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);

  // Read saved camera selection from the EEG page
  const cameraDeviceId = typeof window !== 'undefined'
    ? localStorage.getItem('selected_camera_device_id') || undefined
    : undefined;

  const {
    start: startWebGazer,
    resume: resumeWebGazer,
    pause: pauseWebGazer,
    isReady: webgazerReady,
    startGazeLogging,
    flushGaze,
    setGazeVideoId,
  } = useWebGazerContext();

  // Ensure WebGazer is initialized (idempotent — usually already started during
  // calibration; needed if the player is reached/reloaded without calibrating).
  useEffect(() => {
    startWebGazer(cameraDeviceId);
  }, [startWebGazer, cameraDeviceId]);

  // Route gaze samples to the logger and resume tracking while on this page;
  // pause and detach on unmount (e.g. navigating back to /admin).
  useEffect(() => {
    // Gaze is logged by the WebGazer context, tagged "experiment" here. Normally
    // already running since calibration; this also covers a skipped
    // calibration, so experiment gaze is never missed.
    startGazeLogging();
    if (webgazerReady) resumeWebGazer();
    return () => {
      pauseWebGazer(); // no-op while logging, which continues until logout
    };
  }, [webgazerReady, startGazeLogging, resumeWebGazer, pauseWebGazer]);

  const { videoSet } = useAuth();
  const videos = useMemo(() => {
    return MOCK_VIDEOS.filter(v => v.set === videoSet);
  }, [videoSet]);

  const sessionAllComplete = videos.length > 0 && completed.length >= videos.length;

  // Whole experiment-block span, alongside the per-video VideoSession rows.
  const { startPhase, endPhase } = usePhaseLog('experiment');
  useEffect(() => {
    if (user) startPhase();
  }, [user, startPhase]);
  useEffect(() => {
    if (sessionAllComplete) endPhase();
  }, [sessionAllComplete, endPhase]);
  const currentVideo = useMemo(
    () => videos.find((v) => v.id === current) ?? null,
    [videos, current]
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Tag gaze samples with the video on screen ('' when nothing is playing).
  useEffect(() => {
    setGazeVideoId(current);
  }, [current, setGazeVideoId]);
  useEffect(() => () => setGazeVideoId(null), [setGazeVideoId]);

  // Recording is started on the EEG page and stopped on leaving this page by
  // RecordingProvider, so the player no longer manages the recorder directly.

  const handleSelectVideo = async (id: string) => {
    // Block clicking other videos in non-switching mode while something is playing
    if (mode === 'non_switching' && current && current !== id) return;

    if (completed.includes(id)) return; // never allow rewatch

    const previousVideo = current;

    // Start new session for the selected video
    try {
      const sessionId = await trackingService.startSession(id);
      setCurrentSessionId(sessionId);

      // Track switch event if switching from another video
      if (previousVideo && previousVideo !== id && mode === 'switching') {
        trackingService.trackSwitch(
          sessionId,
          previousVideo,
          id,
          getPlaybackPosition(previousVideo)
        );
      }

      setCurrent(id);
    } catch (error) {
      console.error('Failed to start session:', error);
      // Still allow video to play even if tracking fails
      setCurrent(id);
    }
  };

  // Control panel: force-select a video (same rules as a participant click)
  // and report player state whenever it changes or the panel asks.
  const sendPlayerStatus = () =>
    postControl({ type: 'playerStatus', current, completed, videos, displayWarning });
  useEffect(sendPlayerStatus, [current, completed, videos, displayWarning]);
  useControlMessages((msg) => {
    if (msg.type === 'select') handleSelectVideo(msg.id);
    if (msg.type === 'ping') sendPlayerStatus();
  });

  const handleVideoEnded = () => {
    if (!currentVideo) return;

    // Track completion via tracking service (if session exists)
    if (currentSessionId) {
      trackingService.trackComplete(
        currentSessionId,
        getPlaybackPosition(currentVideo.id)
      );
      trackingService.completeSession(currentSessionId).catch(console.error);
    }

    markCompleted(currentVideo.id);
    updatePlaybackPosition(currentVideo.id, 0);
    setCurrent(null);
    setCurrentSessionId(null);

    flushGaze();
  };

  const handlePlay = (position: number) => {
    if (currentSessionId) {
      trackingService.trackPlay(currentSessionId, position);
      if (pauseStartTime !== null) {
        setPauseStartTime(null);
      }
    }
  };

  const handlePause = (_position: number) => {
    if (currentSessionId) {
      setPauseStartTime(Date.now());
    }
  };

  const handlePauseEnd = (position: number) => {
    if (currentSessionId && pauseStartTime) {
      const pauseDuration = (Date.now() - pauseStartTime) / 1000;
      trackingService.trackPause(currentSessionId, pauseDuration, position);
      setPauseStartTime(null);
    }
  };

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </PageLayout>
    );
  }

  // Session complete screen
  if (sessionAllComplete) {
    return (
      <PageLayout maxWidth={600} style={{ marginTop: 80 }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#4caf50' }}>Session Complete!</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>
            You've watched all videos for this session.
          </p>
          <p style={{ fontSize: 16, color: '#ffffff', marginBottom: 24 }}>
            The experiment is complete. Thank you for participating!
          </p>
          <button
            onClick={() => confirmLogout()}
            style={{
              padding: '14px 32px',
              fontSize: 18,
              fontWeight: 600,
              background: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            Log Out
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth={1400}>
      <HamburgerMenu />

      {/* Deliberately muted: on the mirrored setup the child sees this too. */}
      {displayWarning && (
        <div
          style={{
            position: 'fixed',
            bottom: 8,
            left: 8,
            fontSize: 11,
            color: '#ff9800',
            opacity: 0.6,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          ⚠ {displayWarning}
        </div>
      )}

      <main
        style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 32 }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VideoPlayer
            mode={mode}
            video={currentVideo}
            onEnded={handleVideoEnded}
            onPlay={handlePlay}
            onPause={handlePause}
            onPauseEnd={handlePauseEnd}
            updatePlaybackPosition={updatePlaybackPosition}
            getPlaybackPosition={getPlaybackPosition}
          />
        </div>

        <VideoGrid
          videos={videos}
          completed={completed}
          current={current}
          mode={mode}
          onSelectVideo={handleSelectVideo}
        />
      </main>
    </PageLayout>
  );
}
