"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ClipboardDocumentCheckIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ClipboardDocumentCheckIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CHECK_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.3 },
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      pathLength: { duration: 0.4, ease: "easeInOut" },
      opacity: { duration: 0.4, ease: "easeInOut" },
    },
  },
};

const ClipboardDocumentCheckIcon = forwardRef<
  ClipboardDocumentCheckIconHandle,
  ClipboardDocumentCheckIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        controls.start("animate");
      }
    },
    [controls, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        controls.start("normal");
      }
    },
    [controls, onMouseLeave]
  );

  return (
    <div
      className={cn('flex items-center justify-center', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M9 4.5V4A1.5 1.5 0 0 1 10.5 2.5h3A1.5 1.5 0 0 1 15 4v.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 4.5Z" />
        <path d="M15 4.75h1.75A1.75 1.75 0 0 1 18.5 6.5v12.75A1.75 1.75 0 0 1 16.75 21H7.25a1.75 1.75 0 0 1-1.75-1.75V6.5A1.75 1.75 0 0 1 7.25 4.75H9" />
        <motion.path
          animate={controls}
          d="M9 13.5 11 15.5 15 11"
          variants={CHECK_VARIANTS}
        />
      </svg>
    </div>
  );
});

ClipboardDocumentCheckIcon.displayName = "ClipboardDocumentCheckIcon";

export { ClipboardDocumentCheckIcon };
