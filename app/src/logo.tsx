import { useId } from "react";

/** O V do Voxix com o X no meio (o mesmo desenho do ícone do app). */
export function Logo({ tam = 40, className = "" }: { tam?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" width={tam} height={tam} className={className} role="img" aria-label="Voxix">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-neon)" />
          <stop offset="1" stopColor="var(--color-magenta)" />
        </linearGradient>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 16 50 88 86 16" stroke={`url(#g${id})`} strokeWidth="13" />
        <path d="M34 36 66 68 M66 36 34 68" stroke="#fff" strokeWidth="8" opacity=".92" />
      </g>
    </svg>
  );
}
