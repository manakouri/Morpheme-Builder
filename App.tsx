import React, { useState } from 'react';
import { GameMode } from './types';
import PracticeMode from './components/PracticeMode';
import ChallengeMode from './components/ChallengeMode';

interface DifficultySelectionProps {
  onSelectDifficulty: (difficulty: 'Easy' | 'Medium' | 'Hard') => void;
  onBack: () => void;
}

const DifficultySelection = ({ onSelectDifficulty, onBack }: DifficultySelectionProps) => {
  return (
    <div className="text-center bg-white p-8 sm:p-12 md:p-16 rounded-3xl shadow-2xl shadow-slate-300/30 w-full max-w-2xl animate-fade-in-up">
      <h2 className="text-4xl sm:text-5xl font-extrabold text-primary-dark mb-4 tracking-tight">
        Choose Difficulty
      </h2>
      <p className="text-neutral-500 text-lg mb-10">Select a level to begin your practice.</p>
      <div className="flex flex-col sm:flex-row justify-center gap-5">
        <button
          onClick={() => onSelectDifficulty('Easy')}
          className="group w-full sm:w-auto text-xl font-bold text-white bg-gradient-to-br from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 focus:outline-none focus:ring-4 focus:ring-emerald-200 rounded-2xl px-10 py-5 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <span className="group-hover:tracking-wider transition-all">Easy</span>
        </button>
        <button
          onClick={() => onSelectDifficulty('Medium')}
          className="group w-full sm:w-auto text-xl font-bold text-white bg-gradient-to-br from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 focus:outline-none focus:ring-4 focus:ring-amber-200 rounded-2xl px-10 py-5 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <span className="group-hover:tracking-wider transition-all">Medium</span>
        </button>
        <button
          onClick={() => onSelectDifficulty('Hard')}
          className="group w-full sm:w-auto text-xl font-bold text-white bg-gradient-to-br from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 focus:outline-none focus:ring-4 focus:ring-rose-200 rounded-2xl px-10 py-5 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <span className="group-hover:tracking-wider transition-all">Hard</span>
        </button>
      </div>
      <div className="mt-12">
        <button onClick={onBack} className="text-neutral-600 font-semibold py-3 px-6 hover:bg-neutral-100 rounded-xl transition-colors">Back to Menu</button>
      </div>
    </div>
  );
};


const App = () => {
  const [gameMode, setGameMode] = useState(GameMode.MENU);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  const handleSelectDifficulty = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    setSelectedDifficulty(difficulty);
    setGameMode(GameMode.PRACTICE);
  };

  const renderContent = () => {
    switch (gameMode) {
      case GameMode.PRACTICE:
        return <PracticeMode onBack={() => setGameMode(GameMode.DIFFICULTY_SELECTION)} difficulty={selectedDifficulty} />;
      case GameMode.DIFFICULTY_SELECTION:
        return <DifficultySelection onSelectDifficulty={handleSelectDifficulty} onBack={() => setGameMode(GameMode.MENU)} />;
      case GameMode.CHALLENGE:
        return <ChallengeMode onBack={() => setGameMode(GameMode.MENU)} />;
      case GameMode.MENU:
      default:
        return (
          <div className="text-center bg-white p-8 sm:p-12 md:p-16 rounded-3xl shadow-2xl shadow-slate-300/30 w-full max-w-3xl transform transition-all duration-500 animate-fade-in">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4 tracking-tighter">
              Multi-Morpheme Power Writers ⚡️
            </h1>
            <p className="text-neutral-500 text-xl mb-12">
              Build your vocabulary by mastering its building blocks.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <button
                onClick={() => setGameMode(GameMode.DIFFICULTY_SELECTION)}
                className="group w-full sm:w-auto text-xl font-bold text-white bg-gradient-to-br from-sky-500 to-cyan-400 hover:from-sky-600 hover:to-cyan-500 focus:outline-none focus:ring-4 focus:ring-sky-200 rounded-2xl px-10 py-5 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl"
              >
                <span className="group-hover:tracking-wider transition-all">Practice Mode</span>
              </button>
              <button
                onClick={() => setGameMode(GameMode.CHALLENGE)}
                className="group w-full sm:w-auto text-xl font-bold text-white bg-gradient-to-br from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 focus:outline-none focus:ring-4 focus:ring-emerald-200 rounded-2xl px-10 py-5 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl"
              >
                 <span className="group-hover:tracking-wider transition-all">Challenge Mode</span>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen font-sans p-4">
      {renderContent()}
    </main>
  );
};

export default App;
