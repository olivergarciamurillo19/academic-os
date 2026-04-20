"use client";

/**
 * Streams a chat turn from `/api/ai/chat`.
 *
 * The route returns plain UTF-8 text chunks (no SSE framing). This helper
 * reads the stream, decodes chunks, accumulates text, and invokes `onDelta`
 * with the growing full string on each arrival — matching the contract the
 * existing typewriter UI expects.
 *
 * Returns `{ ok: true }` on success, `{ ok: false }` on any network / HTTP
 * failure so the caller can show a local mock response gracefully.
 */

export interface StreamChatParams {
  subjectId: string;
  conversationId?: string;
  message: string;
  onDelta: (accumulatedText: string) => void;
}

export type StreamChatResult =
  | { ok: true; text: string; conversationId: string | null }
  | { ok: false; status: number; error: string };

export async function streamChat(params: StreamChatParams): Promise<StreamChatResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: params.subjectId,
        conversationId: params.conversationId,
        message: params.message,
      }),
    });
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "network" };
  }

  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => "");
    return { ok: false, status: response.status, error: errText };
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let acc = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      params.onDelta(acc);
    }
    acc += decoder.decode();
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "stream" };
  }

  return {
    ok: true,
    text: acc,
    conversationId: response.headers.get("X-Conversation-Id"),
  };
}
