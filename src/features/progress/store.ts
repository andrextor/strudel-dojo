// The only place (with lib/storage.ts) that touches localStorage.
import { readItem, removeItem, writeItem } from '../../lib/storage.ts'
import { type ProfilesState, parseProfiles } from '../profiles/profiles.ts'
import { emptyProgress, parseProgress } from './persist.ts'
import type { ProgressState } from './types.ts'

export const PROFILES_KEY = 'dojo_profiles_v1'
export const SYNC_KEY = 'dojo_sync_v1'
export const DIRTY_EVENT = 'dojo:dirty'
export const progressKey = (profileId: string) => `dojo_progress_v1:${profileId}`

let failed = false

// True once any write has failed; the UI shows its "progress is not being saved" notice once.
export const storageFailed = () => failed

function readJson(key: string): unknown {
  const raw = readItem(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  if (!writeItem(key, JSON.stringify(value))) failed = true
}

export interface SyncMark {
  dirty: boolean
  pendingDeletes: string[]
  lastSyncedAt: string | null
}

export function loadSyncMark(): SyncMark {
  const raw = readJson(SYNC_KEY)
  const v = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    dirty: v.dirty === true,
    pendingDeletes: Array.isArray(v.pendingDeletes)
      ? v.pendingDeletes.filter((x) => typeof x === 'string')
      : [],
    lastSyncedAt: typeof v.lastSyncedAt === 'string' ? v.lastSyncedAt : null,
  }
}

export const saveSyncMark = (mark: SyncMark) => writeJson(SYNC_KEY, mark)

function markDirty(deleted?: string) {
  const mark = loadSyncMark()
  saveSyncMark({
    ...mark,
    dirty: true,
    pendingDeletes: deleted ? [...mark.pendingDeletes, deleted] : mark.pendingDeletes,
  })
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DIRTY_EVENT))
}

export const loadProfiles = (): ProfilesState => parseProfiles(readJson(PROFILES_KEY))
export function saveProfiles(state: ProfilesState) {
  writeJson(PROFILES_KEY, state)
  markDirty()
}

export function loadProgress(profileId: string): ProgressState {
  const raw = readJson(progressKey(profileId))
  return raw === null ? emptyProgress() : parseProgress(raw)
}

export function saveProgress(profileId: string, progress: ProgressState) {
  writeJson(progressKey(profileId), progress)
  markDirty()
}

export function removeProgress(profileId: string) {
  removeItem(progressKey(profileId))
  markDirty(profileId)
}

// What came from the cloud does not count as a local change: it must not be uploaded back.
export const applyRemoteProfiles = (state: ProfilesState) => writeJson(PROFILES_KEY, state)
export const applyRemoteProgress = (profileId: string, progress: ProgressState) =>
  writeJson(progressKey(profileId), progress)
export const dropLocalProgress = (profileId: string) => removeItem(progressKey(profileId))
