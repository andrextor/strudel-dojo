interface Props {
  value: number
  max: number
  label: string
  showValue?: boolean
}

export default function ProgressBar({ value, max, label, showValue = true }: Props) {
  return (
    <label class="block space-y-1 text-sm">
      <span class="flex justify-between text-dojo-muted">
        <span>{label}</span>
        {showValue && (
          <span>
            {value} de {max}
          </span>
        )}
      </span>
      <progress
        value={value}
        max={max}
        class="block h-2 w-full appearance-none overflow-hidden rounded-full bg-dojo-raised [&::-moz-progress-bar]:bg-dojo-neon [&::-webkit-progress-bar]:bg-dojo-raised [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-dojo-neon"
      />
    </label>
  )
}
