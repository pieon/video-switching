// Experimenter control panel (/control) <-> participant window messaging.
// Both windows run on the same machine and origin, so a BroadcastChannel is
// enough — no server relay.
import { useEffect, useRef } from 'react';
import { Video } from '@/types';

type ActionVariant = 'primary' | 'secondary' | 'danger' | 'warning';
// Where the participant's page sits on screen, so the panel can place a gaze
// point on whatever surface it captured (tab, window or whole monitor).
export interface GazeView {
  innerW: number;
  innerH: number;
  outerW: number;
  outerH: number;
  screenX: number;
  screenY: number;
  screenLeft: number;
  screenTop: number;
  screenW: number;
  screenH: number;
}

export interface ControlAction {
  id: string;
  label: string;
  variant?: ActionVariant;
  disabled?: boolean;
}

export interface HeadOffset {
  rightCm: number;
  upCm: number;
  closerPct: number;
}

export interface AccuracyResult {
  label: string;
  percentInROI: number;
  offsetCm: number;
  meanDistPx: number;
}

export type ControlMessage =
  // control -> participant
  | { type: 'navigate'; path: string }
  | { type: 'logout' }
  | { type: 'select'; id: string }
  | { type: 'ping' }
  | { type: 'action'; id: string }
  // participant -> control
  | { type: 'status'; path: string; participantId: string | null; isRecording: boolean }
  | {
      type: 'playerStatus';
      current: string | null;
      completed: string[];
      videos: Video[];
      displayWarning: string | null;
    }
  // Live gaze during calibration / accuracy check, in participant viewport
  // CSS px (null = stop showing it).
  | { type: 'gaze'; point: { x: number; y: number; view: GazeView } | null }
  // Head movement since calibration finished, from the participant's point of
  // view (null = no calibration yet, or tracking paused).
  | { type: 'head'; head: HeadOffset | null }
  // Buttons (and status lines) the current participant page offers the panel.
  // With `accuracy`, the panel shows the results and these buttons over the
  // live preview instead of in the bottom bar.
  | {
      type: 'actions';
      actions: ControlAction[];
      info: string[];
      accuracy?: { results: AccuracyResult[]; threshold: number };
    };

const CHANNEL = 'experiment-control';

export function postControl(msg: ControlMessage) {
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage(msg);
  channel.close();
}

export function useControlMessages(handler: (msg: ControlMessage) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e: MessageEvent<ControlMessage>) => handlerRef.current(e.data);
    return () => channel.close();
  }, []);
}

// Participant pages declare the experimenter buttons they currently offer;
// the panel renders them and sends back { type: 'action', id } on click.
export function useControlActions(
  actions: (ControlAction & { run: () => void })[],
  info: string[] = [],
  accuracy?: { results: AccuracyResult[]; threshold: number }
) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const payload: ControlMessage = {
    type: 'actions',
    actions: actions.map(({ id, label, variant, disabled }) => ({ id, label, variant, disabled })),
    info,
    accuracy,
  };
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const key = JSON.stringify(payload);

  useEffect(() => {
    postControl(payloadRef.current);
    // Clear the panel's buttons when this page goes away.
    return () => postControl({ type: 'actions', actions: [], info: [] });
  }, [key]);

  useControlMessages((msg) => {
    if (msg.type === 'ping') postControl(payloadRef.current);
    if (msg.type === 'action') actionsRef.current.find((a) => a.id === msg.id)?.run();
  });
}
