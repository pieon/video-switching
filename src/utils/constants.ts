// Constants and mock data
import { Video } from '@/types';

export const MOCK_VIDEOS: Video[] = [
  // Set A
  { id: "1a", title: "Cafe Chaos",          url: "/videos/1a_Cafe_Chaos.mp4",            thumbnail: "/thumbs/Cafe Chaos.PNG",           set: 'A' },
  { id: "2a", title: "One of These Goats",  url: "/videos/2a_OneOfTheseGoats.mp4",        thumbnail: "/thumbs/One of These Goats.PNG",   set: 'A' },
  { id: "3a", title: "Buried Treasure",     url: "/videos/3a_BurriedTreasure.mp4",        thumbnail: "/thumbs/Burried Treassure.PNG",    set: 'A' },
  { id: "4a", title: "Building Bridges",    url: "/videos/4a_BuildingBridges.mp4",        thumbnail: "/thumbs/Building Bridges.PNG",     set: 'A' },
  // Set B
  { id: "1b", title: "Zadies Shell Shuffle",url: "/videos/1b_Zadies_Shell_Shuffle.mp4",   thumbnail: "/thumbs/Zadies Shell Shuffle.PNG", set: 'B' },
  { id: "2b", title: "Pokey Plant",         url: "/videos/2b_PokeyPlant.mp4",             thumbnail: "/thumbs/Pokey Plant.PNG",          set: 'B' },
  { id: "3b", title: "Lemonade Problem",    url: "/videos/3b_Lemonade_Problem.mp4",       thumbnail: "/thumbs/Lemonade Problem.PNG",     set: 'B' },
  { id: "4b", title: "Design Time",         url: "/videos/4b_Design_Time.mp4",            thumbnail: "/thumbs/Design Time.PNG",          set: 'B' },
];

export const TRAINING_VIDEOS: Video[] = [
  { id: "t1", title: "Ready Jet Go Halloween", url: "/videos/training/Ready Jet Go Halloween-5 seconds.mp4", thumbnail: "/thumbs/training/Ready Jet Go.PNG" },
  { id: "t2", title: "Lyla in the Loop", url: "/videos/training/Lyla in the Loop- When Luke Became Stu - 5 seconds.mp4", thumbnail: "/thumbs/training/Lyla in the Loop.PNG" },
  { id: "t3", title: "Daniel Tiger Teeth Clean", url: "/videos/training/Daniel Tiger Daniel Gets His Teeth Clean-5 seconds.mp4", thumbnail: "/thumbs/training/Daniel Tiger.PNG" },
  { id: "t4", title: "Sid the Science Kid", url: "/videos/training/Sid the Science Kid- Clean Air- 5 seconds.mp4", thumbnail: "/thumbs/training/Sid the Science Kid.PNG" },
];

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
