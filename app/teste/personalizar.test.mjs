import test from "node:test";
import assert from "node:assert/strict";
import { ICONES_PADRAO, limparIcones, TRACOS, ESCALAS_ICONE, coresDe, girarMatiz, hexDe, hexValido, limparVisual, limparTeclado, TECLADO_PADRAO, AJUSTE_MAX, limparLuz, rgbDe, TEMAS, VISUAL_PADRAO, temaDe } from "../src/personalizar.ts";

test("limparVisual: lixo volta ao padrão e valores válidos passam", () => {
  assert.deepEqual(limparVisual(null), VISUAL_PADRAO);
  assert.deepEqual(limparVisual({ cor: "x", luz: 5, formato: "oval", papelInicio: 5, teclado: "x" }), VISUAL_PADRAO);
  const v = limparVisual({ cor: "azul", luz: { modo: "branca", cor: "#112233" }, formato: "quadrado", papelConversa: { modelo: "grade", escurecer: 50 }, teclado: { forma: "futurista", efeito: "brilho" } });
  assert.equal(v.cor, "azul"); assert.deepEqual(v.luz, { modo: "branca", cor: "#112233" }); assert.equal(v.formato, "quadrado");
  assert.deepEqual(v.papelConversa, { modelo: "grade", escurecer: 50 });
  assert.equal(v.teclado.forma, "futurista"); assert.equal(v.teclado.efeito, "brilho"); assert.equal(v.teclado.usar, true);
});

test("o formato antigo (campo tema) ainda é lido", () => {
  assert.equal(limparVisual({ tema: "verde" }).cor, "verde");
});

test("cor personalizada em RGB: só #rrggbb vale", () => {
  assert.equal(limparVisual({ cor: "#12ab9f" }).cor, "#12ab9f");
  assert.equal(limparVisual({ cor: "#12ab9" }).cor, VISUAL_PADRAO.cor);
  assert.equal(limparVisual({ cor: "red" }).cor, VISUAL_PADRAO.cor);
  assert.equal(limparVisual({ teclado: { ledCor: "#zzzzzz" } }).teclado.ledCor, VISUAL_PADRAO.teclado.ledCor);
});

test("escurecer do papel fica entre 0 e 85", () => {
  assert.equal(limparVisual({ papelInicio: { modelo: "aurora", escurecer: 999 } }).papelInicio.escurecer, 85);
  assert.equal(limparVisual({ papelInicio: { modelo: "aurora", escurecer: -4 } }).papelInicio.escurecer, 0);
  assert.equal(limparVisual({ papelInicio: { modelo: "aurora", escurecer: "x" } }).papelInicio.escurecer, 35);
});

test("temas: ids únicos, cores em hexadecimal e tema desconhecido cai no primeiro", () => {
  assert.equal(new Set(TEMAS.map((t) => t.id)).size, TEMAS.length);
  for (const t of TEMAS) assert.match(t.neon + t.magenta, /^#[0-9a-f]{6}#[0-9a-f]{6}$/i);
  assert.equal(temaDe("não existe").id, TEMAS[0].id);
});

test("coresDe: tema pronto devolve as duas cores; RGB gera a segunda girando o matiz", () => {
  assert.deepEqual(coresDe("azul"), { neon: "#2563eb", magenta: "#7c3aed" });
  const c = coresDe("#ff0000");
  assert.equal(c.neon, "#ff0000");
  assert.notEqual(c.magenta, "#ff0000");
  assert.ok(hexValido(c.magenta));
  assert.deepEqual(coresDe("lixo"), coresDe(TEMAS[0].id));
});

test("girarMatiz e conversões de cor", () => {
  assert.equal(girarMatiz("#ff0000", 120), "#00ff00");
  assert.equal(girarMatiz("#ff0000", 360), "#ff0000");
  assert.equal(girarMatiz("#808080", 90), "#808080");
  assert.deepEqual(rgbDe("#0a141e"), [10, 20, 30]);
  assert.equal(hexDe(10, 20, 30), "#0a141e");
  assert.equal(hexDe(300, -5, 7.4), "#ff0007");
});

test("ícones: espessura, tamanho, estilo e cor só aceitam valores conhecidos", () => {
  assert.deepEqual(limparIcones(null), ICONES_PADRAO);
  assert.deepEqual(limparIcones({ traco: "grosso", tamanho: "grande", estilo: "suave", cor: "app" }), { traco: "grosso", tamanho: "grande", estilo: "suave", cor: "app" });
  assert.deepEqual(limparIcones({ traco: "enorme", tamanho: 3, estilo: "x", cor: null }), ICONES_PADRAO);
  assert.equal(limparVisual({ icones: { traco: "fino" } }).icones.traco, "fino");
  assert.deepEqual(limparVisual({}).icones, ICONES_PADRAO);
  assert.ok(TRACOS.fino < TRACOS.medio && TRACOS.medio < TRACOS.grosso);
  assert.ok(ESCALAS_ICONE.pequeno < ESCALAS_ICONE.medio && ESCALAS_ICONE.medio < ESCALAS_ICONE.grande);
});

test("luz do logo: padrão RGB, aceita só modos e cores válidos", () => {
  assert.equal(VISUAL_PADRAO.luz.modo, "rgb");
  assert.deepEqual(limparLuz({ modo: "arco-iris", cor: "verde" }), VISUAL_PADRAO.luz);
  assert.deepEqual(limparLuz({ modo: "cor", cor: "#FF8800" }), { modo: "cor", cor: "#ff8800" });
  assert.deepEqual(limparLuz(null), VISUAL_PADRAO.luz);
});

test("ajuste do toque: começa em zero, aceita pouco e nunca passa do limite", () => {
  assert.equal(TECLADO_PADRAO.ajusteX, 0);
  assert.equal(TECLADO_PADRAO.ajusteY, 0);
  assert.deepEqual([limparTeclado({}).ajusteX, limparTeclado({}).ajusteY], [0, 0]);
  const t = limparTeclado({ ajusteX: 6, ajusteY: -4 });
  assert.deepEqual([t.ajusteX, t.ajusteY], [6, -4]);
  const g = limparTeclado({ ajusteX: 99, ajusteY: -99 });
  assert.deepEqual([g.ajusteX, g.ajusteY], [AJUSTE_MAX, -AJUSTE_MAX]);
  assert.equal(limparTeclado({ ajusteX: "x" }).ajusteX, 0);
});
