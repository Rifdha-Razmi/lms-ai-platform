import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { getErrorMessage } from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import { useUiStore, type Theme } from '@/store/uiStore';
import { LANGUAGES } from '@/i18n';
import { Field, PageHeader } from '@/components/common/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/utils/cn';

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user)!;
  const setUser = useAuthStore((s) => s.setUser);
  const { theme, setTheme, language, setLanguage } = useUiStore();
  const [name, setName] = useState(user.full_name);

  const save = useMutation({
    mutationFn: () => authService.updateProfile({ full_name: name }),
    onSuccess: (u) => {
      setUser(u);
      toast.success('Profile saved');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('nav.settings')} />
      <section className="panel p-5">
        <h2 className="text-lg font-semibold">Profile</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Full name" htmlFor="name">
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email" hint="Contact an admin to change your email.">
            <input id="email" className="input" value={user.email} disabled />
          </Field>
          <button className="btn-primary" disabled={save.isPending || name.trim() === user.full_name}>
            {t('common.save')}
          </button>
        </form>
      </section>

      <section className="panel mt-6 p-5">
        <h2 className="text-lg font-semibold">Appearance & language</h2>
        <fieldset className="mt-4">
          <legend className="label">{t('common.theme')}</legend>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as Theme[]).map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => setTheme(th)}
                aria-pressed={theme === th}
                className={cn(
                  'rounded border px-3 py-1.5 text-sm capitalize',
                  theme === th ? 'border-brand bg-brand-tint text-brand' : 'border-line',
                )}
              >
                {th}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label={t('common.language')} htmlFor="lang" className="mt-4">
          <select
            id="lang"
            className="select max-w-xs"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
      </section>
    </div>
  );
}
