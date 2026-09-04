'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { CheckIcon, CopyIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

/**
 * Preformatted code, a config payload, a curl snippet, a revealed secret.
 *
 * ```tsx
 * <CodeBlock language="json" copyable>{prettyJson(config)}</CodeBlock>
 * <CodeBlock variant="terminal" wrap copyable label="API key">{key}</CodeBlock>
 * ```
 *
 * ## The `terminal` variant is theme-invariant, and that is the feature
 *
 * It paints `--code` / `--on-code`, the one pair in the palette that does not
 * flip between light and dark. This is where the dashboard app's `.reveal-token`
 * rule lands , the surface a one-time API key is shown on.
 *
 * A revealed secret is the only string in the product that has to be transcribed
 * *exactly*, and pinning the surface means the characters that are easy to
 * confuse are the same characters in both themes. It also makes the block read as
 * "not part of the page", which is the right signal for content you are being
 * shown once. The pair measures 12.95:1.
 *
 * ## There is deliberately no highlighter here
 *
 * `language` emits `data-language` and the conventional `language-*` class, and
 * stops. Shiki and Prism are 100 kB-plus and a design system must not force that
 * on a consumer whose only code block is a four-line curl command. Anything that
 * attaches to `.language-json` works unchanged; nothing has to be re-wired if a
 * consumer later adds one.
 *
 * ## What it does NOT do: mask a secret behind a Reveal button
 *
 * Considered and left out. A mask is only meaningful for a value the server can
 * send again , and the case this replaces is a key shown exactly once, where
 * hiding it behind a click adds a step and protects nothing (it is already in the
 * DOM). A component that offers `secret` would invite it onto values where the
 * mask is theatre.
 */
const codeBlockVariants = cva(
  [
    'relative overflow-auto rounded-md font-mono text-xs leading-relaxed',
    // A scrollable region must be reachable by keyboard (WCAG 2.1.1) , hence the
    // `tabIndex={0}` below. Without it a mouse user can read a long snippet and a
    // keyboard user cannot scroll it at all. This is axe's
    // `scrollable-region-focusable`, and it needs real layout to detect, so no
    // unit test will ever catch its absence.
    'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
  ],
  {
    variants: {
      variant: {
        /** The default: an inset well on the surrounding surface. */
        panel: 'border border-border bg-bg2 control-recessed p-3 text-fg',
        /** The pinned dark surface. See the docblock. */
        terminal: 'bg-code p-3 text-on-code',
      },
      wrap: {
        /**
         * `break-all`, not `break-words`: a 64-character opaque key has no word
         * boundaries to break on, so `break-words` leaves it overflowing. The
         * cost is that prose inside a wrapped block breaks mid-word, which is
         * why this is opt-in rather than the default.
         */
        true: 'break-all whitespace-pre-wrap',
        false: 'whitespace-pre',
      },
    },
    defaultVariants: { variant: 'panel', wrap: false },
  },
);

export interface CodeBlockProps
  extends Omit<React.ComponentProps<'pre'>, 'children'>, VariantProps<typeof codeBlockVariants> {
  /** The code. A string, so the copy button has something exact to copy. */
  children: string;
  /** Emitted as `data-language` and `language-*`, for an optional highlighter. */
  language?: string;
  /** Show the copy button. */
  copyable?: boolean;
  /**
   * Names the block for assistive tech, and captions it when a header is shown.
   * Worth setting whenever a page has more than one: "code" is not a useful
   * announcement, and the copy button's name becomes "Copy API key".
   */
  label?: string;
}

function CodeBlock({
  className,
  children,
  variant,
  wrap,
  language,
  copyable = false,
  label,
  ...props
}: CodeBlockProps) {
  return (
    <div data-slot="code-block" className={cn('group/code relative', className)}>
      {copyable && (
        <CopyButton
          value={children}
          label={label}
          className={cn(
            'absolute end-2 top-2 z-raised',
            // Tinted from the token rather than from a literal `white/10`, so the
            // hover wash stays on the same surface's own axis.
            variant === 'terminal' && 'text-on-code hover:bg-on-code/10 hover:text-on-code',
          )}
        />
      )}
      <pre
        // See the note in the cva base: a scrollable region needs to be
        // focusable, and this one scrolls by construction.
        tabIndex={0}
        role={label ? 'region' : undefined}
        aria-label={label}
        data-slot="code-block-pre"
        data-language={language}
        className={cn(
          codeBlockVariants({ variant, wrap }),
          // Room for the button, but only on the first line , `pe-12` on the
          // whole block would indent every line of a long snippet.
          copyable && '[&>code]:inline-block [&>code]:pe-10',
        )}
        {...props}
      >
        <code className={language ? `language-${language}` : undefined}>{children}</code>
      </pre>
    </div>
  );
}

/**
 * ## Three things go wrong with a copy button, and two of them are silent
 *
 *  1. **`navigator.clipboard` is undefined on an insecure origin.** It is a
 *     secure-context API, so the whole object , not just the method , is absent
 *     over plain http, which is exactly how a staging box on a LAN IP gets
 *     reached. Unguarded, the button throws a TypeError on click and appears to
 *     do nothing at all. Here it falls through to a stated instruction to copy
 *     by hand, which is the honest outcome: the browser will not let the page do
 *     it, and pretending otherwise is how someone walks away without their key.
 *  2. **The label changes under a focused button.** Swapping "Copy" for "Copied"
 *     renames the element the user is standing on; several screen readers
 *     re-announce the whole control, and some announce nothing because the
 *     accessible name changed without a focus event. The name here is constant
 *     and the confirmation goes to a separate live region , which is also the
 *     only way a non-visual user learns the copy succeeded at all.
 *  3. **The reset timer outlives the component.** Copy, navigate away, and
 *     `setState` fires on an unmounted tree. Cleared on unmount below.
 */
function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    clearTimeout(timer.current);
    try {
      // Presence-checked, not optional-chained: on an insecure origin the whole
      // `clipboard` object is absent, so `?.writeText()` would resolve to
      // `undefined` and the success branch would run on a copy that never
      // happened , the one failure worse than throwing.
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('manual');
    }
    timer.current = setTimeout(() => setState('idle'), 2000);
  }, [value]);

  return (
    <>
      <button
        type="button"
        data-slot="code-block-copy"
        // Constant, deliberately , see point 2 in the docblock.
        aria-label={label ? `Copy ${label}` : 'Copy code'}
        onClick={copy}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-7', className)}
      >
        {state === 'copied' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      </button>
      {/*
       * `aria-live` on a permanently-mounted, initially-empty region. A region
       * that is added to the DOM already containing its message is frequently
       * not announced , the observer has nothing to observe a change to.
       */}
      <span aria-live="polite" className="sr-only">
        {state === 'copied' && 'Copied to clipboard'}
        {state === 'manual' && 'Copying is unavailable here , select the text and press Ctrl+C'}
      </span>
    </>
  );
}

export { CodeBlock, codeBlockVariants };
