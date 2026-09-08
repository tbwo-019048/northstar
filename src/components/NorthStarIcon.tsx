/** The NorthStar mark — a four-point "shine" star, faceted into four blue
 * planes lit from the top-left so it reads as a solid object rather than a
 * flat icon. Fixed brand blues (not `currentColor`); sized by `className`. */
export function NorthStarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* base plane — covers any sub-pixel seams between the facets */}
      <path
        d="M12 1.5C12.8 7.6 16.4 11.2 22.5 12 16.4 12.8 12.8 16.4 12 22.5 11.2 16.4 7.6 12.8 1.5 12 7.6 11.2 11.2 7.6 12 1.5Z"
        fill="#0a76b4"
      />
      <path d="M12 1.5C11.2 7.6 7.6 11.2 1.5 12L12 12Z" fill="#54afe8" />
      <path d="M12 1.5C12.8 7.6 16.4 11.2 22.5 12L12 12Z" fill="#0d80c4" />
      <path d="M1.5 12C7.6 12.8 11.2 16.4 12 22.5L12 12Z" fill="#0a76b4" />
      <path d="M22.5 12C16.4 12.8 12.8 16.4 12 22.5L12 12Z" fill="#00527f" />
    </svg>
  )
}
