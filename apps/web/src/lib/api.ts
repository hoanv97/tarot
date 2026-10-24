import type { DrawnCard, Locale, SpreadId, TopicId } from '@miu/tarot-core';

export type InterpretResponse = {
  source: 'ai' | 'rules' | 'safety';
  text: string;
  insights: { id: string; tone: string; text: string }[];
  disclaimer: string;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const requestInterpretation = async (
  accessToken: string,
  payload: { spread: SpreadId; topic: TopicId; locale: Locale; question: string; cards: DrawnCard[] }
): Promise<InterpretResponse> => {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const res = await fetch(`${base}/v1/interpret`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
  const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | InterpretResponse | null;
  if (!res.ok) throw new ApiError(res.status, (data as { error?: { message?: string } } | null)?.error?.message ?? 'Request failed');
  return data as InterpretResponse;
};
