import type { Locale } from '@/core/i18n/messages';
import type { SelectableCoachRole } from '@/core/config/roles';
import type { DraftCallAdvice } from '@/core/coaching/draftCall';
import {
  personalAnalyticsToPromptBlock,
  type PersonalAnalyticsReport,
} from '@/core/coaching/personalAnalytics';
import type { PoolChampion, StoredMatchSummary } from '@/core/riot/types';
import type { CoachingSession } from '@/core/coaching/sessionCoach';

export function buildAiSystemPrompt(locale: Locale): string {
  const lang = locale === 'es' ? 'Spanish' : 'English';
  return [
    'You are LoL Coach, a high-level League of Legends coaching assistant.',
    'Audience: players aiming up to Challenger fundamentals.',
    `Respond in ${lang}.`,
    'Rules:',
    '- Coaching and learning only. Never automate gameplay.',
    '- Never suggest cheats, scripts, pixel-bots, or fog-of-war abuse.',
    '- Never invent enemy cooldowns, jungle pathing, or info the player cannot legitimately know.',
    '- Prefer concrete, measurable next actions (CS/min, death caps, wave goals).',
    '- Use the provided player data as ground truth; if data is thin, say so.',
    '- Keep answers tight: short bullets + one clear focus for the next game.',
  ].join('\n');
}

export function buildAiContextPayload(input: {
  riotId: string;
  rolePriority: readonly SelectableCoachRole[];
  matches: StoredMatchSummary[];
  pool: PoolChampion[];
  personal: PersonalAnalyticsReport;
  session: CoachingSession | null;
  draftCall: DraftCallAdvice | null;
}): string {
  const recent = input.matches
    .slice(0, 8)
    .map(
      (m) =>
        `${m.championName}/${m.role} ${m.win ? 'W' : 'L'} ${m.kills}/${m.deaths}/${m.assists} CS/m ${m.csPerMin}`,
    )
    .join('\n');

  const pool = input.pool
    .slice(0, 10)
    .map((p) => `${p.championName} ${p.role} WR ${p.winRate}% KDA ${p.avgKda} CS/m ${p.avgCsPerMin}`)
    .join('\n');

  const sessionBlock = input.session?.active
    ? [
        `Active session since ${new Date(input.session.startedAt).toISOString()}`,
        `Next focus: ${input.session.nextFocus.join(' | ')}`,
        `Objectives: ${input.session.objectivesSnapshot.join(' | ') || 'none'}`,
      ].join('\n')
    : 'No active session';

  const draftBlock = input.draftCall
    ? [
        `Call roles: ${input.draftCall.callRoles.roles.join(', ')}`,
        `Focus role: ${input.draftCall.focusRole}`,
        `Rivals: ${input.draftCall.rivals.map((r) => `${r.championName}${r.role ? `(${r.role})` : ''}`).join(', ') || 'none'}`,
      ].join('\n')
    : 'No draft call context';

  return [
    `Player: ${input.riotId || 'unknown'}`,
    `Role priority: ${input.rolePriority.join(' > ')}`,
    '',
    '=== PERSONAL ANALYTICS ===',
    personalAnalyticsToPromptBlock(input.personal),
    '',
    '=== POOL ===',
    pool || 'empty',
    '',
    '=== RECENT MATCHES ===',
    recent || 'empty',
    '',
    '=== SESSION ===',
    sessionBlock,
    '',
    '=== DRAFT ===',
    draftBlock,
  ].join('\n');
}
