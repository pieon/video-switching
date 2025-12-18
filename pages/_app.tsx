// Next.js App wrapper with AuthProvider
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext';
import '../src/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
