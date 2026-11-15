import { ESCALAS_ICONE, TRACOS } from "./personalizar";
import { useVisual } from "./useVisual";

export type NomeIcone =
  | "config" | "fechar" | "voltar" | "mais" | "adicionar" | "enviar" | "microfone" | "inicio" | "teclado" | "cores" | "formato" | "fundo"
  | "emoji" | "apagar" | "shift" | "shiftTrava" | "estrela" | "seta";

/** Engrenagem de 8 dentes, gerada em código (centro 12,12). */
function engrenagem(): string {
  const pontos: string[] = [];
  const dentes = 8, re = 9.6, ri = 7.2;
  for (let i = 0; i < dentes; i++) {
    const a = (i * 2 * Math.PI) / dentes;
    const m = Math.PI / dentes / 2.6;
    for (const [ang, r] of [[a - m * 1.6, ri], [a - m, re], [a + m, re], [a + m * 1.6, ri]] as const) {
      pontos.push(`${(12 + r * Math.cos(ang)).toFixed(2)} ${(12 + r * Math.sin(ang)).toFixed(2)}`);
    }
  }
  return `M${pontos.join("L")}Z`;
}
const ENGRENAGEM = engrenagem();

/** Desenhos em 24x24. `area` = parte fechada que pode receber o preenchimento suave; `linhas` = só traço. */
const DESENHOS: Record<NomeIcone, { area?: string; linhas?: string; pontos?: [number, number][] }> = {
  config: { area: ENGRENAGEM, linhas: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  fechar: { linhas: "M6 6l12 12M18 6L6 18" },
  voltar: { linhas: "M15 5l-7 7 7 7" },
  seta: { linhas: "M9 5l7 7-7 7" },
  mais: { pontos: [[12, 5], [12, 12], [12, 19]] },
  adicionar: { linhas: "M12 5v14M5 12h14" },
  enviar: { area: "M4 12L20 4l-5 16-3.5-6.5z", linhas: "M11.5 13.5L20 4" },
  microfone: { area: "M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z", linhas: "M5 11a7 7 0 0014 0M12 18v3M9 21h6" },
  inicio: { area: "M4 11l8-7 8 7v9h-5v-6H9v6H4z" },
  teclado: { area: "M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z", linhas: "M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" },
  cores: { area: "M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2.2-.5-1.2.3-2.3 1.7-2.3H18a3 3 0 003-3c0-5-4-10.5-9-10.5z", linhas: "M7.5 11h.01M10 7.5h.01M14.5 7.5h.01" },
  formato: { area: "M12 3l8 4.5v9L12 21l-8-4.5v-9z" },
  fundo: { area: "M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z", linhas: "M3 17l5-5 4 4 3-3 6 6M9 9.5h.01" },
  emoji: { area: "M12 3a9 9 0 100 18 9 9 0 000-18z", linhas: "M8.5 14a4 4 0 007 0M9 10h.01M15 10h.01" },
  apagar: { area: "M21 5H9l-6 7 6 7h12z", linhas: "M13 9.5l5 5M18 9.5l-5 5" },
  shift: { area: "M12 4l8 9h-5v7H9v-7H4z" },
  shiftTrava: { area: "M12 3l8 8.5h-5V16H9v-4.5H4z", linhas: "M9 20h6" },
  estrela: { area: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3 9.5l6.1-.9z" },
};

/** Ícone do Voxix: espessura, tamanho, estilo e cor seguem o que a pessoa escolheu em Personalizar › Ícones. */
export function Icone({ nome, tam = 20, className = "" }: { nome: NomeIcone; tam?: number; className?: string }) {
  const { icones } = useVisual();
  const d = DESENHOS[nome];
  const px = Math.round(tam * ESCALAS_ICONE[icones.tamanho]);
  const suave = icones.estilo === "suave";
  const traco = TRACOS[icones.traco];
  return (
    <svg viewBox="0 0 24 24" width={px} height={px} className={className} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth={traco} strokeLinecap="round" strokeLinejoin="round"
      style={icones.cor === "app" ? { color: "var(--color-neon)" } : undefined}>
      {d.area && <path d={d.area} fill={suave ? "currentColor" : "none"} fillOpacity={suave ? 0.22 : undefined} />}
      {d.linhas && <path d={d.linhas} />}
      {d.pontos && d.pontos.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={Math.max(1.4, traco * 0.75)} fill="currentColor" stroke="none" />)}
    </svg>
  );
}
