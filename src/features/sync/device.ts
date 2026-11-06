// This device's side of a sync: reads and writes localStorage and tells the islands to reload.
import {
  applyRemoteProfiles,
  applyRemoteProgress,
  dropLocalProgress,
  loadProfiles,
  loadProgress,
  loadSyncMark,
  saveSyncMark,
} from '../progress/store.ts'
import type { SyncDevice } from './engine.ts'
import { sameProgress } from './reconcile.ts'

function announce() {
  try {
    const channel = new BroadcastChannel('dojo')
    channel.postMessage('changed')
    channel.close()
  } catch {
    // Without BroadcastChannel the new data shows on the next page.
  }
}

export const browserDevice: SyncDevice = {
  readLocal() {
    const profiles = loadProfiles().profiles.map((profile) => ({
      profile,
      progress: loadProgress(profile.id),
    }))
    return { profiles, pendingDeletes: loadSyncMark().pendingDeletes }
  },

  apply(plan) {
    const state = loadProfiles()
    let changed = plan.removals.length > 0 || Object.keys(plan.renames).length > 0
    for (const { profile, progress } of plan.kept) {
      const known = state.profiles.some((p) => p.id === profile.id)
      if (!known || !sameProgress(loadProgress(profile.id), progress)) changed = true
      applyRemoteProgress(profile.id, progress)
    }
    for (const id of [...plan.removals, ...Object.keys(plan.renames)]) dropLocalProgress(id)
    const active = state.activeProfileId
    const moved = active === null ? null : (plan.renames[active] ?? active)
    applyRemoteProfiles({
      profiles: plan.kept.map((k) => k.profile),
      activeProfileId: plan.kept.some((k) => k.profile.id === moved) ? moved : null,
    })
    if (changed) announce()
  },

  confirmDeletes(ids) {
    const mark = loadSyncMark()
    saveSyncMark({
      ...mark,
      pendingDeletes: mark.pendingDeletes.filter((id) => !ids.includes(id)),
    })
  },
}
