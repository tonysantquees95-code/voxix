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
- O servidor do Voxix mora no repositório `vetorial-srrvidor` (`servidor/src/voxix/`), no mesmo Worker. Mudou rota ou regra lá, confira aqui.

## Teste visual das telas
- `app/teste-visual/telas.mjs` (`npm run build && npm run test:visual`) abre o app em 7 tamanhos (celular pequeno até janela do Windows) e confere cada janela: cabe na tela, não estoura para o lado e todo botão dá para alcançar. Roda na publicação e guarda as fotos como artefato `fotos-das-telas`.
- Tela ou janela nova: acrescente um cenário em `CENARIOS` nesse arquivo.

## Feedback e relato de erro
- Ajustes › Sobre tem "Enviar feedback" e "Reportar um erro": abrem `telas/FeedbackDoApp.tsx` (página do servidor `/feedback?app=voxix&v=<versão>&p=<plataforma>` num iframe, com o visual do app). Os relatos chegam no Painel Dev › Feedback. Windows: o CSP do `tauri.conf.json` precisa de `frame-src` do servidor. Cenário `feedback` no teste visual.

## Teste de segurança (igual em todos os apps da suíte)
- `app/teste/seguranca.test.mjs` roda junto com os outros testes e na publicação: se falhar, a publicação para. Confere o repositório inteiro: segredo escrito no código (chaves, tokens, senhas), arquivo que nunca pode ser versionado (.env, chaves de assinatura), CSP do Tauri sem `unsafe-eval`/curinga, manifesto do Android (debug, tráfego http, componente exposto sem permissão, `QUERY_ALL_PACKAGES`), `eval`, HTML montado com texto (`innerHTML`), endereço `http://` fora da máquina local, segredo no log, HTTPS desligado e WebView com acesso perigoso.
- Exceção justificada = uma linha em `seguranca.permitidos.json` (regra, arquivo, trecho e MOTIVO de verdade); sem motivo, não vale. Texto digitado pela pessoa ou vindo de site/servidor nunca entra em HTML sem escapar (`textContent` ou `esc()`).
- O arquivo é o mesmo em todos os apps: mudou uma regra? Mude em todos. Achou uma brecha nova? Escreva primeiro um teste que a reproduz.
