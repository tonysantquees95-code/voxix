// Telas que o teste visual visita no Voxix.
import { readFileSync } from "node:fs";
const TERMOS = readFileSync(new URL("../src/apresentacao.ts", import.meta.url), "utf8").match(/VERSAO_DOS_TERMOS\s*=\s*(\d+)/)[1];
const sessao = JSON.stringify({ token: "teste", email: "teste@exemplo.com", nome: "Teste" });

export default {
  porta: 4179,
  guardado: (modo) => modo === "primeira" ? {} : {
    "voxix.tour": "1", "voxix.termos": TERMOS, "voxix.sessao": sessao,
    "voxix.novidades.vistas": modo === "atualizou" ? "0" : "9999",
  },
  respostas: {
    "/voxix/perfil": { apelido: "teste", nome: "Teste", avatar: null },
    "/voxix/comunidades": { comunidades: [] },
    "/voxix/bloqueios": { bloqueios: [] },
    "/voxix/historico": { mensagens: [], mais: false },
    "/voxix/avatares": { avatares: {} },
  },
  cenarios: [
    ["primeira-abertura", "primeira", async () => {}],
    ["o-que-ha-de-novo", "atualizou", async (p) => { await p.getByText("O que há de novo").first().waitFor(); }],
    ["tela-inicial", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").waitFor(); }],
    ["ajustes", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByRole("heading", { name: "Ajustes" }).waitFor(); }],
    ["ajustes-novidades", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByRole("button", { name: "O que há de novo" }).click(); await p.getByRole("button", { name: "Entendi" }).waitFor(); }],
    ["ajustes-feedback", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByRole("button", { name: "Enviar feedback" }).click(); await p.getByText(/^FEEDBACK/).waitFor(); await p.waitForTimeout(300); }],
    ["ajustes-termos", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByRole("button", { name: "Termos de uso" }).click(); await p.waitForTimeout(300); }],
    ["ajustes-tour", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByRole("button", { name: "Como o Voxix funciona" }).click(); await p.waitForTimeout(300); }],
    ["personalizar", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByText("Cores, formato, fundo e teclado").click(); await p.waitForTimeout(400); }],
    ["nova-conversa", "normal", async (p) => { await p.getByLabel("Nova conversa").click(); await p.waitForTimeout(300); }],
    ["comunidades-criar", "normal", async (p) => { await p.getByRole("tab", { name: /Comunidades/ }).click(); await p.getByRole("button", { name: /Criar/ }).click(); await p.waitForTimeout(300); }],
    ["comunidades-entrar", "normal", async (p) => { await p.getByRole("tab", { name: /Comunidades/ }).click(); await p.getByRole("button", { name: /Entrar/ }).click(); await p.waitForTimeout(300); }],
  ],
};
