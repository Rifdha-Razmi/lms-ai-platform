import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardList, Download } from 'lucide-react';
import { courseService } from '@/services/courseService';
import { assessmentService } from '@/services/assessmentService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState, ErrorState, Skeleton, Spinner } from '@/components/common/feedback';
import { Avatar, Field, Modal, PageHeader, Pill } from '@/components/common/ui';
import type { Assignment, Submission } from '@/types';
import { formatDate, pluralize } from '@/utils/format';
import { safeHref } from '@/utils/safeUrl';

function GradeModal({
  sub,
  assignment,
  onClose,
}: {
  sub: Submission | null;
  assignment?: Assignment;
  onClose: () => void;
}) {
  const [scores, setScores] = useState<number[]>([]);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    if (!sub || !assignment) return;
    setScores(assignment.rubric.map(() => 0));
    setFeedback(sub.feedback ?? '');
  }, [sub, assignment]);
  const total = scores.reduce((s, x) => s + (x || 0), 0);
  const max = assignment?.rubric.reduce((s, r) => s + r.points, 0) ?? 100;
  const grade = useMutation({
    mutationFn: () => assessmentService.grade(sub!.id, { grade: total, feedback }),
    onSuccess: () => {
      toast.success(`Graded ${sub!.student_name}: ${total}/${max}`);
      void queryClient.invalidateQueries({ queryKey: qk.submissions(assignment!.id) });
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <Modal
      open={!!sub}
      onClose={onClose}
      title={`Grade ${sub?.student_name ?? ''}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => grade.mutate()} disabled={grade.isPending}>
            {grade.isPending && <Spinner />} Save grade · {total}/{max}
          </button>
        </>
      }
    >
      {sub && assignment && (
        <div className="space-y-4">
          <a
            href={safeHref(sub.file_url) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded border border-line bg-sunken px-3 py-2 text-sm hover:border-brand"
          >
            <Download className="h-4 w-4" /> {sub.file_name}
            <span className="ml-auto text-xs text-ink-faint">
              {formatDate(sub.submitted_at, 'd MMM, h:mm a')}
            </span>
          </a>
          <fieldset className="space-y-2">
            <legend className="label">Rubric</legend>
            {assignment.rubric.map((r, i) => (
              <div key={r.criterion} className="flex items-center gap-3">
                <label htmlFor={`r-${i}`} className="flex-1 text-sm">
                  {r.criterion}
                </label>
                <input
                  id={`r-${i}`}
                  type="number"
                  min={0}
                  max={r.points}
                  className="input w-20"
                  value={scores[i] ?? 0}
                  onChange={(e) =>
                    setScores((s) =>
                      s.map((x, j) =>
                        j === i ? Math.min(r.points, Math.max(0, Number(e.target.value))) : x,
                      ),
                    )
                  }
                />
                <span className="w-10 text-xs text-ink-faint">/ {r.points}</span>
              </div>
            ))}
          </fieldset>
          <Field label="Feedback for the student" htmlFor="fb">
            <textarea
              id="fb"
              rows={4}
              className="textarea"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What went well, and one thing to improve"
            />
          </Field>
        </div>
      )}
    </Modal>
  );
}

export default function GradingPage() {
  useDocumentTitle('Grading');
  const [params, setParams] = useSearchParams();
  const courses = useQuery({ queryKey: qk.instructorCourses, queryFn: courseService.mine });
  const courseId = params.get('course') ?? courses.data?.find((c) => c.status === 'approved')?.id ?? '';
  const assignments = useQuery({
    queryKey: qk.courseAssignments(courseId),
    queryFn: () => assessmentService.courseAssignments(courseId),
    enabled: !!courseId,
  });
  const assignmentId = params.get('assignment') ?? assignments.data?.[0]?.id ?? '';
  const assignment = assignments.data?.find((a) => a.id === assignmentId);
  const subs = useQuery({
    queryKey: qk.submissions(assignmentId),
    queryFn: () => assessmentService.submissions(assignmentId),
    enabled: !!assignmentId,
  });
  const [grading, setGrading] = useState<Submission | null>(null);
  const pending = subs.data?.filter((s) => s.grade == null).length ?? 0;

  return (
    <div>
      <PageHeader title="Grading" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Field label="Course" htmlFor="g-course">
          <select
            id="g-course"
            className="select"
            value={courseId}
            onChange={(e) => setParams({ course: e.target.value })}
          >
            {courses.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assignment" htmlFor="g-asg">
          <select
            id="g-asg"
            className="select"
            value={assignmentId}
            onChange={(e) => setParams({ course: courseId, assignment: e.target.value })}
            disabled={!assignments.data?.length}
          >
            {assignments.data?.length === 0 && <option>No assignments in this course</option>}
            {assignments.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {subs.isError ? (
        <ErrorState error={subs.error} onRetry={() => subs.refetch()} />
      ) : subs.isLoading || assignments.isLoading ? (
        <Skeleton className="h-48" />
      ) : !assignmentId || subs.data?.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No submissions yet"
          body="Submissions appear here as students upload their work."
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-ink-soft">
            {pluralize(subs.data!.length, 'submission')} · {pending} to grade
          </p>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b border-line text-left text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Student</th>
                  <th className="px-4 py-2.5 font-medium">File</th>
                  <th className="px-4 py-2.5 font-medium">Submitted</th>
                  <th className="px-4 py-2.5 font-medium">Grade</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...subs.data!]
                  .sort((a, b) => Number(a.grade != null) - Number(b.grade != null))
                  .map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <Avatar name={s.student_name ?? '?'} size={26} /> {s.student_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{s.file_name}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        {formatDate(s.submitted_at, 'd MMM, h:mm a')}
                      </td>
                      <td className="px-4 py-3">
                        {s.grade != null ? (
                          <Pill tone="ok">{s.grade}</Pill>
                        ) : (
                          <Pill tone="warn">Not graded</Pill>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className={s.grade != null ? 'btn-secondary' : 'btn-primary'}
                          onClick={() => setGrading(s)}
                        >
                          {s.grade != null ? 'Regrade' : 'Grade'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <GradeModal sub={grading} assignment={assignment} onClose={() => setGrading(null)} />
    </div>
  );
}
