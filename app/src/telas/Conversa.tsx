import { useEffect, useRef, useState } from "react";
import { api, ErroApi } from "../api";
import { iniciarDitado, type Ditado } from "../ditado";
import { useVoxix } from "../estado";
import { PapelDeParede } from "../papel";
import { Teclado } from "../Teclado";
import { apagar as apagarTexto, comecaFrase, inserir, type Edicao } from "../teclado";
import { useVisual } from "../useVisual";

const horaMsg = (t: number): string => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function Conversa({ apelido }: { apelido: string }) {
  const { armazem, sessao, abrir, enviar, reenviar, apagar } = useVoxix();
  const conversa = armazem.conversas[apelido];
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const [menu, setMenu] = useState(false);
  const [denuncia, setDenuncia] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const ditado = useRef<Ditado | null>(null);
  const caixa = useRef<HTMLTextAreaElement>(null);
  const visual = useVisual();
  const [tecladoAberto, setTecladoAberto] = useState(false);
  // teclado do Voxix: no celular sempre que ligado; no computador só se a pessoa pedir
  const proprio = visual.teclado.usar && (visual.teclado.noPc || (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches));
  const fim = useRef<HTMLDivElement>(null);
  const mensagens = conversa?.mensagens ?? [];

  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [mensagens.length, apelido]);
  useEffect(() => () => { void ditado.current?.parar(); }, [apelido]);
  useEffect(() => { setTexto(""); setAviso(""); setMenu(false); }, [apelido]);

  if (!conversa) return null;

  const mandar = async () => {
    const t = texto.trim();
    if (!t) return;
    if (ouvindo) await ditado.current?.parar();
    setTexto("");
    setAviso("");
    try { await enviar(apelido, t); } catch (e) { setAviso(e instanceof ErroApi ? e.message : "Não consegui enviar. Toque na mensagem para tentar de novo."); }
  };

  const editar = (f: (t: string, i: number, j: number) => Edicao) => {
    const el = caixa.current;
    const focado = !!el && document.activeElement === el;
    const r = f(texto, focado ? (el?.selectionStart ?? texto.length) : texto.length, focado ? (el?.selectionEnd ?? texto.length) : texto.length);
    setTexto(r.texto.slice(0, 2000));
    requestAnimationFrame(() => { try { el?.setSelectionRange(r.pos, r.pos); } catch { /* campo fora da tela */ } });
  };
  const posCursor = () => (caixa.current && document.activeElement === caixa.current ? (caixa.current.selectionStart ?? texto.length) : texto.length);

  const alternarMicrofone = async () => {
    if (ouvindo) { await ditado.current?.parar(); return; }
    if (!sessao) return;
    setAviso("");
    const base = texto.trim();
    try {
      setOuvindo(true);
      ditado.current = await iniciarDitado({
        aoTexto: (t) => setTexto(base ? `${base} ${t}` : t),
        aoFim: () => { setOuvindo(false); ditado.current = null; },
        aoErro: (m) => setAviso(m),
      }, sessao.token);
    } catch (e) {
      setOuvindo(false);
      setAviso(e instanceof Error ? e.message : "Não consegui usar o microfone.");
    }
  };

  const bloquear = async () => {
    if (!sessao) return;
    setMenu(false);
    try { await api.bloquear(sessao.token, apelido); setAviso(`@${apelido} foi bloqueado. Ele não percebe, mas as mensagens dele não chegam mais para você.`); } catch (e) { setAviso(e instanceof ErroApi ? e.message : "Não consegui bloquear agora."); }
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b border-borda bg-painel px-3 py-2.5">
        <button onClick={() => abrir(null)} aria-label="Voltar" className="grid h-9 w-9 place-items-center rounded-full text-xl md:hidden">←</button>
        <span className="avatar grid h-10 w-10 flex-none place-items-center bg-gradient-to-br from-neon to-magenta font-extrabold text-white">{conversa.nome.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><div className="truncate font-bold leading-tight">{conversa.nome}</div><div className="text-xs text-suave">@{conversa.apelido}</div></div>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} aria-label="Mais opções" className="grid h-9 w-9 place-items-center rounded-full text-xl">⋮</button>
          {menu && (
            <div className="absolute right-0 top-10 z-10 w-52 overflow-hidden rounded-xl border border-borda bg-painel text-sm shadow-xl">
              <button onClick={() => void bloquear()} className="block w-full px-4 py-3 text-left hover:bg-white/5">Bloquear</button>
              <button onClick={() => { setMenu(false); setDenuncia(true); }} className="block w-full px-4 py-3 text-left hover:bg-white/5">Denunciar</button>
              <button onClick={() => apagar(apelido)} className="block w-full px-4 py-3 text-left text-erro hover:bg-white/5">Apagar conversa deste aparelho</button>
            </div>
          )}
        </div>
      </header>

      <div className="relative min-h-0 flex-1"><PapelDeParede qual="conversa" />
      <div className="rolagem absolute inset-0 z-[1] space-y-1.5 overflow-y-auto px-3 py-3">
        {mensagens.length === 0 && <p className="py-10 text-center text-sm text-suave">Diga oi para {conversa.nome}!</p>}
        {mensagens.map((m) => (
          <div key={m.id} className={`flex ${m.minha ? "justify-end" : "justify-start"}`}>
            <div className={`balao max-w-[80%] whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] ${m.minha ? "balao-meu" : "border border-borda bg-painel"}`}>
              {m.corpo}
              <div className={`mt-0.5 text-right text-[10px] ${m.minha ? "text-white/70" : "text-suave"}`}>
                {horaMsg(m.criado)}{m.minha && (m.estado === "enviando" ? " · enviando…" : m.estado === "enviada" ? " ✓" : "")}
                {m.estado === "falhou" && <button onClick={() => void reenviar(apelido, m.id, m.corpo).catch(() => setAviso("Ainda não consegui enviar."))} className="ml-1 font-bold underline">não enviada · tentar de novo</button>}
              </div>
            </div>
          </div>
        ))}
        <div ref={fim} />
      </div></div>

      {aviso && <p className="px-4 pb-1 text-xs text-aviso" role="status">{aviso}</p>}
      <form onSubmit={(e) => { e.preventDefault(); void mandar(); }} className="flex items-end gap-2 border-t border-borda bg-painel p-2.5">
        <button type="button" onClick={() => void alternarMicrofone()} aria-label={ouvindo ? "Parar o ditado" : "Ditar mensagem"} title="Ditado: fale e a fala vira texto" className={`botao-redondo grid h-11 w-11 flex-none place-items-center border ${ouvindo ? "gravando border-magenta bg-magenta text-[#1a0620]" : "border-borda text-neon"}`}>🎤</button>
        <textarea ref={caixa} inputMode={proprio ? "none" : undefined} onFocus={() => setTecladoAberto(true)} onClick={() => setTecladoAberto(true)} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 768px)").matches) { e.preventDefault(); void mandar(); } }} rows={1} maxLength={2000} placeholder={ouvindo ? "Ouvindo…" : "Mensagem"} className="max-h-32 balao min-h-11 flex-1 resize-none border border-borda bg-fundo px-4 py-2.5 outline-none focus:border-neon" />
        <button disabled={!texto.trim()} className="botao-redondo grid h-11 w-11 flex-none place-items-center bg-neon text-lg font-bold text-white disabled:opacity-40" aria-label="Enviar">➤</button>
      </form>
      {proprio && tecladoAberto && (
        <>
          <button type="button" onClick={() => { setTecladoAberto(false); caixa.current?.blur(); }} className="w-full border-t border-borda bg-painel py-1 text-xs text-suave" aria-label="Fechar o teclado">⌄ fechar teclado</button>
          <Teclado aoInserir={(x) => editar((t, i, j) => inserir(t, i, j, x))} aoApagar={() => editar(apagarTexto)} aoEnviar={() => void mandar()} inicioDeFrase={comecaFrase(texto, posCursor())} podeEnviar={!!texto.trim()} />
        </>
      )}

      {denuncia && sessao && <Denuncia apelido={apelido} trecho={mensagens.filter((m) => !m.minha).slice(-10).map((m) => m.corpo).join("\n")} token={sessao.token} fechar={() => setDenuncia(false)} aoEnviar={() => setAviso("Denúncia enviada. Obrigado por avisar.")} />}
    </>
  );
}

function Denuncia({ apelido, trecho, token, fechar, aoEnviar }: { apelido: string; trecho: string; token: string; fechar: () => void; aoEnviar: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const enviar = async () => {
    setOcupado(true);
    setErro("");
    try { await api.denunciar(token, apelido, motivo, trecho); aoEnviar(); fechar(); } catch (e) { setErro(e instanceof ErroApi ? e.message : "Não consegui enviar a denúncia agora."); } finally { setOcupado(false); }
  };
  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-4" onClick={fechar}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-2xl border border-borda bg-painel p-5">
        <h2 className="text-lg font-extrabold">Denunciar @{apelido}</h2>
        <p className="text-sm text-suave">Conte o que aconteceu. As últimas mensagens dele nesta conversa vão junto, para a revisão (o Voxix não guarda conversas, então só o que você enviar aqui é visto).</p>
        <textarea autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} rows={3} placeholder="Motivo" className="w-full resize-none rounded-xl border border-borda bg-fundo px-4 py-2.5 outline-none focus:border-neon" />
        {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}
        <div className="flex gap-2">
          <button onClick={fechar} className="flex-1 rounded-xl border border-borda py-2.5">Cancelar</button>
          <button disabled={ocupado || !motivo.trim()} onClick={() => void enviar()} className="flex-1 rounded-xl bg-erro py-2.5 font-extrabold text-[#2a0606] disabled:opacity-60">{ocupado ? "Enviando…" : "Denunciar"}</button>
        </div>
      </div>
    </div>
  );
}
