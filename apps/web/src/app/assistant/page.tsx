'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  'How many matches are scheduled?',
  'How many matches are completed?',
  'Are there any pending results?',
  'Give me a match status summary.',
];

function MarkdownText({ text }: { text: string }) {
  // Render **bold** and line breaks from the AI response.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function AssistantPage() {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [conversationId, setConvId] = useState<string | undefined>(undefined);
  const [error, setError]           = useState<string | null>(null);
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom whenever messages change.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput('');

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${apiBase}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });

      const json = await res.json() as {
        success: boolean;
        data?: { answer: string; conversationId: string };
        error?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `API error ${res.status}`);
      }

      const { answer, conversationId: newConvId } = json.data!;
      setConvId(newConvId);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        .chat-page {
          display: flex; flex-direction: column;
          height: calc(100vh - 120px); max-height: 820px;
        }

        /* Header */
        .chat-header { margin-bottom: 1rem; flex-shrink: 0; }
        .chat-title  { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0 0 .25rem; }
        .chat-sub    { color: #64748b; font-size: .875rem; margin: 0; }

        /* Messages area */
        .messages-area {
          flex: 1; overflow-y: auto; border: 1px solid #e2e8f0;
          border-radius: 12px; background: #f8fafc;
          padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
          scroll-behavior: smooth;
        }

        /* Empty state */
        .empty-state {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 1.5rem;
          color: #94a3b8; text-align: center;
        }
        .empty-icon { font-size: 2.5rem; line-height: 1; }
        .empty-title { font-size: 1rem; font-weight: 600; color: #475569; margin: 0; }
        .empty-sub   { font-size: .8125rem; color: #94a3b8; margin: .25rem 0 0; }

        .suggestions { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin-top: .5rem; }
        .suggestion-btn {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
          padding: .4rem .875rem; font-size: .8rem; color: #475569; cursor: pointer;
          transition: all .15s;
        }
        .suggestion-btn:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }

        /* Message bubbles */
        .msg-row { display: flex; gap: .75rem; align-items: flex-end; }
        .msg-row.user { flex-direction: row-reverse; }

        .avatar {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: .875rem; font-weight: 700;
        }
        .avatar.user      { background: #3b82f6; color: #fff; }
        .avatar.assistant { background: #1e293b; color: #fff; }

        .bubble {
          max-width: 72%; padding: .75rem 1rem;
          border-radius: 12px; font-size: .875rem; line-height: 1.55;
          word-break: break-word;
        }
        .bubble.user      {
          background: #3b82f6; color: #fff;
          border-bottom-right-radius: 4px;
        }
        .bubble.assistant {
          background: #fff; color: #1e293b;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,.04);
        }

        .bubble-time { font-size: .68rem; opacity: .6; margin-top: .35rem; }
        .user .bubble-time   { text-align: right; }

        /* Typing indicator */
        .typing-row { display: flex; gap: .75rem; align-items: flex-end; }
        .typing-bubble {
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 12px; border-bottom-left-radius: 4px;
          padding: .75rem 1rem; display: flex; align-items: center; gap: 4px;
        }
        .dot {
          width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;
          animation: bounce .9s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: .15s; }
        .dot:nth-child(3) { animation-delay: .3s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }

        /* Error */
        .chat-error {
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
          padding: .625rem 1rem; color: #dc2626; font-size: .8125rem;
          margin-top: .75rem; flex-shrink: 0;
        }

        /* Input row */
        .input-row {
          display: flex; gap: .75rem; align-items: flex-end;
          margin-top: .875rem; flex-shrink: 0;
        }
        .chat-textarea {
          flex: 1; resize: none; border: 1px solid #e2e8f0; border-radius: 10px;
          padding: .75rem 1rem; font-size: .875rem; font-family: inherit;
          line-height: 1.5; outline: none; transition: border-color .15s;
          background: #fff; color: #1e293b; max-height: 120px;
        }
        .chat-textarea:focus   { border-color: #3b82f6; }
        .chat-textarea::placeholder { color: #94a3b8; }

        .send-btn {
          width: 42px; height: 42px; border-radius: 10px; border: none;
          background: #3b82f6; color: #fff; cursor: pointer; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0;
          transition: background .15s, opacity .15s;
        }
        .send-btn:hover:not(:disabled) { background: #2563eb; }
        .send-btn:disabled { opacity: .45; cursor: not-allowed; }

        .input-hint { font-size: .72rem; color: #94a3b8; margin-top: .375rem; }
      `}</style>

      <div className="chat-page">
        <div className="chat-header">
          <h1 className="chat-title">AI Assistant</h1>
          <p className="chat-sub">Ask anything about the Aethon Cup 2025 tournament</p>
        </div>

        <div className="messages-area" id="messages-area" role="log" aria-live="polite">
          {isEmpty && !loading ? (
            <div className="empty-state">
              <span className="empty-icon">⚽</span>
              <div>
                <p className="empty-title">What would you like to know?</p>
                <p className="empty-sub">Ask about matches, results, schedules, or rules.</p>
              </div>
              <div className="suggestions">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    id={`suggestion-${q.slice(0, 20).replace(/\s/g, '-').toLowerCase()}`}
                    className="suggestion-btn"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`msg-row ${msg.role}`}>
                  <div className={`avatar ${msg.role}`}>
                    {msg.role === 'user' ? 'U' : '🤖'}
                  </div>
                  <div>
                    <div className={`bubble ${msg.role}`}>
                      <MarkdownText text={msg.content} />
                    </div>
                    <p className="bubble-time">
                      {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="typing-row">
                  <div className="avatar assistant">🤖</div>
                  <div className="typing-bubble">
                    <div className="dot" />
                    <div className="dot" />
                    <div className="dot" />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="chat-error" role="alert">
            ⚠️ {error}
          </div>
        )}

        <div className="input-row">
          <textarea
            ref={inputRef}
            id="chat-input"
            className="chat-textarea"
            rows={1}
            placeholder="Ask about matches, results, schedules… (Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            aria-label="Chat message input"
          />
          <button
            id="chat-send-btn"
            className="send-btn"
            aria-label="Send message"
            disabled={!input.trim() || loading}
            onClick={() => sendMessage(input)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </>
  );
}
