'use client';

import { useEffect, useState } from 'react';

interface Score {
  home: number;
  away: number;
}

interface Match {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledAt: string;
  status: 'scheduled' | 'completed' | 'pending_result';
  score: Score | null;
}

// Static lookup maps derived from data/teams.json and data/venues.json
const TEAM_NAMES: Record<string, { name: string; code: string; city: string }> = {
  'team-01': { name: 'Iron Wolves FC',    code: 'IWF', city: 'Veldoria' },
  'team-02': { name: 'Crimson Tide SC',   code: 'CTS', city: 'Marveth'  },
  'team-03': { name: 'Azure Falcons',     code: 'AZF', city: 'Lunaris'  },
  'team-04': { name: 'Golden Strike FC',  code: 'GSF', city: 'Dawnport' },
};

const VENUE_NAMES: Record<string, string> = {
  'v-01': 'Veldoria Grand Arena',
  'v-02': 'Marveth City Stadium',
};

type FilterTab = 'all' | 'scheduled' | 'completed' | 'pending_result';

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  completed:      { label: 'Completed',      color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  scheduled:      { label: 'Upcoming',       color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500'    },
  pending_result: { label: 'Pending Result', color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500'   },
};

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

function MatchCard({ match }: { match: Match }) {
  const home = TEAM_NAMES[match.homeTeamId] ?? { name: match.homeTeamId, code: '?', city: '' };
  const away = TEAM_NAMES[match.awayTeamId] ?? { name: match.awayTeamId, code: '?', city: '' };
  const venue = VENUE_NAMES[match.venueId] ?? match.venueId;
  const { date, time } = formatDate(match.scheduledAt);
  const meta = STATUS_META[match.status];

  return (
    <div className="match-card">
      <div className="match-card-header">
        <span className="match-id">{match.id.toUpperCase()}</span>
        <span className={`status-badge ${meta.color}`}>
          <span className={`status-dot ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="match-teams">
        <div className="team home-team">
          <span className="team-code">{home.code}</span>
          <span className="team-name">{home.name}</span>
          <span className="team-city">{home.city}</span>
        </div>

        <div className="score-block">
          {match.score ? (
            <>
              <span className="score">{match.score.home}</span>
              <span className="score-divider">–</span>
              <span className="score">{match.score.away}</span>
            </>
          ) : (
            <span className="score-vs">VS</span>
          )}
        </div>

        <div className="team away-team">
          <span className="team-code">{away.code}</span>
          <span className="team-name">{away.name}</span>
          <span className="team-city">{away.city}</span>
        </div>
      </div>

      <div className="match-footer">
        <span className="match-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {date} · {time} UTC
        </span>
        <span className="match-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {venue}
        </span>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const [matches, setMatches]   = useState<Match[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<FilterTab>('all');

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

  const filtered =
    filter === 'all' ? matches : matches.filter((m) => m.status === filter);

  const counts = {
    all:            matches.length,
    completed:      matches.filter((m) => m.status === 'completed').length,
    scheduled:      matches.filter((m) => m.status === 'scheduled').length,
    pending_result: matches.filter((m) => m.status === 'pending_result').length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',            label: `All (${counts.all})`               },
    { key: 'completed',      label: `Completed (${counts.completed})`   },
    { key: 'scheduled',      label: `Upcoming (${counts.scheduled})`    },
    { key: 'pending_result', label: `Pending (${counts.pending_result})` },
  ];

  return (
    <>
      <style>{`
        .matches-page { padding: 0; }

        .page-header { margin-bottom: 2rem; }
        .page-title  { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 0 0 .35rem; }
        .page-sub    { color: #64748b; font-size: .875rem; margin: 0; }

        .filter-tabs {
          display: flex; gap: .5rem; margin-bottom: 1.75rem;
          border-bottom: 1px solid #e2e8f0; padding-bottom: 0;
        }
        .filter-tab {
          padding: .5rem 1rem; border: none; background: none;
          font-size: .8125rem; font-weight: 500; cursor: pointer;
          color: #64748b; border-bottom: 2px solid transparent;
          margin-bottom: -1px; transition: all .15s;
        }
        .filter-tab:hover  { color: #1e293b; }
        .filter-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }

        .match-grid  { display: flex; flex-direction: column; gap: 1rem; }

        .match-card  {
          border: 1px solid #e2e8f0; border-radius: 12px;
          padding: 1.25rem 1.5rem; background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,.04);
          transition: box-shadow .2s, border-color .2s;
        }
        .match-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); border-color: #cbd5e1; }

        .match-card-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1rem;
        }
        .match-id    { font-size: .75rem; font-weight: 600; color: #94a3b8; letter-spacing: .05em; }

        .status-badge {
          display: inline-flex; align-items: center; gap: .375rem;
          font-size: .72rem; font-weight: 600; padding: .25rem .625rem;
          border-radius: 999px;
        }
        .status-dot  { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .match-teams {
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; gap: 1rem; margin-bottom: 1rem;
        }

        .team        { display: flex; flex-direction: column; }
        .home-team   { align-items: flex-end; text-align: right; }
        .away-team   { align-items: flex-start; text-align: left; }

        .team-code   { font-size: 1.375rem; font-weight: 800; color: #1e293b; line-height: 1; }
        .team-name   { font-size: .8125rem; font-weight: 500; color: #475569; margin-top: .25rem; }
        .team-city   { font-size: .72rem; color: #94a3b8; margin-top: .125rem; }

        .score-block {
          display: flex; align-items: center; gap: .375rem;
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 8px; padding: .5rem .875rem;
        }
        .score       { font-size: 1.5rem; font-weight: 800; color: #0f172a; }
        .score-divider { font-size: 1rem; color: #94a3b8; font-weight: 400; }
        .score-vs    { font-size: 1rem; font-weight: 700; color: #94a3b8; padding: 0 .25rem; }

        .match-footer {
          display: flex; gap: 1.25rem; flex-wrap: wrap;
          padding-top: .875rem; border-top: 1px solid #f1f5f9;
        }
        .match-meta-item {
          display: flex; align-items: center; gap: .375rem;
          font-size: .78rem; color: #64748b;
        }

        .empty-state {
          text-align: center; padding: 3rem 1.5rem;
          border: 2px dashed #e2e8f0; border-radius: 12px; color: #94a3b8;
        }
        .empty-state p { margin: .5rem 0 0; font-size: .875rem; }

        .error-box {
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px;
          padding: 1rem 1.25rem; color: #dc2626; font-size: .875rem;
        }

        .spinner-wrap { text-align: center; padding: 3rem; color: #94a3b8; }
        .spinner {
          display: inline-block; width: 32px; height: 32px;
          border: 3px solid #e2e8f0; border-top-color: #3b82f6;
          border-radius: 50%; animation: spin .7s linear infinite;
          margin-bottom: .75rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="matches-page">
        <div className="page-header">
          <h1 className="page-title">Matches</h1>
          <p className="page-sub">Aethon Cup 2025 — schedule and results</p>
        </div>

        <div className="filter-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              role="tab"
              aria-selected={filter === t.key}
              className={`filter-tab${filter === t.key ? ' active' : ''}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="spinner-wrap">
            <div className="spinner" />
            <p>Loading matches…</p>
          </div>
        )}

        {error && (
          <div className="error-box">
            ⚠️ Could not load matches: <strong>{error}</strong>
            <p style={{ margin: '.5rem 0 0', color: '#b91c1c', fontSize: '.8rem' }}>
              Make sure the API is running on port 4000 (<code>npm run dev:api</code>).
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="match-grid" role="list">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: '2rem' }}>🏟️</span>
                <p>No matches found for this filter.</p>
              </div>
            ) : (
              filtered.map((m) => (
                <div key={m.id} role="listitem">
                  <MatchCard match={m} />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
