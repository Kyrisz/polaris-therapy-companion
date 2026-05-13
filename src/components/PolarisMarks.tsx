type MarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

// (Removed) Pip puffy silhouette — Pip now uses the same star outline as the splash.

function RoundedFourPointStarPath() {
  // A true 4-point star (N/E/S/W) with slightly rounded tips.
  // Hand-tuned for a 24x24 viewBox.
  return (
    <path
      d="M12 2.7
         C12.7 2.7 13.05 3.15 13.18 3.6
         L14.55 8.45
         C14.62 8.7 14.8 8.88 15.05 8.95
         L19.9 10.32
         C20.35 10.45 20.8 10.8 20.8 11.5
         C20.8 12.2 20.35 12.55 19.9 12.68
         L15.05 14.05
         C14.8 14.12 14.62 14.3 14.55 14.55
         L13.18 19.4
         C13.05 19.85 12.7 20.3 12 20.3
         C11.3 20.3 10.95 19.85 10.82 19.4
         L9.45 14.55
         C9.38 14.3 9.2 14.12 8.95 14.05
         L4.1 12.68
         C3.65 12.55 3.2 12.2 3.2 11.5
         C3.2 10.8 3.65 10.45 4.1 10.32
         L8.95 8.95
         C9.2 8.88 9.38 8.7 9.45 8.45
         L10.82 3.6
         C10.95 3.15 11.3 2.7 12 2.7Z"
      fill="currentColor"
      opacity="0.95"
    />
  );
}

function RoundedFourPointStarOutlinePath() {
  // Outline version of the same star used on the splash.
  return (
    <path
      d="M12 2.7
         C12.7 2.7 13.05 3.15 13.18 3.6
         L14.55 8.45
         C14.62 8.7 14.8 8.88 15.05 8.95
         L19.9 10.32
         C20.35 10.45 20.8 10.8 20.8 11.5
         C20.8 12.2 20.35 12.55 19.9 12.68
         L15.05 14.05
         C14.8 14.12 14.62 14.3 14.55 14.55
         L13.18 19.4
         C13.05 19.85 12.7 20.3 12 20.3
         C11.3 20.3 10.95 19.85 10.82 19.4
         L9.45 14.55
         C9.38 14.3 9.2 14.12 8.95 14.05
         L4.1 12.68
         C3.65 12.55 3.2 12.2 3.2 11.5
         C3.2 10.8 3.65 10.45 4.1 10.32
         L8.95 8.95
         C9.2 8.88 9.38 8.7 9.45 8.45
         L10.82 3.6
         C10.95 3.15 11.3 2.7 12 2.7Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  );
}

export function PolarisStarMark({ size = 20, className, title }: MarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <RoundedFourPointStarPath />
      <path
        d="M12 5.4l0.95 3.35 3.35 0.95-3.35 0.95L12 14.95l-0.95-3.35-3.35-0.95 3.35-0.95L12 5.4z"
        fill="rgba(255,255,255,0.55)"
      />
    </svg>
  );
}

export function PipStar({ size = 24, className, title = "Pip" }: MarkProps) {
  return (
    <span className={`pip-star ${className || ""}`} aria-label={title} role="img">
      <svg
        className="pip-star-mark"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        <RoundedFourPointStarOutlinePath />
      </svg>
      <span className="pip-face" aria-hidden="true">
        <span className="pip-eye" />
        <span className="pip-eye" />
      </span>
    </span>
  );
}

export function PolarisCompassMark({ size = 24, className, title }: MarkProps) {
  const ring = 11;
  const c = 12;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <circle cx={c} cy={c} r={ring} fill="none" stroke="currentColor" opacity="0.35" strokeWidth="1.2" />
      <path d="M12 1.8v2.1M12 20.1v2.1M1.8 12h2.1M20.1 12h2.1" stroke="currentColor" opacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
      <RoundedFourPointStarPath />
      <path d="M12 2.4l1.05 2.2h-2.1L12 2.4z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function PolarisLogoMark({ size = 24, className, title }: MarkProps) {
  // Inspired by the concept: 4-point star + compass arcs + dot markers.
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}

      {/* Outer compass arcs */}
      <path
        d="M6.2 6.4a8.2 8.2 0 0 1 11.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.38"
      />
      <path
        d="M17.8 17.6a8.2 8.2 0 0 1-11.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.38"
      />
      <path
        d="M6.0 17.2a8.2 8.2 0 0 1 0-10.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.28"
      />
      <path
        d="M18.0 6.8a8.2 8.2 0 0 1 0 10.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.28"
      />

      {/* Dot markers */}
      <circle cx="17.2" cy="9.1" r="0.85" fill="currentColor" opacity="0.5" />
      <circle cx="17.2" cy="14.9" r="0.85" fill="currentColor" opacity="0.5" />
      <circle cx="6.8" cy="9.1" r="0.85" fill="currentColor" opacity="0.5" />
      <circle cx="6.8" cy="14.9" r="0.85" fill="currentColor" opacity="0.5" />

      {/* Core star */}
      <RoundedFourPointStarPath />

      {/* Small inner sparkle */}
      <path
        d="M12 7.3l0.7 2.4 2.4 0.7-2.4 0.7L12 13.2l-0.7-2.4-2.4-0.7 2.4-0.7L12 7.3z"
        fill="rgba(255,255,255,0.6)"
      />
    </svg>
  );
}

