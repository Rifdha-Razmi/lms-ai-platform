import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search } from 'lucide-react';
import { courseService } from '@/services/courseService';
import { qk } from '@/services/queryClient';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CourseCard } from '@/components/common/CourseCard';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/feedback';
import { PageHeader, Pagination } from '@/components/common/ui';
import type { CourseQuery, Difficulty } from '@/types';
import { cn } from '@/utils/cn';

const DIFFICULTIES: (Difficulty | '')[] = ['', 'beginner', 'intermediate', 'advanced'];

export default function CatalogPage() {
  useDocumentTitle('Course Catalog');
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  // The URL is the source of truth; `q` is just what's in the box while typing.
  const [q, setQ] = useState(urlQ);
  const timer = useRef<number>();
  const [showFilters, setShowFilters] = useState(false);

  // URL changed from outside (back/forward, a shared link) -> update the box
  useEffect(() => setQ(urlQ), [urlQ]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Typing updates results live, after a short pause
  const onType = (value: string) => {
    setQ(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value.trim()) next.set('q', value.trim());
          else next.delete('q');
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    }, 300);
  };

  const query: CourseQuery = {
    q: urlQ || undefined,
    category: params.get('category') ?? '',
    difficulty: (params.get('difficulty') as Difficulty) ?? '',
    min_rating: Number(params.get('min_rating') ?? 0) || undefined,
    sort: (params.get('sort') as CourseQuery['sort']) ?? 'popular',
    page: Number(params.get('page') ?? 1),
  };

  const set = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });

  const categories = useQuery({
    queryKey: qk.categories,
    queryFn: courseService.categories,
    staleTime: Infinity,
  });
  const courses = useQuery({
    queryKey: qk.catalog(query),
    queryFn: () => courseService.list(query),
    placeholderData: keepPreviousData,
  });
  const activeFilters = [query.category, query.difficulty, query.min_rating].filter(Boolean).length;

  return (
    <div>
      <PageHeader title="Course Catalog" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            className="input h-10 pl-9"
            placeholder="Search by topic, course or instructor"
            value={q}
            onChange={(e) => onType(e.target.value)}
            aria-label="Search courses"
          />
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary sm:hidden"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters{activeFilters ? ` (${activeFilters})` : ''}
          </button>
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            className="select h-10 w-auto"
            value={query.sort}
            onChange={(e) => set('sort', e.target.value)}
          >
            <option value="popular">Most popular</option>
            <option value="rating">Highest rated</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-8 sm:grid-cols-[200px_1fr]">
        <aside className={cn('space-y-6 text-sm', !showFilters && 'hidden sm:block')} aria-label="Filters">
          <fieldset>
            <legend className="mb-2 font-medium">Category</legend>
            <ul className="space-y-1">
              {['', ...(categories.data ?? [])].map((c) => (
                <li key={c || 'all'}>
                  <button
                    onClick={() => set('category', c)}
                    aria-pressed={query.category === c}
                    className={cn(
                      'w-full rounded px-2 py-1 text-left',
                      query.category === c
                        ? 'bg-brand-tint font-medium text-brand'
                        : 'text-ink-soft hover:bg-sunken',
                    )}
                  >
                    {c || 'All categories'}
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-medium">Difficulty</legend>
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d || 'any'}
                  onClick={() => set('difficulty', d)}
                  aria-pressed={query.difficulty === d}
                  className={cn(
                    'rounded border px-2 py-1 capitalize',
                    query.difficulty === d
                      ? 'border-brand bg-brand-tint text-brand'
                      : 'border-line text-ink-soft',
                  )}
                >
                  {d || 'Any'}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-medium">Rating</legend>
            {[0, 4.5, 4.7].map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 py-0.5 text-ink-soft">
                <input
                  type="radio"
                  name="rating"
                  className="form-radio border-line text-brand focus:ring-brand"
                  checked={(query.min_rating ?? 0) === r}
                  onChange={() => set('min_rating', r ? String(r) : '')}
                />
                {r ? `${r} and up` : 'Any rating'}
              </label>
            ))}
          </fieldset>
          {activeFilters > 0 && (
            <button
              className="text-sm font-medium text-brand hover:underline"
              onClick={() => setParams(urlQ ? { q: urlQ } : {})}
            >
              Clear filters
            </button>
          )}
        </aside>

        <section aria-live="polite">
          {courses.isError ? (
            <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
          ) : courses.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          ) : courses.data!.data.length === 0 ? (
            <EmptyState
              title="No courses match"
              body="Try a broader search term or clear a filter."
              action={
                <button
                  className="btn-secondary"
                  onClick={() => {
                    window.clearTimeout(timer.current);
                    setQ('');
                    setParams({});
                  }}
                >
                  Clear search and filters
                </button>
              }
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-ink-soft">
                {courses.data!.total} {courses.data!.total === 1 ? 'course' : 'courses'}
              </p>
              <div
                className={cn(
                  'grid gap-4 md:grid-cols-2 xl:grid-cols-3',
                  courses.isPlaceholderData && 'opacity-60',
                )}
              >
                {courses.data!.data.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
              <Pagination
                page={courses.data!.page}
                pageSize={courses.data!.page_size}
                total={courses.data!.total}
                onChange={(pg) => set('page', String(pg))}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
