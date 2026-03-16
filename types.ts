
export interface CinematicPrompt {
  chinesePrompt: string;
  vietnameseTranslation: string;
}

export interface Character {
  id: string;
  name: string;
  gender: 'male' | 'female';
  isMain: boolean;
  useCameoOutfit: boolean;
  color: string;
}

export interface Scene {
  id: string;
  description: string; // Vietnamese description
  finalPrompt?: CinematicPrompt;
  loading?: boolean;
  characters?: Character[];
}

export interface Episode {
  id: number;
  title: string;
  summary: string;
  duration: number; // Duration in minutes for this specific episode
  scenes: Scene[];
}

export interface Screenplay {
  overallPlot: string;
  intensityLevel: 'storytelling' | 'action-drama' | 'hardcore';
  episodes: Episode[];
}

export interface IdeaSuggestion {
  title: string;
  description: string;
}
