import type { CoachRole } from '@/core/config/roles';
import type { DDragonChampion } from '@/core/riot/types';

/**
 * Expert-leaning counter knowledge:
 * 1) archetype matrix from DDragon tags/stats
 * 2) curated hard-counter pairs (name-based, patch-agnostic heuristics)
 *
 * Scores are in roughly [-2, +2]. Positive = `mine` is favored into `enemy`.
 */

export type CombatArchetype =
  | 'ranged_dps'
  | 'burst_assassin'
  | 'juggernaut'
  | 'tank'
  | 'poke_mage'
  | 'enchanter'
  | 'engage_support'
  | 'skirmisher'
  | 'unknown';

const HARD_COUNTERS: Readonly<Record<string, readonly string[]>> = {
  // mine → list of enemies mine is strong into
  Malphite: ['Yasuo', 'Yone', 'Tryndamere', 'Fiora', 'Camille'],
  Renekton: ['Yasuo', 'Riven', 'Irelia', 'Akali', 'Kennen'],
  Garen: ['Yasuo', 'Riven', 'Illaoi', 'Darius'],
  Nasus: ['Darius', 'Tryndamere', 'Jax'],
  Quinn: ['Darius', 'Nasus', 'DrMundo', 'Sion', 'Ornn'],
  Vayne: ['Nasus', 'DrMundo', 'ChoGath', 'Sion', 'Ornn'],
  Jax: ['Yasuo', 'Riven', 'Irelia', 'Aatrox'],
  Poppy: ['Yasuo', 'Irelia', 'Camille', 'Riven'],
  Ornn: ['Yasuo', 'Yone', 'Fiora'],
  Camille: ['Nasus', 'Ornn', 'Sion', 'ChoGath'],
  Fiora: ['Garen', 'DrMundo', 'ChoGath', 'Sion', 'Ornn'],

  Ezreal: ['Jhin', 'Ashe', 'Varus', 'Caitlyn'],
  Jinx: ['Ashe', 'Jhin', 'Varus'],
  Jhin: ['KaiSa', 'Samira', 'Nilah'],
  Caitlyn: ['Ashe', 'Jinx', 'Sivir', 'Ezreal'],
  KaiSa: ['Jinx', 'Twitch', 'KogMaw'],
  Twitch: ['Caitlyn', 'Ashe', 'Jhin'],
  Samira: ['Jinx', 'Twitch', 'KogMaw'],

  Ekko: ['Karthus', 'TwistedFate', 'Viktor'],
  LeeSin: ['Karthus', 'MasterYi', 'Kayn'],
  Graves: ['MasterYi', 'Belveth', 'Kayn'],
  Elise: ['Karthus', 'MasterYi'],

  Annie: ['Yasuo', 'Zed', 'Talon'],
  Malzahar: ['Yasuo', 'Zed', 'Fizz', 'Kassadin'],
  Lissandra: ['Fizz', 'Zed', 'Yasuo', 'LeBlanc'],

  Lulu: ['Nautilus', 'Leona', 'Rell', 'Blitzcrank'],
  Janna: ['Nautilus', 'Leona', 'Rell', 'Nami'],
  Nautilus: ['Lux', 'Brand', 'Xerath', 'Velkoz'],
  Leona: ['Lux', 'Brand', 'Soraka', 'Sona'],
  Thresh: ['Lux', 'Brand', 'Xerath'],
  Pyke: ['Soraka', 'Sona', 'Yuumi', 'Nami'],
};

const HARD_COUNTERED_BY: Readonly<Record<string, readonly string[]>> = {
  // mine → enemies that hard-counter mine
  Yasuo: ['Malphite', 'Renekton', 'Poppy', 'Annie', 'Malzahar'],
  Yone: ['Malphite', 'Renekton', 'Poppy'],
  Darius: ['Quinn', 'Vayne', 'Kayle', 'Gwen'],
  Nasus: ['Vayne', 'Quinn', 'Camille', 'Fiora'],
  Tryndamere: ['Malphite', 'Renekton', 'Jax', 'Quinn'],
  MasterYi: ['LeeSin', 'Graves', 'Elise', 'Rammus'],

  Jinx: ['Draven', 'Lucian', 'Tristana', 'Samira'],
  Ezreal: ['Draven', 'Lucian', 'Tristana', 'Samira'],
  KaiSa: ['Caitlyn', 'Draven', 'Xayah'],

  Lux: ['Nautilus', 'Leona', 'Pyke', 'Blitzcrank'],
  Brand: ['Nautilus', 'Leona', 'Pyke'],
  Soraka: ['Pyke', 'Blitzcrank', 'Nautilus', 'Leona'],
};

function normalizeName(name: string): string {
  return name.replace(/['.\s]/g, '');
}

export function classifyArchetype(champ: DDragonChampion): CombatArchetype {
  const tags = new Set(champ.tags);
  const { attack, defense, magic } = champ.info;

  if (tags.has('Support') && tags.has('Tank')) return 'engage_support';
  if (tags.has('Support') && magic >= attack) return 'enchanter';
  if (tags.has('Support')) return 'engage_support';

  if (tags.has('Assassin')) return 'burst_assassin';
  if (tags.has('Tank') && defense >= 7) return 'tank';
  if (tags.has('Fighter') && defense >= 6 && attack >= 6) return 'juggernaut';
  if (tags.has('Fighter')) return 'skirmisher';
  if (tags.has('Marksman')) return 'ranged_dps';
  if (tags.has('Mage') && magic >= 7) return 'poke_mage';
  if (tags.has('Mage')) return 'poke_mage';

  return 'unknown';
}

const ARCHETYPE_EDGE: Readonly<Record<CombatArchetype, Partial<Record<CombatArchetype, number>>>> = {
  ranged_dps: {
    juggernaut: 1.1,
    tank: 0.8,
    skirmisher: 0.3,
    burst_assassin: -1.0,
    poke_mage: -0.2,
  },
  burst_assassin: {
    poke_mage: 0.9,
    ranged_dps: 0.7,
    enchanter: 0.6,
    tank: -0.8,
    juggernaut: -0.4,
  },
  juggernaut: {
    skirmisher: 0.5,
    poke_mage: -0.4,
    ranged_dps: -0.9,
    tank: 0.2,
  },
  tank: {
    burst_assassin: 0.7,
    skirmisher: 0.4,
    ranged_dps: -0.6,
    poke_mage: -0.3,
  },
  poke_mage: {
    juggernaut: 0.6,
    skirmisher: 0.4,
    burst_assassin: -0.8,
    engage_support: -0.2,
  },
  enchanter: {
    poke_mage: 0.3,
    ranged_dps: 0.2,
    engage_support: -0.9,
    burst_assassin: -0.5,
  },
  engage_support: {
    enchanter: 1.0,
    poke_mage: 0.7,
    ranged_dps: 0.2,
    burst_assassin: -0.3,
  },
  skirmisher: {
    poke_mage: 0.3,
    ranged_dps: -0.2,
    tank: -0.3,
    juggernaut: -0.2,
  },
  unknown: {},
};

export interface CounterAssessment {
  score: number;
  label: 'strong' | 'even' | 'weak';
  reasons: string[];
}

export function assessCounter(
  mine: DDragonChampion,
  enemy: DDragonChampion,
  locale: 'en' | 'es',
): CounterAssessment {
  const en = locale === 'en';
  const reasons: string[] = [];
  let score = 0;

  const myName = normalizeName(mine.name);
  const enemyName = normalizeName(enemy.name);

  const hard = HARD_COUNTERS[myName];
  if (hard?.some((n) => normalizeName(n) === enemyName)) {
    score += 1.4;
    reasons.push(
      en
        ? `Expert note: ${mine.name} is a classic answer to ${enemy.name}.`
        : `Nota experta: ${mine.name} es respuesta clásica a ${enemy.name}.`,
    );
  }

  const weak = HARD_COUNTERED_BY[myName];
  if (weak?.some((n) => normalizeName(n) === enemyName)) {
    score -= 1.4;
    reasons.push(
      en
        ? `Expert note: ${enemy.name} traditionally pressures ${mine.name}.`
        : `Nota experta: ${enemy.name} suele presionar a ${mine.name}.`,
    );
  }

  // Also check reverse hard-counter list (enemy hard-counters me listed under enemy's HARD_COUNTERS)
  const enemyHard = HARD_COUNTERS[enemyName];
  if (enemyHard?.some((n) => normalizeName(n) === myName)) {
    score -= 1.2;
    reasons.push(
      en
        ? `${enemy.name} often wins the pattern into ${mine.name}.`
        : `${enemy.name} suele ganar el patrón contra ${mine.name}.`,
    );
  }

  const myArch = classifyArchetype(mine);
  const enemyArch = classifyArchetype(enemy);
  const edge = ARCHETYPE_EDGE[myArch]?.[enemyArch] ?? 0;
  if (edge !== 0) {
    score += edge;
    reasons.push(
      en
        ? `Archetype edge: ${myArch.replace(/_/g, ' ')} vs ${enemyArch.replace(/_/g, ' ')} (${edge > 0 ? '+' : ''}${edge.toFixed(1)}).`
        : `Arquetipo: ${myArch.replace(/_/g, ' ')} vs ${enemyArch.replace(/_/g, ' ')} (${edge > 0 ? '+' : ''}${edge.toFixed(1)}).`,
    );
  }

  // Stat profile nudge
  const rangeBias =
    (mine.tags.includes('Marksman') || mine.tags.includes('Mage') ? 1 : 0) -
    (enemy.tags.includes('Marksman') || enemy.tags.includes('Mage') ? 1 : 0);
  if (rangeBias !== 0 && Math.abs(edge) < 0.8) {
    score += rangeBias * 0.25;
  }

  const defenseGap = mine.info.defense - enemy.info.attack;
  if (defenseGap >= 3) {
    score += 0.25;
    reasons.push(
      en ? 'Your defense rating absorbs their threat profile.' : 'Tu defensa absorbe bien su amenaza.',
    );
  } else if (defenseGap <= -3) {
    score -= 0.25;
  }

  const clamped = Math.max(-2, Math.min(2, score));
  const label: CounterAssessment['label'] =
    clamped >= 0.55 ? 'strong' : clamped <= -0.55 ? 'weak' : 'even';

  if (reasons.length === 0) {
    reasons.push(
      en
        ? 'No sharp expert edge — decide with your WR and comfort.'
        : 'Sin edge experto claro — decide con WR y comfort.',
    );
  }

  return { score: Number(clamped.toFixed(2)), label, reasons };
}

export function counterLabelText(
  label: CounterAssessment['label'],
  locale: 'en' | 'es',
): string {
  if (locale === 'es') {
    if (label === 'strong') return 'FAVORABLE';
    if (label === 'weak') return 'DESFAVORABLE';
    return 'PAREJO';
  }
  if (label === 'strong') return 'STRONG';
  if (label === 'weak') return 'WEAK';
  return 'EVEN';
}

export function rolesForLaneContext(role: CoachRole): CoachRole[] {
  if (role === 'ADC' || role === 'SUPPORT') {
    return ['ADC', 'SUPPORT'];
  }
  return [role];
}
