import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  FileBadge,
  Flag,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Monitor,
  ScrollText,
  Settings,
  ShieldCheck,
  Sun,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { qk } from '@/services/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useUiStore, type Theme } from '@/store/uiStore';
import { NotificationBell } from '@/components/common/NotificationBell';
import { Avatar } from '@/components/common/ui';
import { cn } from '@/utils/cn';
import type { Role } from '@/types';

type NavItem = { to: string; key: string; icon: ComponentType<{ className?: string }>; end?: boolean };
const NAV: Record<Role, { section: string; items: NavItem[] }> = {
  student: {
    section: 'nav.learn',
    items: [
      { to: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
      { to: '/my-learning', key: 'nav.myLearning', icon: BookOpen },
      { to: '/catalog', key: 'nav.catalog', icon: Library },
      { to: '/tutor', key: 'nav.aiTutor', icon: Bot },
      { to: '/quizzes', key: 'nav.quizzes', icon: ClipboardCheck },
      { to: '/assignments', key: 'nav.assignments', icon: ClipboardList },
      { to: '/study-plan', key: 'nav.studyPlan', icon: CalendarCheck },
      { to: '/achievements', key: 'nav.achievements', icon: Trophy },
      { to: '/certificates', key: 'nav.certificates', icon: FileBadge },
    ],
  },
  instructor: {
    section: 'nav.teach',
    items: [
      { to: '/instructor', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
      { to: '/instructor/courses', key: 'nav.myCourses', icon: GraduationCap },
      { to: '/instructor/grading', key: 'nav.grading', icon: ClipboardList },
      { to: '/instructor/quizzes', key: 'nav.quizReview', icon: ClipboardCheck },
      { to: '/instructor/analytics', key: 'nav.analytics', icon: BarChart3 },
      { to: '/instructor/announcements', key: 'nav.announcements', icon: Megaphone },
    ],
  },
  admin: {
    section: 'nav.govern',
    items: [
      { to: '/admin', key: 'nav.overview', icon: BarChart3, end: true },
      { to: '/admin/users', key: 'nav.users', icon: Users },
      { to: '/admin/approvals', key: 'nav.approvals', icon: ShieldCheck },
      { to: '/instructor/courses', key: 'nav.allCourses', icon: GraduationCap }, // §11: admin edits any course
      { to: '/admin/moderation', key: 'nav.moderation', icon: Flag },
      { to: '/admin/audit', key: 'nav.auditLog', icon: ScrollText },
    ],
  },
};

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-1">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-brand" />
        <rect x="6" y="19" width="20" height="5" rx="1.5" fill="#FFD84D" />
        <path d="M9 8h3v13H9zM14 8h3v13h-3zM19 8l4 13h-3l-4-13z" fill="#fff" />
      </svg>
      <span className="font-display text-lg font-semibold leading-none">
        LMS<span className="text-ink-faint">·</span>AI
      </span>
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const roles = (['student', 'instructor', 'admin'] as Role[]).filter((r) => user?.roles.includes(r));
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <Brand />
      {roles.map((r) => (
        <div key={r}>
          {roles.length > 1 && (
            <p className="mb-1 px-2 text-xs font-medium text-ink-faint">{t(NAV[r].section)}</p>
          )}
          <ul className="space-y-0.5">
            {NAV[r].items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-brand-tint font-medium text-brand'
                        : 'text-ink-soft hover:bg-sunken hover:text-ink',
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-auto">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded px-2 py-1.5 text-sm',
              isActive
                ? 'bg-brand-tint font-medium text-brand'
                : 'text-ink-soft hover:bg-sunken hover:text-ink',
            )
          }
        >
          <Settings className="h-4 w-4" />
          {t('nav.settings')}
        </NavLink>
      </div>
    </nav>
  );
}

const themeIcon: Record<Theme, ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};
const nextTheme: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };

function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-2 rounded p-1 hover:bg-sunken"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar name={user.full_name} size={30} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-60 rounded-lg border border-line bg-surface py-1 shadow-lift">
          <div className="border-b border-line px-4 py-2.5">
            <p className="truncate text-sm font-medium">{user.full_name}</p>
            <p className="truncate text-xs text-ink-soft">{user.email}</p>
            <p className="mt-1 text-xs capitalize text-ink-faint">{user.roles.join(' + ')}</p>
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-sunken"
          >
            <Settings className="h-4 w-4" /> {t('nav.settings')}
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-sunken"
          >
            <LogOut className="h-4 w-4" /> {t('common.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const ThemeIcon = themeIcon[theme];
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-6">
      {isAuthenticated ? (
        <button className="btn-ghost -ml-2 p-2 lg:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      ) : (
        <Brand />
      )}
      <div className="ml-auto flex items-center gap-1">
        <button
          className="btn-ghost p-2"
          onClick={() => setTheme(nextTheme[theme])}
          aria-label={`Theme: ${theme}. Switch to ${nextTheme[theme]}`}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="h-[18px] w-[18px]" />
        </button>
        {isAuthenticated ? (
          <>
            <NotificationBell />
            <UserMenu />
          </>
        ) : (
          <>
            <Link to="/login" className="btn-ghost">
              {t('common.signIn')}
            </Link>
            <Link to="/register" className="btn-primary hidden sm:inline-flex">
              {t('common.createAccount')}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export function AppLayout() {
  const { isAuthenticated } = useAuth();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const location = useLocation();
  useEffect(() => setSidebarOpen(false), [location.pathname, setSidebarOpen]);

  // Keep roles fresh — e.g. an admin approves an instructor application while the user is signed in.
  const me = useQuery({
    queryKey: qk.me,
    queryFn: authService.me,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
  useEffect(() => {
    const current = useAuthStore.getState().user;
    if (me.data && current && me.data.roles.join() !== current.roles.join())
      useAuthStore.getState().setUser(me.data);
  }, [me.data]);

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      {isAuthenticated && (
        <>
          <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-surface lg:block">
            <Sidebar />
          </aside>
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="absolute inset-0 bg-ink/40" onClick={() => setSidebarOpen(false)} />
              <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface">
                <button
                  className="btn-ghost absolute right-2 top-4 p-1.5"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
                <Sidebar onNavigate={() => setSidebarOpen(false)} />
              </aside>
            </div>
          )}
        </>
      )}
      <div className={cn(isAuthenticated && 'lg:pl-60')}>
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
