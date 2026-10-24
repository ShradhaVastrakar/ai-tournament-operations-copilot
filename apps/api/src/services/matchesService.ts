import fs from 'fs';
import path from 'path';
import type { Match, MatchStatus } from '../types';

// ponytail: reads from disk on every call — fine for a JSON file this size.
// Upgrade path: cache in memory (module-level variable) when file grows or p99 latency matters.
const DATA_PATH = path.join(__dirname, '../../../../data/matches.json');

function loadMatches(): Match[] {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return (JSON.parse(raw) as { matches: Match[] }).matches;
}

export interface MatchFilters {
  status?: MatchStatus;
  date?: string; // ISO date string YYYY-MM-DD — filters by scheduledAt date
}

export function getMatches(filters: MatchFilters = {}): Match[] {
  let matches = loadMatches();

  if (filters.status) {
    matches = matches.filter((m) => m.status === filters.status);
  }

  if (filters.date) {
    matches = matches.filter((m) => m.scheduledAt.startsWith(filters.date!));
  }

  return matches;
}

export function getMatchById(id: string): Match | undefined {
  return loadMatches().find((m) => m.id === id);
}
