import { BELT_NAME_ES } from '../curriculum/belts.ts'
import type { Module } from '../curriculum/schema.ts'
import BeltCeremony from './BeltCeremony.tsx'

interface Props {
  module: Module
  curriculum: Module[]
  onContinue: () => void
}

export default function EarnedBelt({ module, curriculum, onContinue }: Props) {
  const next = curriculum.find((m) => m.order === module.order + 1)
  return (
    <BeltCeremony
      belt={module.belt}
      order={module.order}
      next={
        next
          ? `Ahora vas por el cinturón ${BELT_NAME_ES[next.belt].toLowerCase()}: ${next.title}.`
          : null
      }
      onContinue={onContinue}
    />
  )
}
