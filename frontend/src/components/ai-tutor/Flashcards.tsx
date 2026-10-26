import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { Flashcard } from '@/types';
import { cn } from '@/utils/cn';
import { pluralize } from '@/utils/format';

/** Flip-card deck with a simple "again / got it" queue for spaced revision (FR-A7). */
export function Flashcards({ cards }: { cards: Flashcard[] }) {
  const [queue, setQueue] = useState(cards);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);

  useEffect(() => {
    setQueue(cards);
    setIdx(0);
    setKnown(0);
    setFlipped(false);
  }, [cards]);

  if (queue.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="font-display text-lg font-semibold">Deck done — {pluralize(known, 'card')} learned</p>
        <button
          className="btn-secondary mt-3"
          onClick={() => {
            setQueue(cards);
            setIdx(0);
            setKnown(0);
          }}
        >
          <RotateCcw className="h-4 w-4" /> Study again
        </button>
      </div>
    );
  }
  const card = queue[Math.min(idx, queue.length - 1)];
  const next = (gotIt: boolean) => {
    setFlipped(false);
    if (gotIt) {
      setKnown((k) => k + 1);
      setQueue((q) => q.filter((c) => c.id !== card.id));
    } else {
      setQueue((q) => [...q.filter((c) => c.id !== card.id), card]);
    }
    setIdx(0);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-ink-soft">
        <span>{queue.length} left</span>
        <span>{known} learned</span>
      </div>
      <button
        onClick={() => setFlipped((f) => !f)}
        className={cn(
          'flex min-h-[170px] w-full flex-col items-center justify-center rounded-lg border px-6 py-8 text-center transition-colors',
          flipped ? 'border-marker bg-marker/20' : 'border-line bg-surface hover:border-brand/50',
        )}
        aria-label={flipped ? 'Show question' : 'Show answer'}
      >
        <span className="mb-2 text-xs text-ink-faint">{flipped ? 'Answer' : 'Question — tap to flip'}</span>
        <span className={cn('text-base', flipped && 'font-display text-2xl font-semibold')}>
          {flipped ? card.answer : card.question}
        </span>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          className="btn-ghost p-2"
          onClick={() => {
            setIdx((i) => (i - 1 + queue.length) % queue.length);
            setFlipped(false);
          }}
          aria-label="Previous card"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => next(false)}>
            Again
          </button>
          <button className="btn-primary" onClick={() => next(true)}>
            Got it
          </button>
        </div>
        <button
          className="btn-ghost p-2"
          onClick={() => {
            setIdx((i) => (i + 1) % queue.length);
            setFlipped(false);
          }}
          aria-label="Next card"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
