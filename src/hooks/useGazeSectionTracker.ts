// Hook to track gaze transitions between top and bottom screen sections
import { useRef, useCallback } from 'react';
import { GazeData } from './useWebGazer';

type Section = 'top' | 'bottom';

export interface SectionTransition {
  from: Section;
  to: Section;
  timestamp: number;
}

const STORAGE_KEY = 'gaze_transitions';

/** Read all saved transitions from localStorage (keyed by participantId). */
function loadTransitions(): Record<string, SectionTransition[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Append transitions for a participant and persist to localStorage. */
function persistTransitions(participantId: string, transitions: SectionTransition[]) {
  const all = loadTransitions();
  const existing = all[participantId] || [];
  all[participantId] = [...existing, ...transitions];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function buildGazeCSV(): string | null {
  const all = loadTransitions();
  const entries = Object.entries(all);
  if (entries.length === 0) return null;

  const header = 'participantId,from,to,timestamp';
  const rows: string[] = [];
  for (const [pid, transitions] of entries) {
    for (const t of transitions) {
      rows.push(`${pid},${t.from},${t.to},${t.timestamp}`);
    }
  }
  if (rows.length === 0) return null;
  return [header, ...rows].join('\n');
}

/** Download all stored gaze transitions as a CSV file. */
export function downloadGazeCSV() {
  const csv = buildGazeCSV();
  if (!csv) {
    alert('No gaze section transitions recorded yet.');
    return;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gaze_transitions_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

interface UseGazeSectionTrackerOptions {
  participantId?: string;
  splitRatio?: number;
}

export function useGazeSectionTracker({ participantId, splitRatio = 0.67 }: UseGazeSectionTrackerOptions = {}) {
  const currentSectionRef = useRef<Section | null>(null);
  const transitionsRef = useRef<SectionTransition[]>([]);
  const splitRatioRef = useRef(splitRatio);
  splitRatioRef.current = splitRatio;

  const gazeCountRef = useRef(0);
  const processGaze = useCallback((data: GazeData) => {
    gazeCountRef.current++;
    const splitY = window.innerHeight * splitRatioRef.current;
    const section: Section = data.y < splitY ? 'top' : 'bottom';

    if (gazeCountRef.current <= 3 || gazeCountRef.current % 200 === 0) {
      console.log(`[GazeTracker] #${gazeCountRef.current}: y=${Math.round(data.y)}, splitY=${Math.round(splitY)}, section=${section}, transitions=${transitionsRef.current.length}`);
    }

    if (currentSectionRef.current === null) {
      currentSectionRef.current = section;
      return;
    }

    if (section !== currentSectionRef.current) {
      transitionsRef.current.push({
        from: currentSectionRef.current,
        to: section,
        timestamp: data.timestamp,
      });
      console.log(`[GazeTracker] Transition: ${currentSectionRef.current} → ${section} (total: ${transitionsRef.current.length})`);
      currentSectionRef.current = section;
    }
  }, []);

  /** Persist current transitions to localStorage then clear the buffer. */
  const saveAndClearTransitions = useCallback(() => {
    console.log(`[GazeTracker] saveAndClearTransitions called — participantId=${participantId}, transitions=${transitionsRef.current.length}`);
    if (participantId && transitionsRef.current.length > 0) {
      persistTransitions(participantId, transitionsRef.current);
      console.log(`[GazeTracker] Persisted ${transitionsRef.current.length} transitions for ${participantId}`);
    }
    transitionsRef.current = [];
    currentSectionRef.current = null;
  }, [participantId]);

  return {
    processGaze,
    saveAndClearTransitions,
  };
}
