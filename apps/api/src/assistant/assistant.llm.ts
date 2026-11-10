/**
 * Minimal client for any OpenAI-compatible Chat Completions API.
 *
 * Default: Google Gemini through its OpenAI-compatible endpoint.
 * Switch provider with env vars only (no code change):
 *   Gemini : AI_BASE_URL unset, GEMINI_API_KEY=...,  AI_MODEL=gemini-3.8-flash
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
  const isGemini = baseUrl.includes('generativelanguage.googleapis.com');
  // How long the model "thinks" before answering. Gemini 3 defaults to high, which makes every
  // tool step slow; low is plenty for lookups and drafts. "default" = don't send the parameter.
  const effort = (process.env.AI_REASONING_EFFORT ?? (isGemini ? 'low' : 'default')).trim();
  return {
    apiKey,
    baseUrl,
    model: process.env.AI_MODEL || 'gemini-3.8-flash',
    reasoningEffort: effort && effort !== 'default' ? effort : undefined,
    // A local server (Ollama) needs no key; a cloud provider does
    enabled: Boolean(apiKey) || Boolean(process.env.AI_BASE_URL),
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 90_000,
    // Tried when the main model is overloaded. Set AI_FALLBACK_MODEL="none" to turn off.
    fallbackModel:
      process.env.AI_FALLBACK_MODEL === 'none'
        ? undefined
        : process.env.AI_FALLBACK_MODEL || (isGemini ? 'gemini-3.5-flash-lite' : undefined),
    // First try, then retries after these waits (ms)
    retryDelaysMs: [0, ...(process.env.AI_RETRY_DELAYS_MS ?? '1500,4000').split(',').map(Number).filter((n) => n >= 0)],
  };
}

export class LlmError extends Error {
  statusCode = 502;
}

/** Errors worth retrying: overloaded (503), server error (500/502/504), rate limit (429). */
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends the conversation to the model. Temporary failures are retried with a short wait
 * (Gemini often answers 503 "high demand" for a few seconds), then sent once to
 * AI_FALLBACK_MODEL (default for Gemini: gemini-3.5-flash-lite) before giving up.
 */
export async function chatCompletion(
  messages: LlmMessage[],
  tools: LlmToolSpec[] | undefined,
  fetchImpl: FetchLike = fetch
): Promise<LlmMessage> {
  const config = getAiConfig();
  const attempts: { model: string; waitMs: number }[] = [
    ...config.retryDelaysMs.map((waitMs, i) => ({ model: config.model, waitMs: i === 0 ? 0 : waitMs })),
    ...(config.fallbackModel && config.fallbackModel !== config.model ? [{ model: config.fallbackModel, waitMs: 0 }] : []),
  ];

  let lastStatus = 0;
  for (const attempt of attempts) {
    if (attempt.waitMs) await sleep(attempt.waitMs);
    const { status, text } = await requestOnce(config, attempt.model, messages, tools, fetchImpl);

    if (status >= 200 && status < 300) return parseMessage(text);

    lastStatus = status;
    console.error(`[Assistant] AI provider error ${status} from ${attempt.model}:`, text.slice(0, 500));
    if (!RETRYABLE.has(status)) break; // bad key, bad request, unknown model: retrying won't help
  }

  throw new LlmError(
    lastStatus === 503 || lastStatus === 500 || lastStatus === 502 || lastStatus === 504
      ? 'Dịch vụ AI (Gemini) đang quá tải, vui lòng thử lại sau ít phút.'
      : lastStatus === 429
      ? 'Đã vượt giới hạn sử dụng AI, vui lòng thử lại sau ít phút.'
      : lastStatus === 401 || lastStatus === 403
      ? 'Khóa API của dịch vụ AI không hợp lệ.'
      : lastStatus === 404
      ? `Không tìm thấy model AI "${config.model}". Hãy kiểm tra biến AI_MODEL.`
      : 'Dịch vụ AI đang gặp lỗi, vui lòng thử lại.'
  );
}

async function requestOnce(
  config: ReturnType<typeof getAiConfig>,
  model: string,
  messages: LlmMessage[],
  tools: LlmToolSpec[] | undefined,
  fetchImpl: FetchLike
): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        ...(tools?.length ? { tools } : {}),
        ...(config.reasoningEffort ? { reasoning_effort: config.reasoningEffort } : {}),
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    console.log(`[Assistant] ${model} answered in ${Date.now() - startedAt}ms (HTTP ${response.status})`);
    return { status: response.status, text };
  } catch (err: any) {
    console.error(
      `[Assistant] AI request to ${model} failed after ${Date.now() - startedAt}ms:`,
      err?.name === 'AbortError' ? `timeout (${config.timeoutMs}ms)` : err?.cause ?? err
    );
    throw new LlmError(
      err?.name === 'AbortError' ? 'Trợ lý AI phản hồi quá lâu, vui lòng thử lại.' : 'Không kết nối được tới dịch vụ AI.'
    );
  } finally {
    clearTimeout(timer);
  }
}

function parseMessage(text: string): LlmMessage {
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
