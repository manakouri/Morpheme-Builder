import React, { useState, useEffect, useCallback, useRef, forwardRef } from 'react';
import { generateQuestion } from '../services/geminiService';
import type { Question, Morpheme, FeedbackState } from '../types';

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

interface MorphemeTileProps {
    morpheme: Morpheme;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>, morpheme: Morpheme) => void;
    onClick?: () => void;
    className?: string;
    showMeanings: boolean;
}

const MorphemeTile = forwardRef<HTMLDivElement, MorphemeTileProps>(({ morpheme, onDragStart, onDragEnd, onTouchStart, onClick, className, showMeanings }, ref) => {
    const typeStyles = {
        prefix: 'from-sky-500 to-sky-400',
        root: 'from-amber-500 to-amber-400',
        suffix: 'from-fuchsia-500 to-fuchsia-400',
    };

    return (
        <div
            ref={ref}
            id={morpheme.id}
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onTouchStart={(e) => onTouchStart(e, morpheme)}
            onClick={onClick}
            className={`select-none bg-gradient-to-br text-white p-3 px-4 rounded-xl shadow-md transition-all duration-200 transform hover:scale-105 hover:shadow-lg ${typeStyles[morpheme.type] || 'from-neutral-500 to-neutral-400'} ${className}`}
        >
            <strong className="text-xl font-bold tracking-wide">{morpheme.morpheme}</strong>
            {showMeanings && <span className="text-xs italic opacity-90 block font-light tracking-wide mt-0.5">{morpheme.meaning}</span>}
        </div>
    );
});

// --- GAME COMPONENT ---

interface PracticeModeProps {
    onBack: () => void;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

const PracticeMode = ({ onBack, difficulty }: PracticeModeProps) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [droppedMorphemes, setDroppedMorphemes] = useState<Morpheme[]>([]);
  const [spelledWord, setSpelledWord] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showMeanings, setShowMeanings] = useState(false);
  const [morphemesAreCorrect, setMorphemesAreCorrect] = useState(false);
  
  const draggedItemNode = useRef<HTMLElement | null>(null);
  const draggedItemData = useRef<{ morpheme: Morpheme; source: 'bank' | 'zone' } | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const bankRef = useRef<HTMLDivElement>(null);
  const fetchInProgress = useRef(false);
  const questionAnswerRef = useRef<string | null>(null);

  const touchDragData = useRef<{
    morpheme: Morpheme;
    source: 'bank' | 'zone';
    originalElement: HTMLElement;
    ghostElement: HTMLElement;
    offsetX: number;
    offsetY: number;
  } | null>(null);


  useEffect(() => {
    questionAnswerRef.current = question?.answer ?? null;
  }, [question]);

  const fetchNewQuestion = useCallback(async () => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;

    setLoading(true);
    setFeedback(null);
    setDroppedMorphemes([]);
    setSpelledWord('');
    setMorphemesAreCorrect(false);
    setQuestion(null); // Clear old question to prevent flash
    try {
      const newQuestion = await generateQuestion(difficulty, questionAnswerRef.current ?? undefined);
      // Add unique IDs to bank morphemes for stable drag-and-drop
      newQuestion.bank = newQuestion.bank.map(m => ({ ...m, id: `${m.morpheme}-${Math.random()}` }));
      setQuestion(newQuestion);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [difficulty]);

  useEffect(() => {
    fetchNewQuestion();
  }, [fetchNewQuestion]);
  
  useEffect(() => {
    if (!question) {
      setMorphemesAreCorrect(false);
      return;
    }
    const droppedMorphemeStrings = droppedMorphemes.map(m => m.morpheme);
    const correctMorphemeStrings = question.parts;
    const isCorrect = droppedMorphemeStrings.length === correctMorphemeStrings.length &&
      droppedMorphemeStrings.every((val, index) => val === correctMorphemeStrings[index]);
    
    setMorphemesAreCorrect(isCorrect);
  }, [droppedMorphemes, question]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, morpheme: Morpheme, source: 'bank' | 'zone') => {
    draggedItemData.current = { morpheme, source };
    draggedItemNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(morpheme));
    setTimeout(() => {
        if(draggedItemNode.current) draggedItemNode.current.classList.add('opacity-50', 'scale-95');
    }, 0);
  };

  const handleDragEnd = () => {
    if (draggedItemNode.current) {
      draggedItemNode.current.classList.remove('opacity-50', 'scale-95');
    }
    draggedItemNode.current = null;
    draggedItemData.current = null;
    Array.from(dropZoneRef.current?.children || []).forEach(child => {
        if (child instanceof HTMLElement) {
            child.classList.remove('border-l-4', 'border-primary');
        }
    });
    if(dropZoneRef.current) dropZoneRef.current.classList.remove('border-r-4', 'border-primary');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!dropZoneRef.current || !draggedItemData.current) return;
  
      const dropZone = dropZoneRef.current;
      const draggedId = draggedItemData.current.morpheme.id;
  
      const activeChildren = Array.from(dropZone.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.id !== draggedId
      );
      activeChildren.forEach(child => child.classList.remove('border-l-4', 'border-primary'));
      dropZone.classList.remove('border-r-4', 'border-primary');
      dropZone.classList.add('drag-over-zone');

      const afterElement = activeChildren.find(child => {
          const box = child.getBoundingClientRect();
          return e.clientX < box.left + box.width / 2;
      });
  
      if (afterElement) {
          afterElement.classList.add('border-l-4', 'border-primary');
      } else if (activeChildren.length > 0) {
          dropZone.classList.add('border-r-4', 'border-primary');
      }
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-over-zone', 'border-r-4', 'border-primary');
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over-zone', 'border-r-4', 'border-primary');
    if (!draggedItemData.current) return;
  
    const droppedItem = JSON.parse(e.dataTransfer.getData('application/json')) as Morpheme;
  
    const dropZoneChildren = Array.from(dropZoneRef.current?.children || []);
    const afterElement = dropZoneChildren.find((child): child is HTMLElement =>
        child instanceof HTMLElement && child.classList.contains('border-l-4')
    );
    const dropIndex = afterElement ? droppedMorphemes.findIndex(m => m.id === afterElement.id) : droppedMorphemes.length;
    
    dropZoneChildren.forEach(child => {
        if (child instanceof HTMLElement) {
            child.classList.remove('border-l-4', 'border-primary');
        }
    });

    setDroppedMorphemes(current => {
        const newArr = current.filter(m => m.id !== droppedItem.id);
        newArr.splice(dropIndex, 0, droppedItem);
        return newArr;
    });
  };
  
  const handleBankDrop = (e: React.DragEvent<HTMLDivElement>) => {
     e.preventDefault();
     if (draggedItemData.current?.source === 'zone') {
       setDroppedMorphemes(prev => prev.filter(m => m.id !== draggedItemData.current?.morpheme.id));
     }
  }

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchDragData.current) return;
    e.preventDefault(); 

    const { ghostElement, offsetX, offsetY, morpheme } = touchDragData.current;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    
    ghostElement.style.left = `${clientX - offsetX}px`;
    ghostElement.style.top = `${clientY - offsetY}px`;

    ghostElement.style.display = 'none';
    const elementBelow = document.elementFromPoint(clientX, clientY);
    ghostElement.style.display = '';

    if (!dropZoneRef.current) return;
    const dropZone = dropZoneRef.current;

    Array.from(dropZone.children).forEach(child => {
        if (child instanceof HTMLElement) child.classList.remove('border-l-4', 'border-primary');
    });
    dropZone.classList.remove('border-r-4', 'border-primary', 'drag-over-zone');

    if (elementBelow && dropZone.contains(elementBelow)) {
        dropZone.classList.add('drag-over-zone');

        const activeChildren = Array.from(dropZone.children).filter(
            (child): child is HTMLElement => child instanceof HTMLElement && child.id !== morpheme.id
        );

        const afterElement = activeChildren.find(child => {
            const box = child.getBoundingClientRect();
            return clientX < box.left + box.width / 2;
        });

        if (afterElement) {
            afterElement.classList.add('border-l-4', 'border-primary');
        } else if (activeChildren.length > 0) {
            dropZone.classList.add('border-r-4', 'border-primary');
        }
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchDragData.current) return;
    
    const { ghostElement, originalElement, morpheme, source } = touchDragData.current;

    // Perform drop logic first
    if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        const elementBelow = document.elementFromPoint(clientX, clientY);

        if (dropZoneRef.current && elementBelow && dropZoneRef.current.contains(elementBelow)) {
            const dropZoneChildren = Array.from(dropZoneRef.current.children);
            const afterElement = dropZoneChildren.find((child): child is HTMLElement => {
                if (!(child instanceof HTMLElement)) return false;
                const box = child.getBoundingClientRect();
                return clientX < box.left + box.width / 2;
            });
            
            setDroppedMorphemes(current => {
                const dropIndex = afterElement
                    ? current.findIndex(m => m.id === afterElement.id)
                    : current.length;
                const newArr = current.filter(m => m.id !== morpheme.id);
                newArr.splice(dropIndex, 0, morpheme);
                return newArr;
            });
        } else if (source === 'zone') {
            setDroppedMorphemes(prev => prev.filter(m => m.id !== morpheme.id));
        }
    }

    // --- Cleanup ---
    if (ghostElement.parentElement) {
        document.body.removeChild(ghostElement);
    }
    originalElement.style.opacity = '1';
    document.body.style.touchAction = '';

    if (dropZoneRef.current) {
        Array.from(dropZoneRef.current.children).forEach(child => {
            if (child instanceof HTMLElement) child.classList.remove('border-l-4', 'border-primary');
        });
        dropZoneRef.current.classList.remove('border-r-4', 'border-primary', 'drag-over-zone');
    }

    touchDragData.current = null;
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
}, [handleTouchMove]);


  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, morpheme: Morpheme, source: 'bank' | 'zone') => {
      const originalElement = e.currentTarget;
      const touch = e.touches[0];
      const rect = originalElement.getBoundingClientRect();
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;

      const ghostElement = originalElement.cloneNode(true) as HTMLElement;
      ghostElement.style.position = 'fixed';
      ghostElement.style.left = `${touch.clientX - offsetX}px`;
      ghostElement.style.top = `${touch.clientY - offsetY}px`;
      ghostElement.style.width = `${rect.width}px`;
      ghostElement.style.height = `${rect.height}px`;
      ghostElement.style.pointerEvents = 'none';
      ghostElement.style.zIndex = '1000';
      ghostElement.style.opacity = '0.8';
      ghostElement.style.transform = 'scale(1.05)';
      document.body.appendChild(ghostElement);

      originalElement.style.opacity = '0.4';

      document.body.style.touchAction = 'none';

      touchDragData.current = { morpheme, source, originalElement, ghostElement, offsetX, offsetY };

      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
  };

  const handleCheckSpelling = () => {
    if (!question) return;
    if (spelledWord.trim().toLowerCase() === question.answer.toLowerCase()) {
      setFeedback({ message: 'Correct! Well done!', type: 'correct' });
      setTimeout(() => fetchNewQuestion(), 2000);
    } else {
      setFeedback({ message: 'Not quite right. Check your spelling or morpheme order.', type: 'incorrect' });
    }
  };
  
  const handleSkipQuestion = () => {
    if (loading || !question) return;
    setFeedback({ message: `The answer was: ${question.answer}`, type: 'incorrect' });
    setTimeout(() => {
        fetchNewQuestion();
    }, 2500);
  };

  const getBankMorphemes = () => {
      if (!question) return [];
      const droppedIds = new Set(droppedMorphemes.map(m => m.id));
      return question.bank.filter(m => !droppedIds.has(m.id));
  }

  if (loading || !question) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[700px] w-full max-w-4xl bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl shadow-slate-300/30 text-neutral-600">
          <Spinner className="text-primary h-12 w-12" />
          <p className="mt-6 font-semibold text-xl">Generating a new challenge...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl shadow-slate-300/30 w-full max-w-4xl text-center space-y-8 animate-fade-in-up">
        <div className="bg-neutral-100 border border-neutral-200/80 p-6 rounded-2xl">
            <p className="text-neutral-600 text-lg font-medium">Create a word that means:</p>
            <p className="font-bold text-2xl md:text-3xl text-primary-dark mt-2 tracking-tight">{question?.definition}</p>
        </div>

        <div ref={bankRef} onDrop={handleBankDrop} onDragOver={e => e.preventDefault()} className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-2xl font-bold text-neutral-800">Morpheme Bank</h2>
              <button onClick={() => setShowMeanings(!showMeanings)} className="text-sm bg-sky-100 text-sky-800 font-semibold py-2 px-5 rounded-full hover:bg-sky-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400">{showMeanings ? "Hide" : "Show"} Meanings</button>
            </div>
            <div className="flex flex-wrap justify-center gap-3 p-4 bg-neutral-100 rounded-2xl min-h-[90px] border border-neutral-200/80">
                {getBankMorphemes().map(m => <MorphemeTile key={m.id} morpheme={m} onDragStart={(e) => handleDragStart(e, m, 'bank')} onDragEnd={handleDragEnd} onTouchStart={(e) => handleTouchStart(e, m, 'bank')} className="cursor-grab active:cursor-grabbing" showMeanings={showMeanings} />)}
            </div>
        </div>

        <div className="space-y-3">
            <h2 className="text-2xl font-bold text-neutral-800">Construction Zone</h2>
             {morphemesAreCorrect && (
                <div className="p-3 rounded-xl font-semibold text-md flex items-center justify-center gap-3 animate-fade-in bg-emerald-100 text-emerald-800">
                    <CheckIcon />
                    <span>Correct! You've assembled the morphemes in the right order.</span>
                </div>
            )}
            <div ref={dropZoneRef} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`min-h-[112px] border-2 border-dashed rounded-2xl p-4 flex justify-center items-center gap-2 flex-wrap transition-all duration-200 ${morphemesAreCorrect ? 'border-emerald-500 bg-emerald-50/80 shadow-inner' : 'border-neutral-300'}`}>
              {droppedMorphemes.length > 0 ? (
                droppedMorphemes.map(m => <MorphemeTile key={m.id} morpheme={m} onDragStart={(e) => handleDragStart(e, m, 'zone')} onDragEnd={handleDragEnd} onTouchStart={(e) => handleTouchStart(e, m, 'zone')} className="cursor-grab active:cursor-grabbing" showMeanings={showMeanings} />)
              ) : <p className="text-neutral-500 font-medium text-lg">Drag & Drop Morphemes Here</p>}
            </div>
        </div>
        
        {morphemesAreCorrect && (
            <div className="flex flex-col sm:flex-row justify-center gap-3 animate-fade-in-up">
                <input type="text" value={spelledWord} onChange={e => setSpelledWord(e.target.value)} onKeyUp={e => e.key === 'Enter' && handleCheckSpelling()} placeholder="Now, type the final word..." autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" className="flex-grow p-4 text-lg border-2 border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition duration-200 shadow-inner" />
                <button onClick={handleCheckSpelling} className="flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold py-4 px-8 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                   Check
                </button>
            </div>
        )}

        {feedback && (
          <div className={`p-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 animate-fade-in ${feedback.type === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
             {feedback.type === 'correct' ? <CheckIcon /> : <XIcon />}
            {feedback.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t border-neutral-200 mt-10">
            <button onClick={handleSkipQuestion} disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-neutral-800 text-white font-bold py-3 px-8 rounded-xl hover:bg-neutral-900 transition-colors disabled:bg-neutral-400 shadow-md">
                {loading ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                Next Word
            </button>
            <button onClick={onBack} className="w-full sm:w-auto text-neutral-600 font-semibold py-3 px-6 hover:bg-neutral-100 rounded-xl transition-colors">Back to Menu</button>
        </div>
    </div>
  );
};

export default PracticeMode;