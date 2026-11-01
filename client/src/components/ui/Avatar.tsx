import { cn } from '../../lib/cn'
import { initials } from '../../lib/initials'

const sizes = { xs: 'size-6 text-[10px]', sm: 'size-7 text-[11px]', md: 'size-8 text-xs', lg: 'size-10 text-sm' }

// Soft, low-saturation fills that sit well on the sage palette.
const fills = ['bg-[#E3EEE7] text-[#2B6A51]', 'bg-[#EDE9DF] text-[#7A6331]', 'bg-[#E4ECF0] text-[#3D6274]', 'bg-[#F1E6E2] text-[#8A4F3F]', 'bg-[#E9E6F0] text-[#5B5078]']

function fillFor(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return fills[h % fills.length]
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string
  size?: keyof typeof sizes
  className?: string
}) {
  const cls = cn('inline-flex shrink-0 items-center justify-center rounded-full font-medium ring-2 ring-surface', sizes[size], className)
  if (src) return <img src={src} alt={name} className={cn(cls, 'object-cover')} />
  return (
    <span role="img" aria-label={name} className={cn(cls, fillFor(name))}>
      {initials(name)}
    </span>
  )
}
