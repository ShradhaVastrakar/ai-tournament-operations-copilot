// Dashboard home page — displays status cards with placeholder data until the backend is connected.
export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-6 text-sm">Aethon Cup 2025 — Tournament Operations</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Matches" value="12" />
        <StatCard label="Completed" value="5" />
        <StatCard label="Upcoming" value="7" />
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-400">
        <p className="text-sm">Live match data will appear here once the backend API is connected.</p>
        <p className="text-xs mt-1">
          Start the API: <code className="bg-gray-100 px-1 rounded">npm run dev:api</code>
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-semibold mt-1">{value}</p>
    </div>
  );
}
