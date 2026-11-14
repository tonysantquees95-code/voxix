// Ditado: a pessoa fala e a fala vira texto, sem mandar áudio para ninguém.
//  • Android: reconhecimento de voz do próprio aparelho (de graça, sem usar o servidor).
//  • Windows/navegador: grava uma frase curta (até 30 s) e o servidor transcreve; o áudio não é guardado.
import { Capacitor } from "@capacitor/core";
import { SERVIDOR } from "./api";

export interface Ditado { parar: () => Promise<void> }
export interface Ganchos { aoTexto: (texto: string) => void; aoFim: () => void; aoErro: (mensagem: string) => void }

export const LIMITE_GRAVACAO_MS = 30_000;

export async function iniciarDitado(g: Ganchos, token: string): Promise<Ditado> {
  return Capacitor.isNativePlatform() ? ditadoNativo(g) : ditadoPeloServidor(g, token);
}

async function ditadoNativo(g: Ganchos): Promise<Ditado> {
  const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
  const { available } = await SpeechRecognition.available();
  if (!available) throw new Error("Este aparelho não tem reconhecimento de voz.");
  const permissao = await SpeechRecognition.requestPermissions();
  if (permissao.speechRecognition !== "granted") throw new Error("Libere o microfone para ditar.");
  const ouvintes: { remove: () => Promise<void> }[] = [];
  let encerrado = false;
  const finalizar = () => {
    if (encerrado) return;
    encerrado = true;
    for (const o of ouvintes) void o.remove();
    g.aoFim();
  };
  ouvintes.push(await SpeechRecognition.addListener("partialResults", (d: { matches?: string[] }) => { const t = d.matches?.[0]; if (t) g.aoTexto(t); }));
  ouvintes.push(await SpeechRecognition.addListener("listeningState", (d: { status: "started" | "stopped" }) => { if (d.status === "stopped") finalizar(); }));
  await SpeechRecognition.start({ language: "pt-BR", maxResults: 1, partialResults: true, popup: false });
  return { parar: async () => { try { await SpeechRecognition.stop(); } catch { /* já parou */ } finalizar(); } };
}

async function ditadoPeloServidor(g: Ganchos, token: string): Promise<Ditado> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Este aparelho não consegue gravar para ditar.");
  let fluxo: MediaStream;
  try { fluxo = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { throw new Error("Libere o microfone para ditar."); }
  const tipo = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const gravador = new MediaRecorder(fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: 24000 } : undefined);
  const partes: Blob[] = [];
  gravador.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
  const limite = setTimeout(() => { if (gravador.state !== "inactive") gravador.stop(); }, LIMITE_GRAVACAO_MS);
  gravador.onstop = () => {
    clearTimeout(limite);
    for (const t of fluxo.getTracks()) t.stop();
    void (async () => {
      try {
        const audio = new Blob(partes, { type: gravador.mimeType || "audio/webm" });
        if (!audio.size) return;
        const r = await fetch(`${SERVIDOR}/voxix/transcrever`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": audio.type }, body: audio, signal: AbortSignal.timeout(30000) });
        const d = (await r.json().catch(() => ({}))) as { texto?: string; error?: string };
        if (!r.ok) throw new Error(d.error ?? "Não consegui transcrever agora.");
        if (d.texto) g.aoTexto(d.texto);
      } catch (e) {
        g.aoErro(e instanceof Error ? e.message : "Não consegui transcrever agora.");
      } finally {
        g.aoFim();
      }
    })();
  };
  gravador.start();
  return { parar: async () => { if (gravador.state !== "inactive") gravador.stop(); } };
}
