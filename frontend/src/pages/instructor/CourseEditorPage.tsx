import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, FileText, Plus, Send, Sparkles, Trash2, Video } from 'lucide-react';
import { courseService, type CourseInput } from '@/services/courseService';
import { assessmentService } from '@/services/assessmentService';
import { aiService } from '@/services/aiService';
import { getErrorField, getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ErrorState, PageLoader, Spinner } from '@/components/common/feedback';
import { FileDrop } from '@/components/common/FileDrop';
import { CourseCover } from '@/components/common/CourseCover';
import { Field, Modal, PageHeader, Pill, ProgressBar, Tabs } from '@/components/common/ui';
import { CourseStatusPill } from '@/components/instructor/CourseStatusPill';
import { ChatPanel } from '@/components/ai-tutor/ChatPanel';
import { useAuthStore } from '@/store/authStore';
import type { CourseDetail, Module } from '@/types';
import { dueLabel, formatDuration, pluralize } from '@/utils/format';

const CATEGORIES = [
  'Computer Science',
  'Web Development',
  'Data Science',
  'Databases',
  'DevOps',
  'Communication',
];

const detailsSchema = z.object({
  title: z.string().trim().min(5, 'Use at least 5 characters').max(200),
  description: z.string().trim().min(30, 'Describe the course in at least 30 characters'),
  category: z.string().min(1, 'Choose a category'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  price: z.coerce.number().min(0, 'Price can’t be negative'),
  thumbnail_url: z.string().url('Enter a full image URL').or(z.literal('')).optional(),
});
type DetailsValues = z.infer<typeof detailsSchema>;

function DetailsForm({ course }: { course?: CourseDetail }) {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: course
      ? {
          title: course.title,
          description: course.description,
          category: course.category,
          difficulty: course.difficulty,
          price: course.price,
          thumbnail_url: course.thumbnail_url ?? '',
        }
      : { difficulty: 'beginner', price: 0, category: '' },
  });
  const save = useMutation({
    mutationFn: (v: DetailsValues) => {
      const body: CourseInput = { ...v, thumbnail_url: v.thumbnail_url || null };
      return course ? courseService.update(course.id, body) : courseService.create(body);
    },
    onSuccess: (c) => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      void queryClient.invalidateQueries({ queryKey: qk.instructorCourses });
      if (course) toast.success('Course details saved');
      else {
        toast.success('Course created. Now add modules and lectures.');
        navigate(`/instructor/courses/${c.id}?tab=content`, { replace: true });
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const v = watch();
  const serverField = getErrorField(save.error);

  return (
    <form
      className="grid gap-8 lg:grid-cols-[1fr_300px]"
      onSubmit={handleSubmit((vals) => save.mutate(vals))}
      noValidate
    >
      <div className="space-y-4">
        <Field
          label="Title"
          htmlFor="title"
          error={
            formState.errors.title?.message ||
            (serverField === 'title' ? getErrorMessage(save.error) : undefined)
          }
        >
          <input
            id="title"
            className="input"
            placeholder="e.g. Data Structures & Algorithms in Practice"
            {...register('title')}
          />
        </Field>
        <Field
          label="Description"
          htmlFor="description"
          error={formState.errors.description?.message}
          hint="What will learners be able to do after this course?"
        >
          <textarea id="description" rows={5} className="textarea" {...register('description')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category" htmlFor="category" error={formState.errors.category?.message}>
            <select id="category" className="select" {...register('category')}>
              <option value="">Choose…</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Difficulty" htmlFor="difficulty">
            <select id="difficulty" className="select" {...register('difficulty')}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field
            label="Price (₹)"
            htmlFor="price"
            error={formState.errors.price?.message}
            hint="0 makes it free"
          >
            <input id="price" type="number" min={0} step={1} className="input" {...register('price')} />
          </Field>
        </div>
        <Field
          label="Thumbnail URL (optional)"
          htmlFor="thumb"
          error={formState.errors.thumbnail_url?.message}
          hint="Leave empty to use generated artwork for the category."
        >
          <input id="thumb" className="input" placeholder="https://…" {...register('thumbnail_url')} />
        </Field>
        <button className="btn-primary" disabled={save.isPending}>
          {save.isPending && <Spinner />} {course ? 'Save changes' : 'Create course'}
        </button>
      </div>
      <div>
        <p className="label">Catalog preview</p>
        <div className="panel overflow-hidden">
          <CourseCover
            category={v.category || 'Computer Science'}
            title={v.title || 'Untitled'}
            thumbnailUrl={v.thumbnail_url || null}
          />
          <div className="p-4">
            <p className="text-xs text-ink-soft">{v.category || 'Category'}</p>
            <p className="font-display text-[17px] font-semibold leading-snug">
              {v.title || 'Your course title'}
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}

function LectureUploadModal({
  module,
  courseId,
  onClose,
}: {
  module: Module | null;
  courseId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [slides, setSlides] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [pct, setPct] = useState(0);
  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('title', title);
      if (video) form.append('video', video);
      if (slides) form.append('resources', slides);
      form.append('transcript', transcript);
      form.append('duration_seconds', String(minutes * 60));
      return courseService.addLecture(module!.id, form, setPct);
    },
    onSuccess: () => {
      toast.success('Lecture uploaded. Transcription and AI indexing run in the background.');
      void queryClient.invalidateQueries({ queryKey: qk.course(courseId) });
      setTitle('');
      setVideo(null);
      setSlides(null);
      setTranscript('');
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
    onSettled: () => setPct(0),
  });
  return (
    <Modal
      open={!!module}
      onClose={onClose}
      title={`Add lecture to “${module?.title ?? ''}”`}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!title.trim() || upload.isPending}
            onClick={() => upload.mutate()}
          >
            {upload.isPending && <Spinner />} Upload lecture
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field label="Lecture title" htmlFor="l-title">
            <input id="l-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Length (min)" htmlFor="l-min">
            <input
              id="l-min"
              type="number"
              min={1}
              className="input"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Video" htmlFor="l-video">
            <FileDrop
              id="l-video"
              accept="video/*"
              file={video}
              onFile={setVideo}
              maxMb={2048}
              hint="MP4 or WebM · streamed via HLS after processing"
            />
          </Field>
          <Field label="Slides or PDF (optional)" htmlFor="l-slides">
            <FileDrop
              id="l-slides"
              accept=".pdf,.ppt,.pptx"
              file={slides}
              onFile={setSlides}
              maxMb={100}
              hint="PDF, PPT or PPTX"
            />
          </Field>
        </div>
        <Field
          label="Transcript (optional)"
          htmlFor="l-tr"
          hint="If empty, we transcribe the video automatically. The AI tutor answers from this text."
        >
          <textarea
            id="l-tr"
            rows={4}
            className="textarea"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </Field>
        {upload.isPending && (
          <div>
            <ProgressBar value={pct} label="Upload progress" />
            <p className="mt-1 text-xs text-ink-soft">Uploading… {pct}%</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ContentTab({ course }: { course: CourseDetail }) {
  const navigate = useNavigate();
  const [moduleTitle, setModuleTitle] = useState('');
  const [uploadTo, setUploadTo] = useState<Module | null>(null);
  const addModule = useMutation({
    mutationFn: () => courseService.addModule(course.id, { title: moduleTitle }),
    onSuccess: () => {
      setModuleTitle('');
      void queryClient.invalidateQueries({ queryKey: qk.course(course.id) });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const genQuiz = useMutation({
    mutationFn: (lectureId: string) => aiService.generateQuiz(lectureId, 5),
    onSuccess: (q) => {
      toast.success('AI quiz draft created. Review it before publishing.');
      navigate(`/instructor/quizzes/${q.id}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      {course.modules.length === 0 && (
        <p className="text-sm text-ink-soft">Start by adding a module — a group of related lectures.</p>
      )}
      {course.modules.map((m, mi) => (
        <section key={m.id} className="panel overflow-hidden">
          <header className="flex items-center gap-3 border-b border-line bg-sunken/60 px-4 py-2.5">
            <span className="font-mono text-xs text-ink-faint">Module {mi + 1}</span>
            <h3 className="flex-1 font-medium">{m.title}</h3>
            <button className="btn-secondary py-1.5" onClick={() => setUploadTo(m)}>
              <Plus className="h-4 w-4" /> Lecture
            </button>
          </header>
          {m.lectures.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-soft">No lectures yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {m.lectures.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <Video className="h-4 w-4 text-ink-faint" aria-hidden />
                  <span className="min-w-0 flex-1">{l.title}</span>
                  {l.resource_urls.length > 0 && (
                    <FileText className="h-4 w-4 text-ink-faint" aria-label="Has slides" />
                  )}
                  {!l.video_url && <Pill tone="warn">No video</Pill>}
                  <span className="font-mono text-xs text-ink-faint">
                    {formatDuration(l.duration_seconds)}
                  </span>
                  <button
                    className="btn-ghost py-1 text-xs"
                    onClick={() => genQuiz.mutate(l.id)}
                    disabled={genQuiz.isPending}
                  >
                    {genQuiz.isPending && genQuiz.variables === l.id ? (
                      <Spinner />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}{' '}
                    Generate quiz
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (moduleTitle.trim()) addModule.mutate();
        }}
      >
        <label htmlFor="mod" className="sr-only">
          New module title
        </label>
        <input
          id="mod"
          className="input max-w-sm"
          placeholder="New module title"
          value={moduleTitle}
          onChange={(e) => setModuleTitle(e.target.value)}
        />
        <button className="btn-secondary shrink-0" disabled={!moduleTitle.trim() || addModule.isPending}>
          <Plus className="h-4 w-4" /> Add module
        </button>
      </form>
      <LectureUploadModal module={uploadTo} courseId={course.id} onClose={() => setUploadTo(null)} />
    </div>
  );
}

const assignmentSchema = z.object({
  title: z.string().trim().min(5, 'Use at least 5 characters'),
  instructions: z.string().trim().min(20, 'Give students enough instructions (20+ characters)'),
  due_date: z
    .string()
    .min(1, 'Pick a due date')
    .refine((v) => new Date(v) > new Date(), 'Pick a date in the future'),
  rubric: z
    .array(
      z.object({
        criterion: z.string().trim().min(2, 'Name the criterion'),
        points: z.coerce.number().int().min(1, 'At least 1'),
      }),
    )
    .min(1, 'Add at least one rubric row'),
});
type AssignmentValues = z.infer<typeof assignmentSchema>;

function AssignmentsTab({ course }: { course: CourseDetail }) {
  const [open, setOpen] = useState(false);
  const list = useQuery({
    queryKey: qk.courseAssignments(course.id),
    queryFn: () => assessmentService.courseAssignments(course.id),
  });
  const { register, control, handleSubmit, reset, watch, formState } = useForm<AssignmentValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      rubric: [
        { criterion: 'Correctness', points: 50 },
        { criterion: 'Code quality', points: 30 },
        { criterion: 'Explanation', points: 20 },
      ],
    },
  });
  const rows = useFieldArray({ control, name: 'rubric' });
  const total = (watch('rubric') ?? []).reduce((s, r) => s + (Number(r.points) || 0), 0);
  const create = useMutation({
    mutationFn: (v: AssignmentValues) =>
      assessmentService.createAssignment({
        ...v,
        course_id: course.id,
        due_date: new Date(v.due_date).toISOString(),
      }),
    onSuccess: () => {
      toast.success('Assignment published. Enrolled students were notified.');
      setOpen(false);
      reset();
      void queryClient.invalidateQueries({ queryKey: qk.courseAssignments(course.id) });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New assignment
        </button>
      </div>
      {list.isError && <ErrorState error={list.error} />}
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {list.data?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-ink-soft">No assignments yet.</li>
        )}
        {list.data?.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{a.title}</p>
              <p className="text-xs text-ink-soft">
                {dueLabel(a.due_date).text} · {a.rubric.reduce((s, r) => s + r.points, 0)} points
              </p>
            </div>
            <Pill tone="brand">{pluralize(a.submission_count ?? 0, 'submission')}</Pill>
            <Link to={`/instructor/grading?assignment=${a.id}&course=${course.id}`} className="btn-secondary">
              Grade
            </Link>
          </li>
        ))}
      </ul>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New assignment"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" form="assignment-form" disabled={create.isPending}>
              {create.isPending && <Spinner />} Publish assignment
            </button>
          </>
        }
      >
        <form
          id="assignment-form"
          className="space-y-4"
          onSubmit={handleSubmit((v) => create.mutate(v))}
          noValidate
        >
          <Field label="Title" htmlFor="a-title" error={formState.errors.title?.message}>
            <input id="a-title" className="input" {...register('title')} />
          </Field>
          <Field label="Instructions" htmlFor="a-ins" error={formState.errors.instructions?.message}>
            <textarea id="a-ins" rows={4} className="textarea" {...register('instructions')} />
          </Field>
          <Field label="Due date" htmlFor="a-due" error={formState.errors.due_date?.message}>
            <input id="a-due" type="datetime-local" className="input max-w-xs" {...register('due_date')} />
          </Field>
          <fieldset>
            <legend className="label">Rubric · {total} points</legend>
            <div className="space-y-2">
              {rows.fields.map((f, i) => (
                <div key={f.id} className="flex gap-2">
                  <input
                    aria-label={`Criterion ${i + 1}`}
                    className="input"
                    {...register(`rubric.${i}.criterion`)}
                  />
                  <input
                    aria-label={`Points for criterion ${i + 1}`}
                    type="number"
                    className="input w-24"
                    {...register(`rubric.${i}.points`)}
                  />
                  <button
                    type="button"
                    className="btn-ghost p-2"
                    onClick={() => rows.remove(i)}
                    aria-label={`Remove criterion ${i + 1}`}
                    disabled={rows.fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {formState.errors.rubric && (
              <p className="mt-1 text-xs text-danger">
                Check the rubric rows — every row needs a name and points.
              </p>
            )}
            <button
              type="button"
              className="btn-ghost mt-2 px-2"
              onClick={() => rows.append({ criterion: '', points: 10 })}
            >
              <Plus className="h-4 w-4" /> Add criterion
            </button>
          </fieldset>
        </form>
      </Modal>
    </div>
  );
}

type Tab = 'details' | 'content' | 'assignments' | 'tutor';

/**
 * PRD §11 "Use AI tutor chat — Instructor: Yes (as reviewer)". Lets the course's instructor ask the tutor
 * what a student would ask and check that answers and citations match their lectures.
 */
function TutorPreviewTab({ course, onShowLecture }: { course: CourseDetail; onShowLecture: () => void }) {
  const session = useQuery({
    queryKey: ['ai', 'session-for', course.id],
    queryFn: () => aiService.startSession(course.id),
    staleTime: Infinity,
  });
  if (!course.lecture_count)
    return (
      <p className="text-sm text-ink-soft">Add a lecture with a transcript, then review the tutor here.</p>
    );
  if (session.isLoading) return <PageLoader />;
  if (session.isError) return <ErrorState error={session.error} onRetry={() => session.refetch()} />;
  return (
    <div className="max-w-3xl">
      <p className="mb-3 text-sm text-ink-soft">
        Ask what a student would ask. Answers come only from this course’s transcripts — this chat is visible
        only to you.
      </p>
      <ChatPanel compact sessionId={session.data!.id} onOpenSource={onShowLecture} />
    </div>
  );
}

export default function CourseEditorPage() {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'details';
  const me = useAuthStore((st) => st.user);
  const course = useQuery({
    queryKey: [...qk.course(courseId ?? ''), true],
    queryFn: () => courseService.get(courseId!),
    enabled: !!courseId,
  });
  useDocumentTitle(courseId ? course.data?.title : 'New course');
  const submit = useMutation({
    mutationFn: () => courseService.submitForReview(courseId!),
    onSuccess: () => {
      toast.success('Submitted for admin review');
      void queryClient.invalidateQueries({ queryKey: qk.course(courseId!) });
      void queryClient.invalidateQueries({ queryKey: qk.instructorCourses });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const back = (
    <Link to="/instructor/courses" className="btn-ghost -ml-2 mb-2 px-2">
      <ArrowLeft className="h-4 w-4" />{' '}
      {me?.roles.includes('admin') && !me.roles.includes('instructor') ? 'All courses' : 'My courses'}
    </Link>
  );

  if (!courseId) {
    return (
      <div>
        <PageHeader back={back} title="New course" />
        <DetailsForm />
      </div>
    );
  }
  if (course.isLoading) return <PageLoader />;
  if (course.isError) return <ErrorState error={course.error} onRetry={() => course.refetch()} />;
  const c = course.data!;
  const canSubmit = c.status === 'draft' || c.status === 'rejected';
  const isOwner = me?.id === c.instructor_id;

  return (
    <div>
      <PageHeader
        back={back}
        title={c.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <CourseStatusPill status={c.status} /> {pluralize(c.lecture_count, 'lecture')} ·{' '}
            {formatDuration(c.total_duration_seconds)}
          </span>
        }
        actions={
          <>
            {c.status === 'approved' && (
              <Link to={`/courses/${c.id}`} className="btn-secondary">
                <ExternalLink className="h-4 w-4" /> View in catalog
              </Link>
            )}
            {canSubmit && (
              <button className="btn-primary" onClick={() => submit.mutate()} disabled={submit.isPending}>
                {submit.isPending ? <Spinner /> : <Send className="h-4 w-4" />} Submit for review
              </button>
            )}
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={(t) => setParams({ tab: t }, { replace: true })}
        tabs={[
          { value: 'details', label: 'Details' },
          { value: 'content', label: `Content (${c.lecture_count})` },
          { value: 'assignments', label: 'Assignments' },
          // only the course's own instructor reviews its tutor (admins: "No" in §11)
          ...(isOwner ? [{ value: 'tutor' as const, label: 'AI tutor' }] : []),
        ]}
      />
      <div className="mt-6">
        {tab === 'details' && <DetailsForm key={c.id} course={c} />}
        {tab === 'content' && <ContentTab course={c} />}
        {tab === 'assignments' && <AssignmentsTab course={c} />}
        {tab === 'tutor' && isOwner && (
          <TutorPreviewTab
            course={c}
            onShowLecture={() => setParams({ tab: 'content' }, { replace: true })}
          />
        )}
      </div>
    </div>
  );
}
