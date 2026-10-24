'use client';

// AI Assistant page — placeholder chat UI.
export default function AssistantPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">AI Assistant</h1>
      <p className="text-gray-500 text-sm mb-6">Ask questions about the tournament</p>
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-400">
        <p className="text-sm">Chat interface will be implemented here.</p>
        <p className="text-xs mt-1">
          Endpoint: <code className="bg-gray-100 px-1 rounded">POST /api/assistant/chat</code>
        </p>
      </div>
    </div>
  );
}
