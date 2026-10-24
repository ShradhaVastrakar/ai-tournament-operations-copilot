'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledAt: string;
  status: 'scheduled' | 'completed' | 'pending_result';
  score: { home: number; away: number } | null;
}

const TEAM_NAMES: Record<string, string> = {
  'team-01': 'Iron Wolves FC',
  'team-02': 'Crimson Tide SC',
  'team-03': 'Azure Falcons',
  'team-04': 'Golden Strike FC',
};

const TEAM_CODES: Record<string, string> = {
  'team-01': 'IWF',
  'team-02': 'CTS',
  'team-03': 'AZF',
  'team-04': 'GSF',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
    fetch(`${url}/api/matches`)
      .then((r) => {
        if (!r.ok) throw new Error(`API returned ${r.status}`);
        return r.json();
      })
      .then((json: { success: boolean; data: Match[] }) => {
        setMatches(json.data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const completed      = matches.filter((m) => m.status === 'completed');
  const scheduled      = matches.filter((m) => m.status === 'scheduled');
  const pendingResult  = matches.filter((m) => m.status === 'pending_result');
  const upcoming       = scheduled.slice(0, 3);
  const recent         = completed.slice(-3).reverse();

  return (
    <>
      <style>{`
        .dash-title { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0 0 .35rem; }
        .dash-sub   { color: #64748b; font-size: .875rem; margin: 0 0 2rem; }

        .stat-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }

        .stat-card  {
          border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem 1.5rem;
          background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.04);
        }
        .stat-label { font-size: .72rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; }
        .stat-value { font-size: 2rem; font-weight: 800; color: #0f172a; margin: .25rem 0 0; line-height: 1; }
        .stat-sub   { font-size: .75rem; color: #64748b; margin-top: .25rem; }

        .section-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

        .panel {
          border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,.04); overflow: hidden;
        }
        .panel-header {
          padding: .875rem 1.25rem; border-bottom: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
        }
        .panel-title { font-size: .875rem; font-weight: 600; color: #1e293b; margin: 0; }
        .panel-link  { font-size: .75rem; color: #3b82f6; text-decoration: none; }
        .panel-link:hover { text-decoration: underline; }

        .mini-match  {
          display: flex; align-items: center; justify-content: space-between;
          padding: .75rem 1.25rem; gap: .75rem; border-bottom: 1px solid #f8fafc;
        }
        .mini-match:last-child { border-bottom: none; }

        .mini-teams  { flex: 1; }
        .mini-team-row { display: flex; align-items: center; justify-content: space-between; }
        .mini-code   { font-size: .8125rem; font-weight: 700; color: #334155; }
        .mini-score  { font-size: .8125rem; font-weight: 700; color: #0f172a; }
        .mini-date   { font-size: .72rem; color: #94a3b8; margin-top: .25rem; }

        .mini-badge  {
          font-size: .65rem; font-weight: 600; padding: .2rem .5rem;
          border-radius: 999px; white-space: nowrap; flex-shrink: 0;
        }

        .spinner-wrap { text-align: center; padding: 3rem; color: #94a3b8; }
        .spinner {
          display: inline-block; width: 28px; height: 28px;
          border: 3px solid #e2e8f0; border-top-color: #3b82f6;
          border-radius: 50%; animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .error-box {
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
          padding: 1rem 1.25rem; color: #dc2626; font-size: .875rem; margin-bottom: 2rem;
        }

        @media (max-width: 640px) {
          .stat-grid   { grid-template-columns: 1fr 1fr; }
          .section-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <h1 className="dash-title">Dashboard</h1>
      <p className="dash-sub">Aethon Cup 2025 — Tournament Operations</p>

      {error && (
        <div className="error-box">
          ⚠️ API unavailable: <strong>{error}</strong> — start the backend with <code>npm run dev:api</code>
        </div>
      )}

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Total Matches"  value={matches.length}     sub="Aethon Cup 2025" />
            <StatCard label="Completed"      value={completed.length}   sub="Final score recorded" />
            <StatCard label="Upcoming"       value={scheduled.length + pendingResult.length} sub={`${pendingResult.length} pending result`} />
          </div>

          <div className="section-row">
            {/* Upcoming matches */}
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">⏳ Upcoming</h2>
                <Link href="/matches?filter=scheduled" className="panel-link">View all →</Link>
              </div>
              {upcoming.length === 0 ? (
                <div style={{ padding: '1.5rem 1.25rem', color: '#94a3b8', fontSize: '.85rem' }}>No upcoming matches.</div>
              ) : (
                upcoming.map((m) => (
                  <div key={m.id} className="mini-match">
                    <div className="mini-teams">
                      <div className="mini-team-row">
                        <span className="mini-code">{TEAM_CODES[m.homeTeamId] ?? '?'} vs {TEAM_CODES[m.awayTeamId] ?? '?'}</span>
                      </div>
                      <div className="mini-date">{TEAM_NAMES[m.homeTeamId]} · {formatDate(m.scheduledAt)}</div>
                    </div>
                    <span className="mini-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>Scheduled</span>
                  </div>
                ))
              )}
            </div>

            {/* Recent results */}
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">✅ Recent Results</h2>
                <Link href="/matches?filter=completed" className="panel-link">View all →</Link>
              </div>
              {recent.length === 0 ? (
                <div style={{ padding: '1.5rem 1.25rem', color: '#94a3b8', fontSize: '.85rem' }}>No completed matches.</div>
              ) : (
                recent.map((m) => (
                  <div key={m.id} className="mini-match">
                    <div className="mini-teams">
                      <div className="mini-team-row">
                        <span className="mini-code">{TEAM_CODES[m.homeTeamId] ?? '?'}</span>
                        <span className="mini-score">{m.score?.home ?? '-'} – {m.score?.away ?? '-'}</span>
                        <span className="mini-code">{TEAM_CODES[m.awayTeamId] ?? '?'}</span>
                      </div>
                      <div className="mini-date">{formatDate(m.scheduledAt)}</div>
                    </div>
                    <span className="mini-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>FT</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-sub">{sub}</p>
    </div>
  );
}
