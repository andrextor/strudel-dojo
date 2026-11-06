import type { Status } from '../../components/ui/StatusBadge.tsx'
import type { StageStatus, UnitStatus } from '../progress/types.ts'

export const STAGE_STATUS: Record<StageStatus, { status: Status; label: string }> = {
  locked: { status: 'locked', label: 'Bloqueada' },
  available: { status: 'in-progress', label: 'Disponible' },
  boss_ready: { status: 'in-progress', label: 'Combate listo' },
  passed: { status: 'passed', label: 'Aprobada' },
}

export const UNIT_STATUS: Record<UnitStatus, { status: Status; label: string }> = {
  locked: { status: 'locked', label: 'Bloqueada' },
  needs_theory: { status: 'locked', label: 'Falta teoría' },
  not_started: { status: 'not-started', label: 'Sin empezar' },
  in_progress: { status: 'in-progress', label: 'En progreso' },
  passed: { status: 'passed', label: 'Aprobada' },
}
