// Video player page - Next.js
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { PageLayout, HamburgerMenu } from '@/components/layout';
import { VideoPlayer, VideoGrid } from '@/components/video';
import { useAuth } from '@/context/AuthContext';
import { useExperimentTheme } from '@/hooks/useExperimentTheme';
import { useSession } from '@/hooks/useSession';
import { GazeData } from '@/hooks/useWebGazer';
import { useWebGazerContext } from '@/context/WebGazerContext';
import { useGazeLogger } from '@/hooks/useGazeLogger';
import { trackingService } from '@/services/trackingService';
import { MOCK_VIDEOS } from '@/utils/constants';

export default function PlayerPage() {
  const router = useRouter();
  const { user, mode, isLoading } = useAuth();
  useExperimentTheme();
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

  // Log every raw gaze sample (x, y) per participant.
  const { logSample, saveAndClearSamples } = useGazeLogger({
    participantId: user?.participantId,
  });

  // Latest video being watched, read inside the (stable) gaze handler so each
  // sample is tagged with the current videoId ('' when nothing is playing).
  const currentVideoIdRef = useRef<string | null>(null);

  // WebGazer eye tracking integration (single persistent instance via context)
  const handleGazeUpdate = useCallback((data: GazeData) => {
    logSample(data, currentVideoIdRef.current ?? '');
  }, [logSample]);

  const {
    start: startWebGazer,
    resume: resumeWebGazer,
    pause: pauseWebGazer,
    setGazeListener,
    isReady: webgazerReady,
  } = useWebGazerContext();

  // Ensure WebGazer is initialized (idempotent — usually already started during
  // calibration; needed if the player is reached/reloaded without calibrating).
  useEffect(() => {
    startWebGazer(cameraDeviceId);
  }, [startWebGazer, cameraDeviceId]);

  // Route gaze samples to the logger and resume tracking while on this page;
  // pause and detach on unmount (e.g. navigating back to /admin).
  useEffect(() => {
    setGazeListener(handleGazeUpdate);
    if (webgazerReady) resumeWebGazer();
    return () => {
      setGazeListener(null);
      pauseWebGazer();
    };
  }, [webgazerReady, handleGazeUpdate, setGazeListener, resumeWebGazer, pauseWebGazer]);

  // Flush any buffered gaze samples when leaving the page (navigation or tab
  // close), so data isn't lost if a video wasn't finished.
  useEffect(() => {
    const onBeforeUnload = () => saveAndClearSamples(true); // keepalive during unload
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      saveAndClearSamples();
    };
  }, [saveAndClearSamples]);

  const { videoSet } = useAuth();
  const videos = useMemo(() => {
    return MOCK_VIDEOS.filter(v => v.set === videoSet);
  }, [videoSet]);

  const sessionAllComplete = videos.length > 0 && completed.length >= videos.length;
  const sessionNumber = user ? (localStorage.getItem(`session_number_${user.participantId}`) === '2' ? 2 : 1) : 1;
  const isLastSession = sessionNumber === 2;
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

  // Keep the current videoId available to the (stable) gaze handler.
  currentVideoIdRef.current = current;

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

    saveAndClearSamples();
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
          <h1 style={{ color: '#4caf50' }}>Session {sessionNumber} Complete!</h1>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>
            You've watched all videos for this session.
          </p>
          {isLastSession ? (
            <p style={{ fontSize: 16, color: '#333' }}>
              The experiment is complete. Thank you for participating!
            </p>
          ) : (
            <button
              onClick={() => {
                if (user) {
                  localStorage.setItem(`session_number_${user.participantId}`, '2');
                }
                router.push('/admin');
              }}
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
              Continue to Session 2
            </button>
          )}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth={1400}>
      <HamburgerMenu />

      {/* {isRecording && (
        <button
          onClick={stopRecording}
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            padding: '8px 16px',
            background: '#f44336',
            opacity: 0.1,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            zIndex: 1000,
            fontSize: 14,
          }}
        >
          ⏹ Stop Recording
        </button>
      )} */}

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
