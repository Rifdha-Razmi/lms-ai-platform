import { forwardRef, useState, type ComponentType, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  icon: ComponentType<{ className?: string }>;
  invalid?: boolean;
};

/** Tall input with a leading icon; password fields get a show/hide toggle. */
export const IconInput = forwardRef<HTMLInputElement, Props>(function IconInput(
  { icon: Icon, invalid, type, className, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
      <input
        ref={ref}
        type={isPassword && show ? 'text' : type}
        aria-invalid={invalid || undefined}
        className={cn(
          'input h-11 rounded-lg pl-11',
          isPassword && 'pr-11',
          invalid && 'border-danger focus:border-danger focus:ring-danger',
          className,
        )}
        {...rest}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-faint hover:text-ink"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
});
