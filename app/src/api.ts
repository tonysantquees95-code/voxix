// Conversa com o servidor da Vênus (Vetorial ID + rotas /voxix).
export const SERVIDOR = "https://venus-servidor.tonysantquees95.workers.dev";

export class ErroApi extends Error {
  codigo: string;
  status: number;
  constructor(mensagem: string, codigo = "", status = 0) {
    super(mensagem);
    this.codigo = codigo;
    this.status = status;
  }
}

export async function chamar<T>(metodo: string, caminho: string, corpo?: unknown, token?: string, tempoMs = 20000): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${SERVIDOR}${caminho}`, {
      method: metodo,
      headers: { ...(corpo === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(tempoMs),
    });
  } catch {
    throw new ErroApi("Sem conexão com o servidor. Confira a internet.", "sem_rede");
  }
  const d = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new ErroApi(String(d.error ?? `Erro ${r.status}`), String(d.codigo ?? ""), r.status);
  return d as T;
}

export interface Perfil { apelido: string | null; nome?: string; nomeSugerido?: string }
export interface Pessoa { apelido: string; nome: string }
export interface MensagemDoServidor { id: string; de: string; deNome: string; conversa: string; corpo: string; tipo: string; criado: number }

export const api = {
  perfil: (t: string) => chamar<Perfil>("GET", "/voxix/perfil", undefined, t),
  criarPerfil: (t: string, apelido: string, nome: string) => chamar<Pessoa>("PUT", "/voxix/perfil", { apelido, nome }, t),
  buscar: (t: string, apelido: string) => chamar<Pessoa>("GET", `/voxix/buscar?apelido=${encodeURIComponent(apelido)}`, undefined, t),
  enviar: (t: string, para: string, corpo: string, idLocal: string) => chamar<{ ok: boolean; id: string; criado: number }>("POST", "/voxix/mensagens", { para, corpo, idLocal }, t),
  bloqueios: (t: string) => chamar<{ bloqueios: Pessoa[] }>("GET", "/voxix/bloqueios", undefined, t),
  bloquear: (t: string, apelido: string) => chamar("POST", "/voxix/bloqueios", { apelido }, t),
  desbloquear: (t: string, apelido: string) => chamar("DELETE", `/voxix/bloqueios/${encodeURIComponent(apelido)}`, undefined, t),
  denunciar: (t: string, apelido: string, motivo: string, trecho?: string) => chamar("POST", "/voxix/denuncias", { apelido, motivo, trecho }, t),
};

/** Endereço do chat ao vivo (o navegador não manda cabeçalhos no WebSocket, então o token vai na URL). */
export const enderecoWs = (token: string): string => `${SERVIDOR.replace(/^http/, "ws")}/voxix/ws?token=${encodeURIComponent(token)}`;
