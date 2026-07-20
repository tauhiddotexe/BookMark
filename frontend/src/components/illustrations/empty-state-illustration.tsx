export function EmptyStateIllustration({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 160"
      className={className}
      role="img"
      aria-label="Empty state"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
        <rect x="65" y="30" width="90" height="110" rx="6" />
        <line x1="85" y1="55" x2="135" y2="55" opacity="0.5" />
        <line x1="85" y1="70" x2="120" y2="70" opacity="0.3" />
        <line x1="85" y1="85" x2="130" y2="85" opacity="0.3" />
        <line x1="85" y1="100" x2="115" y2="100" opacity="0.3" />
        <circle cx="155" cy="135" r="20" opacity="0.6" />
        <line x1="170" y1="150" x2="190" y2="170" strokeWidth="2" opacity="0.5" />
      </g>
    </svg>
  )
}
