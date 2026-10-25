import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GuestOnly, ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

const student: User = {
  id: 'u1',
  full_name: 'Ananya Sharma',
  email: 'a@x.com',
  is_active: true,
  role: 'student',
  roles: ['student'],
  created_at: '',
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<p>login page</p>} />
        </Route>
        <Route path="/" element={<p>home</p>} />
        <Route path="/catalog" element={<p>home page</p>} />
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<p>admin area</p>} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/settings" element={<p>settings</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute (RBAC, PRD §11)', () => {
  beforeEach(() => useAuthStore.getState().clear());

  it('redirects anonymous users to login', () => {
    renderAt('/settings');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('sends a user who just signed out to the home page, not Sign in', () => {
    useAuthStore.getState().clear({ signedOut: true });
    renderAt('/settings');
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('lets a signed-in user through', () => {
    useAuthStore.setState({ user: student, accessToken: 't', refreshToken: 'r' });
    renderAt('/settings');
    expect(screen.getByText('settings')).toBeInTheDocument();
  });

  it('blocks a student from the admin area', () => {
    useAuthStore.setState({ user: student, accessToken: 't', refreshToken: 'r' });
    renderAt('/admin');
    expect(screen.getByText(/don’t have access/)).toBeInTheDocument();
  });

  it('after sign-in returns to ?next= when it is an in-app path', () => {
    useAuthStore.setState({ user: student, accessToken: 't', refreshToken: 'r' });
    renderAt('/login?next=%2Fsettings');
    expect(screen.getByText('settings')).toBeInTheDocument();
  });

  it('ignores ?next= pointing to another site', () => {
    useAuthStore.setState({ user: student, accessToken: 't', refreshToken: 'r' });
    renderAt('/login?next=%2F%2Fevil.com');
    expect(screen.getByText('home')).toBeInTheDocument();
  });
});
