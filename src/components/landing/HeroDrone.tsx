import { useId } from "react";
import { cn } from "@/lib/utils";

type HeroDroneProps = {
  className?: string;
  /** Smaller footprint for mobile strip */
  compact?: boolean;
};

function Propeller({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx},${cy})`}>
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0"
          to="360"
          dur="0.11s"
          repeatCount="indefinite"
        />
        <ellipse cx="0" cy="0" rx="16" ry="5" fill="hsl(var(--primary) / 0.9)" />
        <ellipse cx="0" cy="0" rx="5" ry="16" fill="hsl(var(--primary) / 0.55)" />
      </g>
      <circle
        r="5"
        fill="hsl(var(--muted))"
        stroke="hsl(var(--primary) / 0.4)"
        strokeWidth="1.5"
      />
    </g>
  );
}

/**
 * Top-down quadcopter SVG with SMIL prop spin + CSS patrol motion on the wrapper.
 */
export function HeroDrone({ className, compact }: HeroDroneProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `hero-drone-body-${uid}`;
  const filterId = `hero-drone-glow-${uid}`;

  return (
    <div
      className={cn(
        "hero-drone-wrap pointer-events-none select-none",
        compact ? "hero-drone-patrol-sm" : "hero-drone-patrol",
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 200"
        className={cn(
          "w-full h-full text-primary drop-shadow-[0_12px_28px_hsl(var(--primary)/0.35)]",
          compact && "opacity-95"
        )}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--ocean-light))" />
          </linearGradient>
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* arms */}
        <g stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.35">
          <line x1="100" y1="100" x2="52" y2="52" />
          <line x1="100" y1="100" x2="148" y2="52" />
          <line x1="100" y1="100" x2="52" y2="148" />
          <line x1="100" y1="100" x2="148" y2="148" />
        </g>

        <Propeller cx={52} cy={52} />
        <Propeller cx={148} cy={52} />
        <Propeller cx={52} cy={148} />
        <Propeller cx={148} cy={148} />

        {/* hull */}
        <g filter={`url(#${filterId})`}>
          <rect
            x="78"
            y="86"
            width="44"
            height="28"
            rx="8"
            fill={`url(#${gradId})`}
          />
          <path
            d="M 100 86 L 108 72 L 92 72 Z"
            fill="hsl(var(--primary) / 0.8)"
          />
          <circle cx="100" cy="100" r="6" fill="hsl(var(--primary-foreground) / 0.95)" />
          <circle cx="100" cy="100" r="2.5" fill="hsl(var(--secondary))" />
        </g>

        {/* scan pulse under hull */}
        <ellipse
          cx="100"
          cy="168"
          rx="36"
          ry="10"
          fill="hsl(var(--primary) / 0.25)"
          className="hero-drone-scan-oval"
        />
      </svg>
    </div>
  );
}
