import { useEffect } from 'react';

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · LMS-AI` : 'LMS-AI · Vertexon Learning';
  }, [title]);
}
