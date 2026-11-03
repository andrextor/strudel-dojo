// Local profiles on a shared, trusted device: no passwords (docs/specs/05).
import { type Rng, randomId } from '../../lib/random.ts'
import { type BeltColor, isBelt } from '../curriculum/belts.ts'

export interface Profile {
  id: string
  name: string
  color: BeltColor
  createdAt: string
}

export interface ProfilesState {
  profiles: Profile[]
  activeProfileId: string | null
}

export const NAME_MAX = 24

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export function parseProfile(v: unknown): Profile | null {
  if (!isObject(v) || typeof v.id !== 'string' || typeof v.name !== 'string') return null
  if (!isBelt(v.color) || typeof v.createdAt !== 'string') return null
  return { id: v.id, name: v.name, color: v.color, createdAt: v.createdAt }
}

export function parseProfiles(raw: unknown): ProfilesState {
  if (!isObject(raw) || !Array.isArray(raw.profiles)) return { profiles: [], activeProfileId: null }
  const profiles: Profile[] = []
  for (const item of raw.profiles) {
    const p = parseProfile(item)
    if (p !== null && !profiles.some((x) => x.id === p.id)) profiles.push(p)
  }
  const active = raw.activeProfileId
  const activeProfileId =
    typeof active === 'string' && profiles.some((p) => p.id === active) ? active : null
  return { profiles, activeProfileId }
}

export const sameName = (a: string, b: string) =>
  a.localeCompare(b, 'es', { sensitivity: 'accent' }) === 0

export function createProfile(
  state: ProfilesState,
  name: string,
  color: BeltColor,
  now: Date,
  rng: Rng,
): { ok: true; state: ProfilesState; profile: Profile } | { ok: false; error: string } {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (clean.length === 0) return { ok: false, error: 'Escribe un nombre.' }
  if (clean.length > NAME_MAX) {
    return { ok: false, error: `El nombre puede tener hasta ${NAME_MAX} caracteres.` }
  }
  if (state.profiles.some((p) => sameName(p.name, clean))) {
    return { ok: false, error: 'Ya hay un perfil con ese nombre.' }
  }
  const profile: Profile = { id: randomId(rng), name: clean, color, createdAt: now.toISOString() }
  return {
    ok: true,
    profile,
    state: { profiles: [...state.profiles, profile], activeProfileId: profile.id },
  }
}

export function removeProfile(state: ProfilesState, id: string): ProfilesState {
  return {
    profiles: state.profiles.filter((p) => p.id !== id),
    activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
  }
}

export function setActive(state: ProfilesState, id: string | null): ProfilesState {
  if (id !== null && !state.profiles.some((p) => p.id === id)) return state
  return { ...state, activeProfileId: id }
}
