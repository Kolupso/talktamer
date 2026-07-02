import type { Gender } from '../types/db'

const STYLE: Record<Gender, { symbol: string; color: string; label: string }> = {
  man: { symbol: '♂', color: '#3b82f6', label: 'man' },
  woman: { symbol: '♀', color: '#ec4899', label: 'woman' },
  enby: { symbol: '⚧', color: '#a855f7', label: 'enby' },
}

export default function GenderBadge({ gender }: { gender: Gender }) {
  const s = STYLE[gender]
  return (
    <span
      title={s.label}
      style={{
        display: 'inline-block',
        minWidth: '1.4em',
        textAlign: 'center',
        color: s.color,
        fontWeight: 700,
      }}
    >
      {s.symbol}
    </span>
  )
}
