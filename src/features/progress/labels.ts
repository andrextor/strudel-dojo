// Status → badge for the views. The status itself always comes from rules.ts.
import type { Status } from '../../components/ui/StatusBadge.tsx'
import type { TopicStatus } from './types.ts'

export const TOPIC_STATUS: Record<TopicStatus, { status: Status; label: string }> = {
  locked: { status: 'locked', label: 'Bloqueado' },
  not_started: { status: 'not-started', label: 'Sin empezar' },
  in_progress: { status: 'in-progress', label: 'En progreso' },
  passed: { status: 'passed', label: 'Aprobado' },
  passed_by_placement: { status: 'passed', label: 'Aprobado por examen' },
}
