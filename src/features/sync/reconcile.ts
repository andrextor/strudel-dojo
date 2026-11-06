// What one sync must do, decided without touching the network or storage (spec 10).
import { isBelt } from '../curriculum/belts.ts'
import { type Profile, sameName } from '../profiles/profiles.ts'
import { mergeProgress, parseProgress } from '../progress/persist.ts'
import type { ProgressState } from '../progress/types.ts'

export interface RemoteRow {
  profile_id: string
  name: string
  color: string
  created_at: string
  progress: unknown
  revision: number
  deleted_at: string | null
}

export interface LocalProfile {
  profile: Profile
  progress: ProgressState
}

export interface Upload extends LocalProfile {
  revision: number | null // null: the row does not exist yet
}

export interface Plan {
  kept: LocalProfile[] // what this device holds after the sync
  renames: Record<string, string> // local id → remote id
  removals: string[] // local ids deleted on another device
  uploads: Upload[]
  deletes: { profileId: string; revision: number }[]
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

// Rows come from the network: anything that does not fit is dropped, as in persist.ts.
export function parseRows(raw: unknown): RemoteRow[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((v: unknown) => {
    if (!isObject(v)) return []
    const { profile_id, name, color, created_at, progress, revision, deleted_at } = v
    const valid =
      typeof profile_id === 'string' &&
      typeof name === 'string' &&
      typeof color === 'string' &&
      typeof created_at === 'string' &&
      typeof revision === 'number' &&
      (deleted_at === null || typeof deleted_at === 'string')
    return valid ? [{ profile_id, name, color, created_at, progress, revision, deleted_at }] : []
  })
}

const stable = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(stable)
  if (!isObject(v)) return v
  return Object.fromEntries(
    Object.keys(v)
      .sort()
      .map((k) => [k, stable(v[k])]),
  )
}

const byId = <T extends { id: string }>(items: T[]) =>
  [...items].sort((a, b) => a.id.localeCompare(b.id))

// Prefs, the backup date and guitar settings belong to each device: only shared data is compared,
// or two devices would rewrite each other on every sync. Jsonb also reorders keys.
const shared = (p: ProgressState) =>
  JSON.stringify(
    stable({
      attempts: byId(p.attempts),
      katas: p.katas,
      bosses: p.bosses,
      skillStats: p.skillStats,
      practiceDays: p.practiceDays,
      scrolls: byId(p.scrolls),
      deletedScrolls: p.deletedScrolls ?? {},
      guitarBest: p.guitar?.best ?? {},
    }),
  )

export const sameProgress = (a: ProgressState, b: ProgressState) => shared(a) === shared(b)

export function reconcile(
  local: LocalProfile[],
  remote: RemoteRow[],
  pendingDeletes: string[],
): Plan {
  const plan: Plan = { kept: [], renames: {}, removals: [], uploads: [], deletes: [] }
  const claimed = new Set<string>()
  const localIds = new Set(local.map((l) => l.profile.id))

  for (const id of pendingDeletes) {
    const row = remote.find((r) => r.profile_id === id)
    if (row && row.deleted_at === null) {
      plan.deletes.push({ profileId: id, revision: row.revision })
      claimed.add(id)
    }
  }

  for (const item of local) {
    const byOwnId = remote.find((r) => r.profile_id === item.profile.id)
    if (byOwnId?.deleted_at) {
      plan.removals.push(item.profile.id)
      continue
    }
    // Two devices that each created "Iván" hold the same person under different ids.
    const row =
      byOwnId ??
      remote.find(
        (r) =>
          r.deleted_at === null &&
          !claimed.has(r.profile_id) &&
          !localIds.has(r.profile_id) &&
          sameName(r.name, item.profile.name),
      )
    if (row === undefined) {
      plan.kept.push(item)
      plan.uploads.push({ ...item, revision: null })
      continue
    }
    claimed.add(row.profile_id)
    if (row.profile_id !== item.profile.id) plan.renames[item.profile.id] = row.profile_id
    const incoming = parseProgress(row.progress)
    const merged = mergeProgress(item.progress, incoming)
    const profile = { ...item.profile, id: row.profile_id }
    plan.kept.push({ profile, progress: merged })
    if (!sameProgress(merged, incoming)) {
      plan.uploads.push({ profile, progress: merged, revision: row.revision })
    }
  }

  for (const row of remote) {
    const skip = row.deleted_at !== null || claimed.has(row.profile_id)
    if (skip || pendingDeletes.includes(row.profile_id)) continue
    plan.kept.push({
      profile: {
        id: row.profile_id,
        name: row.name,
        color: isBelt(row.color) ? row.color : 'white',
        createdAt: row.created_at,
      },
      progress: parseProgress(row.progress),
    })
  }
  return plan
}
