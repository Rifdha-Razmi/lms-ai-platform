import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, ClipboardList, FileCheck2 } from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState, ErrorState, Skeleton, Spinner } from '@/components/common/feedback';
import { FileDrop } from '@/components/common/FileDrop';
import { PageHeader, Pill, ProgressBar, Tabs } from '@/components/common/ui';
import type { Assignment } from '@/types';
import { dueLabel, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

function statusOf(a: Assignment) {
  if (a.my_submission?.grade != null)
    return {
      label: `Graded ${a.my_submission.grade}/${a.rubric.reduce((s, r) => s + r.points, 0)}`,
      tone: 'ok' as const,
      key: 'graded',
    };
  if (a.my_submission) return { label: 'Submitted', tone: 'brand' as const, key: 'submitted' };
  if (new Date(a.due_date) < new Date()) return { label: 'Missed', tone: 'danger' as const, key: 'missed' };
  return { label: 'To do', tone: 'neutral' as const, key: 'todo' };
}

function AssignmentRow({ a }: { a: Assignment }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState(0);
  const status = statusOf(a);
  const due = dueLabel(a.due_date);
  const closed = new Date(a.due_date) < new Date();
  const total = a.rubric.reduce((s, r) => s + r.points, 0);

  const submit = useMutation({
    mutationFn: () => assessmentService.submit(a.id, file!, setPct),
    onSuccess: () => {
      toast.success('Assignment submitted');
      setFile(null);
      void queryClient.invalidateQueries({ queryKey: qk.myAssignments });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
    onSettled: () => setPct(0),
  });

  return (
    <li className="panel overflow-hidden">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken/60"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium">{a.title}</p>
          <p className="text-sm text-ink-soft">{a.course_title}</p>
        </div>
        <div className="hidden text-right text-xs sm:block">
          <p
            className={cn(
              due.tone === 'urgent' && !a.my_submission ? 'font-medium text-danger' : 'text-ink-soft',
            )}
          >
            {due.text}
          </p>
          <p className="text-ink-faint">{formatDate(a.due_date, 'd MMM, h:mm a')}</p>
        </div>
        <Pill tone={status.tone}>{status.label}</Pill>
        <ChevronDown
          className={cn('h-4 w-4 text-ink-faint transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && (
        <div className="grid gap-6 border-t border-line px-4 py-5 md:grid-cols-[1fr_260px]">
          <div>
            <h3 className="text-sm font-medium">Instructions</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{a.instructions}</p>

            {a.my_submission?.grade != null && (
              <div className="mt-5 rounded border-l-2 border-marker bg-sunken px-4 py-3">
                <p className="text-sm font-medium">
                  Grade: {a.my_submission.grade} / {total}
                </p>
                {a.my_submission.feedback && (
                  <p className="mt-1 text-sm text-ink-soft">{a.my_submission.feedback}</p>
                )}
              </div>
            )}

            {a.my_submission && (
              <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
                <FileCheck2 className="h-4 w-4 text-ok" /> {a.my_submission.file_name} · submitted{' '}
                {formatDate(a.my_submission.submitted_at, 'd MMM, h:mm a')}
              </p>
            )}

            {!closed && a.my_submission?.grade == null && (
              <div className="mt-5">
                <label className="label" htmlFor={`file-${a.id}`}>
                  {a.my_submission ? 'Replace your submission' : 'Your submission'}
                </label>
                <FileDrop
                  id={`file-${a.id}`}
                  accept=".pdf,.zip,.js,.ts,.tsx,.py,.java,.cpp,.c,.ipynb,.txt,.md"
                  file={file}
                  onFile={setFile}
                  hint="PDF, ZIP or source code · up to 25 MB"
                />
                {submit.isPending && pct > 0 && (
                  <ProgressBar value={pct} className="mt-2" label="Upload progress" />
                )}
                <button
                  className="btn-primary mt-3"
                  disabled={!file || submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  {submit.isPending && <Spinner />} {a.my_submission ? 'Resubmit' : 'Submit assignment'}
                </button>
              </div>
            )}
            {closed && !a.my_submission && (
              <p className="mt-4 text-sm text-danger">
                The deadline passed. Contact your instructor if you need an extension.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium">Rubric</h3>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-line">
                {a.rubric.map((r) => (
                  <tr key={r.criterion}>
                    <td className="py-1.5 text-ink-soft">{r.criterion}</td>
                    <td className="py-1.5 text-right font-mono text-xs">{r.points}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1.5 font-medium">Total</td>
                  <td className="py-1.5 text-right font-mono text-xs font-medium">{total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </li>
  );
}

export default function AssignmentsPage() {
  useDocumentTitle('Assignments');
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const q = useQuery({ queryKey: qk.myAssignments, queryFn: assessmentService.myAssignments });
  const todo = (q.data ?? []).filter((a) => statusOf(a).key === 'todo');
  const done = (q.data ?? []).filter((a) => statusOf(a).key !== 'todo');
  const list = tab === 'todo' ? todo : done;

  return (
    <div>
      <PageHeader title="Assignments" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'todo', label: `To do (${todo.length})` },
          { value: 'done', label: `Submitted & past (${done.length})` },
        ]}
      />
      <div className="mt-5">
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : q.isLoading ? (
          <Skeleton className="h-40" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title={tab === 'todo' ? 'Nothing to submit' : 'No submissions yet'}
            body={tab === 'todo' ? 'New assignments from your courses will show up here.' : undefined}
          />
        ) : (
          <ul className="space-y-3">
            {list.map((a) => (
              <AssignmentRow key={a.id} a={a} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
