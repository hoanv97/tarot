'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { AdminApiError, deleteUser, listAdmins, listUsers, setLocked, setRole, type AccountRole, type AdminAccount, type UsersPage } from '@/lib/users-api';
import { createClient } from '@/lib/supabase/client';
import { displayName } from '@miu/web-shared';

export type AuditRow = { id: number; actor: string; action: string; target: string; at: string };

const isLocked = (u: AdminAccount) => Boolean(u.bannedUntil && new Date(u.bannedUntil).getTime() > Date.now());

/** Hộp thoại xác nhận xóa: phải gõ đúng email của tài khoản; máy chủ kiểm tra lại điều này. */
function DeleteDialog({ target, busy, error, onCancel, onConfirm }: { target: AdminAccount; busy: boolean; error: string | null; onCancel: () => void; onConfirm: (email: string) => void }) {
  const t = useTranslations('admin.users');
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState('');
  useEffect(() => { ref.current?.showModal(); }, []);
  // Người dùng gõ tên hiển thị; api vẫn nhận email đầy đủ để đối chiếu với tài khoản thật.
  const submit = (event: FormEvent) => { event.preventDefault(); onConfirm(target.email ?? ''); };
  return (
    <dialog ref={ref} className="glass admin-dialog" onCancel={onCancel} aria-labelledby="del-title">
      <form onSubmit={submit}>
        <h2 className="h3" id="del-title">{t('deleteTitle')}</h2>
        <p>{t('deleteBody', { email: displayName(target.email) || target.id })}</p>
        <div className="field"><label htmlFor="del-confirm">{t('deleteType', { email: displayName(target.email) })}</label>
          <input className="input" id="del-confirm" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} /></div>
        {error ? <p className="err" role="alert">{error}</p> : null}
        <div className="admin-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>{t('cancel')}</button>
          <button type="submit" className="btn btn-secondary admin-danger" disabled={busy || typed !== displayName(target.email)}>{t('deleteConfirm')}</button>
        </div>
      </form>
    </dialog>
  );
}

export function UsersManager({ me, audit }: { me: string; audit: AuditRow[] }) {
  const t = useTranslations('admin.users');
  const locale = useLocale();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersPage | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [toDelete, setToDelete] = useState<AdminAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—');
  const describe = (error: unknown) => (error instanceof AdminApiError && t.has(`errors.${error.code}`) ? t(`errors.${error.code}`) : t('errors.error'));

  const load = useCallback(async (accessToken: string, nextPage: number) => {
    setBusy(true);
    try {
      const [users, adminList] = await Promise.all([listUsers(accessToken, nextPage), listAdmins(accessToken)]);
      setData(users);
      setAdmins(adminList.admins);
      setMessage(null);
    } catch (error) {
      setMessage({ kind: 'error', text: describe(error) });
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setMessage({ kind: 'error', text: t('noSupabase') }); return; }
    void supabase.auth.getSession().then(({ data: session }) => {
      const accessToken = session.session?.access_token;
      if (!accessToken) { setMessage({ kind: 'error', text: t('noSession') }); return; }
      setToken(accessToken);
      void load(accessToken, 1);
    });
  }, [load, t]);

  const act = async (action: () => Promise<unknown>, okText: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await action();
      setMessage({ kind: 'ok', text: okText });
      await load(token, page);
      router.refresh();
    } catch (error) {
      setMessage({ kind: 'error', text: describe(error) });
      setBusy(false);
    }
  };

  const changeRole = (user: AdminAccount, role: AccountRole) => {
    if (token) void act(() => setRole(token, user.id, role), t(role === 'admin' ? 'granted' : 'revoked'));
  };

  const confirmDelete = async (email: string) => {
    if (!token || !toDelete) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await deleteUser(token, toDelete.id, email);
      setToDelete(null);
      setMessage({ kind: 'ok', text: t('deleted') });
      await load(token, page);
      router.refresh();
    } catch (error) {
      setDeleteError(describe(error));
      setBusy(false);
    }
  };

  const goTo = (next: number) => { setPage(next); if (token) void load(token, next); };
  const pages = data?.total ? Math.max(1, Math.ceil(data.total / data.perPage)) : null;

  const actions = (u: AdminAccount) => {
    const self = u.id === me;
    return (
      <div className="admin-actions">
        {u.role === 'admin'
          ? <button type="button" className="btn btn-text" disabled={busy || self} title={self ? t('selfRole') : undefined} onClick={() => changeRole(u, 'user')}>{t('revoke')}</button>
          : <button type="button" className="btn btn-text" disabled={busy} onClick={() => changeRole(u, 'admin')}>{t('grant')}</button>}
        {u.role === 'user' ? (
          <>
            <button type="button" className="btn btn-text" disabled={busy} onClick={() => token && void act(() => setLocked(token, u.id, !isLocked(u)), t(isLocked(u) ? 'unlocked' : 'locked'))}>{isLocked(u) ? t('unlock') : t('lock')}</button>
            <button type="button" className="btn btn-text admin-danger" disabled={busy} onClick={() => { setDeleteError(null); setToDelete(u); }}>{t('delete')}</button>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="admin-stack">
      <section className="glass admin-panel">
        <h1 className="h2">{t('title')}</h1>
        <p className="muted">{t('lead')}</p>
        {message ? <p className={message.kind === 'ok' ? 'form-msg' : 'form-msg error'} role={message.kind === 'ok' ? 'status' : 'alert'}>{message.text}</p> : null}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <caption className="sr-only">{t('title')}</caption>
            <thead><tr>
              <th scope="col">{t('email')}</th><th scope="col">{t('created')}</th><th scope="col">{t('lastSignIn')}</th>
              <th scope="col">{t('readings')}</th><th scope="col">{t('decks')}</th><th scope="col">{t('status')}</th><th scope="col">{t('actions')}</th>
            </tr></thead>
            <tbody>
              {(data?.users ?? []).map((u) => (
                <tr key={u.id}>
                  <td>{displayName(u.email) || '—'}{u.id === me ? <span className="tag"> {t('you')}</span> : null}</td>
                  <td>{date(u.createdAt)}</td><td>{date(u.lastSignInAt)}</td>
                  <td>{u.readingCount}</td><td>{u.decks.length ? u.decks.join(', ') : '—'}</td>
                  <td>{u.role === 'admin' ? <span className="tag">{t('roleAdmin')}</span> : isLocked(u) ? <span className="tag">{t('lockedTag')}</span> : <span className="muted small">{t('active')}</span>}</td>
                  <td>{actions(u)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.users.length === 0 ? <p className="muted">{t('empty')}</p> : null}
        {!data && busy ? <p className="muted" role="status">{t('loading')}</p> : null}

        <nav className="admin-pager" aria-label={t('pager')}>
          {page > 1 ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => goTo(page - 1)}>{t('prev')}</button> : <span />}
          <span className="muted small">{pages ? t('pageOf', { page, pages, total: data?.total ?? 0 }) : t('page', { page })}</span>
          {data && data.users.length === data.perPage && (!pages || page < pages) ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => goTo(page + 1)}>{t('next')}</button> : <span />}
        </nav>
      </section>

      <section className="glass admin-panel">
        <h2 className="h3">{t('adminsTitle')}</h2>
        <p className="muted small">{t('adminsLead')}</p>
        <ul className="admin-list">
          {admins.map((a) => (
            <li key={a.id}>
              <span>{displayName(a.email) || a.id}{a.id === me ? <span className="tag"> {t('you')}</span> : null}</span>
              <button type="button" className="btn btn-text" disabled={busy || a.id === me} title={a.id === me ? t('selfRole') : undefined} onClick={() => changeRole(a, 'user')}>{t('revoke')}</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass admin-panel">
        <h2 className="h3">{t('auditTitle')}</h2>
        {audit.length === 0 ? <p className="muted">{t('auditEmpty')}</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th scope="col">{t('auditAt')}</th><th scope="col">{t('auditActor')}</th><th scope="col">{t('auditAction')}</th><th scope="col">{t('auditTarget')}</th></tr></thead>
              <tbody>{audit.map((row) => (
                <tr key={row.id}><td>{date(row.at)}</td><td>{row.actor || '—'}</td><td>{t(`actions_log.${row.action.replace('.', '_')}`)}</td><td>{row.target || '—'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {toDelete ? <DeleteDialog target={toDelete} busy={busy} error={deleteError} onCancel={() => setToDelete(null)} onConfirm={(email) => void confirmDelete(email)} /> : null}
    </div>
  );
}
