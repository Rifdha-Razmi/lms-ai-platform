import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
import { homeFor, useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/services/apiClient';
import { IconInput } from '@/components/common/IconInput';
import { Spinner } from '@/components/common/feedback';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { safeNextPath } from '@/utils/safeUrl';

const schema = z.object({
  email: z.string().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit((values: Values) =>
    login.mutate(values, {
      onSuccess: (data) => {
        toast.success(`Welcome back, ${data.user.full_name.split(' ')[0]}`);
        navigate(safeNextPath(params.get('next')) ?? homeFor(data.user), { replace: true });
      },
    }),
  );

  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight">Welcome back</h1>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        {login.isError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {getErrorMessage(login.error)}
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <IconInput
            id="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@example.com"
            invalid={!!formState.errors.email}
            {...register('email')}
          />
          {formState.errors.email && (
            <p className="mt-1 text-xs text-danger">{formState.errors.email.message}</p>
          )}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <button
              type="button"
              className="text-xs font-medium text-brand hover:underline"
              onClick={() => toast.info('Password reset emails will work once the backend is connected.')}
            >
              Forgot password?
            </button>
          </div>
          <IconInput
            id="password"
            type="password"
            icon={Lock}
            autoComplete="current-password"
            placeholder="Your password"
            invalid={!!formState.errors.password}
            {...register('password')}
          />
          {formState.errors.password && (
            <p className="mt-1 text-xs text-danger">{formState.errors.password.message}</p>
          )}
        </div>
        <button
          type="submit"
          className="btn-primary h-11 w-full rounded-lg text-[15px]"
          disabled={login.isPending}
        >
          {login.isPending ? <Spinner /> : null} Sign in{' '}
          {!login.isPending && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-ink-soft">
        New to LMS-AI?{' '}
        <Link to="/register" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
