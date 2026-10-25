'use client';

import { CARD_IDS, validateCondition } from '@miu/tarot-core';
import { lintText } from '@miu/content-policy';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { revalidateRules } from '@/lib/actions';
import { createClient } from '@/lib/supabase/client';

export type EditableRule = { id: string; priority: number; enabled: boolean; when_json: unknown; text: string };

/**
 * Sửa luật tầng 2. Kiểm tra ở trình duyệt (điều kiện hợp lệ, nội dung qua bộ lọc chính sách)
 * chỉ để phản hồi nhanh; quyền ghi thực sự do RLS của Supabase quyết định.
 */
export function RuleEditor({ rules }: { rules: EditableRule[] }) {
  const t = useTranslations('admin');
  const [selectedId, setSelectedId] = useState(rules[0]?.id ?? '');
  const selected = rules.find((r) => r.id === selectedId);
  const [priority, setPriority] = useState(selected?.priority ?? 0);
  const [enabled, setEnabled] = useState(selected?.enabled ?? true);
  const [text, setText] = useState(selected?.text ?? '');
  const [whenJson, setWhenJson] = useState(JSON.stringify(selected?.when_json ?? {}, null, 2));
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const select = (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    setSelectedId(id);
    setPriority(rule.priority);
    setEnabled(rule.enabled);
    setText(rule.text);
    setWhenJson(JSON.stringify(rule.when_json, null, 2));
    setMessage(null);
  };

  const fail = (reason: string) => setMessage({ kind: 'error', text: t('blocked', { reason }) });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    let when: unknown;
    try { when = JSON.parse(whenJson); } catch { return fail('JSON'); }
    const conditionError = validateCondition(when, { cardIds: CARD_IDS });
    if (conditionError) return fail(conditionError);
    const violations = lintText(text, 'vi');
    if (violations.length > 0) return fail(violations.map((v) => v.reason).join('; '));
    if (!Number.isInteger(priority) || priority < 0 || priority > 100) return fail('priority 0-100');

    const supabase = createClient();
    if (!supabase) return fail('Supabase');
    const { error: ruleError } = await supabase.from('rules').update({ priority, enabled, when_json: when }).eq('id', selectedId);
    if (ruleError) return fail(ruleError.message);
    const { error: textError } = await supabase.from('rule_translations').update({ text }).eq('rule_id', selectedId).eq('locale', 'vi');
    if (textError) return fail(textError.message);
    await revalidateRules();
    setMessage({ kind: 'ok', text: t('saved') });
  };

  return (
    <form onSubmit={save} className="glass" style={{ padding: 28 }}>
      <h1 className="h2" style={{ marginBottom: 20 }}>{t('title')}</h1>
      <div className="field"><label htmlFor="rule">{t('pick')}</label>
      <select className="input" id="rule" value={selectedId} onChange={(e) => select(e.target.value)}>
        {rules.map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}
      </select></div>

      <div className="field"><label htmlFor="priority">{t('priority')}</label>
      <input className="input" id="priority" type="number" min={0} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))} /></div>

      <label style={{ display: 'block', marginBottom: 16 }}><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> {t('enabled')}</label>

      <div className="field"><label htmlFor="text">{t('text')}</label>
      <textarea className="input" id="text" rows={5} value={text} onChange={(e) => setText(e.target.value)} /></div>

      <div className="field"><label htmlFor="when">{t('when')}</label>
      <textarea className="input" id="when" rows={10} spellCheck={false} style={{ fontFamily: 'monospace' }} value={whenJson} onChange={(e) => setWhenJson(e.target.value)} /></div>

      <p><button className="btn btn-primary" type="submit">{t('save')}</button></p>
      {message ? <p className={message.kind === 'ok' ? 'form-msg' : 'form-msg error'} role={message.kind === 'ok' ? 'status' : 'alert'}>{message.text}</p> : null}
    </form>
  );
}
