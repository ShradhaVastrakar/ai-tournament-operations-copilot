// Matches page — placeholder until API is connected.
export default function MatchesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Matches</h1>
      <p className="text-gray-500 text-sm mb-6">Aethon Cup 2025 schedule and results</p>
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-400">
        <p className="text-sm">Match list will load here once connected to the API.</p>
        <p className="text-xs mt-1">
          Endpoint: <code className="bg-gray-100 px-1 rounded">GET /api/matches</code>
        </p>
      </div>
    </div>
  );
}
