'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Avatar } from '@/components/Avatar';
import { LoginForm } from '@/components/LoginForm';
import { Select } from '@/components/Select';
import { Link } from '@/i18n/navigation';
import { adminHref } from '@/lib/admin-url';
import { createClient } from '@/lib/supabase/client';
import { useAuth, type AuthUser } from '@/lib/use-auth';

const GENDERS = ['male', 'female', 'other', 'na'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_UPLOAD = 5 * 1024 * 1024;
const AVATAR_SIZE = 256;
const MIN_YEAR = 1900;

type Birth = { d: string; m: string; y: string };
type Form = { fullName: string; birth: Birth; gender: string; email: string };
type Notice = { kind: 'ok' | 'err'; text: string } | null;
type SignedIn = NonNullable<AuthUser>;

const pad = (n: string | number) => String(n).padStart(2, '0');
const splitBirth = (value: string): Birth => {
  const [y = '', m = '', d = ''] = value.split('-');
  return { y, m: m ? String(Number(m)) : '', d: d ? String(Number(d)) : '' };
};
const fromUser = (user: SignedIn): Form => ({ fullName: user.fullName, birth: splitBirth(user.birthdate), gender: user.gender, email: user.contactEmail });

/** '' = chưa nhập, null = không hợp lệ, còn lại là YYYY-MM-DD. */
const buildBirth = ({ d, m, y }: Birth): string | null => {
  if (!d && !m && !y) return '';
  if (!d || !m || !y) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return null;
  if (date.getTime() > Date.now()) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
};

/** Cắt vuông ở giữa và thu về 256px JPEG để ảnh nhẹ, hiển thị nhanh. */
const toAvatarBlob = async (file: File): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('blob'))), 'image/jpeg', 0.88));
};

export function ProfileClient() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const { ready, user, configured } = useAuth();
  const [form, setForm] = useState<Form>({ fullName: '', birth: { d: '', m: '', y: '' }, gender: '', email: '' });
  const [errors, setErrors] = useState({ birth: false, email: false });
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const userId = user?.id;
  useEffect(() => { if (user) setForm(fromUser(user)); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })), []);
  const months = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { month: 'long' });
    return Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: f.format(new Date(2026, i, 1)) }));
  }, [locale]);
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now - MIN_YEAR + 1 }, (_, i) => ({ value: String(now - i), label: String(now - i) }));
  }, []);

  const dirty = useMemo(() => {
    if (!user) return false;
    const birth = buildBirth(form.birth);
    return form.fullName.trim() !== user.fullName || birth !== user.birthdate || form.gender !== user.gender || form.email.trim() !== user.contactEmail;
  }, [form, user]);

  const setBirth = (key: keyof Birth, value: string) => { setForm((f) => ({ ...f, birth: { ...f.birth, [key]: value } })); setErrors((e) => ({ ...e, birth: false })); setNotice(null); };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const birth = buildBirth(form.birth);
    const email = form.email.trim();
    const next = { birth: birth === null, email: Boolean(email) && !EMAIL_RE.test(email) };
    setErrors(next);
    if (next.birth || next.email) return;
    const supabase = createClient();
    if (!supabase) return setNotice({ kind: 'err', text: t('unconfigured') });
    setSaving(true);
    setNotice(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: form.fullName.trim(), birthdate: birth ?? '', gender: form.gender, contact_email: email } });
    setSaving(false);
    setNotice(error ? { kind: 'err', text: t('saveFail') } : { kind: 'ok', text: t('saved') });
  };

  const pickAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setNotice({ kind: 'err', text: t('avatarBadType') });
    if (file.size > MAX_UPLOAD) return setNotice({ kind: 'err', text: t('avatarTooBig') });
    const supabase = createClient();
    if (!supabase) return setNotice({ kind: 'err', text: t('unconfigured') });
    setUploading(true);
    setNotice(null);
    try {
      const blob = await toAvatarBlob(file);
      setPreview(URL.createObjectURL(blob));
      const path = `${user.id}/avatar.jpg`;
      const up = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (up.error) throw up.error;
      const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: url } });
      if (error) throw error;
      setNotice({ kind: 'ok', text: t('avatarSaved') });
    } catch {
      setPreview(null);
      setNotice({ kind: 'err', text: t('avatarFail') });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!user) return;
    const supabase = createClient();
    if (!supabase) return;
    setUploading(true);
    setNotice(null);
    await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`]);
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
    setUploading(false);
    setPreview(null);
    setNotice(error ? { kind: 'err', text: t('saveFail') } : { kind: 'ok', text: t('avatarRemoved') });
  };

  const signOut = async () => { await createClient()?.auth.signOut(); };

  const shownName = form.fullName.trim() || user?.name || '';
  const avatarSrc = preview ?? (user?.avatarUrl || undefined);

  return (
    <div className="wrap page">
      <div className="page-head center">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="h2">{t('title')}</h1>
        <p className="lead">{t('lead')}</p>
      </div>

      {!ready ? (
        <p className="muted center">{t('loading')}</p>
      ) : !configured ? (
        <p className="muted center">{t('unconfigured')}</p>
      ) : !user ? (
        <div className="auth glass pf-login">
          <p className="muted">{t('loginNeeded')}</p>
          <LoginForm withTitle={false} />
        </div>
      ) : (
        <form className="pf glass" onSubmit={save} noValidate>
          <section className="pf-avatar" aria-labelledby="pf-avatar-title">
            <Avatar name={shownName} src={avatarSrc} size="xl" />
            <div>
              <h2 id="pf-avatar-title" className="pf-h">{t('avatarTitle')}</h2>
              <div className="pf-avatar-btns">
                <button type="button" className="btn btn-secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? t('avatarUploading') : t('avatarChange')}</button>
                {avatarSrc ? <button type="button" className="btn pf-ghost" disabled={uploading} onClick={removeAvatar}>{t('avatarRemove')}</button> : null}
              </div>
              <p className="small muted pf-hint">{t('avatarHint')}</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickAvatar} />
            </div>
          </section>

          <div className="field">
            <label htmlFor="pf-username">{t('username')}</label>
            <input id="pf-username" className="input" value={user.name} readOnly aria-describedby="pf-username-h" />
            <p id="pf-username-h" className="small muted">{t('usernameHint')}</p>
          </div>

          <div className="field">
            <label htmlFor="pf-name">{t('fullName')}</label>
            <input id="pf-name" className="input" value={form.fullName} maxLength={60} autoComplete="name" placeholder={t('fullNamePh')}
              onChange={(e) => { setForm((f) => ({ ...f, fullName: e.target.value })); setNotice(null); }} />
          </div>

          <fieldset className={`field pf-fieldset${errors.birth ? ' has-error' : ''}`}>
            <legend>{t('birthdate')}</legend>
            <div className="pf-birth">
              <Select label={t('day')} placeholder={t('day')} value={form.birth.d} options={days} onChange={(v) => setBirth('d', v)} />
              <Select label={t('month')} placeholder={t('month')} value={form.birth.m} options={months} onChange={(v) => setBirth('m', v)} />
              <Select label={t('year')} placeholder={t('year')} value={form.birth.y} options={years} onChange={(v) => setBirth('y', v)} />
            </div>
            {errors.birth ? <p className="err" role="alert">{t('birthBad')}</p> : null}
          </fieldset>

          <fieldset className="field pf-fieldset">
            <legend>{t('gender')}</legend>
            <div className="seg" role="group" aria-label={t('gender')}>
              {GENDERS.map((g) => (
                <button key={g} type="button" aria-pressed={form.gender === g} onClick={() => { setForm((f) => ({ ...f, gender: f.gender === g ? '' : g })); setNotice(null); }}>{t(g)}</button>
              ))}
            </div>
          </fieldset>

          <div className={`field${errors.email ? ' has-error' : ''}`}>
            <label htmlFor="pf-email">{t('email')}</label>
            <input id="pf-email" className="input" type="email" inputMode="email" autoComplete="email" value={form.email} placeholder="ban@example.com" aria-describedby="pf-email-h"
              onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setErrors((x) => ({ ...x, email: false })); setNotice(null); }} />
            {errors.email ? <p className="err" role="alert">{t('emailBad')}</p> : null}
            <p id="pf-email-h" className="small muted">{t('emailHint')}</p>
          </div>

          <div className="pf-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>{saving ? t('saving') : t('save')}</button>
            <button type="button" className="btn btn-secondary" disabled={saving || !dirty} onClick={() => { setForm(fromUser(user)); setErrors({ birth: false, email: false }); setNotice(null); }}>{t('reset')}</button>
            {dirty ? <span className="small muted">{t('unsaved')}</span> : null}
          </div>
          <p className={`pf-notice${notice ? ` is-${notice.kind}` : ''}`} role="status" aria-live="polite">{notice?.text}</p>

          {user.role === 'admin' ? <a className="btn btn-primary btn-block" href={adminHref(locale)} style={{ marginTop: 14 }}>{t('admin')}</a> : null}
          <div className="pf-foot">
            <Link className="pf-link" href="/history">{t('history')}</Link>
            <button type="button" className="pf-link" onClick={signOut}>{t('logout')}</button>
          </div>
        </form>
      )}
    </div>
  );
}
