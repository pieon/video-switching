// Tracking service for video event logging

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface TrackingEvent {
  sessionId: string;
  eventType: 'play' | 'pause' | 'switch' | 'complete';
  duration?: number;
  fromVideoId?: string;
  toVideoId?: string;
  playbackPosition?: number;
  timestamp?: string;
}

class TrackingService {
  private token: string | null = null;
  private eventQueue: TrackingEvent[] = [];
  private flushInterval: number | null = null;
  private readonly FLUSH_INTERVAL_MS = 5000; // Flush every 5 seconds
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    // Load token from localStorage
    this.token = localStorage.getItem('authToken');

    // Start auto-flush
    this.startAutoFlush();

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  /**
   * Set authentication token
   */
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  /**
   * Login participant
   */
  async login(participantId: string): Promise<{ token: string; user: any }> {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ participantId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    this.setToken(data.data.token);
    return data.data;
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user');
    }

    const data = await response.json();
    return data.data.user;
  }

  /**
   * Start a new video session
   */
  async startSession(videoId: string): Promise<string> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ videoId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start session');
    }

    const data = await response.json();
    return data.data.session.id;
  }

  /**
   * Complete a video session
   */
  async completeSession(sessionId: string): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/sessions/${sessionId}/complete`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete session');
    }
  }

  /**
   * Track a single event (adds to queue)
   */
  trackEvent(event: TrackingEvent) {
    this.eventQueue.push({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });

    // Auto-flush if queue is too large
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  /**
   * Track a play event
   */
  trackPlay(sessionId: string, playbackPosition: number) {
    this.trackEvent({
      sessionId,
      eventType: 'play',
      playbackPosition,
    });
  }

  /**
   * Track a pause event
   */
  trackPause(sessionId: string, duration: number, playbackPosition: number) {
    this.trackEvent({
      sessionId,
      eventType: 'pause',
      duration,
      playbackPosition,
    });
  }

  /**
   * Track a video switch event
   */
  trackSwitch(sessionId: string, fromVideoId: string, toVideoId: string, playbackPosition: number) {
    this.trackEvent({
      sessionId,
      eventType: 'switch',
      fromVideoId,
      toVideoId,
      playbackPosition,
    });
  }

  /**
   * Track a video completion event
   */
  trackComplete(sessionId: string, playbackPosition: number) {
    this.trackEvent({
      sessionId,
      eventType: 'complete',
      playbackPosition,
    });
  }

  /**
   * Flush events to server
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0 || !this.token) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(`${API_URL}/events/track-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        // Re-add events to queue if failed
        this.eventQueue.unshift(...eventsToSend);
        console.error('Failed to send events to server');
      }
    } catch (error) {
      // Re-add events to queue if failed
      this.eventQueue.unshift(...eventsToSend);
      console.error('Error sending events:', error);
    }
  }

  /**
   * Start auto-flushing events
   */
  private startAutoFlush() {
    this.flushInterval = window.setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Stop auto-flushing
   */
  stopAutoFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

// Export singleton instance
export const trackingService = new TrackingService();
