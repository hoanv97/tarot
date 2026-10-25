'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MIN_PASSWORD_LENGTH, USERNAME_RE, normalizeUsername, toLoginEmail } from '@/lib/username';

type Mode = 'signin' | 'signup';
type Problem = 'username' | 'passwordShort' | 'passwordMismatch' | 'invalid' | 'taken' | 'weak' | 'confirmEmail' | 'providerOff' | 'signupOff' | 'rate' | 'generic' | 'unconfigured';

/** Đăng nhập và đăng ký bằng tên đăng nhập + mật khẩu (xem lib/username.ts). */
export function LoginForm({ withTitle = true }: { withTitle?: boolean }) {
  const t = useTranslations('login');
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  const classify = (error: { code?: string; message: string }): Problem => {
    switch (error.code) {
      case 'invalid_credentials': return 'invalid';
      case 'user_already_exists': case 'email_exists': return 'taken';
      case 'weak_password': return 'weak';
      case 'email_not_confirmed': return 'confirmEmail';
      case 'email_provider_disabled': return 'providerOff';
      case 'signup_disabled': return 'signupOff';
      case 'over_request_rate_limit': case 'over_email_send_rate_limit': return 'rate';
      default: return 'generic';
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = normalizeUsername(username);
    // Nhập email thật thì không áp quy tắc tên đăng nhập.
    if (!name.includes('@') && !USERNAME_RE.test(name)) return setProblem('username');
    if (password.length < MIN_PASSWORD_LENGTH) return setProblem('passwordShort');
    if (mode === 'signup' && password !== confirm) return setProblem('passwordMismatch');

    const supabase = createClient();
    if (!supabase) return setProblem('unconfigured');
    setBusy(true);
    setProblem(null);
    const credentials = { email: toLoginEmail(name), password };
    const { data, error } = mode === 'signin' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp(credentials);
    setBusy(false);
    if (error) {
      console.warn('[auth]', error.code ?? error.status, error.message);
      return setProblem(classify(error));
    }
    // Đăng ký xong mà chưa có phiên nghĩa là Supabase đang bật xác nhận email, nên tên đăng nhập không dùng được ngay.
    if (mode === 'signup' && !data.session) return setProblem('confirmEmail');
    setPassword('');
    setConfirm('');
  };

  const switchMode = (next: Mode) => { setMode(next); setProblem(null); };
  const fieldError = (...names: Problem[]) => (problem && names.includes(problem) ? t(`problems.${problem}`) : null);

  return (
    <>
      {withTitle ? <h2 className="h3">{t('title')}</h2> : null}
      <p className="muted">{t('lead')}</p>

      <div className="seg" role="group" aria-label={t('modeAria')}>
        <button type="button" aria-pressed={mode === 'signin'} onClick={() => switchMode('signin')}>{t('signIn')}</button>
        <button type="button" aria-pressed={mode === 'signup'} onClick={() => switchMode('signup')}>{t('signUp')}</button>
      </div>

      <form onSubmit={submit} noValidate>
        <div className={`field${fieldError('username') ? ' has-error' : ''}`}>
          <label htmlFor="username">{t('username')}</label>
          <input className="input" id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required
            aria-invalid={Boolean(fieldError('username'))} value={username} onChange={(e) => setUsername(e.target.value)} />
          {mode === 'signup' ? <span className="muted small">{t('usernameHint')}</span> : null}
          {fieldError('username') ? <span className="err" role="alert">{fieldError('username')}</span> : null}
        </div>

        <div className={`field${fieldError('passwordShort', 'weak') ? ' has-error' : ''}`}>
          <label htmlFor="password">{t('password')}</label>
          <div className="pw">
            <input className="input" id="password" type={show ? 'text' : 'password'} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              aria-invalid={Boolean(fieldError('passwordShort', 'weak'))} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="pw-toggle" aria-pressed={show} onClick={() => setShow(!show)}>{show ? t('hide') : t('show')}</button>
          </div>
          {fieldError('passwordShort', 'weak') ? <span className="err" role="alert">{fieldError('passwordShort', 'weak')}</span> : null}
        </div>

        {mode === 'signup' ? (
          <div className={`field${fieldError('passwordMismatch') ? ' has-error' : ''}`}>
            <label htmlFor="confirm">{t('confirmPassword')}</label>
            <input className="input" id="confirm" type={show ? 'text' : 'password'} required autoComplete="new-password"
              aria-invalid={Boolean(fieldError('passwordMismatch'))} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {fieldError('passwordMismatch') ? <span className="err" role="alert">{fieldError('passwordMismatch')}</span> : null}
          </div>
        ) : null}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy ? t('working') : mode === 'signin' ? t('signIn') : t('signUp')}</button>
      </form>

      {problem && !fieldError('username', 'passwordShort', 'weak', 'passwordMismatch')
        ? <p className="form-msg error" role="alert">{t(`problems.${problem}`)}</p> : null}
      <p className="auth-foot">{mode === 'signin' ? t('noAccount') : t('haveAccount')}{' '}
        <button type="button" className="btn btn-text" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? t('signUp') : t('signIn')}</button></p>
    </>
  );
}
