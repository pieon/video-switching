// Eye tracking calibration page - Next.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { PageLayout, Header } from '@/components/layout';
import { Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { GazeData } from '@/hooks/useWebGazer';
import { useWebGazerContext } from '@/context/WebGazerContext';
import { trackingService } from '@/services/trackingService';
import { readDisplay, saveCalibrationDisplay } from '@/utils/displayInfo';
import { postControl, useControlActions } from '@/utils/controlChannel';

const CALIBRATION_POINTS = [
  { id: 1, x: 10, y: 10 }, // Top-left
  { id: 2, x: 50, y: 10 }, // Top-center
  { id: 3, x: 90, y: 10 }, // Top-right
  { id: 4, x: 10, y: 50 }, // Middle-left
  { id: 5, x: 50, y: 50 }, // Center
  { id: 6, x: 90, y: 50 }, // Middle-right
  { id: 7, x: 10, y: 90 }, // Bottom-left
  { id: 8, x: 50, y: 90 }, // Bottom-center
  { id: 9, x: 90, y: 90 }, // Bottom-right
];

const CAMERA_STORAGE_KEY = 'selected_camera_device_id';

export default function CalibratePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCameraId(localStorage.getItem(CAMERA_STORAGE_KEY) ?? '');
  }, []);

  const { isReady, start, resume, pause, setGazeListener, clearCalibrationData, calibratePoint, setHeadHome, setVideoPreview, startGazeLogging } = useWebGazerContext();

  useEffect(() => {
    if (selectedCameraId === null) return;
    start(selectedCameraId || undefined);
  }, [selectedCameraId, start]);

  useEffect(() => {
    if (isReady) resume();
    return () => {
      pause();
    };
  }, [isReady, resume, pause]);

  const [currentPointIndex, setCurrentPointIndex] = useState<number | null>(null);
  const [isSampling, setIsSampling] = useState(false);
  const [completedPoints, setCompletedPoints] = useState<number[]>([]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [randomizedOrder, setRandomizedOrder] = useState<number[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [showAccuracyConfirm, setShowAccuracyConfirm] = useState(false);
  const [isMeasuringAccuracy, setIsMeasuringAccuracy] = useState(false);
  const [accuracyPercentage, setAccuracyPercentage] = useState<number | null>(null);
  const gazeCollectionRef = useRef<{ x: number; y: number }[]>([]);
  // Current validation target dot ({x,y} in px) and per-point ROI results.
  const [validationDot, setValidationDot] = useState<{ x: number; y: number } | null>(null);
  const [validationResults, setValidationResults] = useState<
    { label: string; percentInROI: number; offsetCm: number; meanDistPx: number }[]
  >([]);
  // Toggled true only during the 3s accuracy window so the shared listener knows
  // when to buffer samples (vs. just updating the live readout).
  const isCollectingRef = useRef(false);
  // Preloaded chime played each time a new calibration point appears.
  const dingRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    dingRef.current = new Audio('/Images/audio/ding.wav');
  }, []);

  // One click per point starts sampling: wait for the eyes to settle, then record
  // SAMPLES_PER_POINT frames spaced apart so each is a distinct video frame.
  // 5 × 9 = 45 must stay ≤ WebGazer's fixed 50-sample click buffer (dataWindow=50),
  // or the earliest points get silently evicted.
  const SETTLE_MS = 800;
  const SAMPLES_PER_POINT = 5;
  const SAMPLE_INTERVAL_MS = 100;

  // ROI validation config (jsPsych webgazer-validate style).
  const ROI_RADIUS = 200;           // px; a sample is "on target" within this radius
  const TIME_TO_SACCADE = 1000;     // ms for the eyes to reach each point before we collect
  const VALIDATION_DURATION = 2000; // ms of gaze collected per point
  const INTER_TARGET_PAUSE = 1500;  // ms of blank screen between validation targets
  const PASS_THRESHOLD = 70;        // min % of samples within ROI (per point) to pass
  const DPI = 96;

  const getValidationPoints = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const clampY = (y: number) => Math.max(80, Math.min(h - 80, y));
    const LAYOUT_TOP = 76;
    const MAIN_VIDEO_H = 648;
    const GRID_GAP = 32;
    const THUMB_H = 200;
    return [
      { label: 'Main video', x: w / 2, y: clampY(LAYOUT_TOP + MAIN_VIDEO_H / 2) },
      { label: 'Suggested video', x: w / 2, y: clampY(LAYOUT_TOP + MAIN_VIDEO_H + GRID_GAP + THUMB_H / 2) },
    ];
  };

  // Percent of samples that fell within ROI_RADIUS of the target.
  const calculatePercentInROI = (
    samples: { x: number; y: number }[],
    target: { x: number; y: number }
  ) => {
    if (samples.length === 0) return 0;
    const inside = samples.filter(
      (s) => Math.hypot(s.x - target.x, s.y - target.y) <= ROI_RADIUS
    ).length;
    return Math.round((inside / samples.length) * 100);
  };

  // Distance (px) from the samples' centroid to the target — systematic offset.
  const calculateOffsetPx = (
    samples: { x: number; y: number }[],
    target: { x: number; y: number }
  ) => {
    if (samples.length === 0) return 0;
    const cx = samples.reduce((s, p) => s + p.x, 0) / samples.length;
    const cy = samples.reduce((s, p) => s + p.y, 0) / samples.length;
    return Math.hypot(cx - target.x, cy - target.y);
  };

  // Mean per-sample distance (px) to the target — average gaze error, scatter included.
  const calculateMeanDistancePx = (
    samples: { x: number; y: number }[],
    target: { x: number; y: number }
  ) => {
    if (samples.length === 0) return 0;
    const total = samples.reduce((sum, p) => sum + Math.hypot(p.x - target.x, p.y - target.y), 0);
    return total / samples.length;
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Camera preview + face box while the participant positions themselves.
  const isPositioning = isReady && !isCalibrating && !isComplete && !showAccuracyConfirm && !isMeasuringAccuracy;
  useEffect(() => {
    setVideoPreview(isPositioning);
    return () => setVideoPreview(false);
  }, [isPositioning, setVideoPreview]);

  const startCalibration = () => {
    // Always start from an empty model.
    clearCalibrationData();

    // The model is trained in this viewport's pixels; remember the geometry so
    // later pages can tell if it changed (and log it for analysis).
    const display = readDisplay();
    saveCalibrationDisplay(display);
    trackingService.logDisplay('calibration', display);

    // Gaze is logged from here on, continuously, until logout.
    startGazeLogging();

    const indices = Array.from({ length: CALIBRATION_POINTS.length }, (_, i) => i);
    const shuffled = indices.sort(() => Math.random() - 0.5);

    setRandomizedOrder(shuffled);
    setCurrentOrderIndex(0);
    setIsCalibrating(true);
    setCurrentPointIndex(shuffled[0]);
    setIsSampling(false);
    setCompletedPoints([]);
    setAccuracyPercentage(null);
  };

  // Mark the current point done and move to the next, or finish calibration.
  const advanceToNextPoint = () => {
    if (currentPointIndex !== null) {
      const pointId = CALIBRATION_POINTS[currentPointIndex].id;
      setCompletedPoints((prev) => [...prev, pointId]);
    }
    const nextOrderIndex = currentOrderIndex + 1;
    if (nextOrderIndex < randomizedOrder.length) {
      setCurrentOrderIndex(nextOrderIndex);
      setCurrentPointIndex(randomizedOrder[nextOrderIndex]);
    } else {
      setIsCalibrating(false);
      setShowAccuracyConfirm(true);
      // The model is only valid for this head position; /control tracks drift from it.
      setHeadHome();
    }
  };

  // Click the active point once; while the participant keeps looking at it we
  // record SAMPLES_PER_POINT samples of the exact target center, then advance.
  const handlePointClick = async (index: number) => {
    if (!isCalibrating || currentPointIndex !== index || isSampling) return;
    setIsSampling(true);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const point = CALIBRATION_POINTS[index];
    const x = (point.x / 100) * window.innerWidth;
    const y = (point.y / 100) * window.innerHeight;

    await sleep(SETTLE_MS);
    for (let i = 0; i < SAMPLES_PER_POINT; i++) {
      calibratePoint(x, y, 'click');
      await sleep(SAMPLE_INTERVAL_MS);
    }

    setIsSampling(false);
    advanceToNextPoint();
  };

  // Chime each time a new calibration point appears.
  useEffect(() => {
    if (!isCalibrating || currentPointIndex === null) return;
    if (dingRef.current) {
      dingRef.current.currentTime = 0;
      dingRef.current.play().catch(() => {});
    }
  }, [isCalibrating, currentPointIndex]);

  // Single gaze listener active while calibrating or measuring: it buffers
  // samples during the accuracy window.
  useEffect(() => {
    if (!isCalibrating && !isMeasuringAccuracy) return;

    const onGaze = (data: GazeData) => {
      if (!data || !data.x || !data.y) return;
      if (isCollectingRef.current) {
        gazeCollectionRef.current.push({ x: data.x, y: data.y });
      }
      // Gaze dot is drawn only on the control panel's preview.
      // screen.left/top are Chrome-only (the monitor's origin on multi-screen setups).
      const scr = window.screen as Screen & { left?: number; top?: number };
      postControl({
        type: 'gaze',
        point: {
          x: data.x,
          y: data.y,
          view: {
            innerW: window.innerWidth,
            innerH: window.innerHeight,
            outerW: window.outerWidth,
            outerH: window.outerHeight,
            screenX: window.screenX,
            screenY: window.screenY,
            screenLeft: scr.left ?? 0,
            screenTop: scr.top ?? 0,
            screenW: scr.width,
            screenH: scr.height,
          },
        },
      });
    };
    setGazeListener(onGaze);

    return () => {
      setGazeListener(null);
      postControl({ type: 'gaze', point: null });
    };
  }, [isCalibrating, isMeasuringAccuracy, setGazeListener]);

  const handleStartAccuracyCheck = () => {
    setShowAccuracyConfirm(false);
    runValidation();
  };

  // ROI validation: for each target (main video / suggested video) show a dot,
  // let the eyes settle, collect gaze, then score percent-in-ROI + offset.
  const runValidation = async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    setIsMeasuringAccuracy(true);

    const targets = getValidationPoints();
    const results: { label: string; percentInROI: number; offsetCm: number; meanDistPx: number }[] = [];

    for (const [i, target] of targets.entries()) {
      // Blank pause between targets so the previous fixation doesn't bleed over.
      if (i > 0) {
        setValidationDot(null);
        await sleep(INTER_TARGET_PAUSE);
      }

      setValidationDot({ x: target.x, y: target.y });
      gazeCollectionRef.current = [];

      // Chime as each validation target (star) appears.
      if (dingRef.current) {
        dingRef.current.currentTime = 0;
        dingRef.current.play().catch(() => {});
      }

      // Let the eyes reach the dot, then collect for the validation window.
      await sleep(TIME_TO_SACCADE);
      isCollectingRef.current = true;
      await sleep(VALIDATION_DURATION);
      isCollectingRef.current = false;

      const samples = gazeCollectionRef.current.slice();
      const percentInROI = calculatePercentInROI(samples, target);
      const offsetCm = Math.round((calculateOffsetPx(samples, target) / DPI) * 2.54);
      const meanDistPx = Math.round(calculateMeanDistancePx(samples, target));
      results.push({ label: target.label, percentInROI, offsetCm, meanDistPx });
      console.log('[Validation]', target.label, {
        target: { x: Math.round(target.x), y: Math.round(target.y) },
        samples: samples.length,
        percentInROI,
        offsetCm,
        meanDistPx,
      });
    }

    setValidationDot(null);
    setValidationResults(results);

    // Overall = the weakest region (both must be good to pass).
    const overall = Math.min(...results.map((r) => r.percentInROI));
    setAccuracyPercentage(overall);
    setIsMeasuringAccuracy(false);
    setIsComplete(true);

    if (overall >= PASS_THRESHOLD) {
      await sleep(2000);
      router.push('/admin');
    }
  };

  const handleRecalibrate = () => {
    setIsComplete(false);
    setAccuracyPercentage(null);
    setValidationResults([]);
    startCalibration();
  };

  // Re-run the ROI validation only, keeping the existing calibration model.
  const handleRedoAccuracyCheck = () => {
    setIsComplete(false);
    setAccuracyPercentage(null);
    setValidationResults([]);
    runValidation();
  };

  const handleAcceptCalibration = () => {
    router.push('/admin');
  };

  const handleSkipCalibration = () => {
    router.push('/admin');
  };

  // Every step is driven from the control panel; results are shown only there.
  const passed = accuracyPercentage !== null && accuracyPercentage >= PASS_THRESHOLD;
  useControlActions(
    isPositioning
      ? [
          { id: 'start', label: 'Start Calibration', run: startCalibration },
          { id: 'skip', label: 'Skip Calibration', variant: 'secondary', run: handleSkipCalibration },
        ]
      : isCalibrating && currentPointIndex !== null
      ? [{ id: 'capture', label: 'Capture point', disabled: isSampling, run: () => handlePointClick(currentPointIndex) }]
      : showAccuracyConfirm
      ? [{ id: 'accuracy', label: 'Start Accuracy Check', run: handleStartAccuracyCheck }]
      : isComplete && accuracyPercentage !== null
      ? [
          { id: 'accept', label: passed ? 'Continue' : 'Accept Anyway', variant: passed ? 'primary' : 'secondary', run: handleAcceptCalibration },
          { id: 'recalibrate', label: 'Redo Calibration', variant: passed ? 'secondary' : 'primary', run: handleRecalibrate },
          { id: 'redoAccuracy', label: 'Redo Accuracy Check', variant: 'secondary', run: handleRedoAccuracyCheck },
        ]
      : [],
    !isReady
      ? ['Eye tracking initializing…']
      : isPositioning
      ? ["Wait until the face box in the participant's camera preview is green."]
      : isCalibrating
      ? [`Point ${currentOrderIndex + 1} / ${CALIBRATION_POINTS.length} — capture while the participant looks at it.`]
      : isMeasuringAccuracy
      ? ['Checking accuracy…']
      : [],
    isComplete && accuracyPercentage !== null
      ? { results: validationResults, threshold: PASS_THRESHOLD }
      : undefined
  );

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth={1400}>
      <Header
        title="Eye Tracking Calibration"
        showUserInfo
      >
        {/* WebGazer Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 8,
            background: isReady ? '#e8f5e9' : '#fff3e0',
            border: `1px solid ${isReady ? '#4caf50' : '#ff9800'}`,
            fontSize: 13,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isReady ? '#4caf50' : '#ff9800',
            }}
          />
          <span>Eye Tracking: {isReady ? 'Active' : 'Initializing...'}</span>
        </div>
      </Header>

      {!isReady && (
        <Card style={{ marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>Initializing Camera...</h3>
          <p>Please allow camera access when prompted.</p>
          <p style={{ fontSize: 14, color: '#666' }}>
            This study uses eye tracking to understand how you watch videos. Your
            camera feed is only used locally and is not recorded or transmitted.
          </p>
        </Card>
      )}

      {isPositioning && (
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Ready to Calibrate</h2>
          <p style={{ fontSize: 16, marginBottom: 16, color: '#666' }}>
            First, center your face in the camera preview (bottom-right) until the box around it turns <strong>green</strong>.
          </p>
          <p style={{ fontSize: 16, marginBottom: 16, color: '#666' }}>
            You'll then see 9 points on the screen, one at a time. Look directly at each point and <strong>keep looking at it until it moves</strong>, keeping your head still.
          </p>
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            fontSize: 14,
            color: '#856404'
          }}>
            <strong>Tips for best accuracy:</strong>
            <ul style={{ textAlign: 'left', marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Keep your head still during calibration</li>
              <li>Keep looking at each point until it moves to the next spot</li>
              <li>Sit at a comfortable distance from the screen (~40cm)</li>
              <li>Ensure good lighting on your face</li>
            </ul>
          </div>
        </Card>
      )}

      {isCalibrating && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#000',
            zIndex: 1000,
          }}
        >

          {/* Calibration points */}
          {CALIBRATION_POINTS.map((point, index) => {
            const isActive = currentPointIndex === index;
            const isCompleted = completedPoints.includes(point.id);

            return (
              <div
                key={point.id}
                style={{
                  position: 'absolute',
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: isActive ? 120 : 90,
                  height: isActive ? 120 : 90,
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  transition: 'all 0.3s ease',
                  opacity: isCompleted ? 0.0 : isActive ? 1.0 : 0.0,
                  // Hold still while sampling so the target doesn't move under the gaze.
                  animation: isActive && !isSampling ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }}
              >
                <img
                  src="/Images/rilakuma.gif"
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                    display: 'block',
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Accuracy Check Confirmation */}
      {showAccuracyConfirm && (
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: '#4caf50' }}>
            ✓ Calibration Points Complete!
          </h2>
          <p style={{ fontSize: 16, marginBottom: 24, color: '#666' }}>
            Now we'll check the accuracy where you'll actually be looking.
            <br />
            <br />
            <strong>Instructions:</strong>
            <br />
            A star will appear in two places — first over the video area, then
            over the suggested-videos area.
            <br />
            Stare directly at each dot and keep your head still without moving your mouse.
          </p>
          <div style={{
            background: '#e3f2fd',
            border: '1px solid #2196F3',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            fontSize: 14,
            color: '#1565c0'
          }}>
            <strong>Get ready!</strong> The accuracy check will begin shortly.
          </div>
        </Card>
      )}

      {/* Accuracy Measurement Overlay */}
      {isMeasuringAccuracy && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#000',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              color: 'white',
            }}
          >
            <h2 style={{ fontSize: 28, marginBottom: 8 }}>Checking Accuracy...</h2>
            <p style={{ fontSize: 16 }}>
              Stare directly at the character. Keep your head still.
            </p>
          </div>

          {/* Validation target at the current position */}
          {validationDot && (
            <img
              src="/Images/star_wiggle.gif"
              alt=""
              style={{
                position: 'absolute',
                left: validationDot.x,
                top: validationDot.y,
                width: 120,
                height: 120,
                objectFit: 'contain',
                imageRendering: 'pixelated',
                transform: 'translate(-50%, -50%)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>

      <style jsx global>{`
        body #webgazerVideoContainer {
          top: auto !important;
          left: auto !important;
          bottom: 24px !important;
          right: 24px !important;
          z-index: 1001 !important;
        }
      `}</style>

      {isComplete && accuracyPercentage !== null && (
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0 }}>All done!</h2>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 0 }}>Please wait a moment.</p>
        </Card>
      )}
    </PageLayout>
  );
}
