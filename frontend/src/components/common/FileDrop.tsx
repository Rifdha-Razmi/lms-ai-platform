import { useRef, useState, type DragEvent } from 'react';
import { FileUp, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export function FileDrop({
  accept,
  file,
  onFile,
  hint,
  maxMb = 25,
  id,
}: {
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  hint?: string;
  maxMb?: number;
  id?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const take = (f: File | undefined) => {
    if (!f) return;
    if (f.size > maxMb * 1024 * 1024) {
      setErr(`That file is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is ${maxMb} MB.`);
      return;
    }
    setErr(null);
    onFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    take(e.dataTransfer.files[0]);
  };

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded border border-line bg-sunken px-3 py-2 text-sm">
        <span className="truncate">
          <span className="font-medium">{file.name}</span>{' '}
          <span className="text-ink-faint">· {(file.size / 1024).toFixed(0)} KB</span>
        </span>
        <button type="button" className="btn-ghost p-1" onClick={() => onFile(null)} aria-label="Remove file">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div>
      <button
        type="button"
        id={id}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center gap-1 rounded border border-dashed px-4 py-6 text-sm transition-colors',
          drag ? 'border-brand bg-brand-tint' : 'border-line hover:border-brand/60',
        )}
      >
        <FileUp className="h-5 w-5 text-ink-faint" aria-hidden />
        <span>
          <span className="font-medium text-brand">Choose a file</span> or drag it here
        </span>
        {hint && <span className="text-xs text-ink-faint">{hint}</span>}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true" // the visible button above is the labelled control
        onChange={(e) => take(e.target.files?.[0])}
      />
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}
