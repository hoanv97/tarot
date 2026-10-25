'use client';

import { useTranslations } from 'next-intl';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * Sửa một cây JSON gồm chủ yếu là chữ: chuỗi là ô nhập, danh sách chuỗi là mỗi dòng một câu,
 * danh sách đối tượng cho thêm/xóa mục. Cấu trúc (tên khóa) giữ nguyên, người dùng chỉ sửa nội dung.
 */
type Props = { value: unknown; onChange: (value: unknown) => void; path?: string; templates?: Record<string, unknown> };

const isObject = (v: unknown): v is { [key: string]: Json } => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Bản sao rỗng của một mục để thêm mục mới cùng hình dạng. */
const blankLike = (v: unknown): Json => {
  if (typeof v === 'string') return '';
  if (typeof v === 'number') return 0;
  if (typeof v === 'boolean') return false;
  if (Array.isArray(v)) return [];
  if (isObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankLike(x)]));
  return '';
};

export function JsonTextEditor({ value, onChange, path = '', templates = {} }: Props) {
  const t = useTranslations('admin.content');
  const id = (suffix: string) => `jte-${path}-${suffix}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (typeof value === 'string') {
    const long = value.length > 70 || value.includes('\n');
    return long
      ? <textarea className="input" aria-label={path} rows={Math.min(14, Math.max(3, Math.ceil(value.length / 80)))} value={value} onChange={(e) => onChange(e.target.value)} />
      : <input className="input" aria-label={path} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (typeof value === 'number') return <input className="input" type="number" aria-label={path} value={value} onChange={(e) => onChange(Number(e.target.value))} />;
  if (typeof value === 'boolean') return <input type="checkbox" aria-label={path} checked={value} onChange={(e) => onChange(e.target.checked)} />;

  if (isStringList(value)) {
    return (
      <>
        <textarea className="input" aria-label={path} rows={Math.min(14, Math.max(3, value.length + 1))} value={value.join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n'))} onBlur={() => onChange(value.filter((line) => line.trim() !== ''))} />
        <p className="muted small">{t('onePerLine')}</p>
      </>
    );
  }

  if (Array.isArray(value)) {
    const key = path.split('.').pop() ?? '';
    return (
      <div className="jte-list">
        {value.map((item, index) => (
          <fieldset key={`${path}[${index}]`} className="jte-group">
            <legend>{index + 1}</legend>
            <JsonTextEditor value={item} path={`${path}[${index}]`} templates={templates}
              onChange={(next) => onChange(value.map((x, i) => (i === index ? next : x)))} />
            <button type="button" className="btn btn-text" onClick={() => onChange(value.filter((_, i) => i !== index))}>{t('removeItem')}</button>
          </fieldset>
        ))}
        <button type="button" className="btn btn-secondary" onClick={() => onChange([...value, templates[key] ?? blankLike(value[0])])}>{t('addItem')}</button>
      </div>
    );
  }

  if (isObject(value)) {
    return (
      <div className="jte-object">
        {Object.entries(value).map(([key, child]) => (
          <div className="field" key={key}>
            <label htmlFor={id(key)}>{key}</label>
            <div id={id(key)}>
              <JsonTextEditor value={child} path={path ? `${path}.${key}` : key} templates={templates}
                onChange={(next) => onChange({ ...value, [key]: next })} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
