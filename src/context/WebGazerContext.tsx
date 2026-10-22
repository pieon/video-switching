import React, { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { GazeData } from '@/hooks/useWebGazer';
import { useAuth } from '@/context/AuthContext';
import { useGazeLogger, GazePhase } from '@/hooks/useGazeLogger';

// Gaze is logged continuously from the start of calibration until logout, and
// tagged by the page it was recorded on. /admin sits between calibration and
// training and counts as training. Routes not listed here are never logged.
function phaseForPath(pathname: string): GazePhase | null {
  if (pathname === '/calibrate') return 'calibration';
  if (pathname === '/admin' || pathname === '/training') return 'training';
  if (pathname === '/player') return 'experiment';
  return null;
}

interface WebGazerContextType {
  isReady: boolean;
  /** Initialize WebGazer once with the chosen camera. Idempotent. Leaves it paused. */
  start: (cameraDeviceId?: string) => Promise<void>;
  resume: () => void;
  pause: () => void;
  /** Register (or clear) the handler that receives each gaze sample. */
  setGazeListener: (fn: ((data: GazeData) => void) | null) => void;
  /** Toggle whether gaze samples are buffered for getGazeData(). */
  setSaveGazeData: (save: boolean) => void;
  getGazeData: () => GazeData[];
  clearGazeData: () => void;
  /** Clear WebGazer's regression/calibration data (for recalibration). */
  clearCalibrationData: () => void;
  /** Feed an explicit calibration sample (known target) to the regression model. */
  calibratePoint: (x: number, y: number, eventType?: 'click' | 'move') => void;
  /** Show/hide the camera preview with the face-position feedback box. */
  setVideoPreview: (show: boolean) => void;
  /** Begin continuous gaze logging (idempotent). Runs until stopGazeLogging/logout. */
  startGazeLogging: () => void;
  /** Upload what's buffered and stop logging. Call before logout clears the token. */
  stopGazeLogging: () => void;
  /** Upload what's buffered now, without stopping. */
  flushGaze: () => void;
  /** Tag subsequent samples with the video on screen ('' / null when none). */
  setGazeVideoId: (videoId: string | null) => void;
}

const WebGazerContext = createContext<WebGazerContextType | undefined>(undefined);

export function WebGazerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  // Continuous logging state. Refs, because the WebGazer listener is
  // registered once and must always see the current values.
  const loggingRef = useRef(false);
  const videoIdRef = useRef<string | null>(null);
  const pathnameRef = useRef(router.pathname);
  pathnameRef.current = router.pathname;
  const { logSample, saveAndClearSamples } = useGazeLogger({
    participantId: user?.participantId,
  });
  const logSampleRef = useRef(logSample);
  logSampleRef.current = logSample;

  const webgazerRef = useRef<any>(null);
  const startedRef = useRef(false);
  const startingRef = useRef(false);
  const listenerRef = useRef<((data: GazeData) => void) | null>(null);
  const saveRef = useRef(false);
  const gazeDataRef = useRef<GazeData[]>([]);

  const start = useCallback(async (cameraDeviceId?: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    // Init exactly once — immune to StrictMode double-invoke and re-mounts.
    if (startedRef.current || startingRef.current) return;
    startingRef.current = true;

    try {
      const WebGazerModule = await import('webgazer');
      const webgazer: any = WebGazerModule.default;
      webgazerRef.current = webgazer;

      let gazeCount = 0;
      webgazer.setGazeListener((data: any, timestamp: number) => {
        if (data && data.x && data.y) {
          gazeCount++;
          if (gazeCount <= 3 || gazeCount % 200 === 0) {
            console.log(`[WebGazer] Gaze #${gazeCount}: x=${Math.round(data.x)}, y=${Math.round(data.y)}`);
          }
          const gazeData: GazeData = { x: data.x, y: data.y, timestamp };
          if (saveRef.current) gazeDataRef.current.push(gazeData);
          if (loggingRef.current) {
            const phase = phaseForPath(pathnameRef.current);
            if (phase) logSampleRef.current(gazeData, videoIdRef.current ?? '', phase);
          }
          listenerRef.current?.(gazeData);
        }
      });

      webgazer.showVideoPreview(false);
      webgazer.showPredictionPoints(true);
      webgazer.applyKalmanFilter(true);

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };
      if (cameraDeviceId) {
        videoConstraints.deviceId = { exact: cameraDeviceId };
      } else {
        videoConstraints.facingMode = 'user';
      }
      webgazer.setCameraConstraints({ video: videoConstraints });

      // Pre-warm the camera so WebGazer's begin() gets non-zero frames.
      const prewarmStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      try {
        await new Promise<void>((resolve, reject) => {
          const v = document.createElement('video');
          v.muted = true;
          v.playsInline = true;
          v.srcObject = prewarmStream;
          const timeout = setTimeout(() => reject(new Error('Pre-warm timed out')), 5000);
          v.onloadedmetadata = () => {
            v.play()
              .then(() => {
                if (v.videoWidth > 0 && v.videoHeight > 0) {
                  console.log(`[WebGazer] Pre-warm OK: ${v.videoWidth}x${v.videoHeight}`);
                  clearTimeout(timeout);
                  resolve();
                } else {
                  clearTimeout(timeout);
                  reject(new Error('Pre-warm got 0x0 frame'));
                }
              })
              .catch((err) => {
                clearTimeout(timeout);
                reject(err);
              });
          };
        });
      } finally {
        prewarmStream.getTracks().forEach((t) => t.stop());
      }

      // Don't load/persist the model in IndexedDB — otherwise a previous
      // participant's calibration samples are loaded into this one's model.
      webgazer.saveDataAcrossSessions(false);

      await webgazer.begin();
      // Pause immediately; pages resume() when they need tracking.
      webgazer.pause();
      // Train only on explicit calibration samples. Implicit click/mousemove
      // training would keep reshaping the model during the experiment.
      webgazer.removeMouseEventListeners();

      // Wait for the visible video feed to have real dimensions.
      await new Promise<void>((resolve, reject) => {
        let retries = 0;
        const maxRetries = 30; // ~7.5s
        const check = () => {
          const videoElement = document.querySelector('#webgazerVideoFeed') as HTMLVideoElement | null;
          if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0 && videoElement.readyState >= 2) {
            resolve();
            return;
          }
          if (retries < maxRetries) {
            retries++;
            setTimeout(check, 250);
          } else {
            reject(new Error('Video feed did not initialize properly'));
          }
        };
        check();
      });

      // Seed the offscreen processing canvas so the first TF tick isn't 0x0.
      const videoEl = document.querySelector('#webgazerVideoFeed') as HTMLVideoElement | null;
      const canvasEl = document.querySelector('#webgazerVideoCanvas') as HTMLCanvasElement | null;
      if (videoEl && canvasEl && videoEl.videoWidth > 0 &&
          (canvasEl.width === 0 || canvasEl.height === 0)) {
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
      }

      if (webgazer.params) {
        webgazer.params.showVideo = true;
        webgazer.params.showFaceOverlay = false;
        webgazer.params.showFaceFeedbackBox = false;
      }

      startedRef.current = true;
      setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize WebGazer:', error);
    } finally {
      startingRef.current = false;
    }
  }, []);

  const resume = useCallback(() => {
    webgazerRef.current?.resume();
  }, []);

  // While logging, pages leaving must not pause tracking — that is exactly the
  // gap continuous logging exists to close. Tracking stops at logout instead.
  const pause = useCallback(() => {
    if (loggingRef.current) return;
    webgazerRef.current?.pause();
  }, []);

  const startGazeLogging = useCallback(() => {
    loggingRef.current = true;
    webgazerRef.current?.resume();
  }, []);

  const stopGazeLogging = useCallback(() => {
    saveAndClearSamples();
    loggingRef.current = false;
    videoIdRef.current = null;
  }, [saveAndClearSamples]);

  const flushGaze = useCallback(() => {
    saveAndClearSamples();
  }, [saveAndClearSamples]);

  const setGazeVideoId = useCallback((videoId: string | null) => {
    videoIdRef.current = videoId;
  }, []);

  const setGazeListener = useCallback((fn: ((data: GazeData) => void) | null) => {
    listenerRef.current = fn;
  }, []);

  const setSaveGazeData = useCallback((save: boolean) => {
    saveRef.current = save;
  }, []);

  const getGazeData = useCallback(() => gazeDataRef.current, []);

  const clearGazeData = useCallback(() => {
    gazeDataRef.current = [];
  }, []);

  const clearCalibrationData = useCallback(() => {
    webgazerRef.current?.clearData();
  }, []);

  const calibratePoint = useCallback(
    (x: number, y: number, eventType: 'click' | 'move' = 'click') => {
      webgazerRef.current?.recordScreenPosition(x, y, eventType);
    },
    []
  );

  const setVideoPreview = useCallback((show: boolean) => {
    const webgazer = webgazerRef.current;
    if (!webgazer) return;
    webgazer.showVideo(show);
    webgazer.showFaceFeedbackBox(show);
  }, []);

  const end = useCallback(() => {
    const webgazer = webgazerRef.current;
    if (webgazer) {
      // In WebGazer 3.4.0, end() only stops the prediction loop and removes its
      // DOM nodes — it does not release the camera. stopVideo() stops the track,
      // and must run first because end() removes the container it edits.
      try {
        webgazer.stopVideo();
      } catch (error) {
        console.error('Error stopping WebGazer camera:', error);
      }
      try {
        webgazer.end();
      } catch (error) {
        console.error('Error cleaning up WebGazer:', error);
      }
    }
    webgazerRef.current = null;
    startedRef.current = false;
    // Backstop: never carry logging into the next participant's session.
    loggingRef.current = false;
    videoIdRef.current = null;
    listenerRef.current = null;
    saveRef.current = false;
    gazeDataRef.current = [];
    setIsReady(false);
  }, []);

  // Tear down only when returning to the login page (new/!logged-in participant).
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (url === '/') end();
    };
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, end]);

  return (
    <WebGazerContext.Provider
      value={{
        isReady,
        start,
        resume,
        pause,
        setGazeListener,
        setSaveGazeData,
        getGazeData,
        clearGazeData,
        clearCalibrationData,
        calibratePoint,
        setVideoPreview,
        startGazeLogging,
        stopGazeLogging,
        flushGaze,
        setGazeVideoId,
      }}
    >
      {children}
    </WebGazerContext.Provider>
  );
}

export function useWebGazerContext() {
  const context = useContext(WebGazerContext);
  if (context === undefined) {
    throw new Error('useWebGazerContext must be used within a WebGazerProvider');
  }
  return context;
}
