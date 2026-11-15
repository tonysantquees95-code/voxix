// Personalização do Voxix: cor do tema e a "tempestade" (luz neon que pisca atrás do logo, como trovões).
export interface Tema { id: string; nome: string; neon: string; magenta: string }
export const TEMAS: Tema[] = [
  { id: "voxix", nome: "Voxix", neon: "#ef2b3d", magenta: "#8b3cf0" },
  { id: "roxo", nome: "Roxo", neon: "#7c3aed", magenta: "#db2777" },
  { id: "azul", nome: "Azul", neon: "#2563eb", magenta: "#7c3aed" },
  { id: "verde", nome: "Verde", neon: "#16a34a", magenta: "#0891b2" },
  { id: "rosa", nome: "Rosa", neon: "#db2777", magenta: "#7c3aed" },
  { id: "ciano", nome: "Ciano", neon: "#0891b2", magenta: "#8b3cf0" },
];
export type Forca = "fraca" | "media" | "forte";
export const FORCAS: { id: Forca; nome: string }[] = [{ id: "fraca", nome: "Suave" }, { id: "media", nome: "Média" }, { id: "forte", nome: "Forte" }];

export interface Visual { tema: string; tempestade: boolean; forca: Forca }
export const VISUAL_PADRAO: Visual = { tema: "voxix", tempestade: true, forca: "media" };

/** Aceita só valores conhecidos; qualquer coisa estranha volta ao padrão. */
export function limparVisual(v: unknown): Visual {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    tema: TEMAS.some((t) => t.id === o.tema) ? (o.tema as string) : VISUAL_PADRAO.tema,
    tempestade: typeof o.tempestade === "boolean" ? o.tempestade : VISUAL_PADRAO.tempestade,
    forca: FORCAS.some((f) => f.id === o.forca) ? (o.forca as Forca) : VISUAL_PADRAO.forca,
  };
}
export const temaDe = (id: string): Tema => TEMAS.find((t) => t.id === id) ?? TEMAS[0];

const CHAVE = "voxix.visual";
function ler(): Visual {
  try { return limparVisual(JSON.parse(localStorage.getItem(CHAVE) ?? "null")); } catch { return VISUAL_PADRAO; }
}
let atual: Visual = ler();
const ouvintes = new Set<() => void>();
/** Para a tela acompanhar as mudanças (usado por useVisual). */
export const visualAtual = (): Visual => atual;
export function ouvirVisual(f: () => void): () => void { ouvintes.add(f); return () => { ouvintes.delete(f); }; }

export function aplicarVisual(v: Visual, raiz: HTMLElement = document.documentElement) {
  const t = temaDe(v.tema);
  raiz.style.setProperty("--color-neon", t.neon);
  raiz.style.setProperty("--color-magenta", t.magenta);
}
export function iniciarVisual() { try { aplicarVisual(atual); } catch { /* sem DOM */ } }

export function mudarVisual(parcial: Partial<Visual>) {
  atual = limparVisual({ ...atual, ...parcial });
  try { localStorage.setItem(CHAVE, JSON.stringify(atual)); } catch { /* sem armazenamento */ }
  try { aplicarVisual(atual); } catch { /* sem DOM */ }
  ouvintes.forEach((f) => f());
}
