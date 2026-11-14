import { useState } from "react";
import { useVoxix } from "./estado";
import { Entrar } from "./telas/Entrar";
import { CriarPerfil } from "./telas/CriarPerfil";
import { Principal } from "./telas/Principal";
import { Logo } from "./logo";

export function App() {
  const { sessao, perfil } = useVoxix();
  const [, forcar] = useState(0);
  if (!sessao) return <Entrar />;
  if (perfil === undefined) return <Carregando />;
  if (perfil === null) return <CriarPerfil aoCriar={() => forcar((n) => n + 1)} />;
  return <Principal />;
}

function Carregando() {
  return <div className="grid h-full place-items-center"><Logo tam={64} className="gravando" /></div>;
}
