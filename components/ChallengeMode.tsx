import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateQuestion, getHint } from '../services/geminiService';
import type { Question, FeedbackState } from '../types';

const GAME_DURATION = 180;

// --- UI COMPONENTS ---

const Spinner = ({ className }: { className?: string }) => (
    <svg className={`animate-spin h-6 w-6 text-white ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);


// --- GAME COMPONENT ---

interface ChallengeModeProps {
    onBack: () => void;
}

const ChallengeMode = ({ onBack }: ChallengeModeProps) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(GAME_DURATION);
  const [highScore, setHighScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [hint, setHint] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const answerInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setHighScore(parseInt(localStorage.getItem('morphemeHighScore') || '0'));
  }, []);

  const fetchNewQuestion = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    setHint('');
    setUserAnswer('');
    setHintUsed(false);
    const newQuestion = await generateQuestion();
    setQuestion(newQuestion);
    setLoading(false);
    answerInputRef.current?.focus();
  }, []);
  
  const endTheGame = useCallback(() => {
    setGameState('end');
    const currentHighScore = parseInt(localStorage.getItem('morphemeHighScore') || '0');
    if (score > currentHighScore) {
      localStorage.setItem('morphemeHighScore', score.toString());
      setHighScore(score);
    }
  }, [score]);

  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            endTheGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, endTheGame]);

  const startGame = () => {
    setScore(0);
    setTimer(GAME_DURATION);
    setGameState('playing');
    fetchNewQuestion();
  };
  
  const handleCheckAnswer = () => {
    if (!question || !userAnswer.trim()) return;

    if (userAnswer.trim().toLowerCase() === question.answer.toLowerCase()) {
        const points = hintUsed ? 5 : 10;
        setScore(prev => prev + points);
        setFeedback({ message: `Correct! +${points} points`, type: 'correct' });
        setTimeout(() => fetchNewQuestion(), 1200);
    } else {
        setFeedback({ message: 'Not quite. Try again!', type: 'incorrect' });
    }
    setUserAnswer('');
  };

  const handleShowHint = async () => {
    if (!question || hintUsed) return;
    setHintUsed(true);
    setHint('Generating hint...');
    const hintText = await getHint(question.parts.filter(p => !p.startsWith('-') && !p.endsWith('-')));
    setHint(`${hintText}`);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (gameState === 'end') {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-slate-300/30 w-full max-w-lg text-center space-y-5 animate-fade-in-up">
            <h2 className="text-4xl font-bold text-primary-dark">Time's Up!</h2>
            <p className="text-neutral-500 text-lg">Your final score is:</p>
            <div className="text-7xl font-extrabold text-neutral-800 bg-neutral-100 py-6 rounded-2xl">{score}</div>
            {score > highScore && score > 0 && <p className="text-2xl font-semibold text-accent-emerald animate-pulse">🎉 New High Score! 🎉</p>}
            <div className="pt-2 space-y-3">
              <button onClick={startGame} className="w-full text-lg font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl px-8 py-4 transition-all transform hover:scale-105 shadow-lg">Play Again</button>
              <button onClick={onBack} className="w-full text-neutral-600 font-semibold py-3 px-6 hover:bg-neutral-100 rounded-xl transition-colors">Back to Menu</button>
            </div>
        </div>
    );
  }

  if (gameState === 'start') {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-slate-300/30 w-full max-w-lg text-center space-y-6 animate-fade-in-up">
            <h1 className="text-5xl font-extrabold text-primary-dark tracking-tight">Challenge Mode</h1>
            <p className="text-neutral-500 text-lg leading-relaxed">You have <strong>3 minutes</strong> to answer as many questions as you can. Use hints wisely!</p>
            <div className="text-3xl font-bold text-neutral-700 bg-neutral-100 p-5 rounded-2xl border">High Score: <span className="text-primary-dark">{highScore}</span></div>
            <div className="pt-2 space-y-3">
              <button onClick={startGame} className="w-full text-xl font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl px-8 py-4 transition-all transform hover:scale-105 shadow-lg">Start Challenge!</button>
              <button onClick={onBack} className="w-full text-neutral-600 font-semibold py-3 px-6 hover:bg-neutral-100 rounded-xl transition-colors">Back to Menu</button>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl shadow-slate-300/30 w-full max-w-2xl text-center space-y-6">
        <div className="grid grid-cols-2 gap-4 text-lg font-semibold">
            <div className="bg-neutral-100 p-4 rounded-xl text-neutral-700">Time: <span className={`font-bold text-xl ${timer < 20 ? 'text-accent-rose animate-pulse' : 'text-neutral-800'}`}>{formatTime(timer)}</span></div>
            <div className="bg-neutral-100 p-4 rounded-xl text-neutral-700">Score: <span className="font-bold text-xl text-primary-dark">{score}</span></div>
        </div>

        <div className="min-h-[150px] flex flex-col items-center justify-center p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl">
            {loading ? <Spinner className="text-primary" /> : (
                <>
                    <p className="text-neutral-600 font-medium"><strong>Type the word that means:</strong></p>
                    <p className="font-bold italic text-xl md:text-2xl text-primary-dark mt-2">"{question?.definition}"</p>
                </>
            )}
        </div>

        <div className="flex gap-3">
            <input ref={answerInputRef} type="text" value={userAnswer} onChange={e => setUserAnswer(e.target.value)} onKeyUp={e => e.key === 'Enter' && handleCheckAnswer()} disabled={loading} placeholder="Type your answer..." autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" className="flex-grow p-4 text-lg border-2 border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition duration-200 disabled:bg-neutral-100 shadow-inner" />
            <button onClick={handleCheckAnswer} disabled={loading} className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold py-3 px-6 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:from-neutral-400 disabled:to-neutral-300 disabled:shadow-none disabled:transform-none">Check</button>
        </div>

        <div className="min-h-[52px] text-left p-4 bg-neutral-100 rounded-xl text-neutral-700 border border-neutral-200/80">
            {feedback && <p className={`font-semibold flex items-center gap-2 ${feedback.type === 'correct' ? 'text-accent-emerald' : 'text-accent-rose'}`}>{feedback.type === 'correct' ? <CheckIcon/> : <XIcon/>} {feedback.message}</p>}
            {hint && <p className="font-medium text-accent-sky">{hint}</p>}
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={handleShowHint} disabled={hintUsed || loading} className="w-full sm:w-auto bg-amber-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-amber-600 transition-colors disabled:bg-amber-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg">
              Hint (-5 pts)
            </button>
            <button onClick={() => { setScore(s => Math.max(0, s-2)); fetchNewQuestion();}} disabled={loading} className="w-full sm:w-auto bg-rose-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-rose-600 transition-colors disabled:bg-rose-300 shadow-md hover:shadow-lg">
              Skip (-2 pts)
            </button>
        </div>
        
        <div className="pt-4 border-t border-neutral-200">
          <button onClick={onBack} className="text-neutral-500 font-semibold py-2 px-4 hover:bg-neutral-100 rounded-lg transition-colors text-sm">Back to Menu</button>
        </div>
    </div>
  );
};

export default ChallengeMode;
