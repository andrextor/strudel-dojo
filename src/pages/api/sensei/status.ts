import type { APIRoute } from 'astro'
import { claudeClient, json } from '../../../lib/claude.ts'

export const prerender = false

// Tells the UI whether to show the Sensei buttons, without exposing anything else.
export const GET: APIRoute = () => json({ enabled: claudeClient() !== null })
