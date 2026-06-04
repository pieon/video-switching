// Eye tracking calibration page - Next.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { PageLayout, Header } from '@/components/layout';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useWebGazer } from '@/hooks/useWebGazer';

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

  // Camera was already chosen on the EEG page; read it from localStorage.
  // selectedCameraId stays null until loaded so WebGazer initializes once
  // with the chosen device (avoids a teardown/re-init race).
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCameraId(localStorage.getItem(CAMERA_STORAGE_KEY) ?? '');
  }, []);

  const { isReady } = useWebGazer({
    saveGazeData: false,
    cameraDeviceId: selectedCameraId || undefined,
    enabled: selectedCameraId !== null,
  });

  const [currentPointIndex, setCurrentPointIndex] = useState<number | null>(null);
  const [clicksRemaining, setClicksRemaining] = useState(5); // 5 clicks per point
  const [completedPoints, setCompletedPoints] = useState<number[]>([]);
  const [clickCounts, setClickCounts] = useState<{ [key: number]: number }>({});
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [randomizedOrder, setRandomizedOrder] = useState<number[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [showAccuracyConfirm, setShowAccuracyConfirm] = useState(false);
  const [isMeasuringAccuracy, setIsMeasuringAccuracy] = useState(false);
  const [accuracyPercentage, setAccuracyPercentage] = useState<number | null>(null);
  const lastClickTimeRef = useRef<number | null>(null);
  const gazeCollectionRef = useRef<{ x: number; y: number }[]>([]);

  const CLICKS_PER_POINT = 5;
  const CLICK_BUFFER_MS = 500; // Buffer between clicks to prevent accidental rapid taps

  // Follows WebGazer's precision_calculation.js
  const calculatePrecision = (
    xArray: number[],
    yArray: number[],
    staringPointX: number,
    staringPointY: number
  ): number => {
    const halfWindowHeight = window.innerHeight / 2;
    const numPoints = Math.min(xArray.length, yArray.length);
    const precisionPercentages: number[] = [];

    for (let i = 0; i < numPoints; i++) {
      const distance = Math.sqrt(
        Math.pow(staringPointX - xArray[i], 2) + Math.pow(staringPointY - yArray[i], 2)
      );

      let precision: number;
      if (distance <= halfWindowHeight && distance > -1) {
        // Linear falloff: 0px = 100%, halfWindowHeight = 0%
        precision = 100 - (distance / halfWindowHeight * 100);
      } else if (distance > halfWindowHeight) {
        precision = 0;
      } else {
        precision = 100;
      }

      precisionPercentages.push(precision);
    }

    if (precisionPercentages.length === 0) return 0;
    const sum = precisionPercentages.reduce((a, b) => a + b, 0);
    return Math.round(sum / precisionPercentages.length);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const startCalibration = () => {
    // Create a randomized order of point indices
    const indices = Array.from({ length: CALIBRATION_POINTS.length }, (_, i) => i);
    const shuffled = indices.sort(() => Math.random() - 0.5);

    setRandomizedOrder(shuffled);
    setCurrentOrderIndex(0);
    setIsCalibrating(true);
    setCurrentPointIndex(shuffled[0]);
    setClicksRemaining(CLICKS_PER_POINT);
    setCompletedPoints([]);
    setClickCounts({});
    setAccuracyPercentage(null);
    lastClickTimeRef.current = null;
  };

  const handlePointClick = async (pointId: number, index: number) => {
    if (!isCalibrating || currentPointIndex !== index) return;

    // Check click buffer to prevent rapid taps
    const now = Date.now();
    if (lastClickTimeRef.current && now - lastClickTimeRef.current < CLICK_BUFFER_MS) {
      return; // Too soon since last click
    }
    lastClickTimeRef.current = now;

    // Track click count for visual feedback
    const currentClicks = (clickCounts[pointId] || 0) + 1;
    setClickCounts((prev) => ({ ...prev, [pointId]: currentClicks }));

    // Decrement clicks for this point
    const newClicksRemaining = clicksRemaining - 1;
    setClicksRemaining(newClicksRemaining);

    // Wait for WebGazer to record the click (recommended delay)
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (newClicksRemaining === 0) {
      // Point completed, mark it
      setCompletedPoints((prev) => [...prev, pointId]);

      // Move to next point in randomized order or finish
      const nextOrderIndex = currentOrderIndex + 1;
      if (nextOrderIndex < randomizedOrder.length) {
        setCurrentOrderIndex(nextOrderIndex);
        setCurrentPointIndex(randomizedOrder[nextOrderIndex]);
        setClicksRemaining(CLICKS_PER_POINT);
      } else {
        // All points calibrated - show confirmation before measuring accuracy
        setIsCalibrating(false);
        setShowAccuracyConfirm(true);
      }
    }
  };

  const handleStartAccuracyCheck = () => {
    setShowAccuracyConfirm(false);
    measureAccuracy();
  };

  const measureAccuracy = async () => {
    console.log('[Accuracy] measureAccuracy() called');
    setIsMeasuringAccuracy(true);
    gazeCollectionRef.current = [];

    // Staring/target point is the center of the screen (matches WebGazer's approach)
    const staringPointX = window.innerWidth / 2;
    const staringPointY = window.innerHeight / 2;

    const WebGazerModule = typeof window !== 'undefined' ? await import('webgazer') : null;
    const webgazer: any = WebGazerModule?.default;

    if (webgazer) {
      console.log('[Accuracy] WebGazer found');

      // Collect gaze predictions via listener
      const collectGaze = (data: any) => {
        if (data && data.x && data.y) {
          gazeCollectionRef.current.push({ x: data.x, y: data.y });
        }
      };
      webgazer.setGazeListener(collectGaze);

      // Wait 5 seconds while user stares at center dot
      console.log('[Accuracy] Waiting 5 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Restore WebGazer's default no-op listener. Passing null would make the
      // (unguarded) internal prediction loop call null(...) → "callback is not
      // a function".
      webgazer.clearGazeListener();

      console.log('[Accuracy] 5s elapsed. Collected:', gazeCollectionRef.current.length, 'points');

      // Use the last 50 points (matching WebGazer's circular buffer size)
      const points = gazeCollectionRef.current.slice(-50);
      const xArray = points.map((p) => p.x);
      const yArray = points.map((p) => p.y);

      // Step 5: Calculate precision using WebGazer's method
      let calculatedAccuracy = 50;

      if (xArray.length > 0) {
        calculatedAccuracy = calculatePrecision(xArray, yArray, staringPointX, staringPointY);
        console.log(
          `Accuracy check: ${xArray.length} points, precision: ${calculatedAccuracy}%`
        );
      } else {
        console.warn('No gaze data collected during accuracy check');
      }

      setAccuracyPercentage(calculatedAccuracy);
      setIsMeasuringAccuracy(false);
      setIsComplete(true);

      // Auto-proceed if accuracy >= 70%
      if (calculatedAccuracy >= 70) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        router.push('/admin');
      }
    } else {
      console.warn('[Accuracy] WebGazer NOT found on window');
      // Fallback if webgazer not available
      await new Promise((resolve) => setTimeout(resolve, 5000));
      setAccuracyPercentage(50);
      setIsMeasuringAccuracy(false);
      setIsComplete(true);
    }
  };

  const handleRecalibrate = async () => {
    setIsComplete(false);
    setAccuracyPercentage(null);
    if (typeof window !== 'undefined') {
      const WGModule = await import('webgazer');
      const wg: any = WGModule.default;
      if (wg) wg.clearData();
    }
    startCalibration();
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
            You'll see 9 points on the screen. Stare at a point that turned <strong style={{ color: '#ffc107' }}>yellow</strong> but <strong>do not move your head</strong>.
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
              <li>Look directly at each point and wait for it to turn green before clicking</li>
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
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000,
          }}
        >
          {/* Progress indicator */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              fontSize: 20,
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            <div>Point {currentOrderIndex + 1} of {CALIBRATION_POINTS.length}</div>
          </div>

          {/* Calibration points */}
          {CALIBRATION_POINTS.map((point, index) => {
            const isActive = currentPointIndex === index;
            const isCompleted = completedPoints.includes(point.id);

            // Start at 100% opacity when highlighted, decrease by 0.16 per click (down to 0.2)
            const clickOpacity = 1.0

            return (
              <button
                key={point.id}
                onClick={() => handlePointClick(point.id, index)}
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
                  opacity: isCompleted ? 0.1 : isActive ? clickOpacity : 0.4,
                  animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }}
                aria-label={`Calibration point ${point.id}`}
              >
                <img
                  src={
                    isCompleted ? '/Images/greenflower.png' :
                    isActive    ? '/Images/yellowflower.png' :
                                  '/Images/blueflower.png'
                  }
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
            Now we'll measure the accuracy of your calibration.
            <br />
            <br />
            <strong>Instructions:</strong>
            <br />
            You'll see a blue dot in the center of the screen for 5 seconds.
            <br />
            Keep your head still and stare directly at the dot without moving your mouse.
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
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h2 style={{ fontSize: 28, marginBottom: 24 }}>Measuring Accuracy...</h2>
            <p style={{ fontSize: 18, marginBottom: 40 }}>
              Please stare at the center dot for 5 seconds.
              <br />
              Keep your head still and don't move your mouse.
            </p>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#2196F3',
                margin: '0 auto',
                boxShadow: '0 0 30px rgba(33, 150, 243, 0.8)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
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
        #webgazerGazeDot {
          background: url('/Images/LadyBugSprite.png') center / contain no-repeat !important;
          background-color: transparent !important;
          width: 60px !important;
          height: 60px !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          opacity: 1 !important;
          image-rendering: pixelated;
          display: ${isCalibrating || isMeasuringAccuracy ? 'block' : 'none'} !important;
        }
      `}</style>

      {isComplete && accuracyPercentage !== null && (
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: accuracyPercentage >= 70 ? '#4caf50' : '#ff9800' }}>
            {accuracyPercentage >= 70 ? '✓ Calibration Complete!' : '⚠ Calibration Completed'}
          </h2>
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: accuracyPercentage >= 70 ? '#4caf50' : '#ff9800',
              marginBottom: 16,
            }}
          >
            {accuracyPercentage}%
          </div>
          <p style={{ fontSize: 16, marginBottom: 24, color: '#666' }}>
            {accuracyPercentage >= 80
              ? 'Excellent accuracy! Your eye tracking is working very well.'
              : accuracyPercentage >= 70
              ? 'Good accuracy. You can proceed or recalibrate for better results.'
              : 'Low accuracy detected. We recommend recalibrating for better results.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {accuracyPercentage < 70 && (
              <Button onClick={handleRecalibrate} variant="primary" size="large">
                Recalibrate
              </Button>
            )}
            <Button onClick={handleAcceptCalibration} variant={accuracyPercentage >= 70 ? 'primary' : 'secondary'} size="large">
              {accuracyPercentage >= 70 ? 'Continue to Settings' : 'Accept Anyway'}
            </Button>
            {accuracyPercentage >= 70 && (
              <Button onClick={handleRecalibrate} variant="secondary" size="large">
                Recalibrate
              </Button>
            )}
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
