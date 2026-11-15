import { useEffect, useState } from "react";
import { api, type Pessoa } from "../api";
import { BUILD, enderecoDoDownload, haNovaVersao, procurarVersao } from "../atualizacao";
import { useVoxix } from "../estado";
import { abrirLink } from "../link";
import { LogoTempestade } from "../logo";
import { Icone } from "../icones";
import { Personalizar } from "./Personalizar";
import { NOVIDADES } from "../novidades";
import { Novidades } from "./Novidades";
import { Termos, Tour } from "./Apresentacao";

export function Ajustes({ fechar }: { fechar: () => void }) {
  const { sessao, perfil, sair } = useVoxix();
  const [bloqueados, setBloqueados] = useState<Pessoa[] | null>(null);
  const [versao, setVersao] = useState("");
  const [novaVersao, setNovaVersao] = useState(false);
  const [ver, setVer] = useState<"tour" | "termos" | "novidades" | null>(null);
  const [personalizando, setPersonalizando] = useState(false);

  useEffect(() => { if (sessao) void api.bloqueios(sessao.token).then((r) => setBloqueados(r.bloqueios)).catch(() => setBloqueados([])); }, [sessao]);

  const desbloquear = async (a: string) => {
    if (!sessao) return;
    await api.desbloquear(sessao.token, a).catch(() => undefined);
    setBloqueados((l) => (l ?? []).filter((p) => p.apelido !== a));
  };
  const procurar = async () => {
    setVersao("Procurando…");
    let falha: "rede" | "servidor" | null = null;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const v = await procurarVersao();
        if (!v) { falha = "servidor"; continue; }
        if (haNovaVersao(BUILD, v.numero)) { setNovaVersao(true); setVersao(`Versão nova disponível: 1.${v.numero}. Toque em Baixar.`); }
        else { setNovaVersao(false); setVersao("Você já está na versão mais nova."); }
        return;
      } catch { falha = "rede"; }
    }
    setVersao(falha === "rede" ? "Sem conexão com a internet agora. Confira o Wi-Fi ou os dados e tente de novo." : "O servidor não respondeu agora. Tente de novo em instantes.");
  };

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-4" onClick={fechar}>
      <div onClick={(e) => e.stopPropagation()} className="rolagem max-h-full w-full max-w-sm space-y-4 overflow-y-auto rounded-2xl border border-borda bg-painel p-5">
        <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Ajustes</h2><button onClick={fechar} aria-label="Fechar" className="text-xl text-suave"><Icone nome="fechar" tam={22} /></button></div>
        <section><h3 className="text-sm font-bold text-suave">Conta</h3><p className="mt-1">@{perfil?.apelido} · {perfil?.nome}</p><p className="text-xs text-suave">{sessao?.email}</p></section>
        <section>
          <h3 className="text-sm font-bold text-suave">Personalizar</h3>
          <button onClick={() => setPersonalizando(true)} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-borda px-4 py-3 text-left">
            <LogoTempestade tam={40} />
            <span className="min-w-0 flex-1"><b className="block">Cores, formato, fundo e teclado</b><span className="block text-xs text-suave">Cor com RGB, formato dos ícones, papel de parede, emojis e o teclado do Voxix.</span></span>
            <span className="text-suave"><Icone nome="seta" tam={18} /></span>
          </button>
        </section>
        <section>
          <h3 className="text-sm font-bold text-suave">Bloqueados</h3>
          {bloqueados === null ? <p className="mt-1 text-sm text-suave">Carregando…</p> : bloqueados.length === 0 ? <p className="mt-1 text-sm text-suave">Ninguém bloqueado.</p> : bloqueados.map((p) => (
            <div key={p.apelido} className="mt-1 flex items-center justify-between text-sm"><span>@{p.apelido}</span><button onClick={() => void desbloquear(p.apelido)} className="text-neon underline">Desbloquear</button></div>
          ))}
        </section>
        <section>
          <h3 className="text-sm font-bold text-suave">Atualização</h3>
          <p className="mt-1 text-sm">Versão instalada: {BUILD > 0 ? `1.${BUILD}` : "desenvolvimento"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button onClick={() => void procurar()} className="rounded-xl border border-borda px-4 py-2 text-sm">Procurar atualizações</button>
            {novaVersao && <button onClick={() => abrirLink(enderecoDoDownload())} className="rounded-xl bg-neon px-4 py-2 text-sm font-bold text-white">Baixar</button>}
          </div>
          {versao && <p className="mt-1 text-xs text-suave" role="status">{versao}</p>}
        </section>
        <section>
          <h3 className="text-sm font-bold text-suave">Sobre o Voxix</h3>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <button onClick={() => setVer("tour")} className="rounded-xl border border-borda px-4 py-2 text-left">Como o Voxix funciona</button>
            <button onClick={() => setVer("novidades")} className="rounded-xl border border-borda px-4 py-2 text-left">O que há de novo</button>
            <button onClick={() => setVer("termos")} className="rounded-xl border border-borda px-4 py-2 text-left">Termos de uso</button>
          </div>
        </section>
        <p className="text-xs text-suave">As conversas ficam só neste aparelho. Se você sair da conta, o histórico continua guardado aqui.</p>
        <button onClick={() => void sair()} className="w-full rounded-xl border border-erro py-2.5 font-bold text-erro">Sair da conta</button>
      </div>
      {personalizando && <Personalizar fechar={() => setPersonalizando(false)} irParaInicio={fechar} />}
      {ver === "tour" && <div className="fixed inset-0 z-50 flex flex-col bg-fundo p-5" onClick={(e) => e.stopPropagation()}><div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col"><Tour rotuloFinal="Fechar" aoTerminar={() => setVer(null)} aoFechar={() => setVer(null)} /></div></div>}
      {ver === "termos" && <Termos aoFechar={() => setVer(null)} />}
      {ver === "novidades" && <Novidades itens={[...NOVIDADES].sort((a, b) => b.id - a.id)} aoFechar={() => setVer(null)} />}
    </div>
  );
}
