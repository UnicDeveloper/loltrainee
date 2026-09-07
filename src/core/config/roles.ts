/**
 * Playable coaching roles (excludes UNKNOWN).
 */
export type CoachRole = 'ADC' | 'TOP' | 'JUNGLE' | 'MID' | 'SUPPORT' | 'UNKNOWN';

export type SelectableCoachRole = Exclude<CoachRole, 'UNKNOWN'>;

export const ALL_COACH_ROLES: readonly SelectableCoachRole[] = [
  'ADC',
  'TOP',
  'JUNGLE',
  'MID',
  'SUPPORT',
] as const;

/** Default when the user has not customized priority yet. */
export const DEFAULT_ROLE_PRIORITY: readonly SelectableCoachRole[] = ['ADC', 'TOP', 'JUNGLE'];

export const MIN_ROLE_PRIORITY = 2;
export const MAX_ROLE_PRIORITY = 3;

/** Riot match participant teamPosition / individualPosition → CoachRole */
export function mapRiotPosition(position: string | undefined | null): CoachRole {
  const value = (position ?? '').toUpperCase();
  switch (value) {
    case 'BOTTOM':
    case 'BOT':
    case 'ADC':
      return 'ADC';
    case 'TOP':
      return 'TOP';
    case 'JUNGLE':
    case 'JNG':
      return 'JUNGLE';
    case 'MIDDLE':
    case 'MID':
      return 'MID';
    case 'UTILITY':
    case 'SUPPORT':
      return 'SUPPORT';
    default:
      return 'UNKNOWN';
  }
}

export function rolePriorityScore(
  role: CoachRole,
  priority: readonly SelectableCoachRole[] = DEFAULT_ROLE_PRIORITY,
): number {
  const index = priority.indexOf(role as SelectableCoachRole);
  return index === -1 ? 99 : index;
}

export function isSelectableRole(value: string): value is SelectableCoachRole {
  return (ALL_COACH_ROLES as readonly string[]).includes(value);
}

/**
 * Toggle a role in the priority list.
 * Enforces 2–3 selected roles. Order = selection order (first = highest priority).
 */
export function toggleRolePriority(
  current: readonly SelectableCoachRole[],
  role: SelectableCoachRole,
): SelectableCoachRole[] {
  const exists = current.includes(role);
  if (exists) {
    if (current.length <= MIN_ROLE_PRIORITY) {
      return [...current];
    }
    return current.filter((r) => r !== role);
  }

  if (current.length >= MAX_ROLE_PRIORITY) {
    return [...current];
  }

  return [...current, role];
}

export function normalizeRolePriority(
  input: unknown,
): SelectableCoachRole[] {
  if (!Array.isArray(input)) {
    return [...DEFAULT_ROLE_PRIORITY];
  }

  const cleaned = input.filter(isSelectableRole);
  const unique = [...new Set(cleaned)];

  if (unique.length < MIN_ROLE_PRIORITY) {
    return [...DEFAULT_ROLE_PRIORITY];
  }

  return unique.slice(0, MAX_ROLE_PRIORITY);
}

export function formatRolePriorityLabel(priority: readonly SelectableCoachRole[]): string {
  return priority.join(' → ');
}
