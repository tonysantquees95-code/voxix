import { useEffect, useState } from "react";
import { lista, totalNaoLidas } from "../armazem";
import { BUILD, haNovaVersao, procurarVersao } from "../atualizacao";
import { useVoxix } from "../estado";
import { Logo, LogoTempestade } from "../logo";
import { PapelDeParede } from "../papel";
import { Ajustes } from "./Ajustes";
import { Conversa } from "./Conversa";
import { NovaConversa } from "./NovaConversa";

const hora = (t: number): string => {
  const d = new Date(t);
  const hoje = new Date();
  return d.toDateString() === hoje.toDateString() ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export function Principal() {
  const { armazem, aberta, abrir, conexao, perfil } = useVoxix();
  const [painel, setPainel] = useState<"nova" | "ajustes" | null>(null);
  const conversas = lista(armazem);
  const naoLidas = totalNaoLidas(armazem);

  return (
    <div className="grid h-full md:grid-cols-[340px_1fr]">
      <aside className={`${aberta ? "hidden md:flex" : "flex"} relative min-h-0 flex-col overflow-hidden border-r border-borda bg-painel`}>
        <PapelDeParede qual="inicio" />
        <header className="relative z-[1] flex items-center gap-3 px-4 py-3">
          <Logo tam={32} />
          <div className="min-w-0 flex-1">
            <div className="font-extrabold leading-tight">Voxix{naoLidas > 0 && <span className="ml-2 rounded-full bg-magenta px-2 py-0.5 text-xs text-[#1a0620]">{naoLidas}</span>}</div>
            <div className="truncate text-xs text-suave">@{perfil?.apelido} · <span className={conexao === "conectado" ? "text-ok" : conexao === "conectando" ? "text-aviso" : "text-erro"}>{conexao === "conectado" ? "ao vivo" : conexao === "conectando" ? "conectando…" : "sem conexão"}</span></div>
          </div>
          <button onClick={() => setPainel("nova")} aria-label="Nova conversa" className="botao-redondo grid h-9 w-9 place-items-center bg-neon text-xl font-bold text-white">+</button>
          <button onClick={() => setPainel("ajustes")} aria-label="Ajustes" className="botao-redondo grid h-9 w-9 place-items-center border border-borda text-lg">⚙</button>
        </header>
        <div className="relative z-[1]"><Aviso /></div>
        <div className="rolagem relative z-[1] min-h-0 flex-1 overflow-y-auto">
          {conversas.length === 0 && <p className="px-6 py-10 text-center text-sm text-suave">Nenhuma conversa ainda. Toque no <b className="text-neon">+</b> e procure um amigo pelo apelido.</p>}
          {conversas.map((c) => {
            const ult = c.mensagens[c.mensagens.length - 1];
            return (
              <button key={c.apelido} onClick={() => abrir(c.apelido)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 ${aberta === c.apelido ? "bg-white/10" : ""}`}>
                <span className="avatar grid h-11 w-11 flex-none place-items-center bg-gradient-to-br from-neon to-magenta font-extrabold text-white">{c.nome.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2"><b className="truncate">{c.nome}</b><span className="flex-none text-xs text-suave">{ult ? hora(ult.criado) : ""}</span></span>
                  <span className="flex justify-between gap-2"><span className="truncate text-sm text-suave">{ult ? `${ult.minha ? "Você: " : ""}${ult.corpo}` : "Diga oi!"}</span>{c.naoLidas > 0 && <span className="flex-none rounded-full bg-magenta px-2 text-xs font-bold text-[#1a0620]">{c.naoLidas}</span>}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>
      <main className={`${aberta ? "flex" : "hidden md:flex"} relative min-h-0 flex-col`}>
        {!aberta && <PapelDeParede qual="inicio" />}
        {aberta ? <Conversa apelido={aberta} /> : <div className="relative z-[1] m-auto text-center text-suave"><LogoTempestade tam={72} className="mx-auto mb-3" /><p>Escolha uma conversa</p></div>}
      </main>
      {painel === "nova" && <NovaConversa fechar={() => setPainel(null)} />}
      {painel === "ajustes" && <Ajustes fechar={() => setPainel(null)} />}
    </div>
  );
}

/** Aviso de versão nova (confere uma vez ao abrir). */
function Aviso() {
  const [nova, setNova] = useState<number | null>(null);
  useEffect(() => {
    let vivo = true;
    void procurarVersao().then((v) => { if (vivo && v && haNovaVersao(BUILD, v.numero)) setNova(v.numero); }).catch(() => undefined);
    return () => { vivo = false; };
  }, []);
  if (!nova) return null;
  return <div className="mx-4 mb-2 rounded-xl border border-neon/40 bg-neon/10 px-3 py-2 text-xs">Há uma versão nova do Voxix (1.{nova}). Abra os <b>Ajustes</b> para atualizar.</div>;
}
