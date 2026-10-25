import { describe, expect, it } from 'vitest';
import { getDb } from './db';
import { asksAboutThisLecture, chunksForCourse, composeAnswer, lectureOpening, retrieve } from './ai';
import { starterQuestions } from '@/components/ai-tutor/starters';

describe('mock RAG tutor', () => {
  const chunks = chunksForCourse(getDb(), 'c-dsa');

  it('retrieves the quicksort lecture for a quicksort question', () => {
    const hits = retrieve(chunks, 'Why does quicksort degrade to O(n^2) on sorted input?');
    expect(hits[0].c.lecture.title).toMatch(/Quicksort/);
  });

  it('cites sources with timestamps', () => {
    const { sources } = composeAnswer(
      'quicksort pivot worst case',
      retrieve(chunks, 'quicksort pivot worst case'),
      'intermediate',
    );
    expect(sources.length).toBeGreaterThan(0);
    expect(sources[0]).toHaveProperty('timestamp_seconds');
  });

  it('refuses to answer outside the course material (FR-A2)', () => {
    const { reply, sources } = composeAnswer(
      'who won the cricket world cup',
      retrieve(chunks, 'who won the cricket world cup'),
      'beginner',
    );
    expect(sources).toHaveLength(0);
    expect(reply).toMatch(/couldn’t find this/);
  });
});

describe('tutor starter questions', () => {
  const db = getDb();
  const courses = db.courses.map((c) => c.id);

  it.each(courses)('every suggested question is answerable in %s', (courseId) => {
    const chunks = chunksForCourse(db, courseId);
    const titles = [...new Set(chunks.map((c) => c.lecture.title))];
    for (const q of starterQuestions(titles)) {
      expect(retrieve(chunks, q).length, q).toBeGreaterThan(0);
    }
  });

  it('answers "explain this lecture" from the lecture being watched', () => {
    const lecture = chunksForCourse(db, 'c-sql').filter((c) => c.lecture.title === 'Joins Explained');
    expect(asksAboutThisLecture('Explain this lecture in simple terms')).toBe(true);
    expect(lectureOpening(lecture)[0].c.lecture.title).toBe('Joins Explained');
  });

  it('lists what the course covers when it can’t answer', () => {
    const { reply } = composeAnswer('what is time complexity', [], 'intermediate', ['Joins Explained']);
    expect(reply).toMatch(/This course covers: Joins Explained/);
  });
});
