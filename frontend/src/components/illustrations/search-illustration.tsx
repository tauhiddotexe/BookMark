export function SearchIllustration({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 160"
      className={className}
      role="img"
      aria-label="Search books"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
        <circle cx="80" cy="70" r="32" />
        <line x1="104" y1="94" x2="132" y2="122" strokeWidth="2" opacity="0.7" />
        <rect x="138" y="48" width="14" height="50" rx="3" strokeWidth="1.2" opacity="0.4" transform="rotate(15 145 73)" />
        <rect x="152" y="42" width="14" height="54" rx="3" strokeWidth="1.2" opacity="0.5" transform="rotate(10 159 69)" />
        <rect x="166" y="38" width="14" height="58" rx="3" strokeWidth="1.2" opacity="0.6" transform="rotate(5 173 67)" />
        <rect x="180" y="35" width="14" height="62" rx="3" strokeWidth="1.2" opacity="0.4" transform="rotate(-5 187 66)" />
        <line x1="50" y1="42" x2="50" y2="98" strokeWidth="1" opacity="0.3" />
        <line x1="110" y1="42" x2="110" y2="98" strokeWidth="1" opacity="0.3" />
        <line x1="42" y1="50" x2="118" y2="50" strokeWidth="1" opacity="0.3" />
      </g>
    </svg>
  )
}
