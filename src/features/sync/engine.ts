// One sync cycle. The database arrives as a port, so conflicts can be tested without a network.
import type { Profile } from '../profiles/profiles.ts'
import type { ProgressState } from '../progress/types.ts'
import { type LocalProfile, type Plan, parseRows, reconcile } from './reconcile.ts'

export interface SyncDb {
  fetchRows(): Promise<unknown>
  insert(profile: Profile, progress: ProgressState): Promise<boolean>
  update(profile: Profile, progress: ProgressState, revision: number): Promise<boolean>
  softDelete(profileId: string, revision: number): Promise<boolean>
}

export interface SyncDevice {
  readLocal(): { profiles: LocalProfile[]; pendingDeletes: string[] }
  apply(plan: Plan): void
  confirmDeletes(ids: string[]): void
}

const ATTEMPTS = 3

// Each write checks the revision it read. A lost race rereads and merges again: merging only
// adds, so a retry always converges. Returns false when the retries run out.
export async function syncOnce(db: SyncDb, device: SyncDevice): Promise<boolean> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const rows = parseRows(await db.fetchRows())
    // No await between reading and applying: a change made during the fetch is not lost.
    const { profiles, pendingDeletes } = device.readLocal()
    const plan = reconcile(profiles, rows, pendingDeletes)
    device.apply(plan)

    const results = await Promise.all([
      ...plan.uploads.map((u) =>
        u.revision === null
          ? db.insert(u.profile, u.progress)
          : db.update(u.profile, u.progress, u.revision),
      ),
      ...plan.deletes.map((d) => db.softDelete(d.profileId, d.revision)),
    ])
    if (results.every(Boolean)) {
      device.confirmDeletes(pendingDeletes)
      return true
    }
  }
  return false
}
