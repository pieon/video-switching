// EEG setup page - Next.js
// Shown after login, before eye-tracking calibration, so the researcher can
// fit the EEG device on the child while a baseline video plays.
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/layout';
import { Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function EEGPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth={2000} style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => router.push('/calibrate')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            background: 'transparent',
            color: '#000',
            border: '1px solid #000',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Continue to Calibration
        </button>
      </div>

      <Card>
        <video
          src="/videos/training/EEG_Baseline_Video.mp4"
          controls
          loop
          playsInline
          style={{
            width: '100%',
            borderRadius: 12,
            background: '#000',
            display: 'block',
          }}
        />
      </Card>
    </PageLayout>
  );
}
