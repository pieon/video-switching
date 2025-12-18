// Constants and mock data
import { Video } from '@/types';

export const MOCK_VIDEOS: Video[] = [
  { id: "a", title: "Lamp", url: "/videos/a.MOV", thumbnail: "/thumbs/a.png" },
  { id: "b", title: "Bowl", url: "/videos/b.MOV", thumbnail: "/thumbs/b.png" },
  { id: "c", title: "Dragon", url: "/videos/c.MOV", thumbnail: "/thumbs/c.png" },
];

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
