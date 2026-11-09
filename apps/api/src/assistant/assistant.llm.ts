/**
 * Minimal client for any OpenAI-compatible Chat Completions API.
 *
 * Default: Google Gemini through its OpenAI-compatible endpoint.
 * Switch provider with env vars only (no code change):
 *   Gemini : AI_BASE_URL unset, GEMINI_API_KEY=...,  AI_MODEL=gemini-2.5-flash
 *   OpenAI : AI_BASE_URL=https://api.openai.com/v1, AI_API_KEY=..., AI_MODEL=gpt-4o-mini
 *   Ollama : AI_BASE_URL=http://localhost:11434/v1, AI_MODEL=llama3.1 (no key)
 */

export interface LlmToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
  [extra: string]: unknown; // e.g. Gemini "thought signatures" - must be sent back unchanged
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string;
  [extra: string]: unknown;
}

export interface LlmToolSpec {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

const GEMINI_OPENAI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

export function getAiConfig() {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
  const baseUrl = (process.env.AI_BASE_URL || GEMINI_OPENAI_URL).replace(/\/+$/, '');
  return {
    apiKey,
    baseUrl,
    model: process.env.AI_MODEL || 'gemini-2.5-flash',
    // A local server (Ollama) needs no key; a cloud provider does
    enabled: Boolean(apiKey) || Boolean(process.env.AI_BASE_URL),
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 60_000,
  };
}

export class LlmError extends Error {
  statusCode = 502;
}

export async function chatCompletion(
  messages: LlmMessage[],
  tools: LlmToolSpec[] | undefined,
  fetchImpl: FetchLike = fetch
): Promise<LlmMessage> {
  const config = getAiConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: config.model, messages, ...(tools?.length ? { tools } : {}) }),
      signal: controller.signal,
    });
  } catch (err: any) {
    throw new LlmError(
      err?.name === 'AbortError' ? 'Trợ lý AI phản hồi quá lâu, vui lòng thử lại.' : 'Không kết nối được tới dịch vụ AI.'
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  if (!response.ok) {
    console.error(`[Assistant] AI provider error ${response.status}:`, text.slice(0, 500));
    const message =
      response.status === 429
        ? 'Đã vượt giới hạn sử dụng AI, vui lòng thử lại sau ít phút.'
        : response.status === 401 || response.status === 403
        ? 'Khóa API của dịch vụ AI không hợp lệ.'
        : 'Dịch vụ AI đang gặp lỗi, vui lòng thử lại.';
    throw new LlmError(message);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new LlmError('Phản hồi từ dịch vụ AI không hợp lệ.');
  }
  const message: LlmMessage | undefined = data?.choices?.[0]?.message;
  if (!message) throw new LlmError('Dịch vụ AI không trả về nội dung.');

  // Some providers omit ids; the next request must link each tool result to its call
  message.role = 'assistant';
  message.tool_calls?.forEach((call, i) => {
    if (!call.id) call.id = `call_${Date.now()}_${i}`;
  });
  return message;
}
