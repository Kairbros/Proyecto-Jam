// Lightweight inline SVG icon set (stroke = currentColor). Replaces emojis
// across the app for a consistent, modern look.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { filled?: boolean }

const base = (props: SVGProps<SVGSVGElement>) => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  ...props,
})

export function SearchIcon(p: IconProps) {
  return <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
}

export function BellIcon(p: IconProps) {
  return <svg {...base(p)}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
}

export function HeartIcon({ filled, ...p }: IconProps) {
  return <svg {...base(p)} fill={filled ? 'currentColor' : 'none'}><path d="M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0 0 12 5.5 4.5 4.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z" /></svg>
}

export function CommentIcon(p: IconProps) {
  return <svg {...base(p)}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-1L3 20l1.1-4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" /></svg>
}

export function ImageIcon(p: IconProps) {
  return <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
}

export function TrophyIcon(p: IconProps) {
  return <svg {...base(p)}><path d="M6 4h12v4a6 6 0 0 1-12 0Z" /><path d="M6 6H4a2 2 0 0 0 0 4h2M18 6h2a2 2 0 0 1 0 4h-2M9 20h6M12 14v6" /></svg>
}

export function PackageIcon(p: IconProps) {
  return <svg {...base(p)}><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></svg>
}

export function BallotIcon(p: IconProps) {
  return <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8 12 3 3 5-6" /></svg>
}

export function MegaphoneIcon(p: IconProps) {
  return <svg {...base(p)}><path d="m3 11 14-7v16L3 13v5H7l1.5 3" /><path d="M17 8a3 3 0 0 1 0 6" /></svg>
}

export function LinkIcon(p: IconProps) {
  return <svg {...base(p)}><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></svg>
}

export function GlobeIcon(p: IconProps) {
  return <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></svg>
}

export function UserPlusIcon(p: IconProps) {
  return <svg {...base(p)}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M18 8v6M21 11h-6" /></svg>
}

export function UsersIcon(p: IconProps) {
  return <svg {...base(p)}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M17 4.5a4 4 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3" /></svg>
}

export function DocumentIcon(p: IconProps) {
  return <svg {...base(p)}><path d="M14 3v5h5" /><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7Z" /><path d="M9 13h6M9 17h6" /></svg>
}

export function CheckCircleIcon(p: IconProps) {
  return <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
}

export function MailIcon(p: IconProps) {
  return <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
}

export function GamepadIcon(p: IconProps) {
  return <svg {...base(p)}><path d="M6 12H4M5 11v2M15.5 11.5h.01M18 13.5h.01" /><rect x="2" y="6" width="20" height="12" rx="5" /></svg>
}

export function PlusIcon(p: IconProps) {
  return <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
}

export function SunIcon(p: IconProps) {
  return <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
}

export function MoonIcon(p: IconProps) {
  return <svg {...base(p)}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
}

export function CalendarIcon(p: IconProps) {
  return <svg {...base(p)}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
}

// Brand mark — jam jar icon for Mermelada.
export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center bg-violet-500 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-3/5 w-3/5 text-white" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {/* Lid */}
        <path d="M9 4h6v3H9z" fill="currentColor" stroke="none" />
        <path d="M7 7h10" />
        {/* Jar body */}
        <path d="M7 7v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" />
        {/* Jam surface wavy line */}
        <path d="M9 13c.8-.7 1.5-.7 2.5 0s1.7.7 2.5 0" />
      </svg>
    </span>
  )
}
