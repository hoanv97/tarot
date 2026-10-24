import type { Condition, ConditionLeaf, Metrics } from './types';

/** `?` khớp một ký tự bất kỳ; độ dài phải bằng nhau. */
export const matchesPattern = (value: unknown, pattern: string): boolean =>
  typeof value === 'string' && value.length === pattern.length && [...pattern].every((ch, i) => ch === '?' || ch === value[i]);

export const evaluateLeaf = (leaf: ConditionLeaf, metrics: Metrics): boolean => {
  const actual: unknown = metrics[leaf.metric];
  const { op, value } = leaf;
  switch (op) {
    case '==': return actual === value;
    case '!=': return actual !== value;
    case '>=': return typeof actual === 'number' && typeof value === 'number' && actual >= value;
    case '<=': return typeof actual === 'number' && typeof value === 'number' && actual <= value;
    case 'contains_all': return actual instanceof Set && Array.isArray(value) && value.every((token) => actual.has(token));
    case 'matches': return typeof value === 'string' && matchesPattern(actual, value);
    default: return false;
  }
};

export const evaluateCondition = (condition: Condition, metrics: Metrics): boolean => {
  if ('all' in condition) return condition.all.every((child) => evaluateCondition(child, metrics));
  if ('any' in condition) return condition.any.some((child) => evaluateCondition(child, metrics));
  return evaluateLeaf(condition, metrics);
};
