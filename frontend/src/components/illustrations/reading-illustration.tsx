export function ReadingIllustration({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 280 200"
      className={className}
      role="img"
      aria-label="Person reading a book"
    >
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
        <path d="M140 60 L140 170" strokeWidth="1.5" opacity="0.3" />
        <path d="M100 170 Q140 160 180 170" strokeWidth="1.5" opacity="0.3" />
        <circle cx="140" cy="45" r="18" strokeWidth="2" />
        <path d="M125 50 Q130 58 140 58 Q150 58 155 50" strokeWidth="1.5" />
        <path d="M120 65 L160 65 L155 100 L145 100 L140 85 L135 100 L125 100 Z" strokeWidth="1.5" />
        <path d="M130 95 L115 115 L115 155 L125 145 L140 155 L155 145 L165 155 L165 115 L150 95" strokeWidth="1.5" />
        <path d="M185 80 Q200 75 210 85 Q220 95 215 110" strokeWidth="1.5" opacity="0.4" />
        <path d="M195 70 Q210 65 220 75 Q230 85 225 100" strokeWidth="1.5" opacity="0.3" />
        <path d="M95 100 Q80 90 70 100 Q60 110 65 125" strokeWidth="1.5" opacity="0.4" />
      </g>
    </svg>
  )
}
