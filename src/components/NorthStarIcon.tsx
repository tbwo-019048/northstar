/** The NorthStar mark — an eight-point compass rose (long cardinal points, short
 * diagonals) inside a broken double ring, faceted so it reads as a solid object.
 * Fixed navy tones (not `currentColor`); sized by `className`. */
export function NorthStarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* broken outer ring */}
      <path
        d="M12 2.4A9.6 9.6 0 0 1 21.6 12"
        fill="none"
        stroke="#1b2d47"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M12 21.6A9.6 9.6 0 0 1 2.4 12"
        fill="none"
        stroke="#1b2d47"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* short diagonal star */}
      <path
        d="M17.3 6.7 13.8 12 17.3 17.3 12 13.8 6.7 17.3 10.2 12 6.7 6.7 12 10.2Z"
        fill="#16293f"
      />
      {/* long cardinal star — lit left half / shaded right half */}
      <path d="M12 1.5 12 22.5 10.44 13.56 1.5 12 10.44 10.44Z" fill="#26406a" />
      <path d="M12 1.5 13.56 10.44 22.5 12 13.56 13.56 12 22.5Z" fill="#142338" />
      {/* hub */}
      <circle cx="12" cy="12" r="1.6" fill="#32517f" />
    </svg>
  )
}
