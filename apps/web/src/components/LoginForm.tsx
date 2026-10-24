'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Đăng nhập bằng liên kết gửi qua email (không dùng mật khẩu). */
export function LoginForm({ withTitle = true }: { withTitle?: boolean }) {
  const t = useTranslations('login');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'unconfigured'>('idle');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) { setStatus('unconfigured'); return; }
    setStatus('sending');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setStatus(error ? 'error' : 'sent');
  };

  return (
    <>
      {withTitle ? <h2 className="h3">{t('title')}</h2> : null}
      <p className="muted">{t('lead')}</p>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="email">{t('email')}</label>
          <input className="input" id="email" type="email" required autoComplete="email" inputMode="email" placeholder="ten@gmail.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={status === 'sending'}>{t('send')}</button>
      </form>
      {status === 'sent' ? <p className="form-msg" role="status">{t('sent')}</p> : null}
      {status === 'error' ? <p className="form-msg error" role="alert">{t('error')}</p> : null}
      {status === 'unconfigured' ? <p className="form-msg error" role="alert">{t('notConfigured')}</p> : null}
    </>
  );
}
