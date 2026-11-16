import { memo, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Icone } from "./icones";
import { PACOTES, RECENTES_ID, guardarRecentes, lerRecentes, somarRecente } from "./emojis";
import { mudarVisual, type EfeitoToque } from "./personalizar";
import { ACENTOS, DICAS, LETRAS, LINHA_NUMEROS, NUMEROS, TECLADO_ALTURA } from "./edicaoTeclado";
import { useVisual } from "./useVisual";

interface Props {
  aoInserir: (s: string) => void;
  aoApagar: () => void;
  aoEnviar: () => void;
  /** true quando o próximo caractere começa uma frase (a primeira letra sai maiúscula). */
  inicioDeFrase: boolean;
  podeEnviar: boolean;
}

const RGB = ["#ff2a2a", "#2aff5a", "#2a6bff"];

/** A luz que corre pelas bordas do teclado, no sentido do relógio. */
function BordaLuz({ efeito }: { efeito: EfeitoToque }) {
  if (efeito === "nenhum") return null;
  const cor = (n: number) => (efeito === "brilho" ? "#fff" : efeito === "cor" ? "var(--color-neon)" : RGB[n % 3]);
  const lados: [string, number, number][] = [["t", 90, 0], ["d", 180, 1], ["b", 270, 2], ["e", 0, 0]];
  return <>{lados.map(([l, grau, n], k) => <div key={l} className={`borda-luz ${l}`} aria-hidden="true"><i style={{ backgroundImage: `linear-gradient(${grau}deg, transparent, ${cor(n)})`, animationDelay: `${-k * 0.75}s` }} /></div>)}</>;
}

/** Uma luz que corre no vão embaixo de uma fileira de teclas; as fileiras vão e voltam, uma em cada direção. */
function Faixa({ n, efeito }: { n: number; efeito: EfeitoToque }) {
  if (efeito === "nenhum") return null;
  const cor = efeito === "brilho" ? "#fff" : efeito === "cor" ? "var(--color-neon)" : RGB[n % 3];
  const volta = n % 2 === 1;
  return <div className="faixa-luz" aria-hidden="true"><i className={volta ? "volta" : ""} style={{ backgroundImage: `linear-gradient(${volta ? 270 : 90}deg, transparent, ${cor})`, animationDelay: `${-n * 0.7}s` }} /></div>;
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
        e.preventDefault();
        const el = e.currentTarget;
        if (repetir) { onPress(); acender(el); espera.current = window.setTimeout(() => { intervalo.current = window.setInterval(onPress, 55); }, 350); }
        else if (!aoSoltar) { onPress(); acender(el); } // primeiro a letra entra; luz e vibração vêm depois, sem atrasar o texto
        else acender(el);
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
  const segurou = useRef<number | null>(null);
  const ultimaVibracao = useRef(0);

  useEffect(() => () => { if (segurou.current) window.clearTimeout(segurou.current); }, []);

  const maiuscula = shift !== "nao" || (inicioDeFrase && pagina === "letras");

  const acender = (_el: HTMLElement) => {
    const agora = performance.now();
    if (t.vibrar && agora - ultimaVibracao.current > 35) { ultimaVibracao.current = agora; window.setTimeout(() => { try { navigator.vibrate?.(8); } catch { /* sem vibração */ } }, 0); }
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
    const el = e.currentTarget;
    digitar(maiuscula ? letra.toUpperCase() : letra);
    acender(el);
    parar();
    const acentos = ACENTOS[letra] ?? [];
    const dica = DICAS[letra];
    if (acentos.length) {
      // segurar abre as variações (o símbolo pequeno da tecla vem junto); a escolhida troca a letra já escrita
      const opcoes = [...(dica ? [dica] : []), ...acentos].map((o) => (maiuscula ? o.toUpperCase() : o));
      segurou.current = window.setTimeout(() => setPopup({ letra, opcoes }), 380);
    } else if (dica) {
      // como no teclado do celular: segurar uma letra sem acento digita o símbolo pequeno dela
      segurou.current = window.setTimeout(() => { aoApagar(); aoInserir(dica); }, 380);
    }
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
      <BordaLuz efeito={t.efeito} />
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
          {pagina === "letras" && (
            <div className="linha-tecla">
              {LINHA_NUMEROS.map((n) => <Tecla key={n} acender={acender} rotulo={n} onPress={() => digitar(n)} classe="tecla-num">{n}</Tecla>)}
              <Faixa n={0} efeito={t.efeito} />
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
                    {DICAS[ch] && <span className="dica" aria-hidden="true">{DICAS[ch]}</span>}
                    {maiuscula ? ch.toUpperCase() : ch}
                  </button>
                ) : <Tecla key={ch} acender={acender} rotulo={ch} onPress={() => digitar(ch)}>{ch}</Tecla>
              ))}
              {i === 2 && <Tecla acender={acender} rotulo="Apagar" onPress={aoApagar} repetir larga={1.5} classe="tecla-fn"><Icone nome="apagar" tam={22} /></Tecla>}
              <Faixa n={i + (pagina === "letras" ? 1 : 0)} efeito={t.efeito} />
            </div>
          ))}
          <div className="linha-tecla">
            <Tecla acender={acender} rotulo={pagina === "letras" ? "Números e símbolos" : "Letras"} onPress={() => setPagina(pagina === "letras" ? "numeros" : "letras")} larga={1.5} classe="tecla-fn">{pagina === "letras" ? "?123" : "ABC"}</Tecla>
            <Tecla acender={acender} rotulo="Vírgula" onPress={() => digitar(",")} larga={1}>,</Tecla>
            <Tecla acender={acender} rotulo="Emojis" onPress={() => setPagina("emojis")} larga={1} classe="tecla-fn"><Icone nome="emoji" tam={22} /></Tecla>
            <Tecla acender={acender} rotulo="Espaço" onPress={() => aoInserir(" ")} larga={5.4} classe="tecla-espaco">espaço</Tecla>
            <Tecla acender={acender} rotulo="Ponto" onPress={() => digitar(".")} larga={1}>.</Tecla>
            <Tecla acender={acender} rotulo="Nova linha" onPress={() => aoInserir("\n")} larga={1.5} classe="tecla-fn"><Icone nome="enter" tam={22} /></Tecla>
          </div>
        </>
      )}
    </div>
  );
});
