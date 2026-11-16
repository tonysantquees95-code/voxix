import { memo, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Icone } from "./icones";
import { PACOTES, RECENTES_ID, guardarRecentes, lerRecentes, somarRecente } from "./emojis";
import { mudarVisual } from "./personalizar";
import { ACENTOS, LETRAS, NUMEROS, TECLADO_ALTURA } from "./edicaoTeclado";
import { useVisual } from "./useVisual";

interface Props {
  aoInserir: (s: string) => void;
  aoApagar: () => void;
  aoEnviar: () => void;
  /** true quando o próximo caractere começa uma frase (a primeira letra sai maiúscula). */
  inicioDeFrase: boolean;
  podeEnviar: boolean;
}

/** Cor do LED desta batida: a do tema, uma que gira pelo arco-íris, ou a escolhida. */
function corDoToque(led: "tema" | "arco" | "cor", ledCor: string, n: number): string {
  if (led === "arco") return `hsl(${(n * 47) % 360} 100% 60%)`;
  if (led === "cor") return ledCor;
  return "var(--color-neon)";
}

interface TeclaProps { children: ReactNode; onPress: () => void; acender: (el: HTMLElement) => void; larga?: number; ativa?: boolean; rotulo: string; classe?: string; repetir?: boolean; aoSoltar?: boolean }

/** Uma tecla comum. Fica fora do teclado para não ser recriada a cada toque (senão o dedo "perde" a tecla).
 *  Age assim que o dedo encosta (como o teclado do celular), sem esperar soltar; `aoSoltar` é para teclas que não podem disparar sem querer (enviar). */
function Tecla({ children, onPress, acender, larga, ativa, rotulo, classe = "", repetir, aoSoltar }: TeclaProps) {
  const espera = useRef<number | null>(null);
  const intervalo = useRef<number | null>(null);
  const parar = () => {
    if (espera.current) { window.clearTimeout(espera.current); espera.current = null; }
    if (intervalo.current) { window.clearInterval(intervalo.current); intervalo.current = null; }
  };
  useEffect(() => parar, []);
  return (
    <button
      type="button" aria-label={rotulo} data-ativa={ativa ? "sim" : undefined}
      className={`tecla ${classe}`} style={{ flex: larga ?? 1 }}
      onPointerDown={(e) => {
        e.preventDefault(); acender(e.currentTarget);
        if (repetir) { onPress(); espera.current = window.setTimeout(() => { intervalo.current = window.setInterval(onPress, 55); }, 350); }
        else if (!aoSoltar) onPress();
      }}
      onPointerUp={() => { if (repetir) parar(); else if (aoSoltar) onPress(); }}
      onPointerLeave={parar} onPointerCancel={parar}
      onContextMenu={(e) => e.preventDefault()}
    >{children}</button>
  );
}

/** Teclado próprio do Voxix: segue o formato e as cores escolhidos e acende ao toque. */
export const Teclado = memo(function Teclado({ aoInserir, aoApagar, aoEnviar, inicioDeFrase, podeEnviar }: Props) {
  const v = useVisual();
  const t = v.teclado;
  const [pagina, setPagina] = useState<"letras" | "numeros" | "emojis">("letras");
  const [shift, setShift] = useState<"nao" | "uma" | "trava">("nao");
  const [popup, setPopup] = useState<{ letra: string; opcoes: string[] } | null>(null);
  const [recentes, setRecentes] = useState<string[]>(lerRecentes);
  const batidas = useRef(0);
  const segurou = useRef<number | null>(null);

  useEffect(() => () => { if (segurou.current) window.clearTimeout(segurou.current); }, []);

  const maiuscula = shift !== "nao" || (inicioDeFrase && pagina === "letras");

  const acender = (el: HTMLElement) => {
    batidas.current += 1;
    if (t.vibrar) { try { navigator.vibrate?.(8); } catch { /* sem vibração */ } }
    if (t.efeito === "nenhum") return;
    el.style.setProperty("--led", t.efeito === "brilho" ? "#ffffff" : corDoToque(t.led, t.ledCor, batidas.current));
    // a luz é só a transparência de uma camada por cima da tecla: não força o app a refazer o desenho da tela a cada toque
    try { el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: "ease-out", pseudoElement: "::after" }); } catch { /* sem luz neste aparelho */ }
  };

  const digitar = (s: string) => {
    aoInserir(s);
    if (shift === "uma") setShift("nao");
  };

  const parar = () => {
    if (segurou.current) { window.clearTimeout(segurou.current); segurou.current = null; }
  };

  // A letra entra assim que o dedo encosta. Se o dedo ficar, abre as variações com acento e a escolhida troca a letra já escrita.
  const comecoDeLetra = (e: PointerEvent<HTMLButtonElement>, letra: string) => {
    e.preventDefault();
    acender(e.currentTarget);
    digitar(maiuscula ? letra.toUpperCase() : letra);
    parar();
    const op = ACENTOS[letra];
    if (op) segurou.current = window.setTimeout(() => { setPopup({ letra, opcoes: op.map((o) => (maiuscula ? o.toUpperCase() : o)) }); }, 380);
  };
  const escolherAcento = (o: string) => { aoApagar(); aoInserir(o); setPopup(null); };

  const escolherEmoji = (e: string) => {
    aoInserir(e);
    const l = somarRecente(recentes, e);
    setRecentes(l);
    guardarRecentes(l);
  };

  const linhas = pagina === "numeros" ? NUMEROS : LETRAS;
  const alt = TECLADO_ALTURA[t.altura];

  return (
    <div className="teclado" style={{ "--alt-tecla": `${alt}px` } as CSSProperties} role="group" aria-label="Teclado do Voxix" onContextMenu={(e) => e.preventDefault()}>
      {pagina === "emojis" ? (
        <>
          <div className="mb-1 flex gap-1 overflow-x-auto rolagem pb-1" role="tablist" aria-label="Pacotes de emojis">
            {[{ id: RECENTES_ID, nome: "Recentes", icone: "🕘" }, ...PACOTES].map((p) => (
              <button key={p.id} type="button" role="tab" aria-selected={v.pacoteEmoji === p.id} aria-label={p.nome} title={p.nome}
                onPointerDown={(e) => { e.preventDefault(); }} onClick={() => mudarVisual({ pacoteEmoji: p.id })}
                className={`pacote ${v.pacoteEmoji === p.id ? "pacote-ativo" : ""}`}>{p.icone}</button>
            ))}
          </div>
          <div className="grade-emoji rolagem" style={{ maxHeight: alt * 3.4 }}>
            {(v.pacoteEmoji === RECENTES_ID ? recentes : (PACOTES.find((p) => p.id === v.pacoteEmoji) ?? PACOTES[0]).itens).map((e) => (
              <button key={e} type="button" className="emoji" onPointerDown={(ev) => { ev.preventDefault(); acender(ev.currentTarget); }} onClick={() => escolherEmoji(e)}>{e}</button>
            ))}
            {v.pacoteEmoji === RECENTES_ID && recentes.length === 0 && <p className="col-span-full py-4 text-center text-xs text-suave">Os emojis que você usar aparecem aqui.</p>}
          </div>
          <div className="linha-tecla">
            <Tecla acender={acender} rotulo="Voltar para as letras" onPress={() => setPagina("letras")} larga={1.6} classe="tecla-fn">ABC</Tecla>
            <Tecla acender={acender} rotulo="Espaço" onPress={() => aoInserir(" ")} larga={5}>espaço</Tecla>
            <Tecla acender={acender} rotulo="Apagar" onPress={aoApagar} repetir larga={1.6} classe="tecla-fn"><Icone nome="apagar" tam={22} /></Tecla>
            <Tecla acender={acender} rotulo="Enviar" onPress={() => { if (podeEnviar) aoEnviar(); }} aoSoltar larga={1.6} classe={`tecla-enviar ${podeEnviar ? "" : "opacity-50"}`}><Icone nome="enviar" tam={22} /></Tecla>
          </div>
        </>
      ) : (
        <>
          {popup && (
            <div className="popup-acento" role="menu" aria-label={`Variações de ${popup.letra}`}>
              {popup.opcoes.map((o) => <button key={o} type="button" role="menuitem" onPointerDown={(e) => { e.preventDefault(); escolherAcento(o); }}>{o}</button>)}
              <button type="button" aria-label="Fechar" onPointerDown={(e) => { e.preventDefault(); setPopup(null); }}><Icone nome="fechar" tam={18} /></button>
            </div>
          )}
          {linhas.map((l, i) => (
            <div key={i} className="linha-tecla" style={i === 1 && pagina === "letras" ? { paddingInline: "4%" } : undefined}>
              {i === 2 && (
                <Tecla acender={acender} rotulo="Maiúsculas" onPress={() => setShift((s) => (s === "nao" ? "uma" : s === "uma" ? "trava" : "nao"))} larga={1.5} ativa={shift !== "nao"} classe="tecla-fn"><Icone nome={shift === "trava" ? "shiftTrava" : "shift"} tam={22} /></Tecla>
              )}
              {l.map((ch) => (
                pagina === "letras" ? (
                  <button key={ch} type="button" className="tecla" style={{ flex: 1 }} aria-label={ch}
                    onPointerDown={(e) => comecoDeLetra(e, ch)} onPointerUp={parar} onPointerLeave={parar} onPointerCancel={parar} onContextMenu={(e) => e.preventDefault()}>
                    {maiuscula ? ch.toUpperCase() : ch}
                  </button>
                ) : <Tecla key={ch} acender={acender} rotulo={ch} onPress={() => digitar(ch)}>{ch}</Tecla>
              ))}
              {i === 2 && <Tecla acender={acender} rotulo="Apagar" onPress={aoApagar} repetir larga={1.5} classe="tecla-fn"><Icone nome="apagar" tam={22} /></Tecla>}
            </div>
          ))}
          <div className="linha-tecla">
            <Tecla acender={acender} rotulo={pagina === "letras" ? "Números e símbolos" : "Letras"} onPress={() => setPagina(pagina === "letras" ? "numeros" : "letras")} larga={1.3} classe="tecla-fn">{pagina === "letras" ? "123" : "ABC"}</Tecla>
            <Tecla acender={acender} rotulo="Emojis" onPress={() => setPagina("emojis")} larga={1.1} classe="tecla-fn"><Icone nome="emoji" tam={22} /></Tecla>
            <Tecla acender={acender} rotulo="Vírgula" onPress={() => digitar(",")} larga={0.8}>,</Tecla>
            <Tecla acender={acender} rotulo="Espaço" onPress={() => aoInserir(" ")} larga={3.2}>espaço</Tecla>
            <Tecla acender={acender} rotulo="Ponto" onPress={() => digitar(".")} larga={0.8}>.</Tecla>
            <Tecla acender={acender} rotulo="Nova linha" onPress={() => aoInserir("\n")} larga={1.1} classe="tecla-fn"><Icone nome="enter" tam={22} /></Tecla>
            <Tecla acender={acender} rotulo="Enviar" onPress={() => { if (podeEnviar) aoEnviar(); }} aoSoltar larga={1.3} classe={`tecla-enviar ${podeEnviar ? "" : "opacity-50"}`}><Icone nome="enviar" tam={22} /></Tecla>
          </div>
        </>
      )}
    </div>
  );
});
