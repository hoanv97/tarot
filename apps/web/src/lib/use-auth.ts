'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { displayName } from '@/lib/username';

export type AuthUser = { id: string; email: string; /** Tên hiển thị (tên đăng nhập, hoặc email nếu đăng nhập bằng email thật) */ name: string; role: 'user' | 'admin' } | null;
type State = { ready: boolean; user: AuthUser; configured: boolean };

/** Phiên đăng nhập Supabase + vai trò (đọc từ bảng profiles; RLS vẫn là lớp bảo vệ thật). */
export const useAuth = (): State => {
  const [state, setState] = useState<State>({ ready: false, user: null, configured: true });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setState({ ready: true, user: null, configured: false }); return; }
    let alive = true;

    const load = async (session: { user: { id: string; email?: string | null } } | null) => {
      if (!session) { if (alive) setState({ ready: true, user: null, configured: true }); return; }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      const role = data?.role === 'admin' ? 'admin' : 'user';
      if (alive) setState({ ready: true, configured: true, user: { id: session.user.id, email: session.user.email ?? '', name: displayName(session.user.email), role } });
    };

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { void load(session); });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  return state;
};
