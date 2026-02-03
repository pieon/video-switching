// Video player page - Next.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { PageLayout, HamburgerMenu } from '@/components/layout';
import { VideoPlayer, VideoGrid } from '@/components/video';
import { useAuth } from '@/context/AuthContext';
import { useSession } from '@/hooks/useSession';
import { useWebGazer, GazeData } from '@/hooks/useWebGazer';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { trackingService } from '@/services/trackingService';
import { MOCK_VIDEOS } from '@/utils/constants';

export default function PlayerPage() {
  const router = useRouter();
  const { user, mode, isLoading } = useAuth();
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
  const [recordingStarted, setRecordingStarted] = useState(false);

  // Media recording for screen and webcam
  const {
    isRecording,
    startRecording,
    stopRecording,
  } = useMediaRecorder({
    participantId: user?.participantId,
  });

  // WebGazer eye tracking integration
  const handleGazeUpdate = useCallback((data: GazeData) => {
    // You can send gaze data to your tracking service here
    // For now, we'll just collect it
    if (currentSessionId) {
      // Optional: Send gaze data to server
      // trackingService.trackGaze(currentSessionId, data);
    }
  }, [currentSessionId]);

  const { isReady, isCalibrated, getGazeData, clearGazeData } = useWebGazer({
    onGazeUpdate: handleGazeUpdate,
    saveGazeData: true,
  });

  const videos = useMemo(() => {
    // Non-switching: videos 1-5, Switching: videos 6-10
    if (mode === 'non-switching') {
      return MOCK_VIDEOS.filter(v => ['1', '2', '3', '4', '5'].includes(v.id));
    }
    return MOCK_VIDEOS.filter(v => ['6', '7', '8', '9', '10'].includes(v.id));
  }, [mode]);
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

  // Auto-start recording on mount
  useEffect(() => {
    if (user && !recordingStarted && !isRecording) {
      setRecordingStarted(true);
      startRecording();
    }
  }, [user, recordingStarted, isRecording, startRecording]);

  // Stop recording when all videos are completed
  useEffect(() => {
    if (isRecording && videos.length > 0 && completed.length === videos.length) {
      stopRecording();
    }
  }, [isRecording, completed.length, videos.length, stopRecording]);

  const handleSelectVideo = async (id: string) => {
    // Block clicking other videos in non-switching mode while something is playing
    if (mode === 'non-switching' && current && current !== id) return;

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
    if (currentVideo && currentSessionId) {
      // Get and log gaze data
      const gazeData = getGazeData();
      console.log(`Collected ${gazeData.length} gaze data points for video ${currentVideo.id}`);

      // Optional: Send gaze data to server
      // You can add a method to trackingService to handle gaze data

      // Track completion
      trackingService.trackComplete(
        currentSessionId,
        getPlaybackPosition(currentVideo.id)
      );

      // Complete the session
      trackingService.completeSession(currentSessionId).catch(console.error);

      markCompleted(currentVideo.id);
      // Clear the saved position since video is completed
      updatePlaybackPosition(currentVideo.id, 0);
      setCurrent(null);
      setCurrentSessionId(null);

      // Clear gaze data for next video
      clearGazeData();
    }
  };

  const handlePlay = (position: number) => {
    if (currentSessionId) {
      trackingService.trackPlay(currentSessionId, position);
      if (pauseStartTime !== null) {
        setPauseStartTime(null);
      }
    }
  };

  const handlePause = (position: number) => {
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

  return (
    <PageLayout maxWidth={1400}>
      <HamburgerMenu />

      {/* Test button for stopping recording */}
      {isRecording && (
        <button
          onClick={stopRecording}
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            padding: '8px 16px',
            background: '#f44336',
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
      )}

      <main
        style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 32 }}
      >
        {/* Player */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VideoPlayer
            mode={mode}
            video={currentVideo}
            sessionId={currentSessionId}
            onEnded={handleVideoEnded}
            onPlay={handlePlay}
            onPause={handlePause}
            onPauseEnd={handlePauseEnd}
            updatePlaybackPosition={updatePlaybackPosition}
            getPlaybackPosition={getPlaybackPosition}
          />
        </div>

        {/* Video Grid */}
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
