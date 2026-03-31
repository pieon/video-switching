// Authentication context for managing user state
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Mode, VideoSet } from '@/types';
import { trackingService } from '@/services/trackingService';

interface AuthContextType {
  user: User | null;
  mode: Mode;
  videoSet: VideoSet;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  setMode: (mode: Mode) => void;
  setVideoSet: (set: VideoSet) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>("non-switching");
  const [videoSet, setVideoSet] = useState<VideoSet>('A');
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = trackingService.getToken();
      if (token) {
        try {
          const currentUser = await trackingService.getCurrentUser();
          setUser(currentUser);
          setMode(currentUser.condition);
          setVideoSet(currentUser.videoSet ?? 'A');
        } catch (error) {
          console.error('Auth check failed:', error);
          trackingService.clearToken();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = (loggedInUser: User) => {
    setUser(loggedInUser);
    setMode(loggedInUser.condition);
    setVideoSet(loggedInUser.videoSet ?? 'A');
  };

  const logout = () => {
    trackingService.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, mode, videoSet, isLoading, login, logout, setMode, setVideoSet }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
