// Teste visual: abre o app (já compilado em dist/) em vários tamanhos de tela e confere cada janela:
// cabe na tela, não estoura para o lado e todo botão dá para alcançar (direto ou rolando).
// Fotos de cada tela ficam em teste-visual/fotos/ (a publicação guarda como artefato).
// Rodar: npm run build && npm run test:visual   (CHROME=/caminho/do/chrome se o Chrome não for achado sozinho)
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { chromium } from "playwright-core";

const PORTA = 4179;
const FOTOS = new URL("./fotos/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(FOTOS, { recursive: true });

const TAMANHOS = [
  ["celular-pequeno", 320, 568],
  ["celular", 360, 640],
  ["celular-grande", 412, 915],
  ["celular-deitado", 740, 360],
  ["tablet", 768, 1024],
  ["janela-pequena", 800, 500],
  ["janela-windows", 1280, 720],
];

const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const VERSAO_TERMOS = src("apresentacao.ts").match(/VERSAO_DOS_TERMOS\s*=\s*(\d+)/)[1];

/** Dentro da página: devolve a lista de problemas encontrados nas janelas abertas. */
function conferirNaPagina() {
  const vw = innerWidth, vh = innerHeight, problemas = [];
  const visivel = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const nome = (e) => (e.getAttribute("aria-label") || e.textContent || e.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
  if (document.documentElement.scrollWidth > vw + 1) problemas.push(`a página estoura para o lado (${document.documentElement.scrollWidth}px > ${vw}px)`);
  const rolavel = (e) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1; };
  // janelas = elementos fixos que cobrem a tela
  const janelas = [...document.querySelectorAll("body *")].filter((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.position === "fixed" && r.width >= vw - 2 && r.height >= vh - 2 && visivel(e); });
  for (const j of janelas) {
    for (const cartao of [...j.children].filter(visivel)) {
      const r = cartao.getBoundingClientRect();
      if (r.bottom > vh + 1 || r.top < -1) problemas.push(`uma janela passa da altura da tela (${Math.round(r.top)}→${Math.round(r.bottom)} de ${vh}px) e não rola`);
      if (r.right > vw + 1 || r.left < -1) problemas.push(`uma janela passa da largura da tela (${Math.round(r.left)}→${Math.round(r.right)} de ${vw}px)`);
    }
    for (const b of j.querySelectorAll("button, a[href], input, select, textarea, [role=button]")) {
      if (!visivel(b)) continue;
      let pai = b.parentElement, rolagem = null;
      while (pai && pai !== j.parentElement) { if (rolavel(pai)) { rolagem = pai; break; } pai = pai.parentElement; }
      if (rolagem) { b.scrollIntoView({ block: "nearest" }); }
      const r = b.getBoundingClientRect();
      if (r.bottom > vh + 1 || r.top < -1 || r.right > vw + 1 || r.left < -1) problemas.push(`o botão "${nome(b)}" fica fora da tela e não dá para alcançar`);
    }
  }
  return [...new Set(problemas)];
}

const respostas = {
  "/voxix/perfil": { apelido: "teste", nome: "Teste", avatar: null },
  "/voxix/comunidades": { comunidades: [] },
  "/voxix/bloqueios": { bloqueios: [] },
  "/voxix/historico": { mensagens: [], mais: false },
  "/voxix/avatares": { avatares: {} },
};

async function abrir(browser, w, h, modo) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const sessao = JSON.stringify({ token: "teste", email: "teste@exemplo.com", nome: "Teste" });
  await ctx.addInitScript(([modo, sessao, termos]) => {
    if (modo === "primeira") return; // aparelho novo: apresentação completa
    localStorage.setItem("voxix.tour", "1"); localStorage.setItem("voxix.termos", termos); localStorage.setItem("voxix.sessao", sessao);
    if (modo === "atualizou") localStorage.setItem("voxix.novidades.vistas", "0"); // quem atualizou vê todas as novidades
    else localStorage.setItem("voxix.novidades.vistas", "9999");
  }, [modo, sessao, VERSAO_TERMOS]);
  await ctx.route(/workers\.dev/, async (rota) => {
    const caminho = new URL(rota.request().url()).pathname;
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    if (rota.request().method() === "OPTIONS") return rota.fulfill({ status: 204, headers: cors });
    await rota.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(respostas[caminho] ?? {}) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(`erro na página: ${e.message}`));
  await p.goto(`http://localhost:${PORTA}/`);
  return { ctx, p, erros };
}

// cada cenário: nome, modo de abertura, e passos para chegar na janela
const CENARIOS = [
  ["primeira-abertura", "primeira", async () => {}],
  ["o-que-ha-de-novo", "atualizou", async (p) => { await p.getByText("O que há de novo").first().waitFor(); }],
  ["tela-inicial", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").waitFor(); }],
  ["ajustes", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByRole("heading", { name: "Ajustes" }).waitFor(); }],
  ["ajustes-novidades", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByRole("button", { name: "O que há de novo" }).click(); await p.getByRole("button", { name: "Entendi" }).waitFor(); }],
  ["ajustes-termos", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByRole("button", { name: "Termos de uso" }).click(); await p.waitForTimeout(300); }],
  ["ajustes-tour", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByRole("button", { name: "Como o Voxix funciona" }).click(); await p.waitForTimeout(300); }],
  ["personalizar", "normal", async (p) => { await p.getByLabel("Abrir meus ajustes").click(); await p.getByText("Cores, formato, fundo e teclado").click(); await p.waitForTimeout(400); }],
  ["nova-conversa", "normal", async (p) => { await p.getByLabel("Nova conversa").click(); await p.waitForTimeout(300); }],
  ["comunidades-criar", "normal", async (p) => { await p.getByRole("tab", { name: /Comunidades/ }).click(); await p.getByRole("button", { name: /Criar/ }).click(); await p.waitForTimeout(300); }],
  ["comunidades-entrar", "normal", async (p) => { await p.getByRole("tab", { name: /Comunidades/ }).click(); await p.getByRole("button", { name: /Entrar/ }).click(); await p.waitForTimeout(300); }],
];

const preview = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORTA), "--strictPort"], { stdio: "ignore" });
const cromo = process.env.CHROME || ["/usr/bin/google-chrome", "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find(existsSync);
let falhas = 0, total = 0;
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://localhost:${PORTA}/`)).ok) break; } catch { /* ainda subindo */ } await new Promise((r) => setTimeout(r, 250)); }
  const browser = await chromium.launch(cromo ? { executablePath: cromo } : { channel: "chrome" });
  for (const [tam, w, h] of TAMANHOS) {
    for (const [nome, modo, passos] of CENARIOS) {
      total++;
      const { ctx, p, erros } = await abrir(browser, w, h, modo);
      let problemas = [];
      try {
        await passos(p);
        await p.waitForTimeout(150);
        problemas = await p.evaluate(conferirNaPagina);
      } catch (e) { problemas = [`não consegui abrir a tela: ${String(e.message).split("\n")[0]}`]; }
      problemas.push(...erros);
      await p.screenshot({ path: `${FOTOS}${nome}__${tam}.png` });
      if (problemas.length) { falhas++; console.log(`✗ ${nome} em ${tam} (${w}x${h}): ${problemas.join("; ")}`); } else console.log(`✓ ${nome} em ${tam}`);
      await ctx.close();
    }
  }
  await browser.close();
} finally { preview.kill(); }
console.log(`\n${total - falhas}/${total} telas ok`);
process.exit(falhas ? 1 : 0);
