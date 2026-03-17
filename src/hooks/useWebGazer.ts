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
}

export function useWebGazer({ onGazeUpdate, saveGazeData = false, cameraDeviceId }: UseWebGazerOptions = {}) {
  const [isReady, setIsReady] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const gazeDataRef = useRef<GazeData[]>([]);

  useEffect(() => {
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
            const maxRetries = 30; // Increased retries

            const checkVideo = () => {
              const videoElement = document.querySelector('#webgazerVideoFeed') as HTMLVideoElement;

              if (videoElement) {
                console.log(`Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);

                if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0 && videoElement.readyState >= 2) {
                  console.log('Video feed is ready!');
                  resolve();
                  return;
                }
              }

              if (retries < maxRetries) {
                retries++;
                setTimeout(checkVideo, 250);
              } else {
                reject(new Error('Video feed did not initialize properly'));
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
  }, [onGazeUpdate, saveGazeData, cameraDeviceId]);

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
