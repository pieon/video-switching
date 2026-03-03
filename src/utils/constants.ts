// Constants and mock data
import { Video } from '@/types';

export const MOCK_VIDEOS: Video[] = [
  { id: "1", title: "Cafe Chaos", url: "/videos/1_Cafe Chaos 5 minute video.mp4", thumbnail: "/thumbs/Cafe Chaos.PNG" },
  { id: "2", title: "Zadies Shell Shuffle", url: "/videos/2_Zadies Shell Shuffle 5 minute video.mp4", thumbnail: "/thumbs/Zadies Shell Shuffle.PNG" },
  { id: "3", title: "One of These Goats", url: "/videos/3_OneOfTheseGoats_5Mins.mp4", thumbnail: "/thumbs/One of These Goats.PNG" },
  { id: "4", title: "Buried Treasure", url: "/videos/7_BurriedTreasure_5mins.mp4", thumbnail: "/thumbs/Burried Treassure.PNG" },
  { id: "5", title: "Building Bridges", url: "/videos/BuildingBridges_5mins.mp4", thumbnail: "/thumbs/Building Bridges.PNG" },
  { id: "6", title: "Design Time", url: "/videos/Design Time.mp4", thumbnail: "/thumbs/Design Time.PNG" },
  { id: "7", title: "Lemonade Problem", url: "/videos/Lemonade Problem - 5 mins.mp4", thumbnail: "/thumbs/Lemonade Problem.PNG" },
  { id: "8", title: "Pokey Plant", url: "/videos/PokeyPlant_5mins.mp4", thumbnail: "/thumbs/Pokey Plant.PNG" },
];

export const TRAINING_VIDEOS: Video[] = [
  { id: "t1", title: "Ready Jet Go Halloween", url: "/videos/training/Ready Jet Go Halloween-5 seconds.mp4", thumbnail: "/thumbs/training/Ready Jet Go.PNG" },
  { id: "t2", title: "Lyla in the Loop", url: "/videos/training/Lyla in the Loop- When Luke Became Stu - 5 seconds.mp4", thumbnail: "/thumbs/training/Lyla in the Loop.PNG" },
  { id: "t3", title: "Daniel Tiger Teeth Clean", url: "/videos/training/Daniel Tiger Daniel Gets His Teeth Clean-5 seconds.mp4", thumbnail: "/thumbs/training/Daniel Tiger.PNG" },
  { id: "t4", title: "Sid the Science Kid", url: "/videos/training/Sid the Science Kid- Clean Air- 5 seconds.mp4", thumbnail: "/thumbs/training/Sid the Science Kid.PNG" },
];

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
