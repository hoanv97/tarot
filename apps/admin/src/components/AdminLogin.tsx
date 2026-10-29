'use client';

import { MIN_PASSWORD_LENGTH, toLoginEmail } from '@miu/web-shared';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

type Problem = 'empty' | 'invalid' | 'rate' | 'providerOff' | 'unconfigured' | 'generic';

/** Đăng nhập cho quản trị viên bằng tên đăng nhập + mật khẩu. Tài khoản được tạo ở trang web; quyền admin cấp riêng. */
export function AdminLogin() {
  const t = useTranslations('admin.login');
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  const classify = (code: string | undefined): Problem => {
    switch (code) {
      case 'invalid_credentials': return 'invalid';
      case 'over_request_rate_limit': return 'rate';
      case 'email_provider_disabled': return 'providerOff';
      default: return 'generic';
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || password.length < MIN_PASSWORD_LENGTH) return setProblem('empty');
    const supabase = createClient();
    if (!supabase) return setProblem('unconfigured');
    setBusy(true);
    setProblem(null);
    const { error } = await supabase.auth.signInWithPassword({ email: toLoginEmail(username), password });
    if (error) {
      setBusy(false);
      console.warn('[auth]', error.code ?? error.status, error.message);
      return setProblem(classify(error.code));
    }
    // Máy chủ sẽ kiểm tra vai trò admin ở trang kế tiếp.
    router.replace('/cards');
    router.refresh();
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="username">{t('username')}</label>
        <input className="input" id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">{t('password')}</label>
        <div className="pw">
          <input className="input" id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="pw-toggle" aria-pressed={show} onClick={() => setShow(!show)}>{show ? t('hide') : t('show')}</button>
        </div>
      </div>
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? t('working') : t('submit')}</button>
      {problem ? <p className="form-msg error" role="alert">{t(`problems.${problem}`)}</p> : null}
    </form>
  );
}
