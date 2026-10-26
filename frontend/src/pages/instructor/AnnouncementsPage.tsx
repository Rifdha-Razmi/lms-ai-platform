import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';
import { courseService } from '@/services/courseService';
import { communityService } from '@/services/communityService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState, Skeleton, Spinner } from '@/components/common/feedback';
import { Field, PageHeader } from '@/components/common/ui';
import { timeAgo } from '@/utils/format';

export default function AnnouncementsPage() {
  useDocumentTitle('Announcements');
  const courses = useQuery({ queryKey: qk.instructorCourses, queryFn: courseService.mine });
  const live = courses.data?.filter((c) => c.status === 'approved') ?? [];
  const [courseId, setCourseId] = useState('');
  const [text, setText] = useState('');
  const target = courseId || live[0]?.id || '';
  const list = useQuery({ queryKey: qk.announcements(), queryFn: () => communityService.announcements() });
  const post = useMutation({
    mutationFn: () => communityService.postAnnouncement(target, text),
    onSuccess: () => {
      toast.success('Announcement posted. Enrolled students were notified.');
      setText('');
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Announcements" />
      <form
        className="panel space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) post.mutate();
        }}
      >
        <Field label="Course" htmlFor="an-c">
          <select id="an-c" className="select" value={target} onChange={(e) => setCourseId(e.target.value)}>
            {live.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Message" htmlFor="an-t" hint={`${text.length}/1000`}>
          <textarea
            id="an-t"
            rows={4}
            maxLength={1000}
            className="textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Live doubt-clearing session on Friday at 7 PM"
          />
        </Field>
        <button className="btn-primary" disabled={!text.trim() || !target || post.isPending}>
          {post.isPending ? <Spinner /> : <Megaphone className="h-4 w-4" />} Post announcement
        </button>
      </form>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Posted</h2>
      {list.isLoading ? (
        <Skeleton className="h-24" />
      ) : list.data?.length ? (
        <ul className="space-y-4">
          {list.data.map((a) => (
            <li key={a.id} className="border-l-2 border-marker pl-4">
              <p>{a.content}</p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {a.course_title} · {timeAgo(a.created_at)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No announcements yet" />
      )}
    </div>
  );
}
