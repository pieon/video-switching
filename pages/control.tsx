// Experimenter control panel — open in a second window on the same machine.
// Drives the participant window over a BroadcastChannel (see controlChannel).
import { Fragment, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { ControlMessage, GazeView, postControl, useControlMessages } from '@/utils/controlChannel';

type Status = Extract<ControlMessage, { type: 'status' }>;
type PlayerStatus = Extract<ControlMessage, { type: 'playerStatus' }>;
type PageActions = Extract<ControlMessage, { type: 'actions' }>;

const STAGES = [
  { label: 'EEG / Recording', path: '/eeg' },
  { label: 'Calibrate', path: '/calibrate' },
  { label: 'Session Setup', path: '/admin' },
  { label: 'Training', path: '/training' },
  { label: 'Experiment', path: '/player' },
];

const row = { display: 'flex', flexWrap: 'wrap' as const, gap: 8 };
const DOT = 18;
const ACTIVE = '#1976d2';
const INACTIVE = '#ccc';

export default function ControlPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [player, setPlayer] = useState<PlayerStatus | null>(null);
  const [pageActions, setPageActions] = useState<PageActions | null>(null);
  const [gaze, setGaze] = useState<{ x: number; y: number; view: GazeView } | null>(null);

  useControlMessages((msg) => {
    if (msg.type === 'status') {
      // Recording just started (or was already on when this panel opened):
      // show the screen the participant chose to share.
      if (msg.isRecording && !wasRecordingRef.current) showParticipantScreen();
      wasRecordingRef.current = msg.isRecording;
      setStatus(msg);
      if (!msg.path.startsWith('/player')) setPlayer(null);
    }
    if (msg.type === 'playerStatus') setPlayer(msg);
    if (msg.type === 'actions') setPageActions(msg);
    if (msg.type === 'gaze') setGaze(msg.point);
  });

  // Ask an already-open participant window to report in.
  useEffect(() => postControl({ type: 'ping' }), []);

  // Live view of the participant's screen. Normally this is the participant
  // window's own recording stream, read through window.opener (a MediaStream
  // can't go over the BroadcastChannel). If that isn't reachable — panel
  // opened by hand, not recording yet — the experimenter can capture it here.
  const previewRef = useRef<HTMLVideoElement>(null);
  // `own`: captured by this window, so this window stops it.
  const [previewSource, setPreviewSource] = useState<{ stream: MediaStream; own: boolean } | null>(null);
  const preview = previewSource?.stream ?? null;
  const wasRecordingRef = useRef(false);

  const showParticipantScreen = () => {
    try {
      const stream = window.opener?.participantScreen;
      if (stream?.active) {
        setPreviewSource({ stream, own: false });
        return true;
      }
    } catch {
      // Opener navigated away or is not reachable.
    }
    return false;
  };

  const showScreen = async () => {
    if (showParticipantScreen()) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      setPreviewSource({ stream, own: true });
    } catch {
      // Experimenter cancelled the picker.
    }
  };

  useEffect(() => {
    if (previewRef.current) previewRef.current.srcObject = preview;
    if (!previewSource) return;
    // addEventListener, not onended: the participant window's recorder uses
    // onended on its own track.
    const track = previewSource.stream.getVideoTracks()[0];
    const onEnded = () => setPreviewSource(null);
    track?.addEventListener('ended', onEnded);
    return () => {
      track?.removeEventListener('ended', onEnded);
      if (previewSource.own) previewSource.stream.getTracks().forEach((t) => t.stop());
    };
  }, [previewSource, preview]);

  const logout = () => {
    if (window.confirm('Log out the participant? This stops the screen and webcam recording and saves the files.')) {
      postControl({ type: 'logout' });
      // Only works when this panel was opened by script (the login page does
      // that); a panel opened by typing the URL stays open.
      window.close();
    }
  };

  const accuracy = pageActions?.accuracy;

  const refreshButton = (
    <button
      onClick={() => postControl({ type: 'ping' })}
      title="Refresh participant status"
      aria-label="Refresh participant status"
      style={{
        width: 22,
        height: 22,
        padding: 0,
        border: '1px solid #ccc',
        borderRadius: '50%',
        background: '#fff',
        fontSize: 14,
        lineHeight: '20px',
        cursor: 'pointer',
        verticalAlign: 'middle',
      }}
    >
      ↻
    </button>
  );

  const currentStage = STAGES.findIndex((s) => status?.path.startsWith(s.path));

  // Place the gaze (participant viewport CSS px) on the captured frame, then
  // on the letterboxed preview image.
  const gazeDot = (() => {
    const v = previewRef.current;
    if (!gaze || !preview || !v?.videoWidth) return null;
    const { x, y, view } = gaze;
    const fw = v.videoWidth;
    const fh = v.videoHeight;
    const surface = preview.getVideoTracks()[0]?.getSettings().displaySurface;

    // Gaze as a fraction of the captured frame.
    let fx: number;
    let fy: number;
    if (surface === 'browser') {
      // Tab capture is exactly the viewport.
      fx = x / view.innerW;
      fy = y / view.innerH;
    } else if (surface === 'window') {
      // Page spans the window's width with the toolbars above it. Measured
      // from the frame itself, so it holds for any DPI or capture scaling.
      const s = fw / view.innerW;
      fx = x / view.innerW;
      fy = (fh - view.innerH * s + y * s) / fh;
    } else {
      // Whole monitor: page origin = window position + side border + toolbars.
      // ponytail: assumes 100% page zoom (calibration warns when zoom changes).
      const border = (view.outerW - view.innerW) / 2;
      const top = view.outerH - view.innerH - border;
      fx = (view.screenX - view.screenLeft + border + x) / view.screenW;
      fy = (view.screenY - view.screenTop + top + y) / view.screenH;
    }

    const scale = Math.min(v.clientWidth / fw, v.clientHeight / fh);
    const w = fw * scale;
    const h = fh * scale;
    return {
      left: (v.clientWidth - w) / 2 + fx * w,
      top: (v.clientHeight - h) / 2 + fy * h,
    };
  })();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui' }}>
      {/* Live preview fills everything above the stage bar */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', background: '#000' }}>
        <video
          ref={previewRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: preview ? 'block' : 'none' }}
        />
        {gazeDot && (
          <div
            style={{
              position: 'absolute',
              left: gazeDot.left,
              top: gazeDot.top,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'rgba(255, 0, 0, 0.6)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        )}
        {/* Top-right corner: Hide (while previewing), then Logout */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {preview && (
            <Button size="small" variant="secondary" onClick={() => setPreviewSource(null)}>
              Hide
            </Button>
          )}
          <Button size="small" variant="danger" onClick={logout}>
            Exit
          </Button>
        </div>

        {/* Accuracy-check results and choices, over the live preview */}
        {accuracy && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <h2 style={{ marginTop: 0 }}>Accuracy check</h2>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '16px 0' }}>
                {accuracy.results.map((r) => {
                  const pass = r.percentInROI >= accuracy.threshold;
                  return (
                    <div
                      key={r.label}
                      style={{
                        minWidth: 180,
                        padding: 16,
                        borderRadius: 12,
                        border: `2px solid ${pass ? '#4caf50' : '#ff9800'}`,
                        background: pass ? '#e8f5e9' : '#fff3e0',
                      }}
                    >
                      <div style={{ fontSize: 14, color: '#666' }}>{r.label}</div>
                      <div style={{ fontSize: 36, fontWeight: 'bold', color: pass ? '#4caf50' : '#ff9800' }}>
                        {r.percentInROI}%
                      </div>
                      <div style={{ fontSize: 13, color: '#666' }}>within target</div>
                      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{r.offsetCm}cm avg offset</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{r.meanDistPx}px mean distance</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ ...row, justifyContent: 'center' }}>
                {pageActions?.actions.map((a) => (
                  <Button key={a.id} variant={a.variant} onClick={() => postControl({ type: 'action', id: a.id })}>
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!preview && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
            <p>Pick the participant window or monitor in the share dialog.</p>
            <Button onClick={showScreen}>Show participant screen</Button>
          </div>
        )}
      </div>

      {/* Stage bar */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #ddd' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* Participant info */}
          <div style={{ minWidth: 200, fontSize: 14, lineHeight: 1.7 }}>
            {status ? (
              <>
                <div>Participant: <b>{status.participantId ?? '(not logged in)'}</b> {refreshButton}</div>
                <div>
                  Recording:{' '}
                  <b style={{ color: status.isRecording ? '#2e7d32' : '#d32f2f' }}>
                    ● {status.isRecording ? 'ON' : 'OFF'}
                  </b>
                </div>
                {!status.isRecording && status.participantId && (
                  <div style={{ color: '#666', fontSize: 12 }}>Start it by clicking in the participant window (EEG page)</div>
                )}
                {player?.displayWarning && <div style={{ color: '#e65100' }}>⚠ {player.displayWarning}</div>}
              </>
            ) : (
              <div style={{ color: '#666' }}>
                {refreshButton} No participant window found. If this panel was opened by hand, log in from another window of the same browser.
              </div>
            )}
          </div>

          {/* Stage indicator: dots connected by a line; click a dot to jump there */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', padding: '0 48px' }}>
            {STAGES.map((s, i) => (
              <Fragment key={s.path}>
                {i > 0 && (
                  <div style={{ flex: 1, height: 2, marginTop: DOT / 2 - 1, background: i <= currentStage ? ACTIVE : INACTIVE }} />
                )}
                <div
                  onClick={() => postControl({ type: 'navigate', path: s.path })}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 0, cursor: 'pointer' }}
                >
                  <div
                    style={{
                      width: DOT,
                      height: DOT,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: i <= currentStage ? ACTIVE : '#fff',
                      border: `2px solid ${i <= currentStage ? ACTIVE : INACTIVE}`,
                      boxShadow: i === currentStage ? `0 0 0 4px ${ACTIVE}33` : 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, whiteSpace: 'nowrap', fontWeight: i === currentStage ? 700 : 400 }}>
                    {s.label}
                  </div>
                </div>
              </Fragment>
            ))}
          </div>

          {/* The current page's buttons (shown over the preview during accuracy results) */}
          <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pageActions?.info.map((line) => (
              <div key={line} style={{ fontSize: 13, color: '#444' }}>{line}</div>
            ))}
            {!accuracy && !!pageActions?.actions.length && (
              <div style={row}>
                {pageActions.actions.map((a) => (
                  <Button
                    key={a.id}
                    size="small"
                    variant={a.variant}
                    disabled={a.disabled}
                    onClick={() => postControl({ type: 'action', id: a.id })}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {player && (
          <div style={{ ...row, alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 13, color: '#666' }}>
              Completed {player.completed.length} / {player.videos.length}
            </span>
            {player.videos.map((v) => (
              <Button
                key={v.id}
                size="small"
                variant={v.id === player.current ? 'primary' : 'secondary'}
                disabled={player.completed.includes(v.id)}
                onClick={() => postControl({ type: 'select', id: v.id })}
              >
                {player.completed.includes(v.id) ? '✓ ' : ''}{v.title}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
