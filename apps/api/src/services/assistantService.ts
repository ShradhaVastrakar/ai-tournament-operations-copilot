import type { ChatRequest, ChatResponse } from '../types';
import { getConfig } from '../config/env';

/**
 * Forwards the user's message to the Python AI service (FastAPI) and
 * returns the answer in the shape the Express API expects.
 */
export async function getAnswer(req: ChatRequest): Promise<ChatResponse> {
  const { aiServiceUrl } = getConfig();

  const aiRes = await fetch(`${aiServiceUrl}/internal/ai/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: req.message,
      conversation_id: req.conversationId ?? null,
    }),
  });

  if (!aiRes.ok) {
    const text = await aiRes.text().catch(() => '');
    throw new Error(`AI service responded with ${aiRes.status}: ${text}`);
  }

  // FastAPI uses snake_case; map to camelCase for the frontend.
  const data = (await aiRes.json()) as {
    answer: string;
    conversation_id: string;
    sources: string[];
    is_placeholder: boolean;
  };

  return {
    answer: data.answer,
    conversationId: data.conversation_id,
    sources: data.sources,
    isPlaceholder: data.is_placeholder,
  };
}
