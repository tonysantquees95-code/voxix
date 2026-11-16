#!/usr/bin/env python3
"""Gera app/src/ptbr-palavras.txt: as palavras mais usadas do português, da mais comum para a menos comum.
Uso: pip install wordfreq && python3 app/scripts/gerar-dicionario.py
(O corretor do Voxix usa a ordem do arquivo como "frequência": quanto mais no começo, mais comum.)"""
import re, unicodedata, pathlib
from wordfreq import top_n_list, zipf_frequency

N = 70000
VALIDA = re.compile(r"^[a-záàâãçéêíóôõúü]+$")
UMA_LETRA = {"a", "e", "o", "é", "à"}
# Gírias e termos de jogo que o corretor não pode "consertar".
EXTRAS = ("gg wp ez noob noobs lag ping fps rpg mmo mmorpg pvp pve boss loot buff nerf afk brb kk kkk kkkk rsrs vc vcs pq tbm blz mano mn "
          "vdd td tds tô tá tão né pra pro bora salve valeu fala opa eae mlk mn migs gamer gamers stream live skin skins clan guild "
          "voxix vindex vortex").split()

def sem_acento(p: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", p) if unicodedata.category(c) != "Mn")

brutas = [p for p in top_n_list("pt", 100000) if VALIDA.match(p) and (len(p) > 1 or p in UMA_LETRA)]
freq = {p: zipf_frequency(p, "pt") for p in brutas}
por_chave: dict[str, list[str]] = {}
for p in brutas:
    por_chave.setdefault(sem_acento(p), []).append(p)

fora = set()
for chave, formas in por_chave.items():
    if len(formas) < 2 or chave not in freq:
        continue
    melhor_acentuada = max((freq[f] for f in formas if f != chave), default=0)
    # "voce", "nao", "ja": a forma sem acento só aparece porque muita gente escreve assim; é erro, não palavra.
    if melhor_acentuada - freq[chave] >= 0.9:
        fora.add(chave)

# "voçê", "vocé": formas acentuadas erradas, muito mais raras que a certa ("você") com a mesma escrita sem acento.
for chave, formas in por_chave.items():
    acentuadas = [f for f in formas if f != chave]
    if len(acentuadas) < 2:
        continue
    melhor = max(freq[f] for f in acentuadas)
    fora.update(f for f in acentuadas if melhor - freq[f] >= 0.9)

lista = [p for p in brutas if p not in fora][:N]
vistos = set(lista)
lista += [e for e in EXTRAS if e not in vistos]
saida = pathlib.Path(__file__).resolve().parent.parent / "src" / "ptbr-palavras.txt"
saida.write_text("\n".join(lista) + "\n", encoding="utf-8")
print(len(lista), "palavras;", len(fora), "formas tratadas como erro de escrita")
