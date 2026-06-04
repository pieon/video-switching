// Hook to manage WebGazer eye tracking
import { useEffect, useRef, useState } from 'react';

export interface GazeData {
  x: number;
  y: number;
  timestamp: number;
}

interface UseWebGazerOptions {
  onGazeUpdate?: (data: GazeData) => void;
  saveGazeData?: boolean;
  cameraDeviceId?: string;
  enabled?: boolean;
}

export function useWebGazer({ onGazeUpdate, saveGazeData = false, cameraDeviceId, enabled = true }: UseWebGazerOptions = {}) {
  const [isReady, setIsReady] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const gazeDataRef = useRef<GazeData[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let webgazer: any = null;
    let mounted = true;

    const initWebGazer = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Dynamic import to avoid SSR issues
        const WebGazerModule = await import('webgazer');
        webgazer = WebGazerModule.default;

        if (!mounted) return;

        // Set gaze listener before beginning
        let gazeCount = 0;
        webgazer.setGazeListener((data: any, timestamp: number) => {
          if (data && data.x && data.y) {
            gazeCount++;
            if (gazeCount <= 3 || gazeCount % 200 === 0) {
              console.log(`[WebGazer] Gaze #${gazeCount}: x=${Math.round(data.x)}, y=${Math.round(data.y)}`);
            }
            const gazeData: GazeData = {
              x: data.x,
              y: data.y,
              timestamp,
            };

            if (saveGazeData) {
              gazeDataRef.current.push(gazeData);
            }

            if (onGazeUpdate) {
              onGazeUpdate(gazeData);
            }
          }
        });

        // Configure WebGazer before starting
        webgazer.showVideoPreview(false); // Hide webcam preview
        webgazer.showPredictionPoints(true);
        webgazer.applyKalmanFilter(true);

        // Set higher video resolution for better accuracy
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

        // Pre-warm the camera ourselves before handing off to WebGazer.
        // WebGazer.begin() starts its TF.js face-detection loop immediately;
        // on a cold camera the first tick sees a 0x0 video frame and crashes
        // with "Requested texture size [0x0] is invalid" from WebGL.
        // By acquiring + draining the stream first, the second acquisition
        // inside begin() gets frames synchronously.
        const prewarmStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        try {
          await new Promise<void>((resolve, reject) => {
            const v = document.createElement('video');
            v.muted = true;
            v.playsInline = true;
            v.srcObject = prewarmStream;
            const timeout = setTimeout(
              () => reject(new Error('Pre-warm timed out waiting for video metadata')),
              5000
            );
            v.onloadedmetadata = () => {
              v.play()
                .then(() => {
                  if (v.videoWidth > 0 && v.videoHeight > 0) {
                    console.log(`[WebGazer] Pre-warm OK: ${v.videoWidth}x${v.videoHeight}`);
                    clearTimeout(timeout);
                    resolve();
                  } else {
                    clearTimeout(timeout);
                    reject(new Error(`Pre-warm got 0x0 frame`));
                  }
                })
                .catch(err => {
                  clearTimeout(timeout);
                  reject(err);
                });
            };
          });
        } finally {
          prewarmStream.getTracks().forEach(t => t.stop());
        }

        if (!mounted) return;

        // Initialize WebGazer (this starts the camera but not tracking yet)
        await webgazer.begin();

        // Pause immediately to prevent processing before video is ready
        webgazer.pause();

        if (!mounted) {
          webgazer.end();
          return;
        }

        // Wait for video feed to be ready with proper dimensions
        const waitForVideo = () => {
          return new Promise<void>((resolve, reject) => {
            let retries = 0;
            const maxRetries = 30; // ~7.5s total

            const checkVideo = () => {
              const videoElement = document.querySelector('#webgazerVideoFeed') as HTMLVideoElement | null;

              if (videoElement) {
                if (retries === 0 || retries % 4 === 0) {
                  console.log(
                    `[WebGazer] wait ${retries}/${maxRetries}: ` +
                      `dims=${videoElement.videoWidth}x${videoElement.videoHeight} ` +
                      `readyState=${videoElement.readyState} ` +
                      `paused=${videoElement.paused} ` +
                      `srcObject=${videoElement.srcObject ? 'set' : 'null'}`
                  );
                }

                if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0 && videoElement.readyState >= 2) {
                  console.log('[WebGazer] Video feed is ready!');
                  resolve();
                  return;
                }
              } else if (retries === 0 || retries % 4 === 0) {
                console.log(`[WebGazer] wait ${retries}/${maxRetries}: #webgazerVideoFeed not in DOM`);
              }

              if (retries < maxRetries) {
                retries++;
                setTimeout(checkVideo, 250);
              } else {
                // Collect diagnostics so we know WHY it failed
                const diag: Record<string, unknown> = {
                  cameraDeviceIdRequested: cameraDeviceId ?? null,
                  videoElementFound: !!videoElement,
                };
                if (videoElement) {
                  diag.videoWidth = videoElement.videoWidth;
                  diag.videoHeight = videoElement.videoHeight;
                  diag.readyState = videoElement.readyState;
                  diag.paused = videoElement.paused;
                  diag.srcObjectSet = !!videoElement.srcObject;
                  const stream = videoElement.srcObject as MediaStream | null;
                  if (stream) {
                    const tracks = stream.getVideoTracks();
                    diag.trackCount = tracks.length;
                    diag.tracks = tracks.map(t => ({
                      label: t.label,
                      readyState: t.readyState,
                      muted: t.muted,
                      enabled: t.enabled,
                      settings: t.getSettings(),
                    }));
                  }
                }

                // Check permission state if available
                const finish = () => {
                  console.error('[WebGazer] Video feed did not initialize. Diagnostics:', diag);
                  reject(new Error('Video feed did not initialize properly'));
                };
                if (navigator.permissions && (navigator.permissions as any).query) {
                  (navigator.permissions as any)
                    .query({ name: 'camera' })
                    .then((p: PermissionStatus) => {
                      diag.cameraPermission = p.state;
                    })
                    .catch((e: unknown) => {
                      diag.cameraPermissionError = String(e);
                    })
                    .finally(finish);
                } else {
                  finish();
                }
              }
            };

            checkVideo();
          });
        };

        await waitForVideo();

        if (!mounted) {
          webgazer.end();
          return;
        }

        // Additional configuration after initialization
        if (webgazer.params) {
          webgazer.params.showVideo = true;
          webgazer.params.showFaceOverlay = false;
          webgazer.params.showFaceFeedbackBox = false;
        }

        // TF.js reads width/height off #webgazerVideoCanvas in tf.browser.fromPixels.
        // WebGazer sizes that canvas from a video event that can lag behind resume(),
        // leaving it 0x0 → "Requested texture size [0x0] is invalid". Seed it from the
        // ready video so the first processed frame always has valid dimensions.
        const videoEl = document.querySelector('#webgazerVideoFeed') as HTMLVideoElement | null;
        const canvasEl = document.querySelector('#webgazerVideoCanvas') as HTMLCanvasElement | null;
        if (videoEl && canvasEl && videoEl.videoWidth > 0 &&
            (canvasEl.width === 0 || canvasEl.height === 0)) {
          canvasEl.width = videoEl.videoWidth;
          canvasEl.height = videoEl.videoHeight;
        }

        // Resume WebGazer now that video is ready
        webgazer.resume();

        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize WebGazer:', error);
        // Don't throw, just log - eye tracking is optional
      }
    };

    initWebGazer();

    // Cleanup
    return () => {
      mounted = false;
      if (webgazer) {
        try {
          webgazer.end();
        } catch (error) {
          console.error('Error cleaning up WebGazer:', error);
        }
      }
    };
  }, [onGazeUpdate, saveGazeData, cameraDeviceId, enabled]);

  const startCalibration = () => {
    setIsCalibrated(false);
    // User should click on calibration points
  };

  const endCalibration = () => {
    setIsCalibrated(true);
  };

  const getGazeData = () => {
    return gazeDataRef.current;
  };

  const clearGazeData = () => {
    gazeDataRef.current = [];
  };

  const pause = async () => {
    if (typeof window !== 'undefined') {
      const WebGazerModule = await import('webgazer');
      const webgazer = WebGazerModule.default;
      webgazer.pause();
    }
  };

  const resume = async () => {
    if (typeof window !== 'undefined') {
      const WebGazerModule = await import('webgazer');
      const webgazer = WebGazerModule.default;
      webgazer.resume();
    }
  };

  return {
    isReady,
    isCalibrated,
    startCalibration,
    endCalibration,
    getGazeData,
    clearGazeData,
    pause,
    resume,
  };
}
