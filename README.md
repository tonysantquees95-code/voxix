# Voxix · Gaming Chat (Vetorial Tech)

Chat para gamers: conversas privadas, grupos e salas (voz ao vivo só em salas criadas pelos usuários). Login com o Vetorial ID.

- `app/` — interface (React + Vite + Tailwind), compartilhada pelo Android (Capacitor) e pelo Windows (Tauri).
- `desktop/` — casca do Windows (Tauri, instalador NSIS).
- Servidor: mora no repositório do servidor da Vênus (`servidor/src/voxix/`), no mesmo Cloudflare Worker (perfis, mensagens ao vivo por Durable Object, bloqueio, denúncia, ditado).
- CI (`.github/workflows/app.yml`): testa, gera `VoxixSetup.exe` e `Voxix.apk` e publica a release `1.N`.

## Decisões da primeira fase
- Histórico só no aparelho; o servidor guarda a mensagem apenas até a entrega (máx. 7 dias).
- Sem vídeo e sem mensagem de voz gravada: no lugar, botão de **ditado** (a fala vira texto). No Android usa o reconhecimento de voz do aparelho; no Windows grava até 30 s e o servidor transcreve.
- Arquivos leves (5 MB, 3 dias no servidor) — a chegar na próxima etapa.
- Etapa 1 pronta aqui: login, apelido, conversas privadas ao vivo, bloqueio, denúncia e ditado. Próximas: grupos, salas de texto, fotos leves, salas de voz.
