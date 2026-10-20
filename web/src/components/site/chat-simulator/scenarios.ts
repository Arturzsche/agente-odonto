/**
 * Roteiros do simulador da landing page. Tudo aqui é FICTÍCIO e roda no navegador:
 * nenhuma mensagem é enviada, nenhuma agenda é consultada, nenhuma reserva é feita.
 */

export type Author = "paciente" | "agente";

export type Step =
  /** Mensagem no chat. `typing` = tempo do indicador de processamento antes de aparecer. */
  | { kind: "message"; from: Author; text: string; time: string; typing?: number }
  /** Linha de sistema (ação do agente nos bastidores). */
  | { kind: "event"; text: string; tone: "info" | "warning" | "danger" | "success" }
  /** Respostas rápidas: o visitante escolhe o que o paciente responde. */
  | { kind: "choices"; prompt: string; options: Array<{ label: string; next: string }> }
  /** Horários de exemplo para o visitante escolher. */
  | { kind: "slots"; label: string; slots: string[]; next: string };

export interface Scenario {
  id: string;
  label: string;
  patient: string;
  /** Passos por ramo; a conversa começa em "inicio". */
  branches: Record<string, Step[]>;
}

export const scenarios: Scenario[] = [
  {
    id: "dor",
    label: "Dor de siso",
    patient: "Lucas",
    branches: {
      inicio: [
        { kind: "message", from: "paciente", text: "Olá, estou com muita dor no siso. Vocês têm horário hoje?", time: "08:12" },
        {
          kind: "message",
          from: "agente",
          text: "Olá! Sinto muito que esteja passando por isso. Posso ajudar a organizar seu atendimento. A dor começou hoje ou já vem acontecendo há alguns dias?",
          time: "08:12",
          typing: 1100,
        },
        { kind: "message", from: "paciente", text: "Começou ontem e piorou bastante.", time: "08:13", typing: 900 },
        {
          kind: "message",
          from: "agente",
          text: "Entendi. Vou encaminhar sua solicitação para a equipe avaliar a disponibilidade de atendimento.",
          time: "08:13",
          typing: 1000,
        },
        { kind: "event", text: "Encaminhado para avaliação da equipe · prioridade: dor com piora", tone: "warning" },
        {
          kind: "message",
          from: "agente",
          text: "Enquanto isso, me conta: você está com inchaço no rosto, febre ou dificuldade para engolir ou respirar?",
          time: "08:13",
          typing: 900,
        },
        {
          kind: "choices",
          prompt: "Escolha a resposta do paciente",
          options: [
            { label: "Não, só a dor forte", next: "semSinais" },
            { label: "Estou com dificuldade para engolir", next: "urgencia" },
          ],
        },
      ],
      semSinais: [
        { kind: "message", from: "paciente", text: "Não, só a dor forte.", time: "08:14" },
        {
          kind: "message",
          from: "agente",
          text: "Obrigado por avisar. A equipe da clínica já recebeu sua solicitação e vai falar com você por aqui para combinar o atendimento.",
          time: "08:14",
          typing: 1000,
        },
        { kind: "event", text: "A equipe assume a conversa · o agente não diagnostica nem indica medicamentos", tone: "info" },
      ],
      urgencia: [
        { kind: "message", from: "paciente", text: "Estou com dificuldade para engolir.", time: "08:14" },
        {
          kind: "message",
          from: "agente",
          text: "Dificuldade para engolir pode precisar de atendimento imediato. Procure agora um pronto-socorro ou ligue para o SAMU (192). Também avisei a equipe da clínica com urgência.",
          time: "08:14",
          typing: 900,
        },
        { kind: "event", text: "Protocolo de urgência acionado (exemplo — validado pelo dentista responsável de cada clínica)", tone: "danger" },
      ],
    },
  },
  {
    id: "agendamento",
    label: "Agendamento",
    patient: "Camila",
    branches: {
      inicio: [
        { kind: "message", from: "paciente", text: "Gostaria de marcar uma avaliação.", time: "14:05" },
        { kind: "message", from: "agente", text: "Claro! Você prefere algum dia ou período específico?", time: "14:05", typing: 900 },
        { kind: "message", from: "paciente", text: "Amanhã de manhã.", time: "14:06", typing: 900 },
        { kind: "message", from: "agente", text: "Vou verificar os horários disponíveis na agenda da clínica.", time: "14:06", typing: 800 },
        { kind: "event", text: "Consulta à agenda simulada (sem integração real nesta demonstração)", tone: "info" },
        { kind: "message", from: "agente", text: "Encontrei estes horários para amanhã de manhã. Qual fica melhor para você?", time: "14:06", typing: 1100 },
        { kind: "slots", label: "Horários demonstrativos", slots: ["09:00", "10:30", "11:15"], next: "escolhido" },
      ],
      escolhido: [
        {
          kind: "message",
          from: "agente",
          text: "Ótima escolha! Em uma clínica real, eu confirmaria esse horário na agenda integrada e enviaria a confirmação por aqui.",
          time: "14:07",
          typing: 1000,
        },
        { kind: "event", text: "Demonstração: nenhuma reserva foi criada", tone: "success" },
      ],
    },
  },
  {
    id: "horario",
    label: "Horários",
    patient: "Rafael",
    branches: {
      inicio: [
        { kind: "message", from: "paciente", text: "Qual é o horário de funcionamento?", time: "19:40" },
        {
          kind: "message",
          from: "agente",
          text: "Posso ajudar! Vou consultar os horários cadastrados pela clínica para informar corretamente.",
          time: "19:40",
          typing: 900,
        },
        { kind: "event", text: "Base de conhecimento consultada · dados fictícios de exemplo", tone: "info" },
        {
          kind: "message",
          from: "agente",
          text: "Atendemos de segunda a sexta, das 8h às 18h, e aos sábados, das 8h às 12h. Quer que eu veja um horário para você?",
          time: "19:41",
          typing: 1000,
        },
      ],
    },
  },
];
