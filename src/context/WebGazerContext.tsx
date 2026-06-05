// WebGazer context — owns a SINGLE persistent WebGazer instance for the whole
// experiment. WebGazer is a singleton and its async begin()/end() calls race
// when overlapped (React StrictMode double-invoke, or teardown+re-init on
// navigation), which causes "Requested texture size [0x0] is invalid".
//
// To avoid that we call begin() exactly once (guarded), keep the instance alive
// across calibrate → admin → training → player, and pause()/resume() per page
// instead of end()/begin(). The active gaze handler and save flag are held in
// refs so pages can swap them without re-initializing WebGazer.
import React, { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { GazeData } from '@/hooks/useWebGazer';

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
}

const WebGazerContext = createContext<WebGazerContextType | undefined>(undefined);

export function WebGazerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

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

      // Single dispatcher reads the current handler/save flag from refs, so the
      // listener never has to be re-registered (and is never null → no
      // "callback is not a function" from WebGazer's unguarded loop).
      let gazeCount = 0;
      webgazer.setGazeListener((data: any, timestamp: number) => {
        if (data && data.x && data.y) {
          gazeCount++;
          if (gazeCount <= 3 || gazeCount % 200 === 0) {
            console.log(`[WebGazer] Gaze #${gazeCount}: x=${Math.round(data.x)}, y=${Math.round(data.y)}`);
          }
          const gazeData: GazeData = { x: data.x, y: data.y, timestamp };
          if (saveRef.current) gazeDataRef.current.push(gazeData);
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

      await webgazer.begin();
      // Pause immediately; pages resume() when they need tracking.
      webgazer.pause();

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

  const pause = useCallback(() => {
    webgazerRef.current?.pause();
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

  const end = useCallback(() => {
    if (webgazerRef.current) {
      try {
        webgazerRef.current.end();
      } catch (error) {
        console.error('Error cleaning up WebGazer:', error);
      }
    }
    webgazerRef.current = null;
    startedRef.current = false;
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
