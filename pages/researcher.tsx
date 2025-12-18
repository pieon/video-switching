// Researcher dashboard page - Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PageLayout, Header } from '@/components/layout';
import { Button, Alert } from '@/components/ui';
import { Participant } from '@/types';

export default function ResearcherPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                <th style={{ padding: 12, textAlign: 'left' }}>Condition</th>
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
