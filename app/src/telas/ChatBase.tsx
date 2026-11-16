import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ErroApi } from "../api";
import { iniciarDitado, type Ditado } from "../ditado";
import { useVoxix } from "../estado";
import { Icone } from "../icones";
import { PapelDeParede } from "../papel";
import { Teclado } from "../Teclado";
import { BarraSugestoes } from "../BarraSugestoes";
import type { ReactNode } from "react";
import { apagar as apagarTexto, comecaFrase, inserir, type Edicao } from "../edicaoTeclado";
import { SEPARADORES, aplicarSeparador, corrigirFim, desfazerCorrecao, palavraAntesDoCursor, sugerir, trocarPalavra, type Correcao } from "../corretor";
import { aprender, palavrasDaPessoa, useCorretor } from "../useCorretor";
import { useVisual } from "../useVisual";

/** Altura máxima do campo de mensagem: cresce com as linhas e, passando disso, rola por dentro. */
const ALTURA_MAX_CAMPO = 168;

const SEM_OPCOES: string[] = [];

/** A lista fica separada para não ser refeita (balão por balão) a cada letra digitada. */
const ListaMensagens = memo(function ListaMensagens({ mensagens, aoReenviar }: { mensagens: MsgChat[]; aoReenviar: (id: string, corpo: string) => void }) {
  return (
    <>
      {mensagens.map((m) => (
        <div key={m.id} className={`flex ${m.minha ? "justify-end" : "justify-start"}`}>
          <div className={`balao max-w-[80%] whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] ${m.minha ? "balao-meu" : "border border-borda bg-painel"}`}>
            {m.autor && !m.minha && <div className="mb-0.5 text-xs font-bold text-neon">@{m.autor}</div>}
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

export interface MsgChat { id: string; minha: boolean; corpo: string; criado: number; estado: "enviando" | "enviada" | "falhou"; autor?: string }
export interface ItemMenu { rotulo: string; perigo?: boolean; aoTocar: (avisar: (t: string) => void) => void }
export interface PropsChat {
  chave: string; // muda quando troca de conversa/sala: limpa o campo
  titulo: string;
  subtitulo?: ReactNode;
  avatar: ReactNode;
  aoVoltar: () => void;
  mensagens: MsgChat[];
  vazio: string;
  menu?: ItemMenu[];
  aoEnviar: (texto: string) => Promise<void>;
  aoReenviar: (id: string, corpo: string) => Promise<void>;
  cabecalhoExtra?: ReactNode; // faixa embaixo do cabeçalho (ex.: quem está online)
  extra?: (avisar: (t: string) => void) => ReactNode; // janelas (ex.: denúncia)
  acoes?: ReactNode; // botões ao lado do menu
}

export function ChatBase({ chave: apelido, titulo, subtitulo, avatar, aoVoltar, mensagens, vazio, menu = [], aoEnviar, aoReenviar, cabecalhoExtra, extra, acoes }: PropsChat) {
  const { sessao } = useVoxix();
  const [texto, setTexto] = useState("");
  const [cursor, setCursor] = useState(0);
  const textoRef = useRef("");
  const ultimaCorrecao = useRef<Correcao | null>(null);
  const [aviso, setAviso] = useState("");
  const [menuAberto, setMenu] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const ditado = useRef<Ditado | null>(null);
  const caixa = useRef<HTMLTextAreaElement>(null);
  const visual = useVisual();
  const [tecladoAberto, setTecladoAberto] = useState(false);
  // teclado do Voxix: no celular sempre que ligado; no computador só se a pessoa pedir
  const proprio = visual.teclado.usar && (visual.teclado.noPc || (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches));
  const fim = useRef<HTMLDivElement>(null);
  const corretorLigado = visual.teclado.corretor;
  const dic = useCorretor(corretorLigado);
  const dicRef = useRef(dic);
  dicRef.current = dic;
  // computador (mouse e teclado físico): a faixa de sugestões flutua em cima do campo
  const tecladoFisico = typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
  const alturaCampo = useRef(0);
  const textoAnterior = useRef("");
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
    // digitar sem quebrar linha não muda a altura: pula a medição pesada (só mede ao crescer ou ao apagar)
    const antes = textoAnterior.current;
    textoAnterior.current = texto;
    if (texto.length >= antes.length && el.scrollHeight <= el.clientHeight && alturaCampo.current) return;
    el.style.height = "auto";
    const borda = el.offsetHeight - el.clientHeight;
    const cheio = el.scrollHeight + borda > ALTURA_MAX_CAMPO;
    const h = Math.min(el.scrollHeight + borda, ALTURA_MAX_CAMPO);
    el.style.height = `${h}px`;
    el.style.overflowY = cheio ? "auto" : "hidden";
    if (cheio && (el.selectionStart ?? texto.length) >= texto.length) el.scrollTop = el.scrollHeight;
    if (alturaCampo.current && alturaCampo.current !== h) fim.current?.scrollIntoView({ block: "end" });
    alturaCampo.current = h;
  }, [texto]);

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
  const reenviarRef = useRef(aoReenviar);
  reenviarRef.current = aoReenviar;
  const reenviarMsg = useCallback((id: string, corpo: string) => {
    void reenviarRef.current(id, corpo).catch(() => setAviso("Ainda não consegui enviar."));
  }, []);

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
    try { await aoEnviar(t); } catch (e) { setAviso(e instanceof ErroApi ? e.message : "Não consegui enviar. Toque na mensagem para tentar de novo."); }
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

  return (
    <>
      <header className="flex items-center gap-3 border-b border-borda bg-painel px-3 py-2.5">
        <button onClick={aoVoltar} aria-label="Voltar" className="grid h-9 w-9 place-items-center rounded-full text-xl md:hidden"><Icone nome="voltar" tam={22} /></button>
        {avatar}
        <div className="min-w-0 flex-1"><div className="truncate font-bold leading-tight">{titulo}</div>{subtitulo && <div className="truncate text-xs text-suave">{subtitulo}</div>}</div>
        {acoes}
        {menu.length > 0 && (
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} aria-label="Mais opções" className="grid h-9 w-9 place-items-center rounded-full text-xl"><Icone nome="mais" tam={22} /></button>
            {menuAberto && (
              <div className="absolute right-0 top-10 z-10 w-56 overflow-hidden rounded-xl border border-borda bg-painel text-sm shadow-xl">
                {menu.map((i) => <button key={i.rotulo} onClick={() => { setMenu(false); i.aoTocar(setAviso); }} className={`block w-full px-4 py-3 text-left hover:bg-white/5 ${i.perigo ? "text-erro" : ""}`}>{i.rotulo}</button>)}
              </div>
            )}
          </div>
        )}
      </header>
      {cabecalhoExtra}

      <div className="relative min-h-0 flex-1"><PapelDeParede qual="conversa" />
      <div className="rolagem absolute inset-0 z-[1] space-y-1.5 overflow-y-auto px-3 py-3">
        {mensagens.length === 0 && <p className="py-10 text-center text-sm text-suave">{vazio}</p>}
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

      {extra?.(setAviso)}
    </>
  );
}
