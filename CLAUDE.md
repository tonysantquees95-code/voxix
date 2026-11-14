# Voxix (Android + Windows) — notas para quem mexe no código

## Regra de ouro: toda mudança de função vai para a tela "O que há de novo"
- Qualquer melhoria que mude o que o app faz ou como se usa (função nova, fluxo melhorado, correção de erro visível) ganha uma linha em `app/src/novidades.ts`.
- `id` = o maior id existente + 1; `tipo` = `novo`, `melhoria` ou `correcao`; `titulo` curto; `texto` em português simples, dizendo o que mudou para a pessoa (não o que mudou no código).
- A tela aparece sozinha depois da atualização e mostra só o que a pessoa ainda não viu (não depende do número da versão). Na primeira instalação ela não aparece: quem explica é a apresentação.
- O teste `app/teste/novidades.test.mjs` confere ids, tipos e textos.

## Apresentação da primeira abertura
- Tour (telas passando) → permissões explicadas → termos a aceitar, em `app/src/telas/Apresentacao.tsx`; conteúdo em `app/src/apresentacao.ts`.
- Função nova: acrescente (ou ajuste) um passo em `TOUR`. Permissão nova: explique o porquê na tela de permissões ANTES de pedir. Mudou o texto dos termos: suba `VERSAO_DOS_TERMOS`.
- A apresentação e os termos também ficam em Ajustes › Sobre o Voxix.

## Servidor
- O servidor do Voxix mora no repositório da Vênus (`servidor/src/voxix/`), no mesmo Worker. Mudou rota ou regra lá, confira aqui.
