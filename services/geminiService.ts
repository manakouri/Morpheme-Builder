import { GoogleGenAI, Type } from "@google/genai";
import type { Morpheme, Question } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description: "The complete, correctly spelled English word."
    },
    definition: {
      type: Type.STRING,
      description: "A clear, concise definition of the word, suitable for a student."
    },
    parts: {
      type: Type.ARRAY,
      description: "An array of strings listing the morphemes used to build the word in the correct order.",
      items: { type: Type.STRING },
    },
    bank: {
      type: Type.ARRAY,
      description: "An array of 8 morpheme objects. This MUST include all morphemes from the 'parts' array, plus plausible distractors. Each object must have 'morpheme', 'meaning', and 'type' ('prefix', 'root', or 'suffix').",
      items: {
        type: Type.OBJECT,
        properties: {
          morpheme: { type: Type.STRING },
          meaning: { type: Type.STRING, description: "A clear and accurate meaning for the morpheme." },
          type: { type: Type.STRING }, // Simplified for schema, validation is in prompt
        },
        required: ['morpheme', 'meaning', 'type'],
      },
    },
  },
  required: ['answer', 'definition', 'parts', 'bank'],
};

export const generateQuestion = async (difficulty = 'Medium'): Promise<Question> => {
  const difficultyInstructions = {
    Easy: "The word should be appropriate for a middle school student. Use 2-3 common morphemes. Example: 'rewrite'.",
    Medium: "The word should be appropriate for an advanced high school student. Use 3-4 morphemes. Example: 'unbelievable'.",
    Hard: "The word should be complex and suitable for a college student. Use multiple, sometimes less common, morphemes. Example: 'anthropocentric'."
  };

  const prompt = `You are an expert etymologist and English teacher creating a word-building game. Your task is to generate a single, high-quality quiz question based on the chosen difficulty level.

  Difficulty: ${difficulty}.
  Instruction: ${difficultyInstructions[difficulty]}

  The question must be an English word constructed from common Greek or Latin morphemes.
  Do not use obscure words.
  Ensure every single morpheme in the 'bank' array has an accurate, student-friendly definition, including simple roots like 'believe' or 'act'.
  Crucially, the definitions of the individual morphemes in the 'parts' array must logically combine to explain the overall 'definition' of the 'answer' word. This is to ensure the puzzle is solvable through etymological reasoning.

  For example, for a MEDIUM word:
  {
    "answer": "reaction",
    "definition": "The act of doing something back in response.",
    "parts": ["re-", "act", "-ion"],
    "bank": [
      {"morpheme": "re-", "meaning": "again, back", "type": "prefix"},
      {"morpheme": "act", "meaning": "to do", "type": "root"},
      {"morpheme": "-ion", "meaning": "act or process", "type": "suffix"},
      {"morpheme": "pre-", "meaning": "before", "type": "prefix"},
      {"morpheme": "struct", "meaning": "to build", "type": "root"},
      {"morpheme": "-able", "meaning": "capable of being", "type": "suffix"},
      {"morpheme": "inter-", "meaning": "between", "type": "prefix"},
      {"morpheme": "port", "meaning": "to carry", "type": "root"}
    ]
  }
  Now, generate a new, different question with the same structure and quality, adhering to the specified difficulty level.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.9,
      },
    });

    const jsonText = response.text;
     if (typeof jsonText !== 'string' || !jsonText.trim()) {
      throw new Error("Received empty or invalid JSON string from API.");
    }
    const questionData = JSON.parse(jsonText.trim()) as Question;
    
    if (!questionData.answer || !questionData.definition || !questionData.parts || !questionData.bank || questionData.bank.length === 0) {
        throw new Error("Invalid question format received from API.");
    }
    
    questionData.bank.sort(() => Math.random() - 0.5);
    return questionData;
  } catch (error) {
    console.error("Error generating question from Gemini API:", error);
    // FIX: Explicitly type fallbackBank as Morpheme[] to match the return type.
    const fallbackBank: Morpheme[] = [
      { morpheme: "un-", meaning: "not", type: "prefix" },
      { morpheme: "believe", meaning: "to accept as true", type: "root" },
      { morpheme: "-able", meaning: "capable of being", type: "suffix" },
      { morpheme: "re-", meaning: "again, back", type: "prefix" },
      { morpheme: "vis", meaning: "to see", type: "root" },
      { morpheme: "-ion", meaning: "act or process", type: "suffix" },
      { morpheme: "pre-", meaning: "before", type: "prefix" },
      { morpheme: "port", meaning: "to carry", type: "root" }
    ];
    return {
      answer: "unbelievable",
      definition: "Not capable of being believed.",
      parts: ["un-", "believe", "-able"],
      bank: fallbackBank.sort(() => Math.random() - 0.5)
    };
  }
};

export const getHint = async (parts: string[]): Promise<string> => {
    const hintPrompt = `Provide a concise, student-friendly hint by explaining the core meaning of the root morpheme(s) in this list: ${parts.join(', ')}. Focus on the root(s) primarily. For example, for "re-, act, -ion", you could say: "The core of this word is 'act', which means 'to do'."`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: hintPrompt,
        });
        
        const text = response.text;
        if (typeof text === 'string') {
          return text;
        }

        console.warn("Could not extract text from Gemini response for hint.");
        return "Hint not available at the moment.";

    } catch(error) {
        console.error("Error getting hint from Gemini API:", error);
        return "The root morphemes are the core building blocks of the word's meaning.";
    }
}