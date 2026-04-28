// Login form component
import React, { useState } from 'react';
import { Input, Button, Alert } from '@/components/ui';
import { trackingService } from '@/services/trackingService';
import { useAuth } from '@/context/AuthContext';

export function LoginForm() {
  const [participantId, setParticipantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await trackingService.login(participantId);
      console.log('Logged in:', user);
      login(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your Participant ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="text"
        placeholder="Participant ID (e.g., P001)"
        value={participantId}
        onChange={(e) => setParticipantId(e.target.value)}
        disabled={loading}
        required
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Button
        type="submit"
        disabled={loading || !participantId}
        variant="primary"
        fullWidth
        size="large"
      >
        {loading ? 'Logging in...' : 'Start Study'}
      </Button>
    </form>
  );
}
