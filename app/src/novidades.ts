// "O que há de novo": a tela que aparece depois de uma atualização.
// REGRA: toda mudança que altere o que o app faz ou como se usa (função nova, melhoria de fluxo, correção) ganha uma linha AQUI,
// com id = o maior id + 1. A tela mostra só o que a pessoa ainda não viu, então não depende do número da versão.
export type TipoNovidade = "novo" | "melhoria" | "correcao";
export interface Novidade { id: number; data: string; tipo: TipoNovidade; titulo: string; texto: string }

export const NOVIDADES: Novidade[] = [
  { id: 1, data: "2026-11-14", tipo: "novo", titulo: "Voxix chegou", texto: "Conversas privadas ao vivo com o apelido dos seus amigos, bloqueio, denúncia e ditado por microfone." },
  { id: 2, data: "2026-11-14", tipo: "correcao", titulo: "Tela entre as barras do Android", texto: "No Android, o Voxix agora fica entre a barra de cima e os botões de navegação, sem passar por baixo deles, mesmo quando as barras estão fixas. Os botões de baixo e o campo de mensagem não ficam mais escondidos." },
  { id: 3, data: "2026-11-14", tipo: "melhoria", titulo: "Logo novo do Voxix", texto: "O Voxix ganhou a identidade nova: o V com X em roxo escuro com contorno vermelho brilhante, o nome VOXIX em letras angulares e o selo Gaming Chat. Aparece na tela de entrada, no ícone do app e na abertura." },
  { id: 4, data: "2026-11-14", tipo: "melhoria", titulo: "Cores novas", texto: "O Voxix inteiro agora usa as cores do logo: vermelho brilhante e roxo escuro, nos botões, nas mensagens, nos destaques e nas telas." },
];

export const ROTULO: Record<TipoNovidade, string> = { novo: "Novo", melhoria: "Melhorou", correcao: "Corrigido" };
export const ultimoId = (lista: Novidade[] = NOVIDADES): number => lista.reduce((m, n) => Math.max(m, n.id), 0);
/** O que a pessoa ainda não viu, da mais nova para a mais antiga. */
export const novasDesde = (visto: number, lista: Novidade[] = NOVIDADES): Novidade[] => lista.filter((n) => n.id > visto).sort((a, b) => b.id - a.id);

const CHAVE = "voxix.novidades.vistas";
/** null = nunca guardou (primeira instalação: a apresentação já explica tudo, então não mostra o histórico). */
export function lerVisto(): number | null {
  try { const v = localStorage.getItem(CHAVE); if (v === null) return null; const n = Number(v); return Number.isInteger(n) && n >= 0 ? n : null; } catch { return null; }
}
export function marcarVisto(id: number = ultimoId()): void {
  try { localStorage.setItem(CHAVE, String(id)); } catch { /* sem armazenamento: mostra de novo na próxima vez */ }
}
