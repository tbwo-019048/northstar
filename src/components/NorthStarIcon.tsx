/** The NorthStar mark — a four-point star with concave edges (the "shine"
 * silhouette), on a square canvas so it centres against the wordmark. Uses
 * `currentColor`, so `text-primary` (or any text colour class) controls it. */
export function NorthStarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 1.5C12.8 7.6 16.4 11.2 22.5 12 16.4 12.8 12.8 16.4 12 22.5 11.2 16.4 7.6 12.8 1.5 12 7.6 11.2 11.2 7.6 12 1.5Z" />
    </svg>
  )
}
