import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, FileBadge } from 'lucide-react';
import { gamificationService } from '@/services/gamificationService';
import { getErrorMessage } from '@/services/apiClient';
import { qk } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyState, ErrorState, Skeleton, Spinner } from '@/components/common/feedback';
import { PageHeader } from '@/components/common/ui';
import type { Certificate } from '@/types';
import { downloadBlob, formatDate } from '@/utils/format';

function CertificateCard({ c }: { c: Certificate }) {
  const dl = useMutation({
    mutationFn: () => gamificationService.downloadCertificate(c.id),
    onSuccess: (blob) =>
      downloadBlob(blob, `certificate-${c.course_title.toLowerCase().replace(/\W+/g, '-')}.pdf`),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <li className="panel overflow-hidden">
      {/* Mini rendition of the PDF */}
      <div className="m-3 rounded border-2 border-brand/70 p-1">
        <div className="flex flex-col items-center rounded-sm border border-brand/40 px-4 py-6 text-center">
          <p className="text-[10px] text-brand">Vertexon Learning</p>
          <p className="mt-2 font-display text-lg font-semibold text-brand">Certificate of Completion</p>
          <p className="mt-3 text-xs text-ink-soft">This certifies that</p>
          <p className="marker mt-1 font-display text-xl font-semibold">{c.user_name}</p>
          <p className="mt-2 text-xs text-ink-soft">has completed</p>
          <p className="mt-1 font-medium leading-snug">{c.course_title}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <div className="text-sm">
          <p className="text-ink-soft">Issued {formatDate(c.issued_at)}</p>
          <p className="text-xs text-ink-faint">Instructor: {c.instructor_name}</p>
        </div>
        <button className="btn-primary" onClick={() => dl.mutate()} disabled={dl.isPending}>
          {dl.isPending ? <Spinner /> : <Download className="h-4 w-4" />} PDF
        </button>
      </div>
    </li>
  );
}

export default function CertificatesPage() {
  useDocumentTitle('Certificates');
  const q = useQuery({ queryKey: qk.certificates, queryFn: gamificationService.certificates });
  return (
    <div>
      <PageHeader title="Certificates" />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <Skeleton className="h-64 max-w-sm" />
      ) : q.data!.length === 0 ? (
        <EmptyState
          icon={<FileBadge className="h-6 w-6" />}
          title="No certificates yet"
          body="Finish all lectures in a course and your certificate appears here."
          action={
            <Link to="/my-learning" className="btn-primary">
              Continue learning
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data!.map((c) => (
            <CertificateCard key={c.id} c={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
