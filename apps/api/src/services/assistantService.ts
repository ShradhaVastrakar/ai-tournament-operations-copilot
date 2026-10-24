import type { ChatRequest, ChatResponse } from '../types';

// TODO: replace with a real HTTP call to the Python AI service (AI_SERVICE_URL).
// The endpoint will be POST /internal/ai/answer with the same shape as ChatRequest.
export function getPlaceholderAnswer(req: ChatRequest): ChatResponse {
  return {
    answer:
      'AI service not yet connected. This is a placeholder response. ' +
      'Configure the Python AI service and update this service to forward requests.',
    conversationId: req.conversationId ?? crypto.randomUUID(),
    sources: [],
    isPlaceholder: true,
  };
}
