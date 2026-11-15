import test from "node:test";
import assert from "node:assert/strict";
import { limparVisual, temaDe, TEMAS, VISUAL_PADRAO } from "../src/personalizar.ts";

test("limparVisual: lixo volta ao padrão e valores válidos passam", () => {
  assert.deepEqual(limparVisual(null), VISUAL_PADRAO);
  assert.deepEqual(limparVisual({ tema: "x", tempestade: "sim", forca: 9 }), VISUAL_PADRAO);
  assert.deepEqual(limparVisual({ tema: "azul", tempestade: false, forca: "forte" }), { tema: "azul", tempestade: false, forca: "forte" });
});

test("temas: ids únicos, cores em hexadecimal e tema desconhecido cai no primeiro", () => {
  assert.equal(new Set(TEMAS.map((t) => t.id)).size, TEMAS.length);
  for (const t of TEMAS) assert.match(t.neon + t.magenta, /^#[0-9a-f]{6}#[0-9a-f]{6}$/i);
  assert.equal(temaDe("não existe").id, TEMAS[0].id);
});
