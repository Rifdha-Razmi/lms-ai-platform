import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ErrorState, PageLoader, Spinner } from '@/components/common/feedback';
import { Field, Pill } from '@/components/common/ui';
import type { QuestionType, QuizQuestion } from '@/types';
import { cn } from '@/utils/cn';

const tmpId = () => `tmp-${Math.random().toString(36).slice(2, 9)}`;

function validate(qs: QuizQuestion[]): string[] {
  const errs: string[] = [];
  if (!qs.length) errs.push('Add at least one question.');
  qs.forEach((q, i) => {
    const n = i + 1;
    if (!q.question_text.trim()) errs.push(`Q${n}: write the question.`);
    if (q.question_type === 'short_answer') {
      if (!(q.accepted_answers ?? []).some((a) => a.trim()))
        errs.push(`Q${n}: add at least one accepted answer.`);
    } else {
      if (q.options.length < 2) errs.push(`Q${n}: add at least two options.`);
      if (q.options.some((o) => !o.option_text.trim())) errs.push(`Q${n}: fill in every option.`);
      const correct = q.options.filter((o) => o.is_correct).length;
      if (q.question_type === 'mcq' && correct !== 1) errs.push(`Q${n}: mark exactly one correct option.`);
      if (q.question_type === 'multi_select' && correct < 1)
        errs.push(`Q${n}: mark at least one correct option.`);
    }
  });
  return errs;
}

export default function QuizEditorPage() {
  const { quizId = '' } = useParams();
  const quiz = useQuery({ queryKey: qk.quiz(quizId), queryFn: () => assessmentService.getQuiz(quizId) });
  useDocumentTitle(quiz.data?.title);
  const [title, setTitle] = useState('');
  const [qs, setQs] = useState<QuizQuestion[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (quiz.data) {
      setTitle(quiz.data.title);
      setQs(quiz.data.questions);
      setDirty(false);
    }
  }, [quiz.data]);

  const update = (i: number, patch: Partial<QuizQuestion>) => {
    setQs((prev) => prev.map((q, j) => (j === i ? { ...q, ...patch } : q)));
    setDirty(true);
  };
  const move = (i: number, d: -1 | 1) => {
    setQs((prev) => {
      const next = [...prev];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
    setDirty(true);
  };

  const errors = validate(qs);
  const payload = () => ({
    title,
    questions: qs.map((q, i) => ({
      ...q,
      id: q.id.startsWith('tmp-') ? '' : q.id,
      order_index: i,
      options:
        q.question_type === 'short_answer'
          ? []
          : q.options.map((o) => ({
              ...o,
              id: o.id.startsWith('tmp-') ? '' : o.id,
              is_correct: !!o.is_correct,
            })),
    })),
  });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
  };
  const save = useMutation({
    mutationFn: () => assessmentService.updateQuiz(quizId, payload()),
    onSuccess: (q) => {
      queryClient.setQueryData(qk.quiz(quizId), q);
      invalidate();
      toast.success('Quiz saved');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const publish = useMutation({
    mutationFn: async () => {
      await assessmentService.updateQuiz(quizId, payload());
      return assessmentService.publishQuiz(quizId);
    },
    onSuccess: (q) => {
      queryClient.setQueryData(qk.quiz(quizId), q);
      invalidate();
      toast.success('Quiz published. Students can take it now.');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (quiz.isLoading) return <PageLoader />;
  if (quiz.isError) return <ErrorState error={quiz.error} onRetry={() => quiz.refetch()} />;
  const qz = quiz.data!;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Link to={`/instructor/quizzes?course=${qz.course_id}`} className="btn-ghost -ml-2 mb-3 px-2">
        <ArrowLeft className="h-4 w-4" /> Quizzes
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        {qz.status === 'draft' ? (
          <Pill tone="warn">Draft — not visible to students</Pill>
        ) : (
          <Pill tone="ok">Published</Pill>
        )}
        {qz.is_ai_generated && (
          <Pill tone="marker">
            <Sparkles className="h-3 w-3" /> AI-generated — check every answer
          </Pill>
        )}
      </div>
      <Field label="Quiz title" htmlFor="qt" className="mt-4">
        <input
          id="qt"
          className="input text-lg font-medium"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
        />
      </Field>
      <p className="mt-1 text-sm text-ink-soft">
        {qz.course_title} · {qz.module_title}
      </p>

      <ol className="mt-6 space-y-4">
        {qs.map((q, i) => (
          <li key={q.id} className="panel p-4">
            <div className="flex items-start gap-2">
              <span className="mt-2 font-mono text-sm text-ink-faint">Q{i + 1}</span>
              <div className="flex-1 space-y-3">
                <label className="sr-only" htmlFor={`qq-${q.id}`}>
                  Question {i + 1}
                </label>
                <textarea
                  id={`qq-${q.id}`}
                  rows={2}
                  className="textarea"
                  value={q.question_text}
                  onChange={(e) => update(i, { question_text: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  <label className="sr-only" htmlFor={`qtype-${q.id}`}>
                    Question type
                  </label>
                  <select
                    id={`qtype-${q.id}`}
                    className="select w-auto py-1.5 text-xs"
                    value={q.question_type}
                    onChange={(e) => {
                      const t = e.target.value as QuestionType;
                      update(i, {
                        question_type: t,
                        options:
                          t === 'short_answer'
                            ? []
                            : q.options.length
                              ? q.options
                              : [
                                  { id: tmpId(), option_text: '', is_correct: true },
                                  { id: tmpId(), option_text: '', is_correct: false },
                                ],
                        accepted_answers:
                          t === 'short_answer' ? (q.accepted_answers ?? ['']) : q.accepted_answers,
                      });
                    }}
                  >
                    <option value="mcq">Multiple choice (one answer)</option>
                    <option value="multi_select">Multiple select</option>
                    <option value="short_answer">Short answer</option>
                  </select>
                  <label className="sr-only" htmlFor={`topic-${q.id}`}>
                    Topic
                  </label>
                  <input
                    id={`topic-${q.id}`}
                    className="input w-48 py-1.5 text-xs"
                    placeholder="Topic (for mastery tracking)"
                    value={q.topic ?? ''}
                    onChange={(e) => update(i, { topic: e.target.value })}
                  />
                </div>

                {q.question_type === 'short_answer' ? (
                  <div>
                    <p className="text-xs text-ink-soft">Accepted answers (case and spacing are ignored)</p>
                    {(q.accepted_answers ?? ['']).map((a, ai) => (
                      <div key={ai} className="mt-1.5 flex gap-2">
                        <input
                          aria-label={`Accepted answer ${ai + 1}`}
                          className="input"
                          value={a}
                          onChange={(e) =>
                            update(i, {
                              accepted_answers: (q.accepted_answers ?? ['']).map((x, k) =>
                                k === ai ? e.target.value : x,
                              ),
                            })
                          }
                        />
                        <button
                          className="btn-ghost p-2"
                          aria-label="Remove answer"
                          onClick={() =>
                            update(i, {
                              accepted_answers: (q.accepted_answers ?? []).filter((_, k) => k !== ai),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn-ghost mt-1 px-2 text-xs"
                      onClick={() => update(i, { accepted_answers: [...(q.accepted_answers ?? []), ''] })}
                    >
                      <Plus className="h-3.5 w-3.5" /> Another accepted answer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {q.options.map((o, oi) => (
                      <div key={o.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={!!o.is_correct}
                          aria-label={o.is_correct ? 'Marked correct' : 'Mark as correct'}
                          onClick={() =>
                            update(i, {
                              options: q.options.map((x, k) =>
                                q.question_type === 'mcq'
                                  ? { ...x, is_correct: k === oi }
                                  : k === oi
                                    ? { ...x, is_correct: !x.is_correct }
                                    : x,
                              ),
                            })
                          }
                          className={cn(
                            'shrink-0 rounded-full p-1',
                            o.is_correct ? 'text-ok' : 'text-line hover:text-ink-faint',
                          )}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                        <input
                          aria-label={`Option ${oi + 1}`}
                          className={cn('input', o.is_correct && 'border-ok/60')}
                          value={o.option_text}
                          onChange={(e) =>
                            update(i, {
                              options: q.options.map((x, k) =>
                                k === oi ? { ...x, option_text: e.target.value } : x,
                              ),
                            })
                          }
                        />
                        <button
                          className="btn-ghost p-2"
                          aria-label={`Remove option ${oi + 1}`}
                          onClick={() => update(i, { options: q.options.filter((_, k) => k !== oi) })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn-ghost px-2 text-xs"
                      onClick={() =>
                        update(i, {
                          options: [...q.options, { id: tmpId(), option_text: '', is_correct: false }],
                        })
                      }
                    >
                      <Plus className="h-3.5 w-3.5" /> Add option
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  className="btn-ghost p-1.5"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost p-1.5"
                  onClick={() => move(i, 1)}
                  disabled={i === qs.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost p-1.5 text-danger"
                  onClick={() => {
                    setQs((p) => p.filter((_, j) => j !== i));
                    setDirty(true);
                  }}
                  aria-label={`Delete question ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button
        className="btn-secondary mt-4"
        onClick={() => {
          setQs((p) => [
            ...p,
            {
              id: tmpId(),
              question_text: '',
              question_type: 'mcq',
              order_index: p.length,
              topic: qz.module_title,
              options: [
                { id: tmpId(), option_text: '', is_correct: true },
                { id: tmpId(), option_text: '', is_correct: false },
              ],
            },
          ]);
          setDirty(true);
        }}
      >
        <Plus className="h-4 w-4" /> Add question
      </button>

      {showErrors && errors.length > 0 && (
        <div
          role="alert"
          className="mt-6 rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          <p className="font-medium">Fix these before publishing:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-2 px-4 py-3">
          <span className="mr-auto text-sm text-ink-soft">
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <button className="btn-secondary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Spinner />} Save
          </button>
          {qz.status === 'draft' && (
            <button
              className="btn-primary"
              disabled={publish.isPending}
              onClick={() => {
                setShowErrors(true);
                if (errors.length === 0) publish.mutate();
              }}
            >
              {publish.isPending && <Spinner />} Approve & publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
