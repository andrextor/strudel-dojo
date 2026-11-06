// The Supabase client, loaded on demand: without a session nobody downloads it (spec 10).
import type { SupabaseClient } from '@supabase/supabase-js'
import { readItem } from '../../lib/storage.ts'
import type { Profile } from '../profiles/profiles.ts'
import type { ProgressState } from '../progress/types.ts'
import type { SyncDb } from './engine.ts'

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined
const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined
const AUTH_KEY = 'dojo_auth_v1'
const TABLE = 'profile_progress'
const COLUMNS = 'profile_id,name,color,created_at,progress,revision,deleted_at'

export const syncConfigured = Boolean(url && key)
export const hasSession = () => readItem(AUTH_KEY) !== null

let client: Promise<SupabaseClient> | null = null

function getClient(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url ?? '', key ?? '', {
      auth: { storageKey: AUTH_KEY, persistSession: true, detectSessionInUrl: false },
    }),
  )
  return client
}

export type CodeResult = { ok: true } | { ok: false; error: string }

function codeError(code: string | undefined): string {
  switch (code) {
    case 'otp_expired':
      return 'Ese código no es válido o ya venció. Pide otro.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Demasiados intentos. Espera unos minutos y vuelve a probar.'
    case 'otp_disabled':
    case 'signup_disabled':
    case 'user_not_found':
      return 'Ese correo no tiene una cuenta en este dojo.'
    default:
      return 'No se pudo conectar. Revisa tu conexión e intenta de nuevo.'
  }
}

export async function sendCode(email: string): Promise<CodeResult> {
  const { auth } = await getClient()
  const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
  return error ? { ok: false, error: codeError(error.code) } : { ok: true }
}

export async function verifyCode(email: string, token: string): Promise<CodeResult> {
  const { auth } = await getClient()
  const { error } = await auth.verifyOtp({ email, token, type: 'email' })
  return error ? { ok: false, error: codeError(error.code) } : { ok: true }
}

export async function currentEmail(): Promise<string | null> {
  const { auth } = await getClient()
  const { data } = await auth.getSession()
  return data.session?.user.email ?? null
}

// Local only: data on this device stays, and other devices keep their session.
export async function signOut(): Promise<void> {
  const { auth } = await getClient()
  await auth.signOut({ scope: 'local' })
}

const fields = (profile: Profile, progress: ProgressState) => ({
  name: profile.name,
  color: profile.color,
  progress,
})

export async function cloudDb(): Promise<SyncDb> {
  const supabase = await getClient()
  const table = () => supabase.from(TABLE)
  const wrote = ({
    data,
    error,
  }: {
    data: unknown[] | null
    error: { message: string } | null
  }) => {
    if (error) throw new Error(error.message)
    return (data?.length ?? 0) > 0
  }
  return {
    async fetchRows() {
      const { data, error } = await table().select(COLUMNS)
      if (error) throw new Error(error.message)
      return data
    },
    async insert(profile, progress) {
      const { error } = await table().insert({
        ...fields(profile, progress),
        profile_id: profile.id,
        created_at: profile.createdAt,
      })
      if (error?.code === '23505') return false // another device got there first
      if (error) throw new Error(error.message)
      return true
    },
    async update(profile, progress, revision) {
      return wrote(
        await table()
          .update({ ...fields(profile, progress), revision: revision + 1 })
          .eq('profile_id', profile.id)
          .eq('revision', revision)
          .select('profile_id'),
      )
    },
    async softDelete(profileId, revision) {
      return wrote(
        await table()
          .update({ deleted_at: new Date().toISOString(), progress: {}, revision: revision + 1 })
          .eq('profile_id', profileId)
          .eq('revision', revision)
          .select('profile_id'),
      )
    },
  }
}
