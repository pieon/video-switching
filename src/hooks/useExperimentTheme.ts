import { useEffect } from 'react';

export function useExperimentTheme() {
  useEffect(() => {
    document.body.classList.add('experiment-theme');
    return () => {
      document.body.classList.remove('experiment-theme');
    };
  }, []);
}
