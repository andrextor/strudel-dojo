import { buttonClass } from '../../components/ui/button.ts'

// Shown by any island that needs an active profile when there is none.
export default function NeedProfile() {
  return (
    <section class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6">
      <p class="text-lg">Elige quién entrena para guardar tu progreso.</p>
      <a href="/" class={buttonClass('primary')}>
        Elegir perfil
      </a>
    </section>
  )
}
