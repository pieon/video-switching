// Next.js App wrapper with AuthProvider
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext';
import { RecordingProvider } from '@/context/RecordingContext';
import { WebGazerProvider } from '@/context/WebGazerContext';
import '../src/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <RecordingProvider>
        <WebGazerProvider>
          <Component {...pageProps} />
        </WebGazerProvider>
      </RecordingProvider>
    </AuthProvider>
  );
}
