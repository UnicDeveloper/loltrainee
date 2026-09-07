import type { Locale } from '@/core/i18n/messages';
import type { SelectableCoachRole } from '@/core/config/roles';
import type { StoredMatchSummary } from '@/core/riot/types';

export type ObjectiveStatus = 'pending' | 'hit' | 'miss' | 'unknown';

export interface SessionObjectiveProgress {
  text: string;
  status: ObjectiveStatus;
  note?: string;
}

export interface SessionStats {
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKda: number;
  avgCsPerMin: number;
  avgDeaths: number;
}

export interface CoachingSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  active: boolean;
  matchIds: string[];
  objectivesSnapshot: string[];
  objectiveProgress: SessionObjectiveProgress[];
  nextFocus: string[];
  summaryNotes: string[];
}

export interface SessionCoachSnapshot {
  session: CoachingSession | null;
  stats: SessionStats;
  sessionMatches: StoredMatchSummary[];
}

function emptyStats(): SessionStats {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    avgKda: 0,
    avgCsPerMin: 0,
    avgDeaths: 0,
  };
}

export function createSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function computeSessionStats(matches: StoredMatchSummary[]): SessionStats {
  if (matches.length === 0) {
    return emptyStats();
  }

  let wins = 0;
  let kdaSum = 0;
  let csSum = 0;
  let deathsSum = 0;

  for (const m of matches) {
    wins += m.win ? 1 : 0;
    kdaSum += (m.kills + m.assists) / Math.max(m.deaths, 1);
    csSum += m.csPerMin;
    deathsSum += m.deaths;
  }

  const games = matches.length;
  return {
    games,
    wins,
    losses: games - wins,
    winRate: Number(((wins / games) * 100).toFixed(1)),
    avgKda: Number((kdaSum / games).toFixed(2)),
    avgCsPerMin: Number((csSum / games).toFixed(2)),
    avgDeaths: Number((deathsSum / games).toFixed(1)),
  };
}

/**
 * Best-effort evaluation of free-text objectives against session match metrics.
 * Unknown when we cannot parse a measurable target.
 */
export function evaluateObjectives(
  objectives: string[],
  matches: StoredMatchSummary[],
  locale: Locale,
): SessionObjectiveProgress[] {
  const stats = computeSessionStats(matches);
  const en = locale === 'en';

  return objectives.map((text) => {
    const lower = text.toLowerCase();
    const csMatch = lower.match(/(\d+(?:\.\d+)?)\s*cs/);
    const deathMatch = lower.match(/(?:<|>|under|below|menos de|menos)\s*(\d+)\s*(?:death|muerte)/);
    const deathMatchAlt = lower.match(/(\d+)\s*(?:death|muerte)/);

    if (csMatch && matches.length > 0) {
      const target = Number(csMatch[1]);
      const hit = stats.avgCsPerMin >= target;
      return {
        text,
        status: hit ? 'hit' : 'miss',
        note: en
          ? `Session CS/min ${stats.avgCsPerMin} vs target ${target}`
          : `CS/min de sesión ${stats.avgCsPerMin} vs objetivo ${target}`,
      };
    }

    const deathTarget = deathMatch?.[1] ?? (lower.includes('death') || lower.includes('muerte')
      ? deathMatchAlt?.[1]
      : undefined);

    if (deathTarget && matches.length > 0) {
      const target = Number(deathTarget);
      const hit = stats.avgDeaths <= target;
      return {
        text,
        status: hit ? 'hit' : 'miss',
        note: en
          ? `Session avg deaths ${stats.avgDeaths} vs ≤ ${target}`
          : `Muertes promedio ${stats.avgDeaths} vs ≤ ${target}`,
      };
    }

    if (matches.length === 0) {
      return { text, status: 'pending' };
    }

    return {
      text,
      status: 'unknown',
      note: en
        ? 'Tracked manually — sync after games and review.'
        : 'Seguimiento manual — sincroniza tras partidas y revisa.',
    };
  });
}

export function buildNextFocus(input: {
  stats: SessionStats;
  rolePriority: readonly SelectableCoachRole[];
  locale: Locale;
  objectives: string[];
}): string[] {
  const { stats, rolePriority, locale, objectives } = input;
  const en = locale === 'en';
  const primary = rolePriority[0] ?? 'ADC';
  const tips: string[] = [];

  if (stats.games === 0) {
    tips.push(
      en
        ? `Session start — primary role ${primary}. Lock one measurable objective.`
        : `Inicio de sesión — rol primario ${primary}. Fija un objetivo medible.`,
    );
    if (objectives[0]) {
      tips.push(objectives[0]);
    }
    tips.push(
      en
        ? 'First game: play for fundamentals, not hero plays.'
        : 'Primera partida: fundamentos, no hero plays.',
    );
    return tips.slice(0, 4);
  }

  if (stats.avgDeaths > 6) {
    tips.push(
      en
        ? `Deaths trending high (${stats.avgDeaths}). Next game: die ≤ 4 before 20.`
        : `Muertes altas (${stats.avgDeaths}). Próxima: ≤ 4 muertes antes de 20.`,
    );
  }

  if (stats.avgCsPerMin < 6.5 && (primary === 'ADC' || primary === 'TOP' || primary === 'MID')) {
    tips.push(
      en
        ? `CS/min ${stats.avgCsPerMin} — next game farm is non-negotiable.`
        : `CS/min ${stats.avgCsPerMin} — la próxima, farm no se negocia.`,
    );
  }

  if (stats.winRate < 45 && stats.games >= 2) {
    tips.push(
      en
        ? 'Session WR cold — pick a comfort champ from your priority roles.'
        : 'WR de sesión frío — elige un champ comfort de tus roles prioritarios.',
    );
  } else if (stats.winRate >= 60 && stats.games >= 2) {
    tips.push(
      en
        ? 'Session hot — keep the same win condition; don’t invent a new style.'
        : 'Sesión caliente — mantén la misma wincon; no inventes un estilo nuevo.',
    );
  }

  if (objectives[0]) {
    tips.push(
      en ? `Carry objective forward: ${objectives[0]}` : `Mantén el objetivo: ${objectives[0]}`,
    );
  }

  if (tips.length < 2) {
    tips.push(
      en
        ? `Stay on ${primary} win condition for the next queue.`
        : `Mantén la wincon de ${primary} en la próxima cola.`,
    );
  }

  return tips.slice(0, 4);
}

export function buildSummaryNotes(input: {
  stats: SessionStats;
  objectiveProgress: SessionObjectiveProgress[];
  locale: Locale;
}): string[] {
  const { stats, objectiveProgress, locale } = input;
  const en = locale === 'en';
  const notes: string[] = [];

  if (stats.games === 0) {
    return [
      en
        ? 'No session games yet. Queue up, then sync match history.'
        : 'Aún no hay partidas de sesión. Juega y luego sincroniza el historial.',
    ];
  }

  notes.push(
    en
      ? `${stats.games} games · ${stats.wins}W ${stats.losses}L · WR ${stats.winRate}%`
      : `${stats.games} partidas · ${stats.wins}V ${stats.losses}D · WR ${stats.winRate}%`,
  );
  notes.push(
    en
      ? `Avg KDA ${stats.avgKda} · CS/min ${stats.avgCsPerMin} · deaths ${stats.avgDeaths}`
      : `KDA prom. ${stats.avgKda} · CS/min ${stats.avgCsPerMin} · muertes ${stats.avgDeaths}`,
  );

  const hits = objectiveProgress.filter((o) => o.status === 'hit').length;
  const tracked = objectiveProgress.filter((o) => o.status === 'hit' || o.status === 'miss').length;
  if (tracked > 0) {
    notes.push(
      en
        ? `Objectives hit: ${hits}/${tracked}`
        : `Objetivos cumplidos: ${hits}/${tracked}`,
    );
  }

  return notes;
}

export function matchesInSession(
  allMatches: StoredMatchSummary[],
  startedAt: number,
  endedAt?: number,
): StoredMatchSummary[] {
  const end = endedAt ?? Number.POSITIVE_INFINITY;
  return allMatches
    .filter((m) => m.playedAt >= startedAt && m.playedAt <= end)
    .sort((a, b) => b.playedAt - a.playedAt);
}

export function startCoachingSession(input: {
  objectives: string[];
  rolePriority: readonly SelectableCoachRole[];
  locale: Locale;
}): CoachingSession {
  const startedAt = Date.now();
  const nextFocus = buildNextFocus({
    stats: emptyStats(),
    rolePriority: input.rolePriority,
    locale: input.locale,
    objectives: input.objectives,
  });

  return {
    id: createSessionId(),
    startedAt,
    active: true,
    matchIds: [],
    objectivesSnapshot: [...input.objectives],
    objectiveProgress: input.objectives.map((text) => ({ text, status: 'pending' })),
    nextFocus,
    summaryNotes: buildSummaryNotes({
      stats: emptyStats(),
      objectiveProgress: [],
      locale: input.locale,
    }),
  };
}

export function refreshCoachingSession(input: {
  session: CoachingSession;
  allMatches: StoredMatchSummary[];
  rolePriority: readonly SelectableCoachRole[];
  locale: Locale;
}): CoachingSession {
  const sessionMatches = matchesInSession(
    input.allMatches,
    input.session.startedAt,
    input.session.endedAt,
  );
  const stats = computeSessionStats(sessionMatches);
  const objectives =
    input.session.objectivesSnapshot.length > 0
      ? input.session.objectivesSnapshot
      : [];
  const objectiveProgress = evaluateObjectives(objectives, sessionMatches, input.locale);
  const nextFocus = buildNextFocus({
    stats,
    rolePriority: input.rolePriority,
    locale: input.locale,
    objectives,
  });

  return {
    ...input.session,
    matchIds: sessionMatches.map((m) => m.matchId),
    objectiveProgress,
    nextFocus,
    summaryNotes: buildSummaryNotes({ stats, objectiveProgress, locale: input.locale }),
  };
}

export function endCoachingSession(session: CoachingSession): CoachingSession {
  return {
    ...session,
    active: false,
    endedAt: session.endedAt ?? Date.now(),
  };
}
