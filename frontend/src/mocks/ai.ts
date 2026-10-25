// Mock AI engine — a tiny lexical stand-in for the real RAG pipeline
// (PRD §9.2). It retrieves transcript sentences from the *current course only*
// and cites them, so the UI behaves exactly like the real service would.

import type { Difficulty } from '@/types';
import type { LectureRow, MockDb, QuestionRow } from './db';
import { uid } from './db';

const STOP = new Set(
  'a an the is are was were be been to of in on for and or but if then so as at by with from that this these those it its we you i do does did why how what when which who whom can could should would will into over under than about after before because while also only not no yes my your our their there here such each every all any some more most less least very just like use used using vs versus explain tell me please give'.split(
    ' ',
  ),
);

export const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/o\(([^)]*)\)/g, ' o_$1 ')
    .replace(/[^a-z0-9_^ ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.replace(/(ing|ed|es|s)$/, '')));

export interface Chunk {
  lecture: LectureRow;
  text: string;
  index: number;
  total: number;
  timestamp: number;
}

export function chunksForCourse(db: MockDb, courseId: string, lectureId?: string): Chunk[] {
  const moduleIds = new Set(db.modules.filter((m) => m.course_id === courseId).map((m) => m.id));
  const lectures = db.lectures.filter(
    (l) => moduleIds.has(l.module_id) && (!lectureId || l.id === lectureId),
  );
  return lectures.flatMap((lecture) => {
    const sentences = lecture.transcript.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [];
    return sentences.map((text, index) => ({
      lecture,
      text,
      index,
      total: sentences.length,
      timestamp: Math.round((index / Math.max(sentences.length, 1)) * lecture.duration_seconds),
    }));
  });
}

export function retrieve(chunks: Chunk[], question: string, k = 3) {
  const q = new Set(tokenize(question));
  if (q.size === 0) return [];
  const titleHits = new Map<string, number>();
  return chunks
    .map((c) => {
      const words = tokenize(c.text);
      const hits = words.filter((w) => q.has(w)).length;
      const unique = new Set(words.filter((w) => q.has(w))).size;
      // A question that names the lecture ("Explain Joins Explained") should land in that lecture.
      let t = titleHits.get(c.lecture.id);
      if (t === undefined) {
        t = new Set(tokenize(c.lecture.title).filter((w) => q.has(w))).size;
        titleHits.set(c.lecture.id, t);
      }
      return { c, score: unique * 2 + hits * 0.5 + t * 1.5 };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score || a.c.index - b.c.index)
    .slice(0, k);
}

/** "Explain this lecture" while watching one: answer from the opening of that lecture. */
export const asksAboutThisLecture = (question: string) =>
  /\b(this|the current) (lecture|video|lesson|class)\b/i.test(question);

export function lectureOpening(chunks: Chunk[], k = 3) {
  return chunks.slice(0, k).map((c) => ({ c, score: 10 }));
}

const INTRO: Record<Difficulty, string[]> = {
  beginner: ['Let’s keep this simple.', 'Here’s the idea in plain words.'],
  intermediate: ['Here’s what the course material says.', 'Short answer, grounded in the lectures:'],
  advanced: ['Precisely:', 'From the lecture material, with the finer points:'],
};

export function composeAnswer(
  question: string,
  hits: ReturnType<typeof retrieve>,
  mode: Difficulty,
  topics: string[] = [],
) {
  if (hits.length === 0) {
    // Grounded-only (FR-A2): never guess, but point the student at what the course does cover.
    const covered = topics.length
      ? `\n\nThis course covers: ${topics.slice(0, 6).join(' · ')}. Try asking about one of these — for example “Explain ${topics[0]}”.`
      : '';
    return {
      reply: `I couldn’t find this in this course’s material, so I won’t guess.${covered}\n\nIf it’s something your instructor should cover, ask in the course forum.`,
      sources: [],
    };
  }
  const ordered = [...hits].sort((a, b) => (a.c.lecture.id === b.c.lecture.id ? a.c.index - b.c.index : 0));
  const body = ordered.map((h) => h.c.text).join(' ');
  const intro = INTRO[mode][question.length % 2];
  let reply = `${intro} ${body}`;
  if (mode === 'beginner') {
    reply +=
      '\n\nIn short: focus on the first sentence above — the rest builds on it. Re-watch the cited part of the lecture, then review this module’s flashcards.';
  } else if (mode === 'advanced') {
    const lect = ordered[0].c.lecture;
    const rest = lect.transcript.match(/[^.!?]+[.!?]+/g) ?? [];
    const extra = rest.find((s) => !ordered.some((h) => h.c.text === s.trim()));
    if (extra) reply += `\n\nRelated detail from the same lecture: ${extra.trim()}`;
    reply +=
      '\n\nTo go deeper: ask yourself when this approach breaks down, and compare it with the alternatives covered in the same module.';
  }
  const seen = new Set<string>();
  const sources = ordered
    .filter((h) => (seen.has(h.c.lecture.id) ? false : (seen.add(h.c.lecture.id), true)))
    .map((h) => ({
      lecture_id: h.c.lecture.id,
      lecture_title: h.c.lecture.title,
      timestamp_seconds: h.c.timestamp,
      snippet: h.c.text.length > 140 ? `${h.c.text.slice(0, 137)}…` : h.c.text,
    }));
  return { reply, sources };
}

export function summarize(lecture: LectureRow) {
  const sentences = lecture.transcript.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [];
  return sentences.slice(0, 5).map((s) => s.replace(/\.$/, ''));
}

/** Pick the most "teachable" keyword in a sentence to blank out. */
function keyword(sentence: string): string | null {
  const candidates = sentence
    .replace(/[.,;:()]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 4 &&
        !STOP.has(w.toLowerCase()) &&
        !/^(algorithm|element|elements|always|usually|often)$/i.test(w),
    );
  const big = candidates.find((w) => /O\(|[A-Z]{2,}/.test(w));
  if (big) return big;
  return candidates.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function generateQuizQuestions(
  lecture: LectureRow,
  allLectures: LectureRow[],
  count: number,
  topic: string,
): QuestionRow[] {
  const sentences = lecture.transcript.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [];
  const pool = Array.from(
    new Set(
      allLectures
        .flatMap((l) => l.transcript.split(/\s+/))
        .map((w) => w.replace(/[.,;:()]/g, ''))
        .filter((w) => w.length > 5),
    ),
  );
  const out: QuestionRow[] = [];
  sentences.forEach((s, i) => {
    if (out.length >= count) return;
    const kw = keyword(s);
    if (!kw) return;
    const distractors = pool
      .filter((w) => w.toLowerCase() !== kw.toLowerCase())
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const options = [kw, ...distractors]
      .map((t) => ({ id: uid(), option_text: t, is_correct: t === kw }))
      .sort(() => Math.random() - 0.5);
    out.push({
      id: uid(),
      question_text: `Fill in the blank: “${s.replace(kw, '_____')}”`,
      question_type: 'mcq',
      order_index: i,
      topic,
      options,
    });
  });
  return out;
}

export function flashcardsFor(lectures: LectureRow[]) {
  return lectures.flatMap((l) => {
    const sentences = l.transcript.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [];
    return sentences.slice(0, 3).flatMap((s) => {
      const kw = keyword(s);
      return kw ? [{ id: uid(), question: s.replace(kw, '_____'), answer: kw }] : [];
    });
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
