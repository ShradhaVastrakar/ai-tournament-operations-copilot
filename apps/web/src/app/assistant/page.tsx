'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Markdown from '@/components/Markdown';
import {
  IconCheck,
  IconCopy,
  IconDoc,
  IconMenu,
  IconPlus,
  IconSend,
  IconTrash,
  LogoMark,
} from '@/components/chat-icons';
import {
  loadConversations,
  saveConversations,
  type ChatMessage,
  type Conversation,
} from '@/lib/chatStore';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const SUGGESTIONS = [
  { icon: '📊', title: 'Match counts', question: 'How many matches are scheduled?' },
  { icon: '⏳', title: 'Pending results', question: 'Are there any pending results?' },
  { icon: '🏆', title: 'Standings', question: 'Who is top of the standings?' },
  { icon: '📖', title: 'Rulebook', question: 'What are the rules for a penalty shoot-out?' },
];

function titleFrom(text: string): string {
  return text.length > 42 ? `${text.slice(0, 42).trimEnd()}…` : text;
}

function dayLabel(iso: string): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
  if (days <= 0) return 'Today';
  return days === 1 ? 'Yesterday' : 'Earlier';
}

function groupByDay(conversations: Conversation[]): { label: string; items: Conversation[] }[] {
  const groups: { label: string; items: Conversation[] }[] = [];
  for (const c of conversations) {
    const label = dayLabel(c.updatedAt);
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(c);
    else groups.push({ label, items: [c] });
  }
  return groups;
}

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // History lives in localStorage, so it can only be read after mount.
  useEffect(() => {
    setConversations(loadConversations());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveConversations(conversations);
  }, [conversations, hydrated]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const messages = active?.messages ?? [];
  const loading = pendingId !== null;
  const typing = pendingId !== null && pendingId === activeId;
  const isEmpty = messages.length === 0 && !typing;
  const groups = useMemo(() => groupByDay(conversations), [conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, typing, activeId]);

  // Grow the textarea with its content, up to a cap.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input, activeId, isEmpty]);

  function patchConversation(id: string, patch: (c: Conversation) => Conversation) {
    setConversations((prev) => {
      const found = prev.find((c) => c.id === id);
      if (!found) return prev;
      return [patch(found), ...prev.filter((c) => c.id !== id)];
    });
  }

  function newChat() {
    setActiveId(null);
    setInput('');
    setError(null);
    setSidebarOpen(false);
    inputRef.current?.focus();
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setError(null);
    setSidebarOpen(false);
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function clearHistory() {
    setConversations([]);
    setActiveId(null);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput('');

    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: now,
    };

    const convoId = active?.id ?? crypto.randomUUID();
    const serverId = active?.serverId;
    if (active) {
      patchConversation(convoId, (c) => ({ ...c, messages: [...c.messages, userMsg], updatedAt: now }));
    } else {
      const fresh: Conversation = {
        id: convoId,
        title: titleFrom(trimmed),
        messages: [userMsg],
        updatedAt: now,
      };
      setConversations((prev) => [fresh, ...prev]);
      setActiveId(convoId);
    }
    setPendingId(convoId);

    try {
      const res = await fetch(`${API_BASE}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId: serverId }),
      });

      const json = (await res.json()) as {
        success: boolean;
        data?: { answer: string; conversationId: string; sources?: string[] };
        error?: string;
      };

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `API error ${res.status}`);
      }

      const { answer, conversationId, sources } = json.data;
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer,
        sources,
        timestamp: new Date().toISOString(),
      };
      patchConversation(convoId, (c) => ({
        ...c,
        serverId: conversationId,
        messages: [...c.messages, reply],
        updatedAt: reply.timestamp,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPendingId(null);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  async function copyMessage(m: ChatMessage) {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); nothing to do.
    }
  }

  const errorBanner = error && (
    <div
      role="alert"
      className="mb-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm text-red-300"
    >
      {error}
    </div>
  );

  const composer = (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/30 transition focus-within:border-emerald-400/50 focus-within:ring-4 focus-within:ring-emerald-400/10">
      <textarea
        ref={inputRef}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about matches, standings, venues or the rulebook…"
        aria-label="Chat message input"
        className="block max-h-[168px] w-full resize-none bg-transparent px-4 pb-2 pt-4 text-[15px] leading-6 text-zinc-100 outline-none placeholder:text-zinc-500"
      />
      <div className="flex items-center justify-between px-3 pb-3">
        <span className="px-1 text-xs text-zinc-500">Enter to send · Shift+Enter for new line</span>
        <button
          type="button"
          aria-label="Send message"
          disabled={!input.trim() || loading}
          onClick={() => void sendMessage(input)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-400 text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <IconSend size={18} />
        </button>
      </div>
    </div>
  );

  const disclaimer = (
    <p className="mt-3 text-center text-xs text-zinc-500">
      Copilot can make mistakes. Check important results against the official schedule.
    </p>
  );

  return (
    <div className="relative flex h-[calc(100dvh-3rem)] overflow-hidden bg-[#0a0c0f] text-zinc-100">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed bottom-0 left-0 top-12 z-40 flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#0e1115] transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-4 pb-4 pt-5">
          <LogoMark />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Copilot</p>
            <p className="text-xs text-zinc-500">Aethon Cup 2025</p>
          </div>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={newChat}
            className="flex w-full items-center justify-between rounded-xl bg-linear-to-br from-emerald-400 to-teal-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
          >
            <span className="flex items-center gap-2">
              <IconPlus size={16} /> New chat
            </span>
          </button>
        </div>

        <nav aria-label="Chat history" className="mt-5 flex-1 overflow-y-auto px-3 pb-3">
          {groups.length === 0 ? (
            <p className="px-2 text-sm text-zinc-500">Your conversations will appear here.</p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((c) => (
                    <li key={c.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => selectConversation(c.id)}
                        className={`w-full truncate rounded-lg px-3 py-2 pr-9 text-left text-sm transition ${
                          c.id === activeId
                            ? 'bg-white/10 text-white'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                        }`}
                      >
                        {c.title}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete conversation: ${c.title}`}
                        onClick={() => deleteConversation(c.id)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 opacity-0 transition hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
                      >
                        <IconTrash size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <p className="text-xs text-zinc-500">History is saved in this browser only.</p>
          {conversations.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="mt-1 text-xs text-zinc-400 underline-offset-2 transition hover:text-red-300 hover:underline"
            >
              Clear history
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <section className="relative flex min-w-0 flex-1 flex-col bg-[radial-gradient(60%_45%_at_50%_0%,rgba(16,185,129,0.10),transparent)]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white md:hidden"
          >
            <IconMenu />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
            {active?.title ?? 'New chat'}
          </h1>
          <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Matches · Standings · Rulebooks
          </span>
        </header>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10">
            <div className="w-full max-w-2xl">
              <div className="flex flex-col items-center text-center">
                <LogoMark size={56} />
                <h2 className="mt-6 bg-linear-to-r from-white to-emerald-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
                  {"Let's talk tournament ops"}
                </h2>
                <p className="mt-3 max-w-md text-sm text-zinc-400">
                  Ask about matches, standings, venues or the rulebook. Answers come from the
                  tournament data, with sources.
                </p>
              </div>

              <div className="mt-8">
                {errorBanner}
                {composer}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    disabled={loading}
                    onClick={() => void sendMessage(s.question)}
                    className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg">
                      {s.icon}
                    </span>
                    <p className="mt-3 text-sm font-medium text-zinc-100">{s.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-500 transition group-hover:text-zinc-400">
                      {s.question}
                    </p>
                  </button>
                ))}
              </div>
              {disclaimer}
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto" role="log" aria-live="polite">
              <div className="mx-auto w-full max-w-3xl space-y-7 px-4 py-6">
                {messages.map((m) =>
                  m.role === 'user' ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-white/[0.08] px-4 py-2.5 text-[15px] leading-6 text-zinc-100">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex gap-3">
                      <LogoMark size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-[15px] leading-7 text-zinc-300">
                          <Markdown text={m.content} />
                        </div>

                        {m.sources && m.sources.length > 0 && (
                          <ul aria-label="Sources" className="mt-3 flex flex-wrap gap-2">
                            {m.sources.map((src) => (
                              <li
                                key={src}
                                className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300"
                              >
                                <IconDoc size={13} />
                                {src}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                          <span>
                            {new Date(m.timestamp).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => void copyMessage(m)}
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 transition hover:bg-white/5 hover:text-zinc-200"
                          >
                            {copiedId === m.id ? <IconCheck size={13} /> : <IconCopy size={13} />}
                            {copiedId === m.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ),
                )}

                {typing && (
                  <div className="flex items-center gap-3" aria-label="Assistant is typing">
                    <LogoMark size={32} />
                    <div className="flex items-center gap-1.5 rounded-2xl bg-white/[0.05] px-4 py-3">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400/80" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400/80 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400/80 [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="shrink-0 px-4 pb-4 pt-2">
              <div className="mx-auto w-full max-w-3xl">
                {errorBanner}
                {composer}
                {disclaimer}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
