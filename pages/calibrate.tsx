// Eye tracking calibration page - Next.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { PageLayout, Header } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { GazeData } from '@/hooks/useWebGazer';
import { useWebGazerContext } from '@/context/WebGazerContext';

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

  const { isReady, start, resume, pause, setGazeListener, clearCalibrationData, calibratePoint, setMouseTraining } = useWebGazerContext();

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

  useEffect(() => {
    if (!isReady) return;
    setMouseTraining(false);
    return () => {
      setMouseTraining(true);
    };
  }, [isReady, setMouseTraining]);

  const [currentPointIndex, setCurrentPointIndex] = useState<number | null>(null);
  const [clicksRemaining, setClicksRemaining] = useState(0);
  const [completedPoints, setCompletedPoints] = useState<number[]>([]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [randomizedOrder, setRandomizedOrder] = useState<number[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [showAccuracyConfirm, setShowAccuracyConfirm] = useState(false);
  const [isMeasuringAccuracy, setIsMeasuringAccuracy] = useState(false);
  const [accuracyPercentage, setAccuracyPercentage] = useState<number | null>(null);
  const gazeCollectionRef = useRef<{ x: number; y: number }[]>([]);
  // Live gaze readout shown during calibration + accuracy check.
  // Rolling trace of recent gaze points shown during the accuracy check.
  const [gazeTrail, setGazeTrail] = useState<{ x: number; y: number }[]>([]);
  // Current validation target dot ({x,y} in px) and per-point ROI results.
  const [validationDot, setValidationDot] = useState<{ x: number; y: number } | null>(null);
  const [validationResults, setValidationResults] = useState<
    { label: string; percentInROI: number; offsetCm: number }[]
  >([]);
  // Toggled true only during the 3s accuracy window so the shared listener knows
  // when to buffer samples (vs. just updating the live readout).
  const isCollectingRef = useRef(false);
  // Preloaded chime played each time a new calibration point appears.
  const dingRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    dingRef.current = new Audio('/Images/audio/ding.wav');
  }, []);

  // Clicks required per point. Each click records one sample; 4 × 9 = 36 total,
  // well within WebGazer's fixed 50-sample click buffer (dataWindow=50).
  const CLICKS_PER_POINT = 4;

  // ROI validation config (jsPsych webgazer-validate style).
  const ROI_RADIUS = 200;           // px; a sample is "on target" within this radius
  const TIME_TO_SACCADE = 1000;     // ms for the eyes to reach each point before we collect
  const VALIDATION_DURATION = 2000; // ms of gaze collected per point
  const INTER_TARGET_PAUSE = 3000;  // ms of blank screen between validation targets
  const PASS_THRESHOLD = 70;        // min % of samples within ROI (per point) to pass
  const DPI = 96;
  const GAZE_TRAIL_MAX = 20;        // max gaze-trace dots shown; oldest drops off

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

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const startCalibration = () => {
    const indices = Array.from({ length: CALIBRATION_POINTS.length }, (_, i) => i);
    const shuffled = indices.sort(() => Math.random() - 0.5);

    setRandomizedOrder(shuffled);
    setCurrentOrderIndex(0);
    setIsCalibrating(true);
    setCurrentPointIndex(shuffled[0]);
    setClicksRemaining(CLICKS_PER_POINT);
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
      setClicksRemaining(CLICKS_PER_POINT);
    } else {
      setIsCalibrating(false);
      setShowAccuracyConfirm(true);
    }
  };

  // Click mode: each click on the active point records the exact target center
  // once; after CLICKS_PER_POINT clicks the point is done and we advance.
  const handlePointClick = (index: number) => {
    if (!isCalibrating || currentPointIndex !== index) return;

    const point = CALIBRATION_POINTS[index];
    const x = (point.x / 100) * window.innerWidth;
    const y = (point.y / 100) * window.innerHeight;
    calibratePoint(x, y, 'click');

    if (clicksRemaining - 1 > 0) {
      setClicksRemaining(clicksRemaining - 1);
    } else {
      advanceToNextPoint();
    }
  };

  // Chime each time a new calibration point appears.
  useEffect(() => {
    if (!isCalibrating || currentPointIndex === null) return;
    if (dingRef.current) {
      dingRef.current.currentTime = 0;
      dingRef.current.play().catch(() => {});
    }
  }, [isCalibrating, currentPointIndex]);

  // Single gaze listener active while calibrating or measuring: it updates the
  // live readout (throttled) and buffers samples during the accuracy window.
  useEffect(() => {
    if (!isCalibrating && !isMeasuringAccuracy) return;

    const onGaze = (data: GazeData) => {
      if (!data || !data.x || !data.y) return;
      if (isCollectingRef.current) {
        gazeCollectionRef.current.push({ x: data.x, y: data.y });
      }
      // Rolling trace of the last GAZE_TRAIL_MAX viewpoints (accuracy check only).
      if (isMeasuringAccuracy) {
        const point = { x: data.x, y: data.y };
        setGazeTrail((prev) => {
          const next = prev.length >= GAZE_TRAIL_MAX ? prev.slice(1) : prev.slice();
          next.push(point);
          return next;
        });
      }
    };
    setGazeListener(onGaze);

    return () => {
      setGazeListener(null);
      setGazeTrail([]);
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
    const results: { label: string; percentInROI: number; offsetCm: number }[] = [];

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
      results.push({ label: target.label, percentInROI, offsetCm });
      console.log('[Validation]', target.label, {
        target: { x: Math.round(target.x), y: Math.round(target.y) },
        samples: samples.length,
        percentInROI,
        offsetCm,
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
    clearCalibrationData();
    startCalibration();
  };

  // Re-run the ROI validation only, keeping the existing calibration model.
  const handleRedoAccuracyCheck = () => {
    setIsComplete(false);
    setAccuracyPercentage(null);
    setValidationResults([]);
    setGazeTrail([]);
    runValidation();
  };

  const handleAcceptCalibration = () => {
    router.push('/admin');
  };

  const handleSkipCalibration = () => {
    router.push('/admin');
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

      {isReady && !isCalibrating && !isComplete && (
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0 }}>Ready to Calibrate</h2>
          <p style={{ fontSize: 16, marginBottom: 16, color: '#666' }}>
            You'll see 9 points on the screen, one at a time. Look directly at each point and <strong>click it {CLICKS_PER_POINT} times</strong> while keeping your head still.
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
              <li>Look directly at each point while you click it, then it advances to the next</li>
              <li>Sit at a comfortable distance from the screen (~40cm)</li>
              <li>Ensure good lighting on your face</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button onClick={startCalibration} size="large">
              Start Calibration
            </Button>
            <Button onClick={handleSkipCalibration} variant="secondary" size="large">
              Skip Calibration
            </Button>
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
              <button
                key={point.id}
                onClick={() => handlePointClick(index)}
                disabled={!isActive}
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
                  cursor: isActive ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  opacity: isCompleted ? 0.0 : isActive ? 1.0 : 0.0,
                  animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }}
                aria-label={`Calibration point ${point.id}`}
              >
                <img
                  src="/Images/Pulsating-violet-star.gif"
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                    display: 'block',
                  }}
                />
              </button>
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
            <strong>Ready when you are!</strong> Click the button below when you're ready to begin the accuracy test.
          </div>
          <Button onClick={handleStartAccuracyCheck} size="large">
            Start Accuracy Check
          </Button>
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

          {/* Rolling trace of the user's recent gaze points (max GAZE_TRAIL_MAX) */}
          {gazeTrail.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#878786',
                transform: 'translate(-50%, -50%)',
                opacity: ((i + 1) / gazeTrail.length) * 0.8,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Validation target at the current position */}
          {validationDot && (
            <img
              src="/Images/Pulsating-violet-star.gif"
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
        body #webgazerGazeDot {
          background: rgba(33, 150, 243, 0.45) !important;
          width: 10px !important;
          height: 10px !important;
          border-radius: 50% !important;
          box-shadow: none !important;
          opacity: 1 !important;
          display: ${isCalibrating || isMeasuringAccuracy ? 'block' : 'none'} !important;
        }
      `}</style>

      {isComplete && accuracyPercentage !== null && (
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: accuracyPercentage >= PASS_THRESHOLD ? '#4caf50' : '#ff9800' }}>
            {accuracyPercentage >= PASS_THRESHOLD ? '✓ Calibration Complete!' : '⚠ Calibration Completed'}
          </h2>

          {/* Per-region ROI results */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '16px 0 24px' }}>
            {validationResults.map((r) => {
              const pass = r.percentInROI >= PASS_THRESHOLD;
              return (
                <div
                  key={r.label}
                  style={{
                    minWidth: 200,
                    padding: 16,
                    borderRadius: 12,
                    border: `2px solid ${pass ? '#4caf50' : '#ff9800'}`,
                    background: pass ? '#e8f5e9' : '#fff3e0',
                  }}
                >
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 36, fontWeight: 'bold', color: pass ? '#4caf50' : '#ff9800' }}>
                    {r.percentInROI}%
                  </div>
                  <div style={{ fontSize: 13, color: '#666' }}>within target</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    {r.offsetCm}cm avg offset
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: 16, marginBottom: 24, color: '#666' }}>
            {accuracyPercentage >= 85
              ? 'Excellent accuracy in both regions.'
              : accuracyPercentage >= PASS_THRESHOLD
              ? 'Good accuracy. You can proceed, or redo the calibration or the accuracy check for better results.'
              : 'Low accuracy in at least one region. Redo the calibration, or just retry the accuracy check if you think you looked away.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {accuracyPercentage < PASS_THRESHOLD && (
              <>
                <Button onClick={handleRecalibrate} variant="primary" size="large">
                  Redo Calibration
                </Button>
                <Button onClick={handleRedoAccuracyCheck} variant="secondary" size="large">
                  Redo Accuracy Check Only
                </Button>
              </>
            )}
            <Button onClick={handleAcceptCalibration} variant={accuracyPercentage >= PASS_THRESHOLD ? 'primary' : 'secondary'} size="large">
              {accuracyPercentage >= PASS_THRESHOLD ? 'Continue to Settings' : 'Accept Anyway'}
            </Button>
            {accuracyPercentage >= PASS_THRESHOLD && (
              <>
                <Button onClick={handleRecalibrate} variant="secondary" size="large">
                  Redo Calibration
                </Button>
                <Button onClick={handleRedoAccuracyCheck} variant="secondary" size="large">
                  Redo Accuracy Check Only
                </Button>
              </>
            )}
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
