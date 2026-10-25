import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

function Status({ code, title, body }: { code: string; title: string; body: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-start justify-center px-4">
      <p className="font-mono text-sm text-ink-faint">{code}</p>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-ink-soft">{body}</p>
      <Link to="/" className="btn-primary mt-6">
        Go to your home page
      </Link>
    </div>
  );
}

export const NotFoundPage = () => (
  <Status
    code="404"
    title="This page doesn’t exist"
    body="The link may be old, or the course may have been archived."
  />
);

export const ForbiddenPage = () => (
  <Status
    code="403"
    title="You don’t have access to this page"
    body="This area belongs to a different role. Ask an admin if you think you should have access."
  />
);

export function RouteErrorPage() {
  const err = useRouteError();
  if (isRouteErrorResponse(err) && err.status === 404) return <NotFoundPage />;
  return (
    <Status
      code="Error"
      title="This page failed to load"
      body="Reload the page. If it keeps happening, sign out and back in."
    />
  );
}
