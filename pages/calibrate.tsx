// Eye tracking calibration page - Next.js
import { useState, useEffect, useRef, useCallback } from 'react';
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

export default function CalibratePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isReady } = useWebGazer({ saveGazeData: false });

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
  const [dwellProgress, setDwellProgress] = useState(0); // 0-100 percentage
  const [isClickEnabled, setIsClickEnabled] = useState(false);
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dwellStartRef = useRef<number | null>(null);
  const gazeCollectionRef = useRef<{ x: number; y: number }[]>([]);

  const CLICKS_PER_POINT = 5;
  const DWELL_TIME_MS = 500; // Time user must hover before click is enabled

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Check if THIS USER already calibrated
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const calibrationKey = `webgazer_calibrated_${user.participantId}`;
      const calibrated = localStorage.getItem(calibrationKey);
      if (calibrated === 'true') {
        router.push('/admin');
      }
    }
  }, [router, user]);

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
    setDwellProgress(0);
    setIsClickEnabled(false);
  };

  // Clear dwell timer on cleanup
  useEffect(() => {
    return () => {
      if (dwellTimerRef.current) {
        clearInterval(dwellTimerRef.current);
      }
    };
  }, []);

  const handlePointMouseEnter = useCallback((index: number) => {
    if (!isCalibrating || currentPointIndex !== index) return;

    // Start dwell timer
    dwellStartRef.current = Date.now();
    setDwellProgress(0);
    setIsClickEnabled(false);

    dwellTimerRef.current = setInterval(() => {
      if (dwellStartRef.current) {
        const elapsed = Date.now() - dwellStartRef.current;
        const progress = Math.min((elapsed / DWELL_TIME_MS) * 100, 100);
        setDwellProgress(progress);

        if (progress >= 100) {
          setIsClickEnabled(true);
          if (dwellTimerRef.current) {
            clearInterval(dwellTimerRef.current);
          }
        }
      }
    }, 16); // ~60fps update
  }, [isCalibrating, currentPointIndex, DWELL_TIME_MS]);

  const handlePointMouseLeave = useCallback(() => {
    // Clear dwell timer and reset progress
    if (dwellTimerRef.current) {
      clearInterval(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    dwellStartRef.current = null;
    setDwellProgress(0);
    setIsClickEnabled(false);
  }, []);

  const handlePointClick = async (pointId: number, index: number) => {
    if (!isCalibrating || currentPointIndex !== index || !isClickEnabled) return;

    // Track click count for visual feedback
    const currentClicks = (clickCounts[pointId] || 0) + 1;
    setClickCounts((prev) => ({ ...prev, [pointId]: currentClicks }));

    // Reset dwell state for next click
    setDwellProgress(0);
    setIsClickEnabled(false);
    dwellStartRef.current = null;

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
    setIsMeasuringAccuracy(true);
    gazeCollectionRef.current = []; // Reset collection

    // Get screen center (target location)
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    // Set up gaze listener to collect predictions
    if (typeof window !== 'undefined' && (window as any).webgazer) {
      const webgazer = (window as any).webgazer;

      // Store original listener if any
      const collectGaze = (data: any) => {
        if (data && data.x && data.y) {
          gazeCollectionRef.current.push({ x: data.x, y: data.y });
        }
      };

      // Add gaze listener
      webgazer.setGazeListener(collectGaze);

      // Wait 5 seconds while collecting gaze predictions
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Clear the listener
      webgazer.setGazeListener(null);
    } else {
      // Fallback if webgazer not available
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    let calculatedAccuracy = 50; // default if no data

    const collectedPoints = gazeCollectionRef.current;

    if (collectedPoints.length > 0) {
      // Calculate average distance from screen center (where the dot is)
      const distances = collectedPoints.map((p) =>
        Math.sqrt(Math.pow(p.x - screenCenterX, 2) + Math.pow(p.y - screenCenterY, 2))
      );

      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

      // Convert distance to accuracy percentage
      // 0px distance = 100% accuracy
      // 200px distance = 0% accuracy (scales linearly)
      const maxDistance = 200; // pixels - adjust based on your needs
      const accuracy = Math.max(0, Math.min(100, 100 - (avgDistance / maxDistance) * 100));
      calculatedAccuracy = Math.round(accuracy);

      console.log(`Accuracy check: ${collectedPoints.length} points collected, avg distance: ${avgDistance.toFixed(1)}px, accuracy: ${calculatedAccuracy}%`);
    } else {
      console.warn('No gaze data collected during accuracy check');
    }

    setAccuracyPercentage(calculatedAccuracy);
    setIsMeasuringAccuracy(false);
    setIsComplete(true);

    // Auto-proceed if accuracy >= 70%
    if (calculatedAccuracy >= 70) {
      if (typeof window !== 'undefined' && user) {
        const calibrationKey = `webgazer_calibrated_${user.participantId}`;
        localStorage.setItem(calibrationKey, 'true');
      }
      // Wait 2 seconds to show the result before proceeding
      await new Promise((resolve) => setTimeout(resolve, 2000));
      router.push('/admin');
    }
  };

  const handleRecalibrate = () => {
    setIsComplete(false);
    setAccuracyPercentage(null);
    if (typeof window !== 'undefined' && (window as any).webgazer) {
      (window as any).webgazer.clearData();
    }
    startCalibration();
  };

  const handleAcceptCalibration = () => {
    if (typeof window !== 'undefined' && user) {
      const calibrationKey = `webgazer_calibrated_${user.participantId}`;
      localStorage.setItem(calibrationKey, 'true');
    }
    router.push('/admin');
  };

  const handleSkipCalibration = () => {
    if (typeof window !== 'undefined' && user) {
      const calibrationKey = `webgazer_calibrated_${user.participantId}`;
      localStorage.setItem(calibrationKey, 'true');
    }
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
        subtitle="Please calibrate your eye tracking for accurate data collection"
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
            You'll see 9 points on the screen. Hover over each point, wait for it to turn green,
            then click. Repeat <strong>{CLICKS_PER_POINT} times</strong> per point.
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
              <li>Sit at a comfortable distance from the screen (40-130 cm)</li>
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

          {/* Instructions */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              fontSize: 16,
              textAlign: 'center',
              maxWidth: 600,
            }}
          >
            Look at the dot, wait for it to turn green, then click. Repeat {CLICKS_PER_POINT} times. Keep your head still.
          </div>

          {/* Calibration points */}
          {CALIBRATION_POINTS.map((point, index) => {
            const isActive = currentPointIndex === index;
            const isCompleted = completedPoints.includes(point.id);
            const clicks = clickCounts[point.id] || 0;

            // Calculate opacity based on clicks (0.2 base + 0.16 per click, up to 1.0)
            const clickOpacity = isActive ? Math.min(0.2 + (clicks * 0.16), 1.0) : 1.0;

            return (
              <button
                key={point.id}
                onClick={() => handlePointClick(point.id, index)}
                onMouseEnter={() => handlePointMouseEnter(index)}
                onMouseLeave={handlePointMouseLeave}
                disabled={!isActive}
                style={{
                  position: 'absolute',
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: isActive ? 80 : 50,
                  height: isActive ? 80 : 50,
                  borderRadius: '50%',
                  border: '4px solid white',
                  background: isCompleted
                    ? '#ffeb3b'  // Yellow when completed
                    : isActive
                    ? '#2196F3'
                    : '#555',
                  cursor: isActive ? (isClickEnabled ? 'pointer' : 'wait') : 'default',
                  transition: 'all 0.3s ease',
                  opacity: isCompleted ? 0.4 : isActive ? clickOpacity : 0.2,
                  boxShadow: isActive
                    ? '0 0 30px rgba(33, 150, 243, 0.8), 0 0 60px rgba(33, 150, 243, 0.4)'
                    : 'none',
                  animation: isActive && isClickEnabled ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  overflow: 'hidden',
                }}
                aria-label={`Calibration point ${point.id}`}
              >
                {/* Dwell progress ring */}
                {isActive && dwellProgress > 0 && dwellProgress < 100 && (
                  <svg
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      transform: 'rotate(-90deg)',
                    }}
                  >
                    <circle
                      cx="50%"
                      cy="50%"
                      r="35%"
                      fill="none"
                      stroke="rgba(76, 175, 80, 0.8)"
                      strokeWidth="8"
                      strokeDasharray={`${dwellProgress * 2.2} 220`}
                    />
                  </svg>
                )}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: isClickEnabled ? 20 : 16,
                      height: isClickEnabled ? 20 : 16,
                      borderRadius: '50%',
                      background: isClickEnabled ? '#4caf50' : 'white',
                      boxShadow: isClickEnabled
                        ? '0 0 15px rgba(76, 175, 80, 0.8)'
                        : '0 0 10px rgba(255, 255, 255, 0.8)',
                      transition: 'all 0.2s ease',
                    }}
                  />
                )}
                {isCompleted && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'white',
                      fontSize: 24,
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
                  </div>
                )}
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
