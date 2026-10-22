// Experimenter control panel (/control) <-> participant window messaging.
// Both windows run on the same machine and origin, so a BroadcastChannel is
// enough — no server relay.
import { useEffect, useRef } from 'react';
import { Video } from '@/types';

export type ControlMessage =
  // control -> participant
  | { type: 'navigate'; path: string }
  | { type: 'logout' }
  | { type: 'skip' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'select'; id: string }
  | { type: 'ping' }
  // participant -> control
  | { type: 'status'; path: string; participantId: string | null; isRecording: boolean }
  | {
      type: 'playerStatus';
      current: string | null;
      completed: string[];
      videos: Video[];
      displayWarning: string | null;
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
