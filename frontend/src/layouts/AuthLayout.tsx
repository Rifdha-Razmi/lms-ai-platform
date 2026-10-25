import { Outlet } from 'react-router-dom';
import { Brand } from './AppLayout';

/**
 * Calm line-art: an open notebook, a highlighter marking one line,
 * and a small AI spark. The highlighter stroke draws in once on load.
 */
function NotebookArt() {
  return (
    <svg
      viewBox="0 0 360 260"
      className="w-full max-w-[380px]"
      role="img"
      aria-label="Open notebook with a highlighted line"
    >
      <g
        fill="none"
        stroke="rgb(var(--brand))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* pages */}
        <path d="M180 62 C150 46 98 44 52 54 L52 214 C98 204 150 206 180 222 Z" fill="rgb(var(--surface))" />
        <path
          d="M180 62 C210 46 262 44 308 54 L308 214 C262 204 210 206 180 222 Z"
          fill="rgb(var(--surface))"
        />
        {/* left page text lines */}
        <path d="M74 88 H156 M74 110 H150 M74 154 H156 M74 176 H132" opacity="0.35" />
        {/* the highlighted line */}
        <path
          className="draw-stroke"
          d="M72 132 H158"
          stroke="rgb(var(--marker))"
          strokeWidth="14"
          opacity="0.9"
        />
        <path d="M74 132 H146" />
        {/* right page: tiny diagram (a tree, it's an LMS for CS) */}
        <path d="M244 92 L218 128 M244 92 L270 128 M218 128 L204 164 M218 128 L232 164" opacity="0.6" />
        <circle cx="244" cy="92" r="7" fill="rgb(var(--surface))" />
        <circle cx="218" cy="128" r="7" fill="rgb(var(--surface))" />
        <circle cx="270" cy="128" r="7" fill="rgb(var(--surface))" />
        <circle cx="204" cy="164" r="7" fill="rgb(var(--marker))" />
        <circle cx="232" cy="164" r="7" fill="rgb(var(--surface))" />
        {/* highlighter pen */}
        <g transform="translate(-12 -8) rotate(-35 168 128)">
          <rect x="162" y="108" width="16" height="58" rx="4" fill="rgb(var(--surface))" />
          <path d="M162 120 H178" />
          <path d="M164 166 L170 178 L176 166" fill="rgb(var(--marker))" />
        </g>
        {/* AI spark */}
        <path d="M300 28 V44 M292 36 H308 M294.5 30.5 L305.5 41.5 M305.5 30.5 L294.5 41.5" strokeWidth="2" />
      </g>
    </svg>
  );
}

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-2">
      <main className="flex flex-col px-4 py-6 sm:px-10">
        <Brand />
        <div className="flex flex-1 items-center justify-center py-8 lg:py-10">
          <div className="w-full max-w-[400px]">
            <Outlet />
          </div>
        </div>
        <p className="text-center text-xs text-ink-faint">
          © {new Date().getFullYear()} Vertexon Learning Technologies
        </p>
      </main>

      <aside className="m-3 hidden flex-col items-center justify-center rounded-[28px] bg-brand-tint px-12 text-center lg:flex">
        <NotebookArt />
        <h2 className="mt-10 max-w-sm font-display text-3xl font-semibold leading-snug">
          Learn at your own pace.
          <br />
          Ask when you’re stuck.
        </h2>
      </aside>
    </div>
  );
}
