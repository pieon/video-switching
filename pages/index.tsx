// Login page - Next.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { LoginForm } from '@/components/forms';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Redirect to calibration if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      // Check if THIS USER has been calibrated
      const calibrationKey = `webgazer_calibrated_${user.participantId}`;
      const calibrated = localStorage.getItem(calibrationKey);

      if (calibrated === 'true') {
        router.push('/admin');
      } else {
        router.push('/calibrate');
      }
    }
  }, [user, isLoading, router]);

  const handleResearcherMode = () => {
    router.push('/researcher');
  };

  if (isLoading) {
    return (
      <PageLayout maxWidth={500}>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth={500} style={{ marginTop: 100 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 32 }}>
        Video Watching Study
      </h1>

      <Card>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Welcome</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          Please enter your Participant ID to begin the study.
        </p>

        <LoginForm />

        <p
          style={{
            marginTop: 24,
            fontSize: 12,
            color: '#999',
            textAlign: 'center',
          }}
        >
          If you don't have a Participant ID, please contact the researcher.
        </p>
      </Card>

      <Button
        onClick={handleResearcherMode}
        variant="secondary"
        fullWidth
        size="medium"
        style={{
          marginTop: 16,
          background: '#6c757d',
          color: 'white',
        }}
      >
        Researcher Dashboard
      </Button>
    </PageLayout>
  );
}
