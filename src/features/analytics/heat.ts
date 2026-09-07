import type { CoachRole } from '@/core/config/roles';

/**
 * Heat scale: red (poor) → yellow → green → blue (excellent).
 * `t` in [0, 1].
 */
export function heatColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const hue =
    clamped < 0.66 ? (clamped / 0.66) * 120 : 120 + ((clamped - 0.66) / 0.34) * 85;
  const lightness = 52 + clamped * 6;
  return `hsl(${hue.toFixed(1)} 78% ${lightness.toFixed(1)}%)`;
}

export function kdaRatio(kills: number, deaths: number, assists: number): number {
  return (kills + assists) / Math.max(deaths, 1);
}

/** Normalize KDA ratio: ~0.5 poor, ~2 ok, ~4+ excellent. */
export function heatFromKda(ratio: number): string {
  const t = Math.max(0, Math.min(1, (ratio - 0.4) / 4.2));
  return heatColor(t);
}

/**
 * Role-aware CS/min heat.
 * Support farms little; lane roles target Challenger-ish standards.
 */
export function heatFromCsPerMin(csPerMin: number, role: CoachRole): string {
  let min = 4;
  let max = 9.5;

  switch (role) {
    case 'SUPPORT':
      min = 0.4;
      max = 2.2;
      break;
    case 'JUNGLE':
      min = 4.5;
      max = 8.5;
      break;
    case 'ADC':
    case 'MID':
    case 'TOP':
      min = 5;
      max = 9.5;
      break;
    default:
      min = 4;
      max = 9;
  }

  const t = Math.max(0, Math.min(1, (csPerMin - min) / (max - min)));
  return heatColor(t);
}

/** Absolute CS heat — softer, duration-agnostic bands by role. */
export function heatFromCs(cs: number, role: CoachRole): string {
  let min = 80;
  let max = 280;

  switch (role) {
    case 'SUPPORT':
      min = 8;
      max = 55;
      break;
    case 'JUNGLE':
      min = 90;
      max = 240;
      break;
    default:
      min = 100;
      max = 300;
  }

  const t = Math.max(0, Math.min(1, (cs - min) / (max - min)));
  return heatColor(t);
}

/** Win rate heat: <40% poor, ~50% ok, 60%+ strong, 70%+ elite. */
export function heatFromWinRate(winRatePercent: number): string {
  const t = Math.max(0, Math.min(1, (winRatePercent - 30) / 45));
  return heatColor(t);
}

export function resultTone(win: boolean): 'win' | 'loss' {
  return win ? 'win' : 'loss';
}
