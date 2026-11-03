// The only place (with lib/storage.ts) that touches localStorage.
import { readItem, removeItem, writeItem } from '../../lib/storage.ts'
import { type ProfilesState, parseProfiles } from '../profiles/profiles.ts'
import { emptyProgress, parseProgress } from './persist.ts'
import type { ProgressState } from './types.ts'

export const PROFILES_KEY = 'dojo_profiles_v1'
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

export const loadProfiles = (): ProfilesState => parseProfiles(readJson(PROFILES_KEY))
export const saveProfiles = (state: ProfilesState) => writeJson(PROFILES_KEY, state)

export function loadProgress(profileId: string): ProgressState {
  const raw = readJson(progressKey(profileId))
  return raw === null ? emptyProgress() : parseProgress(raw)
}

export const saveProgress = (profileId: string, progress: ProgressState) =>
  writeJson(progressKey(profileId), progress)

export const removeProgress = (profileId: string) => removeItem(progressKey(profileId))
