// Constants and mock data
import { Video } from '@/types';

export const MOCK_VIDEOS: Video[] = [
  // Set A
  { id: "1a", title: "Cafe Chaos",          url: "/videos/stimulant/1_SET A/1_Cafe Chaos 5 minute video.mp4", thumbnail: "/thumbs/stimulant_thumb/Set_A/1_Cafe Chaos 5 minute video thumb.jpg", set: 'A' },
  { id: "2a", title: "One of These Goats",  url: "/videos/stimulant/1_SET A/3_OneOfTheseGoats_5Mins.mp4",     thumbnail: "/thumbs/stimulant_thumb/Set_A/3_OneOfTheseGoats_5Mins thumb.jpg",     set: 'A' },
  { id: "3a", title: "Buried Treasure",     url: "/videos/stimulant/1_SET A/5_BurriedTreasure_5mins.mp4",     thumbnail: "/thumbs/stimulant_thumb/Set_A/5_BurriedTreasure_5mins thumb.jpg",     set: 'A' },
  { id: "4a", title: "Building Bridges",    url: "/videos/stimulant/1_SET A/9_Building Bridges_5mins_v2.mp4", thumbnail: "/thumbs/stimulant_thumb/Set_A/9_Building Bridges_5mins_v2 thumb.jpg", set: 'A' },
  // Set B
  { id: "1b", title: "Zadies Shell Shuffle",url: "/videos/stimulant/2_SET B/2_Zadies Shell Shuffle 5 minute video.mp4", thumbnail: "/thumbs/stimulant_thumb/Set_B/2_Zadies Shell Shuffle 5 minute video thumb.jpg", set: 'B' },
  { id: "2b", title: "Pokey Plant",         url: "/videos/stimulant/2_SET B/4_PokeyPlant_5mins.mp4",                    thumbnail: "/thumbs/stimulant_thumb/Set_B/4_PokeyPlant_5mins thumb.jpg",                    set: 'B' },
  { id: "3b", title: "Lemonade Problem",    url: "/videos/stimulant/2_SET B/6_Lemonade Problem_5mins v2.mp4",           thumbnail: "/thumbs/stimulant_thumb/Set_B/6_Lemonade Problem_5mins v2 thumb.jpg",           set: 'B' },
  { id: "4b", title: "Design Time",         url: "/videos/stimulant/2_SET B/10_Design Time.mp4",                        thumbnail: "/thumbs/stimulant_thumb/Set_B/10_Design Time thumb.jpg",                        set: 'B' },
];

// Phase 1: 5-min videos, set 1
export const TRAINING_VIDEOS_PHASE_1: Video[] = [
  { id: "p1_1", title: "Daniel the Tiger",         url: "/videos/training/Training 1/Daniel the Tiger 5 mins.mp4",         thumbnail: "/thumbs/training_thumb/training_1/Daniel the Tiger 5 mins thumb.jpg" },
  { id: "p1_2", title: "Lyla in the Loop",         url: "/videos/training/Training 1/Lyla in the Loop.mp4",                thumbnail: "/thumbs/training_thumb/training_1/Lyla in the Loop thumb.jpg" },
  { id: "p1_3", title: "Ready Jet Go",             url: "/videos/training/Training 1/Ready Jet Go 5 mins.mp4",             thumbnail: "/thumbs/training_thumb/training_1/Ready Jet Go 5 mins thumb.jpg" },
  { id: "p1_4", title: "Sid the Science Reporter", url: "/videos/training/Training 1/Sid the Science Reporter 5 mins.mp4", thumbnail: "/thumbs/training_thumb/training_1/Sid the Science Reporter 5 mins thumb.jpg" },
];

// Phase 2: 5-sec versions of the same set 1 videos (reuses Phase 1 thumbs)
export const TRAINING_VIDEOS_PHASE_2: Video[] = [
  { id: "p2_1", title: "Daniel the Tiger",         url: "/videos/training/test_training/Daniel the Tiger 5 seconds.mp4", thumbnail: "/thumbs/training_thumb/training_1/Daniel the Tiger 5 mins thumb.jpg" },
  { id: "p2_2", title: "Lyla in the Loop",         url: "/videos/training/test_training/Lyla in the loop 5 seconds.mp4", thumbnail: "/thumbs/training_thumb/training_1/Lyla in the Loop thumb.jpg" },
  { id: "p2_3", title: "Ready Jet Go",             url: "/videos/training/test_training/Ready Jet Go 5 seconds.mp4",     thumbnail: "/thumbs/training_thumb/training_1/Ready Jet Go 5 mins thumb.jpg" },
  { id: "p2_4", title: "Sid the Science Kid",      url: "/videos/training/test_training/Sid the Science Kid 5 seconds.mp4", thumbnail: "/thumbs/training_thumb/training_1/Sid the Science Reporter 5 mins thumb.jpg" },
];

// Phase 3: 5-min videos, set 2
export const TRAINING_VIDEOS_PHASE_3: Video[] = [
  { id: "p3_1", title: "House That Ants Build", url: "/videos/training/Training 2/House That Ants Build.mp4", thumbnail: "/thumbs/training_thumb/training_2/house_that_ants_build_thumb.jpg" },
  { id: "p3_2", title: "Search for String",     url: "/videos/training/Training 2/Search for String.mp4",     thumbnail: "/thumbs/training_thumb/training_2/search_for_string_thumb.jpg" },
  { id: "p3_3", title: "Slot Problem",          url: "/videos/training/Training 2/Slot Problem.mp4",          thumbnail: "/thumbs/training_thumb/training_2/slot_problem_thumb.jpg" },
  { id: "p3_4", title: "Snout Wash Day",        url: "/videos/training/Training 2/Snout Wash Day.mp4",        thumbnail: "/thumbs/training_thumb/training_2/snout_wash_day_thumb.jpg" },
];

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
