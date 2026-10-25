import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Search } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { getErrorMessage } from '@/services/apiClient';
import { qk, queryClient } from '@/services/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ErrorState, Skeleton, Spinner } from '@/components/common/feedback';
import { Avatar, ConfirmDialog, Modal, PageHeader, Pagination, Pill } from '@/components/common/ui';
import type { Role, User } from '@/types';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

const ROLES: Role[] = ['student', 'instructor', 'admin'];

function RolesModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [prevId, setPrevId] = useState<string | null>(null);
  if (user && user.id !== prevId) {
    setPrevId(user.id);
    setRoles(user.roles);
  }
  const save = useMutation({
    mutationFn: () => adminService.setRoles(user!.id, roles),
    onSuccess: (u) => {
      toast.success(`Roles updated for ${u.full_name}`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`Roles for ${user?.full_name ?? ''}`}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!roles.length || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Spinner />} Save roles
          </button>
        </>
      }
    >
      <fieldset className="space-y-2">
        <legend className="sr-only">Roles</legend>
        {ROLES.map((r) => (
          <label key={r} className="flex items-start gap-3 rounded border border-line p-3">
            <input
              type="checkbox"
              className="checkbox mt-0.5"
              checked={roles.includes(r)}
              onChange={(e) => setRoles((p) => (e.target.checked ? [...p, r] : p.filter((x) => x !== r)))}
            />
            <span>
              <span className="block font-medium capitalize">{r}</span>
              <span className="block text-xs text-ink-soft">
                {r === 'student'
                  ? 'Enroll, learn, use the AI tutor'
                  : r === 'instructor'
                    ? 'Create courses, grade, see own analytics'
                    : 'Full platform governance'}
              </span>
            </span>
          </label>
        ))}
        {!roles.length && <p className="text-xs text-danger">A user needs at least one role.</p>}
      </fieldset>
    </Modal>
  );
}

export default function UsersPage() {
  useDocumentTitle('Users & roles');
  const me = useAuthStore((s) => s.user)!;
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<'' | 'active' | 'suspended'>('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const params = { q: dq, role, status, page };
  const users = useQuery({
    queryKey: qk.adminUsers(params),
    queryFn: () => adminService.users(params),
    placeholderData: keepPreviousData,
  });
  // Row menu is rendered in a fixed layer so the table's scroll container can't clip it.
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'suspend' | 'reactivate' | 'delete'; user: User } | null>(
    null,
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  const act = useMutation({
    mutationFn: async ({ kind, user }: { kind: 'suspend' | 'reactivate' | 'delete'; user: User }) => {
      if (kind === 'delete') await adminService.deleteUser(user.id);
      else await adminService.setSuspended(user.id, kind === 'suspend');
      return { kind, user };
    },
    onSuccess: ({ kind, user }) => {
      toast.success(
        `${user.full_name} ${kind === 'delete' ? 'deleted' : kind === 'suspend' ? 'suspended' : 'reactivated'}`,
      );
      setConfirm(null);
      void invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader title="Users & roles" />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            className="input pl-9"
            placeholder="Search by name or email"
            aria-label="Search users"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="select sm:w-40"
          aria-label="Filter by role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | '');
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r}
            </option>
          ))}
        </select>
        <select
          className="select sm:w-40"
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(1);
          }}
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {users.isError ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : users.isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <>
          <div
            className={cn(
              'overflow-x-auto rounded-lg border border-line bg-surface',
              users.isPlaceholderData && 'opacity-60',
            )}
          >
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-line text-left text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Roles</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.data!.data.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-3">
                        <Avatar name={u.full_name} size={30} />
                        <span>
                          <span className="block font-medium">
                            {u.full_name}{' '}
                            {u.id === me.id && (
                              <span className="text-xs font-normal text-ink-faint">(you)</span>
                            )}
                          </span>
                          <span className="block text-xs text-ink-soft">{u.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Pill
                            key={r}
                            tone={r === 'admin' ? 'danger' : r === 'instructor' ? 'brand' : 'neutral'}
                            className="capitalize"
                          >
                            {r}
                          </Pill>
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {u.is_active ? <Pill tone="ok">Active</Pill> : <Pill tone="warn">Suspended</Pill>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        className="btn-ghost p-1.5"
                        aria-label={`Actions for ${u.full_name}`}
                        aria-expanded={menu?.id === u.id}
                        onClick={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setMenu(
                            menu?.id === u.id
                              ? null
                              : { id: u.id, top: r.bottom + 4, right: window.innerWidth - r.right },
                          );
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menu?.id === u.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} aria-hidden />
                          <div
                            role="menu"
                            className="fixed z-40 w-44 rounded-lg border border-line bg-surface py-1 text-left shadow-lift"
                            style={{ top: menu.top, right: menu.right }}
                          >
                            <button
                              role="menuitem"
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-sunken"
                              onClick={() => {
                                setEditing(u);
                                setMenu(null);
                              }}
                            >
                              Change roles
                            </button>
                            {u.id !== me.id && (
                              <>
                                <button
                                  role="menuitem"
                                  className="block w-full px-3 py-2 text-left text-sm hover:bg-sunken"
                                  onClick={() => {
                                    setConfirm({ kind: u.is_active ? 'suspend' : 'reactivate', user: u });
                                    setMenu(null);
                                  }}
                                >
                                  {u.is_active ? 'Suspend' : 'Reactivate'}
                                </button>
                                <button
                                  role="menuitem"
                                  className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-sunken"
                                  onClick={() => {
                                    setConfirm({ kind: 'delete', user: u });
                                    setMenu(null);
                                  }}
                                >
                                  Delete account
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {users.data!.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                      No users match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={users.data!.page}
            pageSize={users.data!.page_size}
            total={users.data!.total}
            onChange={setPage}
          />
        </>
      )}

      <RolesModal user={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === 'delete'
            ? `Delete ${confirm.user.full_name}?`
            : confirm?.kind === 'suspend'
              ? `Suspend ${confirm?.user.full_name}?`
              : `Reactivate ${confirm?.user.full_name}?`
        }
        body={
          confirm?.kind === 'delete'
            ? 'This permanently removes the account and its enrollments. It can’t be undone.'
            : confirm?.kind === 'suspend'
              ? 'They’ll be signed out and can’t sign in until you reactivate the account.'
              : 'They’ll be able to sign in again.'
        }
        confirmLabel={
          confirm?.kind === 'delete'
            ? 'Delete account'
            : confirm?.kind === 'suspend'
              ? 'Suspend'
              : 'Reactivate'
        }
        tone={confirm?.kind === 'reactivate' ? 'primary' : 'danger'}
        onConfirm={() => confirm && act.mutate(confirm)}
        pending={act.isPending}
      />
    </div>
  );
}
