export function ScopeLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle ring */}
      <circle cx="50" cy="50" r="46" stroke="url(#goldGrad)" strokeWidth="3" fill="none" />

      {/* S letter - Gold */}
      <text
        x="22"
        y="62"
        fontFamily="Georgia, serif"
        fontSize="48"
        fontWeight="bold"
        fill="url(#goldGrad)"
        letterSpacing="-2"
      >
        S
      </text>

      {/* M letter - Silver */}
      <text
        x="50"
        y="62"
        fontFamily="Georgia, serif"
        fontSize="38"
        fontWeight="bold"
        fill="url(#silverGrad)"
        letterSpacing="-2"
      >
        M
      </text>

      {/* Bar chart bars */}
      <rect x="38" y="68" width="5" height="10" rx="1" fill="url(#silverGrad)" opacity="0.9" />
      <rect x="45" y="63" width="5" height="15" rx="1" fill="url(#silverGrad)" opacity="0.9" />
      <rect x="52" y="58" width="5" height="20" rx="1" fill="url(#goldGrad)" opacity="0.9" />

      {/* Arrow tip */}
      <polyline
        points="38,68 52,55 62,62"
        stroke="url(#goldGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5c518" />
          <stop offset="50%" stopColor="#d4a017" />
          <stop offset="100%" stopColor="#c8860a" />
        </linearGradient>
        <linearGradient id="silverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="50%" stopColor="#b0b0b0" />
          <stop offset="100%" stopColor="#888888" />
        </linearGradient>
      </defs>
    </svg>
  );
}
