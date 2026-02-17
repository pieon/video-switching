// Constants and mock data
import { Video } from '@/types';

export const MOCK_VIDEOS: Video[] = [
  { id: "1", title: "Cafe Chaos", url: "/videos/1_Cafe Chaos 5 minute video.mp4", thumbnail: "/thumbs/Cafe Chaos.PNG" },
  { id: "2", title: "Zadies Shell Shuffle", url: "/videos/2_Zadies Shell Shuffle 5 minute video.mp4", thumbnail: "/thumbs/Zadies Shell Shuffle.PNG" },
  { id: "3", title: "One of These Goats", url: "/videos/3_OneOfTheseGoats_5Mins.mp4", thumbnail: "/thumbs/One of These Goats.PNG" },
  { id: "4", title: "Buried Treasure", url: "/videos/7_BurriedTreasure_5mins.mp4", thumbnail: "/thumbs/Burried Treassure.PNG" },
  { id: "5", title: "Building Bridges", url: "/videos/BuildingBridges_5mins.mp4", thumbnail: "/thumbs/Building Bridges.PNG" },
  { id: "6", title: "Bunny Hunt", url: "/videos/BunnyHunt_5mins.mp4", thumbnail: "/thumbs/Bunny Hunt.PNG" },
  { id: "7", title: "Design Time", url: "/videos/Design Time.mp4", thumbnail: "/thumbs/Design Time.PNG" },
  { id: "8", title: "Lemonade Problem", url: "/videos/Lemonade Problem - 5 mins.mp4", thumbnail: "/thumbs/Lemonade Problem.PNG" },
  { id: "9", title: "Pokey Plant", url: "/videos/PokeyPlant_5mins.mp4", thumbnail: "/thumbs/Pokey Plant.PNG" },
  { id: "10", title: "Rocket Ride", url: "/videos/RocketRide_5mins.mp4", thumbnail: "/thumbs/Rocket Ride.PNG" },
];

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
