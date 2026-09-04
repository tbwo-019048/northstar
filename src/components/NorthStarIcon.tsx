/** The NorthStar mark — a four-point star, taller than it is wide. Uses
 * `currentColor` so `text-primary` (or any text color class) controls it. */
export function NorthStarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 28"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 0 L13 11 L20 14 L13 17 L10 28 L7 17 L0 14 L7 11 Z" />
    </svg>
  )
}
