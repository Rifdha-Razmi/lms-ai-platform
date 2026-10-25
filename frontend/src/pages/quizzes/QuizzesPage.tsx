import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { qk } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/feedback';
import { PageHeader, Pill } from '@/components/common/ui';
import { pluralize } from '@/utils/format';

export default function QuizzesPage() {
  useDocumentTitle('Quizzes');
  const q = useQuery({ queryKey: qk.myQuizzes, queryFn: assessmentService.myQuizzes });
  const byCourse = (q.data ?? []).reduce<Record<string, NonNullable<typeof q.data>>>((acc, quiz) => {
    (acc[quiz.course_title ?? ''] ??= []).push(quiz);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Quizzes" />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <Skeleton className="h-60" />
      ) : !q.data!.length ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title="No quizzes yet"
          body="Quizzes appear here when your instructors publish them."
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(byCourse).map(([course, quizzes]) => (
            <section key={course}>
              <h2 className="mb-3 text-lg font-semibold">{course}</h2>
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {quizzes.map((quiz) => (
                  <li key={quiz.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {/* No "AI-generated" label for students: the instructor reviewed and
                            published it, so it's the instructor's quiz (FR-I4). */}
                        {quiz.title}
                      </p>
                      <p className="text-sm text-ink-soft">
                        {quiz.module_title} · {pluralize(quiz.questions.length, 'question')}
                      </p>
                    </div>
                    {quiz.best_score != null ? (
                      <Pill tone={quiz.best_score >= 80 ? 'ok' : quiz.best_score >= 50 ? 'warn' : 'danger'}>
                        Best {quiz.best_score}%
                      </Pill>
                    ) : (
                      <Pill>Not attempted</Pill>
                    )}
                    <Link
                      to={`/quizzes/${quiz.id}`}
                      className={quiz.best_score != null ? 'btn-secondary' : 'btn-primary'}
                    >
                      {quiz.best_score != null ? 'Retake' : 'Start quiz'}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
