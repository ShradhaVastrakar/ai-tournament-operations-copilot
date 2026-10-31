// Chat history kept in this browser's localStorage. The AI service holds the real
// conversation memory (keyed by serverId) and loses it on restart.

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: string; // ISO
}

export interface Conversation {
  id: string;
  serverId?: string; // conversation_id issued by the AI service
  title: string;
  messages: ChatMessage[];
  updatedAt: string; // ISO
}

const KEY = 'copilot.chat.v1';
const MAX_CONVERSATIONS = 30;

function isConversation(value: unknown): value is Conversation {
  const c = value as Conversation;
  return (
    typeof c === 'object' &&
    c !== null &&
    typeof c.id === 'string' &&
    typeof c.title === 'string' &&
    typeof c.updatedAt === 'string' &&
    Array.isArray(c.messages)
  );
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(isConversation) : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS)));
  } catch {
    // Storage can be full or blocked (private mode); history is a convenience only.
  }
}
