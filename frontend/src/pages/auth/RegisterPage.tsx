import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertCircle, ArrowRight, Info, Lock, Mail, User } from 'lucide-react';
import { homeFor, useAuth } from '@/hooks/useAuth';
import { getErrorField, getErrorMessage } from '@/services/apiClient';
import { IconInput } from '@/components/common/IconInput';
import { Spinner } from '@/components/common/feedback';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/utils/cn';

const schema = z
  .object({
    full_name: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().min(1, 'Enter your email').email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[A-Z]/, 'Add at least one uppercase letter')
      .regex(/[0-9]/, 'Add at least one number'),
    confirm: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords don’t match' });
type Values = z.infer<typeof schema>;

const strength = (p: string) => [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p)].filter(Boolean).length;

/** Public sign-up creates a student account (PRD §8.1). Admins grant instructor access (FR-AD4). */
export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });
  const passed = strength(watch('password') ?? '');
  const serverField = getErrorField(signUp.error);
  const fieldError = (name: keyof Values) =>
    formState.errors[name]?.message || (serverField === name ? getErrorMessage(signUp.error) : undefined);

  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight">Create your account</h1>

      <form
        className="mt-6 space-y-4"
        noValidate
        onSubmit={handleSubmit(({ confirm: _c, ...v }) =>
          signUp.mutate(v, {
            onSuccess: (d) => {
              toast.success(`Welcome to LMS-AI, ${d.user.full_name.split(' ')[0]}`);
              navigate(homeFor(d.user), { replace: true });
            },
          }),
        )}
      >
        {signUp.isError && !serverField && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {getErrorMessage(signUp.error)}
          </div>
        )}

        <div>
          <label htmlFor="full_name" className="label">
            Full name
          </label>
          <IconInput
            id="full_name"
            icon={User}
            autoComplete="name"
            placeholder="Your full name"
            invalid={!!fieldError('full_name')}
            {...register('full_name')}
          />
          {fieldError('full_name') && <p className="mt-1 text-xs text-danger">{fieldError('full_name')}</p>}
        </div>
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
            invalid={!!fieldError('email')}
            {...register('email')}
          />
          {fieldError('email') && <p className="mt-1 text-xs text-danger">{fieldError('email')}</p>}
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <IconInput
            id="password"
            type="password"
            icon={Lock}
            autoComplete="new-password"
            placeholder="Create a password"
            invalid={!!formState.errors.password}
            {...register('password')}
          />
          <div className="mt-2 flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i < passed
                    ? passed === 3
                      ? 'bg-ok'
                      : passed === 2
                        ? 'bg-warn'
                        : 'bg-danger'
                    : 'bg-sunken',
                )}
              />
            ))}
          </div>
          {formState.errors.password && (
            <p className="mt-1 text-xs text-danger">{formState.errors.password.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="confirm" className="label">
            Confirm password
          </label>
          <IconInput
            id="confirm"
            type="password"
            icon={Lock}
            autoComplete="new-password"
            placeholder="Type it again"
            invalid={!!formState.errors.confirm}
            {...register('confirm')}
          />
          {formState.errors.confirm && (
            <p className="mt-1 text-xs text-danger">{formState.errors.confirm.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary h-11 w-full rounded-lg text-[15px]"
          disabled={signUp.isPending}
        >
          {signUp.isPending ? <Spinner /> : null} Create account{' '}
          {!signUp.isPending && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-5 flex items-start gap-2 rounded-lg bg-sunken px-3 py-2.5 text-xs text-ink-soft">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        Instructors: register here, an admin will give you instructor access.
      </p>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
