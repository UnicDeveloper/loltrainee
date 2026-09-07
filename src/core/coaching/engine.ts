import {
  DEFAULT_ROLE_PRIORITY,
  rolePriorityScore,
  type CoachRole,
  type SelectableCoachRole,
} from '@/core/config/roles';
import type { DDragonChampion, PoolChampion, StoredMatchSummary } from '@/core/riot/types';

export interface MatchupInsight {
  enemyChampionId: number;
  enemyChampionName: string;
  summary: string;
  focus: string;
}

export interface GamePlan {
  role: CoachRole;
  championName: string;
  priorities: string[];
  contextualTips: string[];
}

export interface DraftAdvice {
  recommended: PoolChampion[];
  matchups: MatchupInsight[];
  gamePlan: GamePlan | null;
}

function inferRoleFromTags(tags: string[]): CoachRole {
  if (tags.includes('Marksman')) return 'ADC';
  if (tags.includes('Fighter') || tags.includes('Tank')) return 'TOP';
  if (tags.includes('Assassin')) return 'JUNGLE';
  if (tags.includes('Mage')) return 'MID';
  if (tags.includes('Support')) return 'SUPPORT';
  return 'UNKNOWN';
}

/**
 * Coaching content derived from Riot/Data Dragon stats + the player's own history.
 * No static hardcoded matchup encyclopedia.
 */
export function buildDraftAdvice(input: {
  pool: PoolChampion[];
  matches: StoredMatchSummary[];
  champions: Record<string, DDragonChampion>;
  assignedRole?: CoachRole;
  myChampionId?: number;
  enemyChampionIds?: number[];
  locale: 'en' | 'es';
  rolePriority?: readonly SelectableCoachRole[];
}): DraftAdvice {
  const {
    pool,
    matches,
    champions,
    assignedRole,
    myChampionId,
    enemyChampionIds = [],
    locale,
    rolePriority = DEFAULT_ROLE_PRIORITY,
  } = input;

  const likelyRole = pickLikelyRole(pool, matches, rolePriority);
  // Prefer a real champ-select assignment only when a pick exists.
  const assigned =
    assignedRole && assignedRole !== 'UNKNOWN' && myChampionId ? assignedRole : undefined;

  const maxPriorityIndex = Math.max(rolePriority.length - 1, 0);
  const focusRole = assigned ?? likelyRole;

  const recommended = pool
    .filter(
      (p) =>
        p.role === focusRole || rolePriorityScore(p.role, rolePriority) <= maxPriorityIndex,
    )
    .sort((a, b) => {
      const roleDelta =
        rolePriorityScore(a.role, rolePriority) - rolePriorityScore(b.role, rolePriority);
      if (roleDelta !== 0) return roleDelta;
      return b.score - a.score;
    })
    .slice(0, 8);

  const poolChampForPlan =
    (myChampionId
      ? pool.find((p) => p.championId === myChampionId)
      : undefined) ?? recommended[0];

  const myChamp =
    (myChampionId
      ? Object.values(champions).find((c) => Number(c.key) === myChampionId)
      : undefined) ??
    (poolChampForPlan
      ? Object.values(champions).find((c) => Number(c.key) === poolChampForPlan.championId)
      : undefined);

  // Game plan role must match the champion being coached — never "Ezreal · TOP".
  const planRole: CoachRole =
    assigned ??
    (poolChampForPlan?.role && poolChampForPlan.role !== 'UNKNOWN'
      ? poolChampForPlan.role
      : undefined) ??
    (myChamp ? inferRoleFromTags(myChamp.tags) : undefined) ??
    focusRole;

  const matchups = enemyChampionIds
    .map((id) => {
      const enemy = Object.values(champions).find((c) => Number(c.key) === id);
      if (!enemy || !myChamp) return null;
      return buildMatchup(myChamp, enemy, matches, locale);
    })
    .filter((m): m is MatchupInsight => m !== null);

  const gamePlan = buildGamePlan({
    role: planRole,
    myChamp,
    matches,
    poolChamp: poolChampForPlan,
    locale,
  });

  return { recommended, matchups, gamePlan };
}

function pickLikelyRole(
  pool: PoolChampion[],
  matches: StoredMatchSummary[],
  rolePriority: readonly SelectableCoachRole[],
): CoachRole {
  const counts: Partial<Record<CoachRole, number>> = {};
  for (const m of matches) {
    counts[m.role] = (counts[m.role] ?? 0) + 1;
  }
  for (const p of pool) {
    counts[p.role] = (counts[p.role] ?? 0) + 1;
  }

  let best: CoachRole = rolePriority[0] ?? 'ADC';
  let bestScore = -1;
  const candidates: CoachRole[] = [...rolePriority, 'MID', 'SUPPORT', 'ADC', 'TOP', 'JUNGLE'];
  for (const role of candidates) {
    const games = counts[role] ?? 0;
    const score = games * 10 - rolePriorityScore(role, rolePriority);
    if (score > bestScore) {
      bestScore = score;
      best = role;
    }
  }
  return best;
}

function buildMatchup(
  mine: DDragonChampion,
  enemy: DDragonChampion,
  matches: StoredMatchSummary[],
  locale: 'en' | 'es',
): MatchupInsight {
  const myAttack = mine.info.attack;
  const enemyBurst = Math.max(enemy.info.attack, enemy.info.magic);
  const myDefense = mine.info.defense;
  const laneDiff = myAttack + myDefense - enemyBurst;

  const historyVsTag = matches.filter((m) => m.championName === mine.name);
  const personalWr =
    historyVsTag.length > 0
      ? historyVsTag.filter((m) => m.win).length / historyVsTag.length
      : null;

  const en = locale === 'en';
  let summary: string;
  let focus: string;

  if (laneDiff >= 2) {
    summary = en
      ? `${mine.name} stats favor trading vs ${enemy.name} (attack/defense vs their threat).`
      : `Las stats de ${mine.name} favorecen tradear vs ${enemy.name}.`;
    focus = en
      ? 'Look for short trades when their key spell is down. Convert plates if ahead.'
      : 'Busca trades cortos cuando su hechizo clave esté en CD. Convierte placas si vas adelante.';
  } else if (laneDiff <= -2) {
    summary = en
      ? `${enemy.name} has higher threat profile than ${mine.name} in raw DDragon ratings.`
      : `${enemy.name} tiene más amenaza relativa que ${mine.name} según ratings de DDragon.`;
    focus = en
      ? 'Play for farm and wave control. Avoid extended fights until item spike.'
      : 'Prioriza farm y control de oleada. Evita peleas largas hasta tu spike de ítems.';
  } else {
    summary = en
      ? `Even matchup profile between ${mine.name} and ${enemy.name} based on champion ratings.`
      : `Matchup parejo entre ${mine.name} y ${enemy.name} según ratings.`;
    focus = en
      ? 'Win through spacing and CS discipline rather than all-ins.'
      : 'Gana con spacing y disciplina de CS, no con all-ins forzados.';
  }

  if (personalWr !== null) {
    const pct = Math.round(personalWr * 100);
    summary += en
      ? ` Your recent WR on ${mine.name}: ${pct}%.`
      : ` Tu WR reciente con ${mine.name}: ${pct}%.`;
  }

  if (enemy.tags.includes('Assassin')) {
    focus += en
      ? ' Respect roam/flank windows; track missing mid/jg.'
      : ' Respeta ventanas de roam/flank; trackea mid/jg faltantes.';
  }

  return {
    enemyChampionId: Number(enemy.key),
    enemyChampionName: enemy.name,
    summary,
    focus,
  };
}

function buildGamePlan(input: {
  role: CoachRole;
  myChamp?: DDragonChampion;
  matches: StoredMatchSummary[];
  poolChamp?: PoolChampion;
  locale: 'en' | 'es';
}): GamePlan | null {
  const { role, myChamp, matches, poolChamp, locale } = input;
  if (!myChamp && !poolChamp) {
    return null;
  }

  const name = myChamp?.name ?? poolChamp?.championName ?? 'Champion';
  const roleMatches = matches.filter((m) => m.role === role);
  const avgCs =
    roleMatches.length > 0
      ? roleMatches.reduce((s, m) => s + m.csPerMin, 0) / roleMatches.length
      : poolChamp?.avgCsPerMin ?? 0;
  const avgDeaths =
    roleMatches.length > 0
      ? roleMatches.reduce((s, m) => s + m.deaths, 0) / roleMatches.length
      : 5;
  const en = locale === 'en';

  const priorities: string[] = [];
  const tips: string[] = [];

  if (role === 'ADC') {
    priorities.push(
      en ? `Hit ${Math.max(6.5, avgCs + 0.4).toFixed(1)} CS/min by 15` : `Llega a ${Math.max(6.5, avgCs + 0.4).toFixed(1)} CS/min a los 15`,
    );
    priorities.push(en ? 'Survive lane — fewer than 3 deaths by 15' : 'Sobrevive la lane — menos de 3 muertes a los 15');
    priorities.push(en ? 'Be present for second dragon with bot wave pushed' : 'Presencia en segundo dragón con oleada bot pusheada');
    tips.push(
      en
        ? 'Your job is consistent DPS, not first blood. Trade only with support.'
        : 'Tu trabajo es DPS consistente, no first blood. Tradea solo con support.',
    );
  } else if (role === 'TOP') {
    priorities.push(
      en ? `Wave management: crash 3rd wave, then reset` : `Oleadas: crashea la 3ra, luego reset`,
    );
    priorities.push(
      en ? `CS target ${Math.max(6.0, avgCs + 0.3).toFixed(1)}/min` : `Objetivo CS ${Math.max(6.0, avgCs + 0.3).toFixed(1)}/min`,
    );
    priorities.push(en ? 'Track TP windows before herald/dragon' : 'Trackea ventanas de TP antes de heraldo/dragón');
    tips.push(
      en
        ? 'Win lane through plates and TP impact, not ego fights.'
        : 'Gana con placas e impacto de TP, no con peleas de ego.',
    );
  } else if (role === 'JUNGLE') {
    priorities.push(en ? 'Full clear → first scuttle contest decision' : 'Full clear → decisión de scuttle');
    priorities.push(en ? 'Play for prioritized role (ADC/Top) on first mid-game objective' : 'Juega para el rol priorizado (ADC/Top) en el primer objetivo');
    priorities.push(en ? 'Keep death count ≤ your recent average' : 'Mantén muertes ≤ tu promedio reciente');
    tips.push(
      en
        ? 'Only path toward winning lanes. Vertical jungling when bot is priority.'
        : 'Path solo hacia lanes ganadoras. Jungla vertical si bot es prioridad.',
    );
  } else {
    priorities.push(en ? 'Convert your spike into a tower or objective' : 'Convierte tu spike en torre u objetivo');
    priorities.push(en ? 'Limit deaths below your recent average' : 'Limita muertes bajo tu promedio reciente');
  }

  if (avgDeaths > 6) {
    tips.push(
      en
        ? `Recent avg deaths (${avgDeaths.toFixed(1)}) are high — first mid-game focus is positioning.`
        : `Tu promedio de muertes (${avgDeaths.toFixed(1)}) es alto — foco mid-game: positioning.`,
    );
  }

  if (avgCs > 0 && avgCs < 6) {
    tips.push(
      en
        ? `CS/min (${avgCs.toFixed(1)}) is below Challenger lane standard — farm is objective #1.`
        : `CS/min (${avgCs.toFixed(1)}) está bajo estándar Challenger — farm es objetivo #1.`,
    );
  }

  const tags = myChamp?.tags ?? [];
  const inferred = inferRoleFromTags(tags);
  if (inferred !== 'UNKNOWN' && inferred !== role) {
    tips.push(
      en
        ? `${name} tags (${tags.join(', ')}) often flex; commit to ${role} win condition this game.`
        : `Los tags de ${name} (${tags.join(', ')}) suelen flexear; comprométete a la wincon de ${role}.`,
    );
  }

  return {
    role,
    championName: name,
    priorities,
    contextualTips: tips,
  };
}

export function buildInGameTips(input: {
  role: CoachRole;
  objectives: string[];
  gamePlan: GamePlan | null;
  locale: 'en' | 'es';
}): string[] {
  const tips: string[] = [...input.objectives];
  if (input.gamePlan) {
    tips.push(...input.gamePlan.priorities.slice(0, 2));
    tips.push(...input.gamePlan.contextualTips.slice(0, 2));
  }
  if (tips.length === 0) {
    tips.push(
      input.locale === 'en'
        ? 'Set a session objective before the next lobby.'
        : 'Define un objetivo de sesión antes del próximo lobby.',
    );
  }
  return tips.slice(0, 5);
}
