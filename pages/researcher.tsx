// Researcher dashboard page - Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PageLayout, Header } from '@/components/layout';
import { Button, Alert } from '@/components/ui';
import { Participant } from '@/types';
import { downloadGazeCSV } from '@/hooks/useGazeSectionTracker';

export default function ResearcherPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newParticipantId, setNewParticipantId] = useState('');
  const [newCondition, setNewCondition] = useState<'switching' | 'non_switching'>('switching');
  const [newVideoSet, setNewVideoSet] = useState<'A' | 'B'>('A');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  const fetchParticipants = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/users/all`);
      if (!response.ok) throw new Error('Failed to fetch participants');
      const result = await response.json();
      setParticipants(result.data?.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const handleCreateParticipant = async () => {
    setCreateError('');
    setCreateSuccess('');

    if (!newParticipantId.trim()) {
      setCreateError('Participant ID is required');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: newParticipantId.trim(),
          condition: newCondition,
          videoSet: newVideoSet,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create participant');
      }

      setCreateSuccess(`Participant ${newParticipantId} created successfully!`);
      setNewParticipantId('');
      setNewCondition('switching');
      setNewVideoSet('A');
      fetchParticipants();

      // Close form after 2 seconds
      setTimeout(() => {
        setShowCreateForm(false);
        setCreateSuccess('');
      }, 2000);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create participant');
    }
  };

  const handleExportCSV = async (
    type: 'events' | 'sessions' | 'participants'
  ) => {
    try {
      const response = await fetch(`${API_URL}/analytics/export?type=${type}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  return (
    <PageLayout maxWidth={1200}>
      <Header
        title="Researcher Dashboard"
        onBackClick={() => router.push('/')}
        backButtonText="Back to Login"
      />

      <div style={{ marginBottom: 24 }}>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant="primary"
          size="medium"
          style={{ marginBottom: 16 }}
        >
          {showCreateForm ? 'Cancel' : '+ Create New Participant'}
        </Button>

        {showCreateForm && (
          <div
            style={{
              background: 'white',
              padding: 20,
              borderRadius: 8,
              border: '1px solid #ddd',
              marginBottom: 16,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>
              Create New Participant
            </h3>

            {createError && <Alert variant="error">{createError}</Alert>}
            {createSuccess && <Alert variant="success">{createSuccess}</Alert>}

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Participant ID:
              </label>
              <input
                type="text"
                value={newParticipantId}
                onChange={(e) => setNewParticipantId(e.target.value)}
                placeholder="Enter participant ID (e.g., P001)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 16,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Starting Mode:
              </label>
              <select
                value={newCondition}
                onChange={(e) =>
                  setNewCondition(e.target.value as 'switching' | 'non_switching')
                }
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 16,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  boxSizing: 'border-box',
                }}
              >
                <option value="switching">Switching</option>
                <option value="non_switching">Non-Switching</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Starting Video Set:
              </label>
              <select
                value={newVideoSet}
                onChange={(e) => setNewVideoSet(e.target.value as 'A' | 'B')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 16,
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  boxSizing: 'border-box',
                }}
              >
                <option value="A">Set A (Cafe Chaos, One of These Goats, Buried Treasure, Building Bridges)</option>
                <option value="B">Set B (Zadies Shell Shuffle, Pokey Plant, Lemonade Problem, Design Time)</option>
              </select>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Session 2 will automatically use the opposite set + opposite mode.
              </div>
            </div>

            <Button
              onClick={handleCreateParticipant}
              variant="primary"
              size="medium"
            >
              Create Participant
            </Button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Button
          onClick={() => handleExportCSV('events')}
          variant="primary"
          size="medium"
        >
          Export Events
        </Button>
        <Button
          onClick={() => handleExportCSV('sessions')}
          size="medium"
          style={{ background: '#28a745', color: 'white' }}
        >
          Export Sessions
        </Button>
        <Button
          onClick={() => handleExportCSV('participants')}
          variant="warning"
          size="medium"
        >
          Export Participants
        </Button>
        <Button
          onClick={downloadGazeCSV}
          size="medium"
          style={{ background: '#6a1b9a', color: 'white' }}
        >
          Export Gaze Transitions
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          Loading participants...
        </div>
      ) : error ? (
        <Alert variant="error">{error}</Alert>
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #ddd',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottom: '1px solid #ddd',
              background: '#f9f9f9',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>
              Participants ({participants.length})
            </h2>
            <Button
              onClick={fetchParticipants}
              variant="secondary"
              size="small"
              style={{
                background: 'white',
                color: '#333',
                border: '1px solid #ddd',
              }}
            >
              Refresh
            </Button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: '#f9f9f9',
                  borderBottom: '1px solid #ddd',
                }}
              >
                <th style={{ padding: 12, textAlign: 'left' }}>
                  Participant ID
                </th>
                <th style={{ padding: 12, textAlign: 'left' }}>Starting Mode</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Starting Set</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Sessions</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>
                    {p.participantId}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          p.condition === 'switching' ? '#E3F2FF' : '#FFF8DC',
                        color:
                          p.condition === 'switching' ? '#007AFF' : '#856404',
                      }}
                    >
                      {p.condition === 'switching'
                        ? 'Switching'
                        : 'Non-Switching'}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      background: p.videoSet === 'A' ? '#E8F5E9' : '#FCE4EC',
                      color: p.videoSet === 'A' ? '#2E7D32' : '#C62828',
                    }}>
                      Set {p.videoSet ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{p._count?.sessions || 0}</td>
                  <td style={{ padding: 12, color: '#666' }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
