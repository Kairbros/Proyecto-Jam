interface AvatarProps {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-24 w-24 text-3xl',
}

export default function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const sz = SIZES[size]
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-violet-700 font-bold text-white ${sz} ${className}`}>
      {src
        ? <img src={src} alt={name} className="h-full w-full object-cover" />
        : (name?.[0]?.toUpperCase() ?? '?')}
    </div>
  )
}
