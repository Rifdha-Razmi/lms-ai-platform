import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Bot, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ErrorState, PageLoader, Spinner } from '@/components/common/feedback';
import { ConfirmDialog, ProgressBar } from '@/components/common/ui';
import type { QuizAnswerInput, QuizQuestion, QuizResult } from '@/types';
import { cn } from '@/utils/cn';
import { pluralize } from '@/utils/format';

const typeLabel = {
  mcq: 'Choose one',
  multi_select: 'Choose all that apply',
  short_answer: 'Type your answer',
} as const;

function QuestionView({
  q,
  n,
  answer,
  onChange,
  result,
}: {
  q: QuizQuestion;
  n: number;
  answer?: QuizAnswerInput;
  onChange: (a: QuizAnswerInput) => void;
  result?: QuizResult['answers'][number];
}) {
  const selected = new Set(answer?.selected_option_ids ?? []);
  const correct = new Set(result?.correct_option_ids ?? []);
  return (
    <fieldset className="panel p-5">
      <legend className="sr-only">Question {n}</legend>
      <div className="flex items-start gap-3">
        <span className="font-mono text-sm text-ink-faint">Q{n}</span>
        <div className="flex-1">
          <p className="font-medium leading-snug">{q.question_text}</p>
          <p className="mt-0.5 text-xs text-ink-faint">{typeLabel[q.question_type]}</p>
        </div>
        {result &&
          (result.is_correct ? (
            <CheckCircle2 className="h-5 w-5 text-ok" aria-label="Correct" />
          ) : (
            <XCircle className="h-5 w-5 text-danger" aria-label="Incorrect" />
          ))}
      </div>
      <div className="mt-4 space-y-2 pl-8">
        {q.question_type === 'short_answer' ? (
          <>
            <input
              className="input"
              aria-label={`Answer to question ${n}`}
              value={answer?.text_answer ?? ''}
              disabled={!!result}
              onChange={(e) => onChange({ question_id: q.id, text_answer: e.target.value })}
            />
            {result && !result.is_correct && q.accepted_answers?.length ? (
              <p className="text-sm text-ink-soft">
                Accepted answer: <span className="marker">{q.accepted_answers[0]}</span>
              </p>
            ) : null}
          </>
        ) : (
          q.options.map((o) => {
            const isSel = selected.has(o.id);
            const multi = q.question_type === 'multi_select';
            return (
              <label
                key={o.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded border px-3 py-2 text-sm transition-colors',
                  result
                    ? correct.has(o.id)
                      ? 'border-ok/50 bg-ok/10'
                      : isSel
                        ? 'border-danger/50 bg-danger/10'
                        : 'border-line'
                    : isSel
                      ? 'border-brand bg-brand-tint'
                      : 'border-line hover:border-brand/50',
                  result && 'cursor-default',
                )}
              >
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={q.id}
                  className={multi ? 'checkbox' : 'form-radio border-line text-brand focus:ring-brand'}
                  checked={isSel}
                  disabled={!!result}
                  onChange={() => {
                    const next = multi
                      ? isSel
                        ? [...selected].filter((x) => x !== o.id)
                        : [...selected, o.id]
                      : [o.id];
                    onChange({ question_id: q.id, selected_option_ids: next });
                  }}
                />
                {o.option_text}
              </label>
            );
          })
        )}
      </div>
    </fieldset>
  );
}

export default function QuizAttemptPage() {
  const { quizId = '' } = useParams();
  const quiz = useQuery({ queryKey: qk.quiz(quizId), queryFn: () => assessmentService.getQuiz(quizId) });
  useDocumentTitle(quiz.data?.title);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuizAnswerInput>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [confirm, setConfirm] = useState(false);

  const start = useMutation({
    mutationFn: () => assessmentService.startAttempt(quizId),
    onSuccess: (a) => {
      setAttemptId(a.id);
      setAnswers({});
      setResult(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const submit = useMutation({
    mutationFn: () => assessmentService.submitAttempt(attemptId!, Object.values(answers)),
    onSuccess: (r) => {
      setResult(r);
      setConfirm(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      r.badges_earned.forEach((b) => toast.success(`Badge earned: ${b.name}`));
      void queryClient.invalidateQueries({ queryKey: qk.myQuizzes });
      void queryClient.invalidateQueries({ queryKey: ['ai', 'mastery'] });
      void queryClient.invalidateQueries({ queryKey: qk.streak });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (quiz.isLoading) return <PageLoader />;
  if (quiz.isError) return <ErrorState error={quiz.error} onRetry={() => quiz.refetch()} />;
  const qz = result?.quiz ?? quiz.data!;
  const answered = qz.questions.filter((q) => {
    const a = answers[q.id];
    return a && ((a.selected_option_ids?.length ?? 0) > 0 || (a.text_answer ?? '').trim());
  }).length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/quizzes" className="btn-ghost -ml-2 mb-3 px-2">
        <ArrowLeft className="h-4 w-4" /> All quizzes
      </Link>
      <h1 className="text-2xl font-semibold">{qz.title}</h1>
      <p className="text-ink-soft">
        {qz.course_title} · {qz.module_title} · {pluralize(qz.questions.length, 'question')}
      </p>

      {!attemptId && !result && (
        <div className="panel mt-6 p-6">
          <p>Answer every question, then submit. Multiple-choice and short answers are graded instantly.</p>
          {qz.best_score != null && (
            <p className="mt-1 text-sm text-ink-soft">Your best score so far: {qz.best_score}%</p>
          )}
          <button className="btn-primary mt-4" onClick={() => start.mutate()} disabled={start.isPending}>
            {start.isPending && <Spinner />} Start quiz
          </button>
        </div>
      )}

      {result && (
        <div className="panel mt-6 flex flex-wrap items-center gap-6 p-6">
          <div>
            <p className="font-display text-5xl font-semibold tabular-nums">{result.score}%</p>
            <p className="text-sm text-ink-soft">
              {result.answers.filter((a) => a.is_correct).length} of {result.answers.length} correct
            </p>
          </div>
          <p className="flex-1 text-sm text-ink-soft">
            {result.score === 100
              ? 'Perfect score. Your mastery for these topics went up.'
              : result.score! >= 60
                ? 'Solid. Review the questions marked wrong below, then retake when ready.'
                : 'These topics need another pass. Ask the AI tutor about the ones you missed.'}
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => start.mutate()}>
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
            <Link className="btn-primary" to={`/tutor?course=${qz.course_id}`}>
              <Bot className="h-4 w-4" /> Ask the tutor
            </Link>
          </div>
        </div>
      )}

      {(attemptId || result) && (
        <>
          {!result && (
            <div className="sticky top-14 z-10 -mx-4 mt-6 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded sm:px-0">
              <div className="flex items-center gap-3 text-sm">
                <span className="tabular-nums text-ink-soft">
                  {answered}/{qz.questions.length} answered
                </span>
                <ProgressBar
                  value={(answered / qz.questions.length) * 100}
                  className="flex-1"
                  label="Questions answered"
                />
              </div>
            </div>
          )}
          <div className="mt-6 space-y-4">
            {qz.questions.map((q, i) => (
              <QuestionView
                key={q.id}
                q={q}
                n={i + 1}
                answer={result ? result.answers.find((a) => a.question_id === q.id) : answers[q.id]}
                onChange={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))}
                result={result?.answers.find((a) => a.question_id === q.id)}
              />
            ))}
          </div>
          {!result && (
            <div className="mt-6 flex justify-end">
              <button
                className="btn-primary"
                onClick={() => (answered < qz.questions.length ? setConfirm(true) : submit.mutate())}
                disabled={submit.isPending}
              >
                {submit.isPending && <Spinner />} Submit answers
              </button>
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Submit with unanswered questions?"
        body={`You’ve answered ${answered} of ${qz.questions.length}. Unanswered questions count as wrong.`}
        confirmLabel="Submit anyway"
        onConfirm={() => submit.mutate()}
        pending={submit.isPending}
      />
    </div>
  );
}
