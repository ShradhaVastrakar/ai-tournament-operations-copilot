// Shared response envelope — all endpoints return this shape.
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  statusCode: number;
}

export type MatchStatus = 'scheduled' | 'completed' | 'pending_result';

export interface Score {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledAt: string;
  status: MatchStatus;
  score: Score | null;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  capacity: number;
  surface: string;
}

export interface Team {
  id: string;
  name: string;
  city: string;
  code: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  answer: string;
  conversationId: string;
  sources: string[];
  isPlaceholder: boolean;
}
