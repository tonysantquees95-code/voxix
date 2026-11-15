// Primeira abertura: conhecer as funções, entender as permissões e aceitar os termos.
// Mudou o texto dos termos: suba VERSAO_DOS_TERMOS e a pessoa aceita de novo.
export const VERSAO_DOS_TERMOS = 1;
const CHAVE_TERMOS = "voxix.termos";
const CHAVE_TOUR = "voxix.tour";

export interface PassoDoTour { icone: string; titulo: string; texto: string; como?: string[] }

export const TOUR: PassoDoTour[] = [
  { icone: "🎮", titulo: "Bem-vindo ao Voxix", texto: "O chat feito para gamers: conversa rápida como no WhatsApp, com a cara de comunidade do Discord.", como: ["Deslize ou toque em Próximo para conhecer as funções.", "Você pode rever esta apresentação quando quiser, nos Ajustes."] },
  { icone: "@", titulo: "Seu apelido", texto: "Seus amigos te encontram pelo apelido, não pelo e-mail nem pelo telefone.", como: ["Você escolhe o apelido uma vez, depois do login.", "Ele não muda depois: pense com carinho."] },
  { icone: "💬", titulo: "Conversas ao vivo", texto: "As mensagens chegam na hora. O histórico fica só no seu aparelho; o servidor guarda a mensagem apenas até ela ser entregue.", como: ["Toque no + e digite o apelido exato de um amigo.", "Se a internet cair, a mensagem espera e é reenviada quando você tocar nela."] },
  { icone: "🎤", titulo: "Ditado por microfone", texto: "Não quer digitar? Toque no microfone e fale: a fala vira texto, sem mandar áudio gravado para ninguém.", como: ["No Android usa o reconhecimento de voz do próprio aparelho.", "No Windows grava até 30 segundos só para transcrever; o áudio não fica guardado."] },
  { icone: "🛡️", titulo: "Você no controle", texto: "Bloqueie quem incomoda (a pessoa não percebe) e denuncie abusos com dois toques.", como: ["Na conversa, toque nos três pontinhos.", "Em Ajustes você vê e desbloqueia quem bloqueou.", "Apagar uma conversa só apaga neste aparelho."] },
  { icone: "🎨", titulo: "Deixe do seu jeito", texto: "Cor do app (pronta ou a sua, no RGB), formato dos ícones, papel de parede, emojis e um teclado só do Voxix que acende ao toque.", como: ["Abra Ajustes › Personalizar.", "O emblema e a tempestade de luz seguem a cor que você escolher.", "O teclado do Voxix dá para desligar e voltar ao do aparelho."] },
  { icone: "🚀", titulo: "O que vem por aí", texto: "Esta é a fase de testes. Estão a caminho: grupos, salas de texto, fotos leves (até 5 MB) e salas de voz ao vivo criadas por você.", como: ["A cada atualização, o Voxix mostra o que mudou.", "Achou um problema? Use Denunciar ou conte para o Toni."] },
];

export const TERMOS: { titulo: string; texto: string }[] = [
  { titulo: "1. O que é o Voxix", texto: "O Voxix é um aplicativo de conversa para gamers da Vetorial Tech. Nesta fase ele está em testes (beta): pode ter erros, mudar e ficar fora do ar sem aviso." },
  { titulo: "2. Conta e apelido", texto: "Você entra com o seu Vetorial ID e escolhe um apelido, que não pode ser trocado depois. Você é responsável pela sua conta e por tudo que é feito com ela. Não use apelido que imite outra pessoa, a equipe ou marcas." },
  { titulo: "3. Quem pode usar", texto: "Nesta fase de testes o Voxix é só para maiores de 18 anos. Se você tem menos de 18, não use o aplicativo." },
  { titulo: "4. Como se comportar", texto: "É proibido assediar, ameaçar, discriminar, enviar conteúdo sexual envolvendo menores, golpes, spam, conteúdo ilegal ou que exponha dados de outras pessoas. Quem fizer isso pode ter a conta bloqueada, e casos graves podem ser encaminhados às autoridades." },
  { titulo: "5. Suas mensagens e a sua privacidade", texto: "O histórico das conversas fica somente no seu aparelho. O servidor guarda cada mensagem só até ela ser entregue (no máximo 7 dias) e depois apaga. O Voxix não lê as suas conversas. Se você denunciar alguém, o trecho que você enviar junto com a denúncia é guardado para a revisão. Se você apagar o app ou trocar de aparelho, o histórico do aparelho antigo não volta." },
  { titulo: "6. Microfone e ditado", texto: "O microfone só é usado quando você toca no botão de ditado. No Android, o reconhecimento de voz é feito pelo serviço de voz do próprio aparelho, que pode seguir as regras do fabricante (por exemplo, a Google). No Windows, o áudio de até 30 segundos é enviado ao servidor da Vetorial Tech apenas para virar texto, e não é guardado." },
  { titulo: "7. Bloqueios e denúncias", texto: "Você pode bloquear qualquer pessoa. A pessoa bloqueada não é avisada, mas suas mensagens deixam de chegar até você. Denúncias são analisadas pela equipe, que pode suspender contas." },
  { titulo: "8. Garantias", texto: "O Voxix é oferecido como está, sem garantia de entrega das mensagens ou de funcionamento contínuo. A Vetorial Tech não se responsabiliza por mensagens perdidas, pelo conteúdo enviado por outras pessoas nem por uso em desacordo com a lei." },
  { titulo: "9. Mudanças", texto: "Estes termos podem mudar. Quando mudarem, o Voxix pede que você aceite de novo antes de continuar." },
];

export const termosAceitos = (): boolean => {
  try { return localStorage.getItem(CHAVE_TERMOS) === String(VERSAO_DOS_TERMOS); } catch { return false; }
};
export const aceitarTermos = (): void => {
  try { localStorage.setItem(CHAVE_TERMOS, String(VERSAO_DOS_TERMOS)); } catch { /* sem armazenamento: pede de novo */ }
};
export const tourVisto = (): boolean => {
  try { return localStorage.getItem(CHAVE_TOUR) === "1"; } catch { return false; }
};
export const marcarTourVisto = (): void => {
  try { localStorage.setItem(CHAVE_TOUR, "1"); } catch { /* ok */ }
};
/** Precisa mostrar a apresentação (tour + permissões + termos) antes de usar? */
export const precisaApresentar = (): boolean => !termosAceitos() || !tourVisto();
