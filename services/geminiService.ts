import { morphemes, wordList } from '../data/morpheme-database';
import type { Morpheme, Question } from '../types';

// --- UTILITY FUNCTIONS ---

/**
 * Shuffles an array in place.
 * @param array The array to shuffle.
 */
const shuffleArray = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * A map for quick morpheme lookups.
 */
const morphemeMap = new Map<string, Morpheme>(morphemes.map(m => [m.morpheme, m]));

// --- REFACTORED SERVICE FUNCTIONS ---

export const generateQuestion = async (difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium', previousAnswer?: string): Promise<Question> => {
  let availableWords = wordList[difficulty];
  
  // If a previous answer is provided, filter it out.
  if (previousAnswer) {
    availableWords = availableWords.filter(word => word.answer !== previousAnswer);
  }

  // If filtering results in an empty list (e.g., only one word in difficulty), fall back to the full list.
  if (availableWords.length === 0) {
    availableWords = wordList[difficulty];
  }
  
  const wordData = availableWords[Math.floor(Math.random() * availableWords.length)];

  if (!wordData) {
    throw new Error(`No words found for difficulty: ${difficulty}`);
  }
  
  // Find the full morpheme objects for the parts of the answer.
  const answerParts = wordData.parts
    .map(partStr => morphemeMap.get(partStr))
    .filter((m): m is Morpheme => m !== undefined);

  // Create a set of the answer morphemes for quick lookups.
  const answerMorphemeSet = new Set(wordData.parts);

  // Filter out the answer morphemes to create a pool of distractors.
  const distractorPool = morphemes.filter(m => !answerMorphemeSet.has(m.morpheme));

  // Shuffle the distractor pool.
  const shuffledDistractors = shuffleArray([...distractorPool]);

  // Create the bank: combine answer parts with enough distractors to make 8.
  const bank = [...answerParts];
  const distractorsNeeded = 8 - bank.length;
  
  if (distractorsNeeded > 0) {
    bank.push(...shuffledDistractors.slice(0, distractorsNeeded));
  }

  const finalQuestion: Question = {
    ...wordData,
    bank: shuffleArray(bank),
  };
  
  // Simulate async behavior to match the previous API signature.
  return Promise.resolve(finalQuestion);
};


export const getHint = async (parts: string[]): Promise<string> => {
    const rootMorphemes = parts
        .map(partStr => morphemeMap.get(partStr))
        .filter((m): m is Morpheme => m !== undefined && m.type === 'root');

    if (rootMorphemes.length === 0) {
        return "Focus on the core part of the word to unlock its meaning.";
    }

    const hint = rootMorphemes
        .map(m => `The root '${m.morpheme}' means '${m.meaning}'.`)
        .join(' ');
        
    return Promise.resolve(hint);
};
