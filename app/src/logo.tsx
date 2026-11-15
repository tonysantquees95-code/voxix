import { useId } from "react";
import { useVisual } from "./useVisual";

/** Desenho oficial do Voxix: V com X no meio, em roxo escuro com contorno vermelho brilhante (igual ao conceito visual). */
function Defs({ id }: { id: string }) {
  // as cores vêm das variáveis do tema (--color-neon e --color-magenta): trocou a cor do app, trocou o emblema
  return (
    <defs>
      <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: "color-mix(in srgb, var(--color-magenta) 88%, #fff)" }} />
        <stop offset=".55" style={{ stopColor: "color-mix(in srgb, var(--color-magenta) 50%, #000)" }} />
        <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--color-magenta) 28%, #000)" }} />
      </linearGradient>
      <filter id={`b${id}`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="3" style={{ floodColor: "var(--color-neon)" }} floodOpacity=".85" /></filter>
    </defs>
  );
}

const MARCA = "M2 4 L40 10 L60 36 L80 10 L118 4 L96 68 L72 68 L60 80 L48 68 L24 68 Z M42 76 L78 76 L60 112 Z";
const X = "M49 42 L71 64 M71 42 L49 64";
const NOME = "M0 0 L12 0 L22 28 L32 0 L44 0 L28 40 L16 40 Z M60 0 L88 0 L96 8 L96 32 L88 40 L60 40 L52 32 L52 8 Z M66 10 L82 10 L84 12 L84 28 L82 30 L66 30 L64 28 L64 12 Z M104 0 L116 0 L126 15 L136 0 L148 0 L132 20 L148 40 L136 40 L126 25 L116 40 L104 40 L120 20 Z M156 0 L168 0 L168 40 L156 40 Z M176 0 L188 0 L198 15 L208 0 L220 0 L204 20 L220 40 L208 40 L198 25 L188 40 L176 40 L192 20 Z";

function Desenho({ id }: { id: string }) {
  return (
    <g>
      <path d={MARCA} fill={`url(#g${id})`} style={{ stroke: "var(--color-neon)" }} strokeWidth="3" strokeLinejoin="round" filter={`url(#b${id})`} />
      <path d={X} style={{ stroke: "var(--color-neon)" }} strokeWidth="11" strokeLinecap="square" fill="none" />
      <path d={X} style={{ stroke: "color-mix(in srgb, var(--color-magenta) 28%, #000)" }} strokeWidth="5.5" strokeLinecap="square" fill="none" />
    </g>
  );
}

/** Só o V com X (ícone). */
export function Logo({ tam = 40, className = "" }: { tam?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="-6 -2 130 120" width={tam} height={(tam * 120) / 130} className={className} role="img" aria-label="Voxix">
      <Defs id={id} />
      <Desenho id={id} />
    </svg>
  );
}

/** O nome VOXIX em letras angulares, como no conceito. */
export function NomeVoxix({ largura = 200, className = "" }: { largura?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="-8 -8 236 56" width={largura} height={(largura * 56) / 236} className={className} role="img" aria-label="Voxix">
      <Defs id={id} />
      <path d={NOME} fill={`url(#g${id})`} style={{ stroke: "var(--color-neon)" }} strokeWidth="2.4" strokeLinejoin="round" fillRule="evenodd" filter={`url(#b${id})`} />
    </svg>
  );
}

/** Logo completo da tela de entrada: V com X, nome e "GAMING CHAT". */
export function Marca({ tam = 120 }: { tam?: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <LogoTempestade tam={tam} />
      <NomeVoxix largura={tam * 1.9} />
      <div className="text-xs font-black tracking-[0.45em] text-white">GAMING CHAT</div>
    </div>
  );
}

/** O V com X com a tempestade atrás: luz neon que alterna entre forte e fraca, como trovões (desliga em Ajustes › Personalizar). */
export function LogoTempestade({ tam = 120, className = "" }: { tam?: number; className?: string }) {
  const v = useVisual();
  if (!v.tempestade) return <Logo tam={tam} className={className} />;
  return (
    <span className={`tempestade ${className}`} data-forca={v.forca} style={{ width: tam, height: (tam * 120) / 130 }}>
      <Logo tam={tam} />
    </span>
  );
}
