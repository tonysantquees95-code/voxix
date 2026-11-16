import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { api, ErroApi } from "../api";
import { iniciarDitado, type Ditado } from "../ditado";
import { useVoxix } from "../estado";
import { Icone } from "../icones";
import { PapelDeParede } from "../papel";
import { Teclado } from "../Teclado";
import { BarraSugestoes } from "../BarraSugestoes";
import type { Msg } from "../armazem";
import { apagar as apagarTexto, comecaFrase, inserir, type Edicao } from "../edicaoTeclado";
import { SEPARADORES, aplicarSeparador, corrigirFim, desfazerCorrecao, palavraAntesDoCursor, sugerir, trocarPalavra, type Correcao } from "../corretor";
import { aprender, palavrasDaPessoa, useCorretor } from "../useCorretor";
import { useVisual } from "../useVisual";

/** Altura máxima do campo de mensagem: cresce com as linhas e, passando disso, rola por dentro. */
const ALTURA_MAX_CAMPO = 168;

const SEM_OPCOES: string[] = [];

/** A lista fica separada para não ser refeita (balão por balão) a cada letra digitada. */
const ListaMensagens = memo(function ListaMensagens({ mensagens, aoReenviar }: { mensagens: Msg[]; aoReenviar: (id: string, corpo: string) => void }) {
  return (
    <>
      {mensagens.map((m) => (
        <div key={m.id} className={`flex ${m.minha ? "justify-end" : "justify-start"}`}>
          <div className={`balao max-w-[80%] whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] ${m.minha ? "balao-meu" : "border border-borda bg-painel"}`}>
            {m.corpo}
            <div className={`mt-0.5 text-right text-[10px] ${m.minha ? "text-white/70" : "text-suave"}`}>
              {horaMsg(m.criado)}{m.minha && (m.estado === "enviando" ? " · enviando…" : m.estado === "enviada" ? " ✓" : "")}
              {m.estado === "falhou" && <button onClick={() => aoReenviar(m.id, m.corpo)} className="ml-1 font-bold underline">não enviada · tentar de novo</button>}
            </div>
          </div>
        </div>
      ))}
    </>
  );
});

const horaMsg = (t: number): string => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function Conversa({ apelido }: { apelido: string }) {
  const { armazem, sessao, abrir, enviar, reenviar, apagar } = useVoxix();
  const conversa = armazem.conversas[apelido];
  const [texto, setTexto] = useState("");
  const [cursor, setCursor] = useState(0);
  const textoRef = useRef("");
  const ultimaCorrecao = useRef<Correcao | null>(null);
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
  const mensagens = useMemo(() => conversa?.mensagens ?? [], [conversa]);
  const corretorLigado = visual.teclado.corretor;
  const dic = useCorretor(corretorLigado);
  const dicRef = useRef(dic);
  dicRef.current = dic;
  // computador (mouse e teclado físico): a faixa de sugestões flutua em cima do campo
  const tecladoFisico = typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
  const alturaCampo = useRef(0);
  const cursorPendente = useRef<number | null>(null);

  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [mensagens.length, apelido]);
  useEffect(() => () => { void ditado.current?.parar(); }, [apelido]);
  useEffect(() => { textoRef.current = ""; ultimaCorrecao.current = null; setTexto(""); setCursor(0); setAviso(""); setMenu(false); }, [apelido]);

  // Depois que o texto novo entra no campo, o cursor vai para o lugar certo na mesma hora (sem esperar o próximo quadro:
  // quem digita rápido não pode ver letra caindo no lugar errado).
  useLayoutEffect(() => {
    const pos = cursorPendente.current;
    if (pos === null) return;
    cursorPendente.current = null;
    try { caixa.current?.setSelectionRange(pos, pos); } catch { /* campo fora da tela */ }
  });

  // O campo acompanha o que se escreve: cresce linha a linha até o limite e depois rola, sem esconder o texto.
  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    el.style.height = "auto";
    const borda = el.offsetHeight - el.clientHeight;
    const cheio = el.scrollHeight + borda > ALTURA_MAX_CAMPO;
    const h = Math.min(el.scrollHeight + borda, ALTURA_MAX_CAMPO);
    el.style.height = `${h}px`;
    el.style.overflowY = cheio ? "auto" : "hidden";
    if (cheio && (el.selectionStart ?? texto.length) >= texto.length) el.scrollTop = el.scrollHeight;
    if (alturaCampo.current && alturaCampo.current !== h) fim.current?.scrollIntoView({ block: "end" });
    alturaCampo.current = h;
  }, [texto, conversa]);

  // ---- escrita: tudo aqui é estável (não muda a cada letra) para o teclado não ser refeito a cada toque ----
  const lerSelecao = useCallback((): [number, number] => {
    const el = caixa.current;
    const n = textoRef.current.length;
    if (el && document.activeElement === el) return [el.selectionStart ?? n, el.selectionEnd ?? n];
    return [n, n];
  }, []);
  const aplicar = useCallback((r: Edicao) => {
    const t = r.texto.slice(0, 2000);
    const pos = Math.min(r.pos, t.length);
    textoRef.current = t;
    setTexto(t);
    setCursor(pos);
    cursorPendente.current = pos; // posto no campo logo depois de desenhar (abaixo), antes da próxima tecla
  }, []);
  const inserirTexto = useCallback((x: string) => {
    const [i, j] = lerSelecao();
    const t = textoRef.current;
    const d = dicRef.current;
    if (d && SEPARADORES.has(x)) { // espaço, ponto, vírgula…: conserta a palavra que acabou de ser escrita
      const r = aplicarSeparador(d, palavrasDaPessoa(), t, i, j, x);
      ultimaCorrecao.current = r.correcao;
      aplicar(r);
      return;
    }
    ultimaCorrecao.current = null;
    aplicar(inserir(t, i, j, x));
  }, [aplicar, lerSelecao]);
  const apagarCaractere = useCallback(() => {
    const [i, j] = lerSelecao();
    const t = textoRef.current;
    const c = ultimaCorrecao.current;
    if (c && i === j) { // apagar logo depois de uma troca automática devolve a palavra como estava
      const r = desfazerCorrecao(t, i, c);
      if (r) { aprender(c.original); ultimaCorrecao.current = null; aplicar(r); return; }
    }
    ultimaCorrecao.current = null;
    aplicar(apagarTexto(t, i, j));
  }, [aplicar, lerSelecao]);
  const escolherSugestao = useCallback((palavra: string, literal: boolean) => {
    const [i] = lerSelecao();
    ultimaCorrecao.current = null;
    if (literal) aprender(palavra); // tocar na palavra como foi escrita: o corretor aprende a deixar assim
    aplicar(trocarPalavra(textoRef.current, i, palavra));
  }, [aplicar, lerSelecao]);

  // teclado físico (computador): mesma correção ao dar espaço ou pontuação, e Backspace desfaz
  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const d = dicRef.current;
    if (!d || e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.currentTarget.value;
    const i = e.currentTarget.selectionStart;
    const j = e.currentTarget.selectionEnd;
    if (e.key === "Backspace" && ultimaCorrecao.current && i === j) {
      const r = desfazerCorrecao(t, i, ultimaCorrecao.current);
      if (r) { e.preventDefault(); aprender(ultimaCorrecao.current.original); ultimaCorrecao.current = null; aplicar(r); return; }
    }
    const sep = e.key === "Enter" ? "\n" : e.key;
    if (sep.length === 1 && SEPARADORES.has(sep)) {
      const r = aplicarSeparador(d, palavrasDaPessoa(), t, i, j, sep);
      ultimaCorrecao.current = r.correcao;
      if (r.correcao) { e.preventDefault(); aplicar(r); }
    }
  };

  const palavra = useMemo(() => (dic ? palavraAntesDoCursor(texto, cursor) : null), [dic, texto, cursor]);
  const sugestoes = useMemo(() => {
    if (!dic || !palavra || !palavra.palavra || /[\d@#_/\\:]/.test(palavra.trecho)) return null;
    return sugerir(dic, palavra.palavra, palavrasDaPessoa());
  }, [dic, palavra]);
  const literal = sugestoes && !sugestoes.valida && palavra ? palavra.palavra : null;
  const opcoes = sugestoes?.opcoes ?? SEM_OPCOES;

  const mandarRef = useRef<() => Promise<void>>(async () => {});
  const enviarTecla = useCallback(() => { void mandarRef.current(); }, []);
  const reenviarRef = useRef(reenviar);
  reenviarRef.current = reenviar;
  const reenviarMsg = useCallback((id: string, corpo: string) => {
    void reenviarRef.current(apelido, id, corpo).catch(() => setAviso("Ainda não consegui enviar."));
  }, [apelido]);

  if (!conversa) return null;

  const mandar = async () => {
    let t = textoRef.current.trim();
    if (!t) return;
    if (dicRef.current) t = corrigirFim(dicRef.current, palavrasDaPessoa(), t).trim(); // conserta também a última palavra
    if (ouvindo) await ditado.current?.parar();
    textoRef.current = "";
    ultimaCorrecao.current = null;
    setTexto("");
    setCursor(0);
    setAviso("");
    try { await enviar(apelido, t); } catch (e) { setAviso(e instanceof ErroApi ? e.message : "Não consegui enviar. Toque na mensagem para tentar de novo."); }
  };
  mandarRef.current = mandar;

  const alternarMicrofone = async () => {
    if (ouvindo) { await ditado.current?.parar(); return; }
    if (!sessao) return;
    setAviso("");
    const base = textoRef.current.trim();
    try {
      setOuvindo(true);
      ditado.current = await iniciarDitado({
        aoTexto: (t) => { const x = base ? `${base} ${t}` : t; aplicar({ texto: x, pos: x.length }); },
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
        <button onClick={() => abrir(null)} aria-label="Voltar" className="grid h-9 w-9 place-items-center rounded-full text-xl md:hidden"><Icone nome="voltar" tam={22} /></button>
        <span className="avatar grid h-10 w-10 flex-none place-items-center bg-gradient-to-br from-neon to-magenta font-extrabold text-white">{conversa.nome.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><div className="truncate font-bold leading-tight">{conversa.nome}</div><div className="text-xs text-suave">@{conversa.apelido}</div></div>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} aria-label="Mais opções" className="grid h-9 w-9 place-items-center rounded-full text-xl"><Icone nome="mais" tam={22} /></button>
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
        <ListaMensagens mensagens={mensagens} aoReenviar={reenviarMsg} />
        <div ref={fim} />
      </div></div>

      {aviso && <p className="px-4 pb-1 text-xs text-aviso" role="status">{aviso}</p>}
      <form onSubmit={(e) => { e.preventDefault(); void mandar(); }} className="relative flex items-end gap-2 border-t border-borda bg-painel p-2.5">
        {corretorLigado && !proprio && tecladoFisico && <BarraSugestoes flutuante literal={literal} opcoes={opcoes} aoEscolher={escolherSugestao} />}
        <button type="button" onClick={() => void alternarMicrofone()} aria-label={ouvindo ? "Parar o ditado" : "Ditar mensagem"} title="Ditado: fale e a fala vira texto" className={`botao-redondo grid h-11 w-11 flex-none place-items-center border ${ouvindo ? "gravando border-magenta bg-magenta text-[#1a0620]" : "border-borda text-neon"}`}><Icone nome="microfone" tam={22} /></button>
        <textarea ref={caixa} inputMode={proprio ? "none" : undefined} onFocus={() => setTecladoAberto(true)} onClick={() => setTecladoAberto(true)} value={texto}
          onChange={(e) => { ultimaCorrecao.current = null; textoRef.current = e.target.value; setTexto(e.target.value); setCursor(e.target.selectionStart ?? e.target.value.length); }}
          onSelect={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 768px)").matches) { e.preventDefault(); void mandar(); return; } aoTeclar(e); }}
          rows={1} maxLength={2000} placeholder={ouvindo ? "Ouvindo…" : "Mensagem"} lang="pt-BR" autoCapitalize="sentences" autoCorrect={proprio ? "off" : "on"} spellCheck={!proprio && !(corretorLigado && tecladoFisico)}
          style={{ maxHeight: ALTURA_MAX_CAMPO }} className="balao min-h-11 flex-1 resize-none overflow-hidden border border-borda bg-fundo px-4 py-2.5 leading-6 outline-none focus:border-neon" />
        <button disabled={!texto.trim()} className="botao-redondo grid h-11 w-11 flex-none place-items-center bg-neon text-lg font-bold text-white disabled:opacity-40" aria-label="Enviar"><Icone nome="enviar" tam={22} /></button>
      </form>
      {proprio && tecladoAberto && (
        <>
          <button type="button" onClick={() => { setTecladoAberto(false); caixa.current?.blur(); }} className="w-full border-t border-borda bg-painel py-1 text-xs text-suave" aria-label="Fechar o teclado"><span className="inline-flex items-center gap-1"><Icone nome="teclado" tam={14} /> fechar teclado</span></button>
          {corretorLigado && <BarraSugestoes literal={literal} opcoes={opcoes} aoEscolher={escolherSugestao} />}
          <Teclado aoInserir={inserirTexto} aoApagar={apagarCaractere} aoEnviar={enviarTecla} inicioDeFrase={comecaFrase(texto, cursor)} podeEnviar={!!texto.trim()} />
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
