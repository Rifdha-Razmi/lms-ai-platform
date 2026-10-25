/**
 * Starter questions built from the course's own lectures, so every suggestion
 * is something the tutor can actually answer from this course (FR-A2).
 */
export function starterQuestions(lectureTitles: string[], currentLecture?: string): string[] {
  if (currentLecture)
    return [
      'Explain this lecture in simple terms',
      `What are the key ideas in “${currentLecture}”?`,
      ...lectureTitles
        .filter((t) => t !== currentLecture)
        .slice(0, 1)
        .map((t) => `Explain “${t}”`),
    ];
  return lectureTitles.slice(0, 3).map((t) => `Explain “${t}”`);
}
