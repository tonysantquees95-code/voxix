import { useId } from "react";

/** Desenho oficial do Voxix: V com X no meio, em roxo escuro com contorno vermelho brilhante (igual ao conceito visual). */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c2fd6" /><stop offset=".55" stopColor="#4a1590" /><stop offset="1" stopColor="#2a0b4d" /></linearGradient>
      <filter id={`b${id}`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff1f35" floodOpacity=".85" /></filter>
    </defs>
  );
}

const MARCA = "M2 4 L34 14 L60 76 L86 14 L118 4 L73 100 L60 110 L47 100 Z";
const X = "M44 26 L76 62 M76 26 L44 62";
const NOME = "M0 0 L12 0 L22 28 L32 0 L44 0 L28 40 L16 40 Z M60 0 L88 0 L96 8 L96 32 L88 40 L60 40 L52 32 L52 8 Z M66 10 L82 10 L84 12 L84 28 L82 30 L66 30 L64 28 L64 12 Z M104 0 L116 0 L126 15 L136 0 L148 0 L132 20 L148 40 L136 40 L126 25 L116 40 L104 40 L120 20 Z M156 0 L168 0 L168 40 L156 40 Z M176 0 L188 0 L198 15 L208 0 L220 0 L204 20 L220 40 L208 40 L198 25 L188 40 L176 40 L192 20 Z";

function Desenho({ id }: { id: string }) {
  return (
    <g>
      <path d={MARCA} fill={`url(#g${id})`} stroke="#ff2d3d" strokeWidth="3.2" strokeLinejoin="round" filter={`url(#b${id})`} />
      <path d={X} stroke="#ff2d3d" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d={X} stroke="#2a0b4d" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d={X} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".85" />
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
      <path d={NOME} fill={`url(#g${id})`} stroke="#ff2d3d" strokeWidth="2.4" strokeLinejoin="round" fillRule="evenodd" filter={`url(#b${id})`} />
    </svg>
  );
}

/** Logo completo da tela de entrada: V com X, nome e "GAMING CHAT". */
export function Marca({ tam = 120 }: { tam?: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Logo tam={tam} />
      <NomeVoxix largura={tam * 1.9} />
      <div className="text-xs font-black tracking-[0.45em] text-white">GAMING CHAT</div>
    </div>
  );
}
