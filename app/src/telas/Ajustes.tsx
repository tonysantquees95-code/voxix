import { useEffect, useState } from "react";
import { api, type Pessoa } from "../api";
import { BUILD, enderecoDoDownload, haNovaVersao, procurarVersao } from "../atualizacao";
import { useVoxix } from "../estado";
import { abrirLink } from "../link";

export function Ajustes({ fechar }: { fechar: () => void }) {
  const { sessao, perfil, sair } = useVoxix();
  const [bloqueados, setBloqueados] = useState<Pessoa[] | null>(null);
  const [versao, setVersao] = useState("");
  const [novaVersao, setNovaVersao] = useState(false);

  useEffect(() => { if (sessao) void api.bloqueios(sessao.token).then((r) => setBloqueados(r.bloqueios)).catch(() => setBloqueados([])); }, [sessao]);

  const desbloquear = async (a: string) => {
    if (!sessao) return;
    await api.desbloquear(sessao.token, a).catch(() => undefined);
    setBloqueados((l) => (l ?? []).filter((p) => p.apelido !== a));
  };
  const procurar = async () => {
    setVersao("Procurando…");
    try {
      const v = await procurarVersao();
      if (!v) setVersao("Não consegui consultar agora.");
      else if (haNovaVersao(BUILD, v.numero)) { setNovaVersao(true); setVersao(`Versão nova: 1.${v.numero}`); }
      else setVersao("Você está com a versão mais nova.");
    } catch { setVersao("Não consegui consultar agora."); }
  };

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-4" onClick={fechar}>
      <div onClick={(e) => e.stopPropagation()} className="rolagem max-h-full w-full max-w-sm space-y-4 overflow-y-auto rounded-2xl border border-borda bg-painel p-5">
        <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Ajustes</h2><button onClick={fechar} aria-label="Fechar" className="text-xl text-suave">✕</button></div>
        <section><h3 className="text-sm font-bold text-suave">Conta</h3><p className="mt-1">@{perfil?.apelido} · {perfil?.nome}</p><p className="text-xs text-suave">{sessao?.email}</p></section>
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
            {novaVersao && <button onClick={() => abrirLink(enderecoDoDownload())} className="rounded-xl bg-neon px-4 py-2 text-sm font-bold text-[#04121c]">Baixar</button>}
          </div>
          {versao && <p className="mt-1 text-xs text-suave" role="status">{versao}</p>}
        </section>
        <p className="text-xs text-suave">As conversas ficam só neste aparelho. Se você sair da conta, o histórico continua guardado aqui.</p>
        <button onClick={() => void sair()} className="w-full rounded-xl border border-erro py-2.5 font-bold text-erro">Sair da conta</button>
      </div>
    </div>
  );
}
