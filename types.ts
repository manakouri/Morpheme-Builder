export enum GameMode {
  MENU,
  DIFFICULTY_SELECTION,
  PRACTICE,
  CHALLENGE,
}

export interface Morpheme {
  id?: string;
  morpheme: string;
  meaning: string;
  type: 'prefix' | 'root' | 'suffix';
}

export interface Question {
  answer: string;
  definition: string;
  parts: string[];
  bank: Morpheme[];
}

export interface FeedbackState {
  message: string;
  type: 'correct' | 'incorrect';
}
