// Experimenter control panel — open in a second window on the same machine.
// Drives the participant window over a BroadcastChannel (see controlChannel).
import { useEffect, useState } from 'react';
import { PageLayout } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { ControlMessage, postControl, useControlMessages } from '@/utils/controlChannel';

type Status = Extract<ControlMessage, { type: 'status' }>;
type PlayerStatus = Extract<ControlMessage, { type: 'playerStatus' }>;

const STAGES = [
  { label: 'EEG / Recording', path: '/eeg' },
  { label: 'Calibrate', path: '/calibrate' },
  { label: 'Session Setup', path: '/admin' },
  { label: 'Training', path: '/training' },
  { label: 'Experiment', path: '/player' },
];

const row = { display: 'flex', flexWrap: 'wrap' as const, gap: 8 };

export default function ControlPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [player, setPlayer] = useState<PlayerStatus | null>(null);

  useControlMessages((msg) => {
    if (msg.type === 'status') {
      setStatus(msg);
      if (!msg.path.startsWith('/player')) setPlayer(null);
    }
    if (msg.type === 'playerStatus') setPlayer(msg);
  });

  // Ask an already-open participant window to report in.
  useEffect(() => postControl({ type: 'ping' }), []);

  const logout = () => {
    if (window.confirm('Log out the participant? This stops the screen and webcam recording and saves the files.')) {
      postControl({ type: 'logout' });
    }
  };

  return (
    <PageLayout maxWidth={800} style={{ marginTop: 24 }}>
      <h1 style={{ marginTop: 0 }}>Experimenter Control</h1>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Participant window</h3>
        {status ? (
          <div style={{ fontSize: 15, lineHeight: 1.8 }}>
            <div>Participant: <b>{status.participantId ?? '(not logged in)'}</b></div>
            <div>Page: <code>{status.path}</code></div>
            <div>
              Recording:{' '}
              <b style={{ color: status.isRecording ? '#2e7d32' : '#d32f2f' }}>
                {status.isRecording ? 'ON' : 'OFF'}
              </b>
              {!status.isRecording && status.participantId && (
                <span style={{ color: '#666' }}> — must be started by clicking in the participant window (EEG page)</span>
              )}
            </div>
            {player?.displayWarning && (
              <div style={{ color: '#e65100' }}>⚠ {player.displayWarning}</div>
            )}
          </div>
        ) : (
          <p style={{ color: '#666' }}>
            No participant window found. Open the app in another window (same browser) and log in.
          </p>
        )}
        <Button size="small" variant="secondary" onClick={() => postControl({ type: 'ping' })}>
          Refresh
        </Button>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Stage</h3>
        <div style={row}>
          {STAGES.map((s) => (
            <Button
              key={s.path}
              size="small"
              variant={status?.path.startsWith(s.path) ? 'primary' : 'secondary'}
              onClick={() => postControl({ type: 'navigate', path: s.path })}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div style={{ ...row, marginTop: 16 }}>
          <Button size="small" variant="warning" onClick={() => postControl({ type: 'skip' })}>
            Skip training step
          </Button>
          <Button size="small" variant="danger" onClick={logout}>
            Logout & save recordings
          </Button>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Playback</h3>
        <div style={row}>
          <Button size="small" onClick={() => postControl({ type: 'pause' })}>❚❚ Pause</Button>
          <Button size="small" onClick={() => postControl({ type: 'resume' })}>▶︎ Resume</Button>
        </div>
        {player && (
          <>
            <p style={{ fontSize: 14, color: '#666' }}>
              Completed {player.completed.length} / {player.videos.length}
            </p>
            <div style={row}>
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
          </>
        )}
      </Card>
    </PageLayout>
  );
}
