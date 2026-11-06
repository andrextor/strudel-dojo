// When to sync and what state it is in. Failing here never blocks the app: data stays local.
import { DIRTY_EVENT, loadSyncMark, saveSyncMark } from '../progress/store.ts'
import { cloudDb, currentEmail, hasSession, syncConfigured } from './client.ts'
import { browserDevice } from './device.ts'
import { syncOnce } from './engine.ts'

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error'

const DEBOUNCE_MS = 10_000
const RETURN_THROTTLE_MS = 60_000

let state: SyncState = 'off'
let running: Promise<void> | null = null
let started = false
let timer: ReturnType<typeof setTimeout> | undefined
let lastRun = 0
const listeners = new Set<(s: SyncState) => void>()

const setState = (next: SyncState) => {
  state = next
  for (const listener of listeners) listener(next)
}

export function subscribeSync(listener: (s: SyncState) => void) {
  listeners.add(listener)
  listener(state)
  return () => {
    listeners.delete(listener)
  }
}

async function cycle() {
  if ((await currentEmail()) === null) return setState('off')
  if (!navigator.onLine) return setState('offline')
  setState('syncing')
  // Cleared first: a change made during the sync marks it dirty again and is not lost.
  saveSyncMark({ ...loadSyncMark(), dirty: false })
  try {
    const done = await syncOnce(await cloudDb(), browserDevice)
    if (!done) throw new Error('retries exhausted')
    saveSyncMark({ ...loadSyncMark(), lastSyncedAt: new Date().toISOString() })
    setState('idle')
  } catch {
    saveSyncMark({ ...loadSyncMark(), dirty: true })
    setState(navigator.onLine ? 'error' : 'offline')
  }
}

export function runSync(): Promise<void> {
  lastRun = Date.now()
  running ??= (
    'locks' in navigator
      ? navigator.locks.request('dojo-sync', { ifAvailable: true }, (lock) =>
          lock ? cycle() : undefined,
        )
      : cycle()
  ).finally(() => {
    running = null
  })
  return running
}

export function startSync() {
  if (!syncConfigured || !hasSession()) return
  void runSync()
  if (started) return
  started = true

  window.addEventListener(DIRTY_EVENT, () => {
    clearTimeout(timer)
    timer = setTimeout(() => void runSync(), DEBOUNCE_MS)
  })
  window.addEventListener('online', () => {
    if (loadSyncMark().dirty) void runSync()
    else setState('idle')
  })
  window.addEventListener('offline', () => setState('offline'))
  document.addEventListener('visibilitychange', () => {
    const { dirty } = loadSyncMark()
    if (document.visibilityState === 'hidden') {
      if (dirty) void runSync()
    } else if (dirty || Date.now() - lastRun > RETURN_THROTTLE_MS) {
      void runSync()
    }
  })
}

export function stopSync() {
  clearTimeout(timer)
  setState('off')
}
