// The only way islands read or write progress. Islands mount with client:only, so storage is
// readable on first render. Every save is broadcast so the header and other tabs follow.
import { useCallback, useEffect, useState } from 'preact/hooks'
import type { Profile, ProfilesState } from '../profiles/profiles.ts'
import {
  loadProfiles,
  loadProgress,
  PROFILES_KEY,
  progressKey,
  removeProgress,
  saveProfiles,
  saveProgress,
  storageFailed,
} from './store.ts'
import type { ProgressState } from './types.ts'

const CHANNEL = 'dojo'

interface Snapshot {
  profiles: ProfilesState
  active: Profile | null
  progress: ProgressState | null
  storageFailed: boolean
}

function read(): Snapshot {
  const profiles = loadProfiles()
  const active = profiles.profiles.find((p) => p.id === profiles.activeProfileId) ?? null
  return {
    profiles,
    active,
    progress: active ? loadProgress(active.id) : null,
    storageFailed: storageFailed(),
  }
}

function openChannel(): BroadcastChannel | null {
  try {
    return new BroadcastChannel(CHANNEL)
  } catch {
    return null
  }
}

export function useProgress() {
  const [snapshot, setSnapshot] = useState(read)
  const [channel] = useState(openChannel)

  useEffect(() => {
    const reload = () => setSnapshot(read())
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === PROFILES_KEY || e.key.startsWith(progressKey(''))) reload()
    }
    channel?.addEventListener('message', reload)
    addEventListener('storage', onStorage)
    return () => {
      channel?.removeEventListener('message', reload)
      removeEventListener('storage', onStorage)
      channel?.close()
    }
  }, [channel])

  const commit = useCallback(() => {
    setSnapshot(read())
    channel?.postMessage('changed')
  }, [channel])

  // Reads fresh from storage before changing, so two islands never overwrite each other.
  const updateProgress = useCallback(
    (change: (current: ProgressState) => ProgressState) => {
      const { active, progress } = read()
      if (active === null || progress === null) return
      saveProgress(active.id, change(progress))
      commit()
    },
    [commit],
  )

  const updateProfiles = useCallback(
    (change: (current: ProfilesState) => ProfilesState) => {
      const before = loadProfiles()
      const after = change(before)
      for (const p of before.profiles) {
        if (!after.profiles.some((x) => x.id === p.id)) removeProgress(p.id)
      }
      saveProfiles(after)
      commit()
    },
    [commit],
  )

  // Writes progress for any profile, e.g. restoring a backup as a new profile.
  const writeProgress = useCallback(
    (profileId: string, progress: ProgressState) => {
      saveProgress(profileId, progress)
      commit()
    },
    [commit],
  )

  return { ...snapshot, updateProgress, updateProfiles, writeProgress }
}
