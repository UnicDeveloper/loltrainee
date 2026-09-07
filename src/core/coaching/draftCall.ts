import { assessCounter, counterLabelText, rolesForLaneContext } from '@/core/coaching/counters';
import type { CoachRole, SelectableCoachRole } from '@/core/config/roles';
import type { DDragonChampion, PoolChampion, StoredMatchSummary } from '@/core/riot/types';

export interface CallRolesAdvice {
  roles: SelectableCoachRole[];
  blurb: string;
}

export interface RivalInfo {
  championId: number;
  championName: string;
  role?: CoachRole;
}

export interface PickSuggestion {
  championId: number;
  championName: string;
  role: CoachRole;
  winRate: number;
  games: number;
  personalWrVsRival: number | null;
  personalGamesVsRival: number;
  counterScore: number;
  counterLabel: 'strong' | 'even' | 'weak';
  counterLabelText: string;
  reasons: string[];
  totalScore: number;
}

export interface RivalMatchupBlock {
  rival: RivalInfo;
  suggestions: PickSuggestion[];
  summary: string;
}

export interface DraftCallAdvice {
  callRoles: CallRolesAdvice;
  focusRole: CoachRole;
  rivals: RivalInfo[];
  rivalBlocks: RivalMatchupBlock[];
  botLaneNote?: string;
}

function personalRecordVs(
  matches: StoredMatchSummary[],
  myChampionId: number,
  enemyChampionId: number,
): { games: number; winRate: number } | null {
  const relevant = matches.filter(
    (m) => m.championId === myChampionId && m.laneOpponentChampionId === enemyChampionId,
  );
  if (relevant.length === 0) {
    // Also count bot-lane style: any game on this champ where either bot opponent matched
    const botRelevant = matches.filter(
      (m) =>
        m.championId === myChampionId &&
        (m.laneOpponentChampionId === enemyChampionId ||
          m.duoOpponentChampionId === enemyChampionId),
    );
    if (botRelevant.length === 0) return null;
    const wins = botRelevant.filter((m) => m.win).length;
    return {
      games: botRelevant.length,
      winRate: Number(((wins / botRelevant.length) * 100).toFixed(1)),
    };
  }
  const wins = relevant.filter((m) => m.win).length;
  return {
    games: relevant.length,
    winRate: Number(((wins / relevant.length) * 100).toFixed(1)),
  };
}

export function buildCallRoles(
  rolePriority: readonly SelectableCoachRole[],
  locale: 'en' | 'es',
): CallRolesAdvice {
  const roles = rolePriority.slice(0, 2);
  const label = roles.join(' + ');
  const blurb =
    locale === 'en'
      ? `Call these two roles first: ${label}. Keep the 3rd as flex only.`
      : `Llama primero estos dos roles: ${label}. El 3º solo como flex.`;
  return { roles, blurb };
}

export function buildDraftCallAdvice(input: {
  rolePriority: readonly SelectableCoachRole[];
  pool: PoolChampion[];
  matches: StoredMatchSummary[];
  champions: Record<string, DDragonChampion>;
  assignedRole?: CoachRole;
  enemyByRole?: Partial<Record<CoachRole, number>>;
  enemyChampionIds?: number[];
  locale: 'en' | 'es';
}): DraftCallAdvice {
  const {
    rolePriority,
    pool,
    matches,
    champions,
    assignedRole,
    enemyByRole = {},
    enemyChampionIds = [],
    locale,
  } = input;

  const callRoles = buildCallRoles(rolePriority, locale);
  const focusRole: CoachRole =
    assignedRole && assignedRole !== 'UNKNOWN'
      ? assignedRole
      : (callRoles.roles[0] ?? 'ADC');

  const champById = (id: number) =>
    Object.values(champions).find((c) => Number(c.key) === id);

  const rivals: RivalInfo[] = [];
  const laneRoles = rolesForLaneContext(focusRole);

  for (const role of laneRoles) {
    const id = enemyByRole[role];
    if (id && id > 0) {
      const c = champById(id);
      rivals.push({
        championId: id,
        championName: c?.name ?? `Champion ${id}`,
        role,
      });
    }
  }

  // Fallback: raw enemy ids if role map empty
  if (rivals.length === 0) {
    for (const id of enemyChampionIds) {
      const c = champById(id);
      rivals.push({
        championId: id,
        championName: c?.name ?? `Champion ${id}`,
      });
    }
  }

  // Deduplicate
  const uniqueRivals = [...new Map(rivals.map((r) => [r.championId, r])).values()];

  const candidatePool = pool.filter((p) => {
    if (focusRole === 'ADC' || focusRole === 'SUPPORT') {
      return p.role === 'ADC' || p.role === 'SUPPORT' || callRoles.roles.includes(p.role as SelectableCoachRole);
    }
    return p.role === focusRole || callRoles.roles.includes(p.role as SelectableCoachRole);
  });

  const rivalBlocks: RivalMatchupBlock[] = uniqueRivals.map((rival) => {
    const enemyChamp = champById(rival.championId);
    const suggestions: PickSuggestion[] = [];

    for (const pick of candidatePool) {
      // Prefer same-role answers into the rival's lane when known
      if (rival.role && pick.role !== rival.role && !(focusRole === 'ADC' || focusRole === 'SUPPORT')) {
        if (pick.role !== focusRole) continue;
      }

      const mine = champById(pick.championId);
      if (!mine || !enemyChamp) continue;

      const counter = assessCounter(mine, enemyChamp, locale);
      const personal = personalRecordVs(matches, pick.championId, rival.championId);

      const wrScore = pick.winRate / 100;
      const counterNorm = (counter.score + 2) / 4; // 0..1
      const personalNorm = personal ? personal.winRate / 100 : wrScore;
      const personalWeight = personal && personal.games >= 2 ? 0.2 : 0.05;

      const totalScore =
        wrScore * 0.55 +
        counterNorm * 0.3 +
        personalNorm * personalWeight +
        Math.min(pick.games, 20) * 0.005;

      suggestions.push({
        championId: pick.championId,
        championName: pick.championName,
        role: pick.role,
        winRate: pick.winRate,
        games: pick.games,
        personalWrVsRival: personal?.winRate ?? null,
        personalGamesVsRival: personal?.games ?? 0,
        counterScore: counter.score,
        counterLabel: counter.label,
        counterLabelText: counterLabelText(counter.label, locale),
        reasons: counter.reasons.slice(0, 2),
        totalScore,
      });
    }

    suggestions.sort((a, b) => b.totalScore - a.totalScore);

    const top = suggestions[0];
    const summary = top
      ? locale === 'en'
        ? `Best pool answer to ${rival.championName}: ${top.championName} (WR ${top.winRate}%, ${top.counterLabelText}).`
        : `Mejor respuesta del pool a ${rival.championName}: ${top.championName} (WR ${top.winRate}%, ${top.counterLabelText}).`
      : locale === 'en'
        ? `No strong pool answer yet vs ${rival.championName}.`
        : `Aún no hay respuesta clara del pool vs ${rival.championName}.`;

    return {
      rival,
      suggestions: suggestions.slice(0, 5),
      summary,
    };
  });

  let botLaneNote: string | undefined;
  if (focusRole === 'ADC' || focusRole === 'SUPPORT') {
    const adc = uniqueRivals.find((r) => r.role === 'ADC');
    const sup = uniqueRivals.find((r) => r.role === 'SUPPORT');
    if (adc || sup) {
      botLaneNote =
        locale === 'en'
          ? `Bot lane read: facing ${[adc?.championName, sup?.championName].filter(Boolean).join(' + ') || 'unknown duo'}. Prioritize the lane matchup, then support synergy.`
          : `Lectura bot: vs ${[adc?.championName, sup?.championName].filter(Boolean).join(' + ') || 'dúo desconocido'}. Prioriza el matchup de calle, luego sinergia con support.`;
    } else if (uniqueRivals.length > 0) {
      botLaneNote =
        locale === 'en'
          ? 'Bot roles not tagged yet — using visible enemy picks as provisional rivals.'
          : 'Roles de bot aún no etiquetados — usando picks enemigos visibles como rivales provisionales.';
    }
  }

  return {
    callRoles,
    focusRole,
    rivals: uniqueRivals,
    rivalBlocks,
    botLaneNote,
  };
}
