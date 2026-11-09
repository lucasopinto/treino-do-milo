// Currículo de treino: comandos e truques, cada um com 4 níveis.
// Método: reforço positivo, sessões curtas, "isso!" no momento exato + petisco, sem punição.
import type { SkillId } from '../domain/types'

export interface LevelContent {
  /** Onde/como se treina neste nível (ex.: "Dentro de casa"). */
  name: string
  /** Passo a passo. */
  steps: string[]
  /** O que conta como acerto. */
  success: string
}

export interface SkillContent {
  id: SkillId
  kind: 'comando' | 'truque'
  name: string
  /** Palavra ou gesto que se usa. */
  cue: string
  summary: string
  levels: [LevelContent, LevelContent, LevelContent, LevelContent]
  tips: string[]
}

/** Etapas comuns a todos: o 4º nível é o "Firme". */
export const LEVEL_STAGES = ['Aprendendo', 'Pegando o jeito', 'Com distração', 'Firme'] as const

export const ADVANCE_RULE =
  'Avance quando ele acertar 80% ou mais em 3 sessões seguidas neste nível (com pelo menos 5 tentativas por sessão).'

export const METHOD_BASICS = [
  'Sessões curtas: 5 a 10 minutos, 2 a 3 vezes por dia.',
  'Diga "isso!" no instante exato do acerto e dê o petisco logo em seguida.',
  'Errou? Sem bronca. Só não ganha petisco. Facilite e tente de novo.',
  '3 erros seguidos: volte um passo, deixe mais fácil.',
  'Sempre termine com um acerto, pedindo algo que ele já sabe.',
]

export const SKILLS: SkillContent[] = [
  {
    id: 'atencao',
    kind: 'comando',
    name: 'Atenção ao nome',
    cue: 'O nome dele, uma vez, em tom alegre',
    summary: 'Ele olha para você quando ouve o nome. É a base de todos os outros comandos.',
    levels: [
      {
        name: 'Dentro de casa, sem distração',
        steps: [
          'Fique perto dele, num cômodo calmo, com petiscos pequenos no bolso.',
          'Espere ele olhar para outro lado. Diga o nome UMA vez, em tom alegre.',
          'No instante em que ele virar a cabeça para você: "isso!" e petisco.',
          'Se não olhar em 2 segundos, faça um barulhinho com a boca. Quando olhar, marque e recompense. Na próxima, chegue mais perto.',
          'Não repita o nome várias vezes: ele aprende que pode ignorar as primeiras.',
        ],
        success: 'Vira a cabeça para você em até 2 segundos depois de um único chamado.',
      },
      {
        name: 'Outros cômodos e quintal',
        steps: [
          'Chame quando ele estiver a 2 ou 3 metros, entretido com algo leve (cheirando o chão, mastigando brinquedo).',
          'Marque "isso!" assim que ele olhar e leve o petisco até ele.',
          'Varie o lugar: sala, cozinha, quintal.',
        ],
        success: 'Olha de primeira, mesmo entretido com algo leve e a alguns metros.',
      },
      {
        name: 'Na rua, durante o passeio',
        steps: [
          'Comece em trechos calmos da rua, com a guia.',
          'Chame quando ele estiver cheirando algo. Marque e recompense com um petisco melhor que o de casa.',
          'Aos poucos, chame com pessoas ou cachorros ao longe.',
        ],
        success: 'Olha para você no passeio, com distrações ao longe.',
      },
      {
        name: 'Firme: em qualquer lugar',
        steps: [
          'Chame em situações novas e com mais distração.',
          'Recompense com petisco em parte das vezes; nas outras, elogio animado ou carinho.',
          'Continue usando o nome só para coisas boas.',
        ],
        success: 'Responde de primeira em qualquer lugar.',
      },
    ],
    tips: ['Nunca use o nome para dar bronca ou para algo que ele não gosta (banho, remédio).'],
  },
  {
    id: 'senta',
    kind: 'comando',
    name: 'Senta',
    cue: '"Senta" + mão subindo',
    summary: 'Sentar com o bumbum no chão. Ótimo para pedir antes da comida, do passeio e do carinho.',
    levels: [
      {
        name: 'Com petisco na mão',
        steps: [
          'Com ele em pé, encoste o petisco no focinho.',
          'Leve a mão devagar para cima e um pouco para trás, por cima da cabeça. O traseiro desce sozinho.',
          'No instante em que o bumbum tocar o chão: "isso!" e petisco.',
          'Se ele pular, a mão está alta demais. Se ele andar para trás, faça perto de uma parede.',
          'Depois de uns 5 acertos seguidos, diga "senta" logo antes do gesto.',
        ],
        success: 'Senta seguindo a mão com o petisco.',
      },
      {
        name: 'Só o gesto, em vários cômodos',
        steps: [
          'Faça o mesmo gesto com a mão vazia. O petisco sai do bolso depois do "isso!".',
          'Diga "senta" e espere 2 segundos antes de fazer o gesto, para ele começar a responder só à palavra.',
          'Treine na sala, na cozinha e no quarto.',
        ],
        success: 'Senta com a palavra ou com o gesto, sem petisco à vista.',
      },
      {
        name: 'Quintal e rua',
        steps: [
          'Peça "senta" no quintal e no passeio, antes de atravessar a rua.',
          'Use na regra "nada é de graça": antes da comida, da guia, da bolinha.',
          'Se não sentar, chegue mais perto ou vá para um lugar mais calmo.',
        ],
        success: 'Senta com a palavra mesmo com distração.',
      },
      {
        name: 'Firme: qualquer lugar',
        steps: [
          'Peça uma vez só, em qualquer lugar.',
          'Peça para ficar sentado 3 segundos antes de marcar.',
          'Petisco às vezes; elogio sempre.',
        ],
        success: 'Senta de primeira só com a palavra, e fica uns segundos.',
      },
    ],
    tips: ['Não empurre o traseiro dele: deixe ele descobrir sozinho.'],
  },
  {
    id: 'deixa',
    kind: 'comando',
    name: 'Deixa',
    cue: '"Deixa"',
    summary: 'Desistir de algo que ele quer pegar. Importante para a segurança na rua.',
    levels: [
      {
        name: 'Petisco na mão fechada',
        steps: [
          'Feche um petisco no punho e mostre perto do focinho. Ele vai cheirar, lamber, talvez morder de leve. Espere, sem falar nada.',
          'No instante em que ele afastar o focinho da mão: "isso!" e dê um petisco da OUTRA mão.',
          'Nunca dê o petisco que estava no punho: a lição é "deixar aquele traz outro".',
          'Quando ele já afastar rápido, diga "deixa" ao mostrar o punho.',
        ],
        success: 'Afasta o focinho da mão fechada.',
      },
      {
        name: 'Mão aberta e chão coberto',
        steps: [
          'Mostre o petisco na mão aberta. Se ele avançar, feche a mão. Marque quando ele não tentar pegar.',
          'Depois ponha o petisco no chão e cubra com a mão ou o pé.',
          'Recompense sempre com outro petisco, da outra mão.',
        ],
        success: 'Não tenta pegar o petisco na mão aberta nem no chão coberto.',
      },
      {
        name: 'Chão descoberto e brinquedos',
        steps: [
          'Ponha o petisco no chão, descoberto, com você do lado para cobrir se precisar.',
          'Use também brinquedos e meias.',
          'No quintal, espalhe "iscas" e passe com ele na guia.',
        ],
        success: 'Deixa algo no chão com você por perto, só com a palavra.',
      },
      {
        name: 'Firme: na rua',
        steps: [
          'No passeio, diga "deixa" ao passar por coisas no chão.',
          'Recompense muito bem: na rua é mais difícil.',
        ],
        success: 'Deixa coisas no chão na rua, de primeira, e olha para você.',
      },
    ],
    tips: ['Use petiscos sem graça no chão e um petisco melhor como prêmio.'],
  },
  {
    id: 'aqui',
    kind: 'comando',
    name: 'Aqui',
    cue: '"Aqui!" alegre, abaixando o corpo',
    summary: 'Vir até você quando chamado. O comando mais importante para a segurança.',
    levels: [
      {
        name: 'Dentro de casa',
        steps: [
          'Com ele a 1 ou 2 metros, diga "aqui!" em tom alegre e abaixe-se, ou dê uns passos para trás.',
          'Quando ele chegar até você: "isso!" e um petisco muito gostoso.',
          'Antes de dar o petisco, encoste de leve na coleira (para ele se acostumar a ser segurado).',
          'Aumente a distância aos poucos e chame de outros cômodos.',
        ],
        success: 'Vem direto até você dentro de casa.',
      },
      {
        name: 'Quintal',
        steps: [
          'No quintal, comece perto, depois 5 metros, depois mais.',
          'Brinque de esconde-esconde: um segura, o outro chama ("aqui!") e se esconde.',
          'Ele chegou? Festa e petisco.',
        ],
        success: 'Vem direto no quintal, de qualquer lugar.',
      },
      {
        name: 'Rua com guia longa',
        steps: [
          'Use uma guia longa (5 a 10 metros) em lugar calmo, como uma praça vazia.',
          'Deixe ele se afastar, chame "aqui!" e ande para trás.',
          'Se não vier, não puxe a guia: chame de novo mais animado ou faça barulho. Na próxima, chame mais perto.',
        ],
        success: 'Vem até você na rua com a guia longa, sem precisar puxar.',
      },
      {
        name: 'Firme: rua com distrações',
        steps: [
          'Com a guia longa, chame com cachorros, pessoas e cheiros por perto.',
          'Use o melhor petisco que existe para ele.',
          'Varie a recompensa: petisco, brincadeira, liberar para cheirar de novo.',
        ],
        success: 'Volta de primeira mesmo com distrações.',
      },
    ],
    tips: [
      'Nunca chame para algo ruim (banho, bronca, ir embora do parque). Nesses casos, vá buscá-lo.',
      'Nunca brigue quando ele chegar, mesmo que tenha demorado.',
    ],
  },
  {
    id: 'espera',
    kind: 'comando',
    name: 'Espera (na porta)',
    cue: '"Espera"; liberação com "pode!"',
    summary: 'Ficar parado na porta ou no portão até ouvir "pode!". Evita fugas.',
    levels: [
      {
        name: 'Porta fechada',
        steps: [
          'Com ele sentado em frente a uma porta fechada, diga "espera" e toque na maçaneta.',
          'Se ele continuar sentado: "isso!" e petisco.',
          'Vá abrindo 1 cm, 5 cm, 10 cm. Se ele levantar, feche a porta com calma (sem bronca: a porta fechando já ensina).',
          'Termine sempre com "pode!" para liberar.',
        ],
        success: 'Fica sentado enquanto você mexe na porta e abre um pouco.',
      },
      {
        name: 'Porta aberta',
        steps: [
          'Abra a porta toda por alguns segundos.',
          'Passe você pela porta e volte. Marque e recompense se ele ficou.',
          'Libere com "pode!" e saia junto.',
        ],
        success: 'Espera com a porta aberta até ouvir "pode!".',
      },
      {
        name: 'Porta da rua e portão',
        steps: [
          'Treine na porta de casa e no portão, com barulho da rua.',
          'Peça antes de todo passeio: ele precisa esperar mesmo animado.',
        ],
        success: 'Espera no portão com a rua à vista e barulho.',
      },
      {
        name: 'Firme: sempre',
        steps: [
          'Em toda porta, portão e porta do carro, ele espera o "pode!".',
          'Petisco às vezes; o próprio passeio é o prêmio.',
        ],
        success: 'Espera sozinho em qualquer porta até ser liberado.',
      },
    ],
    tips: ['A palavra de liberação ("pode!") é tão importante quanto o "espera".'],
  },
  {
    id: 'pata',
    kind: 'truque',
    name: 'Pata',
    cue: '"Pata" + mão aberta',
    summary: 'Dar a pata na sua mão.',
    levels: [
      {
        name: 'Petisco na mão fechada',
        steps: [
          'Com ele sentado, segure um petisco na mão fechada, na altura do peito dele.',
          'Ele vai cheirar e lamber. Espere: logo ele tenta com a pata.',
          'Quando a pata levantar ou tocar sua mão: "isso!" e abra a mão.',
        ],
        success: 'Levanta a pata e toca na mão fechada.',
      },
      {
        name: 'Mão aberta, sem petisco',
        steps: [
          'Ofereça a mão aberta, palma para cima, sem petisco nela.',
          'Diga "pata" logo antes de oferecer a mão.',
          'Marque quando a pata pousar na sua mão.',
        ],
        success: 'Põe a pata na mão aberta com a palavra.',
      },
      {
        name: 'Outros lugares e pessoas',
        steps: ['Peça no quintal, na sala, com ele em pé.', 'Peça para o outro treinador também pedir.'],
        success: 'Dá a pata para pessoas diferentes e em lugares diferentes.',
      },
      {
        name: 'Firme',
        steps: ['Só a palavra, de primeira.', 'Recompensa variável.'],
        success: 'Dá a pata de primeira só com a palavra.',
      },
    ],
    tips: ['Se ele tentar com a boca, espere sem falar nada. Ele vai testar outras coisas.'],
  },
  {
    id: 'toca-aqui',
    kind: 'truque',
    name: 'Toca aqui',
    cue: '"Toca aqui" + palma levantada',
    summary: 'Bater a pata na sua palma, como um "high five".',
    levels: [
      {
        name: 'A partir da pata',
        steps: [
          'Peça "pata", mas vá virando a mão: palma para a frente, na vertical, como um "toca aqui".',
          'Marque "isso!" quando a pata tocar a palma.',
          'Suba a mão um pouquinho de cada vez.',
        ],
        success: 'Toca a palma virada para a frente.',
      },
      {
        name: 'Palavra nova',
        steps: ['Diga "toca aqui" antes de levantar a palma.', 'Pare de dizer "pata" neste truque.'],
        success: 'Toca a palma com a palavra "toca aqui".',
      },
      {
        name: 'Mão mais alta e outros lugares',
        steps: ['Levante a mão mais alto e mude de lugar.', 'Peça com ele em pé.'],
        success: 'Toca a palma alta em lugares diferentes.',
      },
      { name: 'Firme', steps: ['De primeira, com a palavra.'], success: 'Faz de primeira.' },
    ],
    tips: ['Só comece quando a "Pata" estiver firme.'],
  },
  {
    id: 'reverencia',
    kind: 'truque',
    name: 'Reverência',
    cue: '"Reverência" + mão descendo',
    summary: 'Cotovelos no chão e traseiro para cima, como um alongamento.',
    levels: [
      {
        name: 'Com petisco na mão',
        steps: [
          'Com o cão EM PÉ (não sentado), encoste o petisco no focinho.',
          'Leve o petisco do focinho para baixo e para trás, entre as patas da frente.',
          'Marque "isso!" quando os cotovelos tocarem o chão com o traseiro ainda para cima. Dê o petisco ali embaixo.',
          'Se ele deitar todo, não marque. Recomece e marque um pouco mais cedo (quando os cotovelos ainda estão descendo).',
          'Pode apoiar a outra mão de leve debaixo da barriga, sem empurrar, para ele não deitar.',
        ],
        success: 'Cotovelos no chão com o traseiro para cima.',
      },
      {
        name: 'Segurar e gesto vazio',
        steps: [
          'Espere 1 a 2 segundos na posição antes de marcar.',
          'Faça o mesmo gesto com a mão vazia; o petisco vem do bolso.',
        ],
        success: 'Faz a reverência seguindo a mão vazia e segura 1 a 2 segundos.',
      },
      {
        name: 'Palavra e gesto menor',
        steps: ['Diga "reverência" antes do gesto.', 'Faça o gesto cada vez menor, até só abaixar um pouco a mão.'],
        success: 'Faz com a palavra e um gesto pequeno.',
      },
      { name: 'Firme', steps: ['Só a palavra ou um gesto pequeno, de primeira.'], success: 'Faz de primeira.' },
    ],
    tips: ['Ele naturalmente faz isso ao se espreguiçar: marque "isso!" quando acontecer sozinho.'],
  },
  {
    id: 'rolar',
    kind: 'truque',
    name: 'Rolar',
    cue: '"Rola" + mão em círculo',
    summary: 'Deitado, rolar o corpo de um lado para o outro.',
    levels: [
      {
        name: 'Deitar de lado',
        steps: [
          'Com ele deitado, encoste o petisco no focinho e leve até o ombro dele.',
          'Ele vira a cabeça e deita de lado. "Isso!" e petisco.',
          'Faça em superfície macia: grama ou tapete.',
        ],
        success: 'Deita de lado seguindo a mão.',
      },
      {
        name: 'Rolada completa',
        steps: [
          'Continue o movimento: do ombro para trás das costas, para ele virar de barriga para cima e passar para o outro lado.',
          'Se travar no meio, marque esse pedaço e continue na próxima.',
          'Marque quando completar a volta.',
        ],
        success: 'Rola por completo seguindo a mão.',
      },
      {
        name: 'Palavra e gesto menor',
        steps: ['Diga "rola" antes do gesto.', 'Gesto de círculo cada vez menor, de pé.'],
        success: 'Rola com a palavra e um gesto pequeno.',
      },
      { name: 'Firme', steps: ['De primeira, a partir do "deita".'], success: 'Rola de primeira.' },
    ],
    tips: ['Alguns cães não gostam de ficar de barriga para cima. Vá devagar e respeite.'],
  },
  {
    id: 'bang',
    kind: 'truque',
    name: 'Fingir de morto ("bang")',
    cue: '"Bang!" + mão em forma de arminha',
    summary: 'Deitar de lado e ficar parado, como se fosse "atingido".',
    levels: [
      {
        name: 'Deitar de lado e parar',
        steps: [
          'Como no começo do "Rolar": com ele deitado, leve o petisco até o ombro para ele deitar de lado.',
          'Marque "isso!" quando ele ficar de lado, parado, por 1 segundo.',
        ],
        success: 'Fica deitado de lado, parado, 1 segundo.',
      },
      {
        name: 'Palavra e mais tempo',
        steps: [
          'Faça a "arminha" com a mão, diga "bang!" e então guie.',
          'Aumente para 3 segundos parado antes de marcar.',
        ],
        success: 'Fica 3 segundos de lado depois do "bang!".',
      },
      {
        name: 'Do senta ou em pé',
        steps: ['Peça o "bang!" com ele sentado e depois em pé.', 'Ele deve ir direto ao chão e deitar de lado.'],
        success: 'Vai ao chão de lado a partir do senta ou em pé.',
      },
      { name: 'Firme', steps: ['De primeira, com a palavra e a arminha.'], success: 'Faz de primeira, com drama.' },
    ],
    tips: ['Fica mais fácil depois que ele já sabe "Rolar".'],
  },
]

export const COMMAND_IDS = SKILLS.filter((s) => s.kind === 'comando').map((s) => s.id)
/** Ordem em que os truques são sugeridos. */
export const TRICK_ORDER = SKILLS.filter((s) => s.kind === 'truque').map((s) => s.id)

export function getSkill(id: SkillId): SkillContent {
  const s = SKILLS.find((x) => x.id === id)
  if (!s) throw new Error(`Comando desconhecido: ${id}`)
  return s
}

export const LEVEL_COUNT = 4
