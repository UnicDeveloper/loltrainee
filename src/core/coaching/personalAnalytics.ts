import type { Locale } from '@/core/i18n/messages';
import type { CoachRole, SelectableCoachRole } from '@/core/config/roles';
import type { PoolChampion, StoredMatchSummary } from '@/core/riot/types';

export interface RoleBreakdown {
  role: CoachRole;
  games: number;
  wins: number;
  winRate: number;
  avgKda: number;
  avgCsPerMin: number;
  avgDeaths: number;
}

export interface ChampionBreakdown {
  championId: number;
  championName: string;
  role: CoachRole;
  games: number;
  wins: number;
  winRate: number;
  avgKda: number;
  avgCsPerMin: number;
  avgDeaths: number;
}

export interface TrendWindow {
  label: string;
  games: number;
  winRate: number;
  avgKda: number;
  avgCsPerMin: number;
  avgDeaths: number;
}

export interface InsightItem {
  kind: 'strength' | 'weakness' | 'focus';
  text: string;
}

export interface PersonalAnalyticsReport {
  overall: TrendWindow;
  recent10: TrendWindow;
  older: TrendWindow | null;
  byRole: RoleBreakdown[];
  byChampion: ChampionBreakdown[];
  insights: InsightItem[];
  baselineDelta: {
    winRateDelta: number;
    kdaDelta: number;
    csDelta: number;
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function windowStats(matches: StoredMatchSummary[], label: string): TrendWindow {
  if (matches.length === 0) {
    return { label, games: 0, winRate: 0, avgKda: 0, avgCsPerMin: 0, avgDeaths: 0 };
  }
  const wins = matches.filter((m) => m.win).length;
  return {
    label,
    games: matches.length,
    winRate: Number(((wins / matches.length) * 100).toFixed(1)),
    avgKda: Number(
      avg(matches.map((m) => (m.kills + m.assists) / Math.max(m.deaths, 1))).toFixed(2),
    ),
    avgCsPerMin: Number(avg(matches.map((m) => m.csPerMin)).toFixed(2)),
    avgDeaths: Number(avg(matches.map((m) => m.deaths)).toFixed(1)),
  };
}

export function buildPersonalAnalytics(input: {
  matches: StoredMatchSummary[];
  pool: PoolChampion[];
  rolePriority: readonly SelectableCoachRole[];
  locale: Locale;
}): PersonalAnalyticsReport {
  const { matches, rolePriority, locale } = input;
  const sorted = [...matches].sort((a, b) => b.playedAt - a.playedAt);
  const overall = windowStats(sorted, locale === 'en' ? 'All synced' : 'Todo sincronizado');
  const recent10 = windowStats(
    sorted.slice(0, 10),
    locale === 'en' ? 'Last 10' : 'Últimas 10',
  );
  const olderSlice = sorted.slice(10, 50);
  const older =
    olderSlice.length >= 5
      ? windowStats(olderSlice, locale === 'en' ? 'Prior sample' : 'Muestra previa')
      : null;

  const byRoleMap = new Map<
    CoachRole,
    { games: number; wins: number; kda: number[]; cs: number[]; deaths: number[] }
  >();

  for (const m of sorted) {
    const bucket = byRoleMap.get(m.role) ?? {
      games: 0,
      wins: 0,
      kda: [],
      cs: [],
      deaths: [],
    };
    bucket.games += 1;
    bucket.wins += m.win ? 1 : 0;
    bucket.kda.push((m.kills + m.assists) / Math.max(m.deaths, 1));
    bucket.cs.push(m.csPerMin);
    bucket.deaths.push(m.deaths);
    byRoleMap.set(m.role, bucket);
  }

  const byRole: RoleBreakdown[] = [...byRoleMap.entries()]
    .map(([role, b]) => ({
      role,
      games: b.games,
      wins: b.wins,
      winRate: Number(((b.wins / b.games) * 100).toFixed(1)),
      avgKda: Number(avg(b.kda).toFixed(2)),
      avgCsPerMin: Number(avg(b.cs).toFixed(2)),
      avgDeaths: Number(avg(b.deaths).toFixed(1)),
    }))
    .sort((a, b) => {
      const pa = rolePriority.indexOf(a.role as SelectableCoachRole);
      const pb = rolePriority.indexOf(b.role as SelectableCoachRole);
      const sa = pa === -1 ? 50 : pa;
      const sb = pb === -1 ? 50 : pb;
      if (sa !== sb) return sa - sb;
      return b.games - a.games;
    });

  const byChampMap = new Map<
    number,
    {
      championId: number;
      championName: string;
      roleVotes: Record<string, number>;
      games: number;
      wins: number;
      kda: number[];
      cs: number[];
      deaths: number[];
    }
  >();

  for (const m of sorted) {
    const entry = byChampMap.get(m.championId) ?? {
      championId: m.championId,
      championName: m.championName,
      roleVotes: {},
      games: 0,
      wins: 0,
      kda: [],
      cs: [],
      deaths: [],
    };
    entry.games += 1;
    entry.wins += m.win ? 1 : 0;
    entry.kda.push((m.kills + m.assists) / Math.max(m.deaths, 1));
    entry.cs.push(m.csPerMin);
    entry.deaths.push(m.deaths);
    entry.roleVotes[m.role] = (entry.roleVotes[m.role] ?? 0) + 1;
    byChampMap.set(m.championId, entry);
  }

  const byChampion: ChampionBreakdown[] = [...byChampMap.values()]
    .filter((c) => c.games >= 2)
    .map((c) => {
      let role: CoachRole = 'UNKNOWN';
      let best = -1;
      for (const [r, n] of Object.entries(c.roleVotes)) {
        if (n > best) {
          best = n;
          role = r as CoachRole;
        }
      }
      return {
        championId: c.championId,
        championName: c.championName,
        role,
        games: c.games,
        wins: c.wins,
        winRate: Number(((c.wins / c.games) * 100).toFixed(1)),
        avgKda: Number(avg(c.kda).toFixed(2)),
        avgCsPerMin: Number(avg(c.cs).toFixed(2)),
        avgDeaths: Number(avg(c.deaths).toFixed(1)),
      };
    })
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate)
    .slice(0, 12);

  const insights = buildInsights({
    overall,
    recent10,
    older,
    byRole,
    byChampion,
    rolePriority,
    locale,
  });

  const baseline = older ?? overall;
  const baselineDelta = {
    winRateDelta: Number((recent10.winRate - baseline.winRate).toFixed(1)),
    kdaDelta: Number((recent10.avgKda - baseline.avgKda).toFixed(2)),
    csDelta: Number((recent10.avgCsPerMin - baseline.avgCsPerMin).toFixed(2)),
  };

  return {
    overall,
    recent10,
    older,
    byRole,
    byChampion,
    insights,
    baselineDelta,
  };
}

function buildInsights(input: {
  overall: TrendWindow;
  recent10: TrendWindow;
  older: TrendWindow | null;
  byRole: RoleBreakdown[];
  byChampion: ChampionBreakdown[];
  rolePriority: readonly SelectableCoachRole[];
  locale: Locale;
}): InsightItem[] {
  const { overall, recent10, older, byRole, byChampion, rolePriority, locale } = input;
  const en = locale === 'en';
  const items: InsightItem[] = [];

  const primary = rolePriority[0];
  const primaryStats = byRole.find((r) => r.role === primary);
  if (primaryStats && primaryStats.games >= 3) {
    if (primaryStats.winRate >= 55) {
      items.push({
        kind: 'strength',
        text: en
          ? `Primary role ${primary} is a strength (WR ${primaryStats.winRate}% over ${primaryStats.games} games).`
          : `Tu rol primario ${primary} es fortaleza (WR ${primaryStats.winRate}% en ${primaryStats.games} partidas).`,
      });
    } else if (primaryStats.winRate <= 45) {
      items.push({
        kind: 'weakness',
        text: en
          ? `${primary} WR is cold (${primaryStats.winRate}%). Reduce champ pool variance there.`
          : `WR en ${primary} está frío (${primaryStats.winRate}%). Reduce varianza de pool ahí.`,
      });
    }
  }

  if (recent10.avgDeaths >= 7) {
    items.push({
      kind: 'weakness',
      text: en
        ? `Deaths are elevated in last 10 (avg ${recent10.avgDeaths}). Next focus: die ≤ 4 before 20.`
        : `Muertes altas en las últimas 10 (prom. ${recent10.avgDeaths}). Foco: ≤ 4 muertes antes de 20.`,
    });
  } else if (recent10.games >= 5 && recent10.avgDeaths <= 4.5) {
    items.push({
      kind: 'strength',
      text: en
        ? `Survival looks solid lately (avg deaths ${recent10.avgDeaths}).`
        : `Supervivencia sólida últimamente (muertes prom. ${recent10.avgDeaths}).`,
    });
  }

  if (primary === 'ADC' || primary === 'TOP' || primary === 'MID') {
    if (recent10.avgCsPerMin > 0 && recent10.avgCsPerMin < 6.2) {
      items.push({
        kind: 'focus',
        text: en
          ? `CS/min ${recent10.avgCsPerMin} is below Challenger lane standard — make farm objective #1.`
          : `CS/min ${recent10.avgCsPerMin} bajo estándar Challenger — farm es objetivo #1.`,
      });
    } else if (recent10.avgCsPerMin >= 7.2) {
      items.push({
        kind: 'strength',
        text: en
          ? `Farm pace is strong (CS/min ${recent10.avgCsPerMin}). Convert that into towers/dragons.`
          : `Ritmo de farm fuerte (CS/min ${recent10.avgCsPerMin}). Conviértelo en torres/dragones.`,
      });
    }
  }

  const bestChamp = byChampion.find((c) => c.games >= 3 && c.winRate >= 55);
  if (bestChamp) {
    items.push({
      kind: 'strength',
      text: en
        ? `Comfort lock: ${bestChamp.championName} (${bestChamp.winRate}% WR / ${bestChamp.games} games).`
        : `Lock comfort: ${bestChamp.championName} (${bestChamp.winRate}% WR / ${bestChamp.games} partidas).`,
    });
  }

  const weakChamp = byChampion.find((c) => c.games >= 3 && c.winRate <= 40);
  if (weakChamp) {
    items.push({
      kind: 'weakness',
      text: en
        ? `${weakChamp.championName} is underperforming (${weakChamp.winRate}%). Bench until fundamentals stabilize.`
        : `${weakChamp.championName} rinde bajo (${weakChamp.winRate}%). Banquéalo hasta estabilizar fundamentos.`,
    });
  }

  if (older && recent10.games >= 5) {
    const delta = recent10.winRate - older.winRate;
    if (delta >= 8) {
      items.push({
        kind: 'strength',
        text: en
          ? `Form trending up (+${delta.toFixed(1)} WR vs prior sample).`
          : `Forma al alza (+${delta.toFixed(1)} WR vs muestra previa).`,
      });
    } else if (delta <= -8) {
      items.push({
        kind: 'focus',
        text: en
          ? `Form trending down (${delta.toFixed(1)} WR). Return to 1–2 comfort champs.`
          : `Forma a la baja (${delta.toFixed(1)} WR). Vuelve a 1–2 champs comfort.`,
      });
    }
  }

  if (items.length === 0 && overall.games > 0) {
    items.push({
      kind: 'focus',
      text: en
        ? 'Not enough signal yet — sync more ranked games on your priority roles.'
        : 'Aún poca señal — sincroniza más ranked en tus roles prioritarios.',
    });
  }

  return items.slice(0, 6);
}

export function personalAnalyticsToPromptBlock(report: PersonalAnalyticsReport): string {
  const roles = report.byRole
    .slice(0, 5)
    .map(
      (r) =>
        `${r.role}: ${r.games}g WR ${r.winRate}% KDA ${r.avgKda} CS/m ${r.avgCsPerMin} deaths ${r.avgDeaths}`,
    )
    .join('\n');
  const champs = report.byChampion
    .slice(0, 8)
    .map(
      (c) =>
        `${c.championName} (${c.role}): ${c.games}g WR ${c.winRate}% KDA ${c.avgKda} CS/m ${c.avgCsPerMin}`,
    )
    .join('\n');
  const insights = report.insights.map((i) => `- [${i.kind}] ${i.text}`).join('\n');

  return [
    `Overall: ${report.overall.games}g WR ${report.overall.winRate}% KDA ${report.overall.avgKda} CS/m ${report.overall.avgCsPerMin}`,
    `Last10: ${report.recent10.games}g WR ${report.recent10.winRate}% KDA ${report.recent10.avgKda} CS/m ${report.recent10.avgCsPerMin} deaths ${report.recent10.avgDeaths}`,
    report.older
      ? `Prior: ${report.older.games}g WR ${report.older.winRate}% KDA ${report.older.avgKda} CS/m ${report.older.avgCsPerMin}`
      : 'Prior: n/a',
    `Delta last10 vs baseline: WR ${report.baselineDelta.winRateDelta}, KDA ${report.baselineDelta.kdaDelta}, CS/m ${report.baselineDelta.csDelta}`,
    'By role:',
    roles || 'n/a',
    'By champion:',
    champs || 'n/a',
    'Insights:',
    insights || 'n/a',
  ].join('\n');
}
