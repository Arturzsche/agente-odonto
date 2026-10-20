/**
 * FONTE DEMONSTRATIVA do painel. Tudo aqui é fictício: pessoas, telefones,
 * profissionais, mensagens e números. Os dados são gerados de forma
 * determinística a partir da data de referência — o mesmo dia produz os mesmos
 * dados — e nunca saem do servidor do painel para nenhum serviço externo.
 *
 * Quando o painel for conectado ao agente, este arquivo deixa de ser usado; a
 * interface consome apenas as funções de ./index.ts.
 */

import { addDays, datePart, timePart, weekday } from "@/lib/dates";
import { createRandom } from "@/lib/demo/random";
import type {
  Appointment,
  AppointmentStatus,
  ContactReason,
  Conversation,
  ConversationStatus,
  DailyStats,
  KnowledgeEntry,
  Message,
  Patient,
  Professional,
} from "./types";

export const HISTORY_DAYS = 90;
const AGENDA_PAST_DAYS = 30;
const AGENDA_FUTURE_DAYS = 45;

export const professionals: Professional[] = [
  { id: "pro-1", name: "Dra. Helena Prado" },
  { id: "pro-2", name: "Dr. Marcos Lima" },
  { id: "pro-3", name: "Dra. Júlia Torres" },
];

const patientNames = [
  "Ana Beatriz Costa", "Bruno Almeida", "Carla Mendes", "Daniel Rocha", "Eduarda Martins", "Felipe Araújo", "Gabriela Nunes", "Henrique Barros",
  "Isabela Freitas", "João Pedro Ramos", "Larissa Teixeira", "Lucas Moreira", "Mariana Lopes", "Matheus Cardoso", "Natália Ribeiro", "Otávio Pires",
  "Patrícia Gomes", "Rafael Duarte", "Renata Campos", "Rodrigo Farias", "Sabrina Melo", "Thiago Correia", "Vanessa Castro", "Vinícius Dias",
  "Aline Batista", "Caio Monteiro", "Débora Vieira", "Eduardo Pacheco", "Fernanda Lima", "Gustavo Reis", "Helena Siqueira", "Igor Santana",
  "Juliana Prado", "Leonardo Cunha", "Marina Azevedo", "Paulo Henrique Sales",
];

const reasonWeights: Record<ContactReason, number> = { agendamento: 38, duvida: 27, remarcacao: 14, dor: 9, outros: 12 };
const handoffChance: Record<ContactReason, number> = { agendamento: 0.1, duvida: 0.08, remarcacao: 0.25, dor: 0.7, outros: 0.4 };
const bookingChance: Record<ContactReason, number> = { agendamento: 0.7, duvida: 0.1, remarcacao: 0.5, dor: 0.3, outros: 0.05 };
/** Peso relativo de cada hora do dia (0–23) no início das conversas. */
const hourWeights = [0, 0, 0, 0, 0, 0, 1, 3, 7, 8, 7, 6, 7, 8, 6, 5, 5, 6, 8, 9, 8, 6, 3, 1];

const pad = (n: number) => String(n).padStart(2, "0");
const at = (date: string, minutes: number) => `${date}T${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
const toMinutes = (dateTime: string) => Number(dateTime.slice(11, 13)) * 60 + Number(dateTime.slice(14, 16));
const firstName = (name: string) => name.split(" ")[0];

/** Soma minutos a uma data-hora local, atravessando a meia-noite quando preciso. */
function shift(dateTime: string, delta: number) {
  let minutes = toMinutes(dateTime) + delta;
  let date = datePart(dateTime);
  while (minutes < 0) {
    minutes += 24 * 60;
    date = addDays(date, -1);
  }
  while (minutes >= 24 * 60) {
    minutes -= 24 * 60;
    date = addDays(date, 1);
  }
  return at(date, minutes);
}

function maskPhone(seed: string) {
  const random = createRandom(`fone:${seed}`);
  return `(11) 9••••-${pad(random.int(10, 99))}${pad(random.int(10, 99))}`;
}

export const patientsBase = patientNames.map((name, index) => ({ id: `pac-${index + 1}`, name, phoneMasked: maskPhone(name) }));

/* ------------------------------------------------------------ Volume diário */

export function buildDailyStats(today: string, nowTime: string): DailyStats[] {
  const days: DailyStats[] = [];
  const currentHour = Number(nowTime.slice(0, 2));

  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    const random = createRandom(`dia:${date}`);
    const dow = weekday(date);
    const expected = dow === 0 ? random.int(3, 7) : dow === 6 ? random.int(10, 16) : random.int(18, 30);

    const stats: DailyStats = {
      date,
      conversations: 0,
      resolvedByAgent: 0,
      handedOff: 0,
      appointmentsCreated: 0,
      reasons: { agendamento: 0, duvida: 0, remarcacao: 0, dor: 0, outros: 0 },
      byHour: Array(24).fill(0),
    };

    for (let i = 0; i < expected; i++) {
      const hour = Number(random.weighted(Object.fromEntries(hourWeights.map((w, h) => [String(h), w]))));
      const reason = random.weighted(reasonWeights);
      const handedOff = random.chance(handoffChance[reason]);
      const booked = random.chance(bookingChance[reason]);
      // Hoje só conta o que já aconteceu até a hora atual.
      if (offset === 0 && hour > currentHour) continue;
      stats.conversations++;
      stats.byHour[hour]++;
      stats.reasons[reason]++;
      if (handedOff) stats.handedOff++;
      else stats.resolvedByAgent++;
      if (booked) stats.appointmentsCreated++;
    }
    days.push(stats);
  }
  return days;
}

/* ------------------------------------------------------------ Conversas */

type Script = Array<Omit<Message, "id" | "at"> & { gap?: number }>;

function scriptFor(reason: ContactReason, status: ConversationStatus, name: string, random: ReturnType<typeof createRandom>): { script: Script; handoffReason?: string; urgent: boolean } {
  const first = firstName(name);
  const day = random.pick(["amanhã", "quinta-feira", "sexta-feira", "segunda-feira"]);
  const [h1, h2] = random.pick([["09:00", "10:30"], ["14:00", "15:30"], ["08:30", "11:00"]]);
  const team = random.pick(["Paula", "Rogério", "Camila"]);
  const handedOff = status === "aguardando" || status === "equipe";

  const teamReply: Script = status === "equipe" ? [{ from: "sistema", text: `${team} (recepção) assumiu a conversa` }, { from: "equipe", text: `Oi, ${first}! Aqui é ${team === "Rogério" ? "o" : "a"} ${team}, da recepção. Já estou vendo isso para você.` }] : [];

  switch (reason) {
    case "agendamento": {
      const script: Script = [
        { from: "paciente", text: random.pick(["Oi, boa tarde! Queria marcar uma avaliação.", "Bom dia! Vocês têm horário para limpeza?", "Olá, gostaria de agendar uma consulta."]) },
        { from: "agente", text: `Olá, ${first}! Claro. Você prefere algum dia ou período?`, gap: 1 },
        { from: "paciente", text: `${day[0].toUpperCase()}${day.slice(1)} de manhã, se tiver.`, gap: 2 },
      ];
      if (handedOff) {
        script.push({ from: "agente", text: "Não encontrei horários livres nesse período. Vou pedir para a equipe verificar um encaixe para você.", gap: 1 });
        script.push({ from: "sistema", text: "Encaminhada para a equipe · sem horários no período pedido" }, ...teamReply);
        return { script, handoffReason: "Sem horários no período pedido", urgent: false };
      }
      script.push({ from: "agente", text: `Tenho ${h1} ou ${h2} na ${day}. Qual fica melhor para você?`, gap: 1 });
      if (status === "agente") return { script, urgent: false };
      script.push({ from: "paciente", text: h1, gap: 3 }, { from: "agente", text: `Pronto! Sua consulta ficou marcada para ${day} às ${h1}. Enviaremos um lembrete na véspera.`, gap: 1 });
      return { script, urgent: false };
    }
    case "duvida": {
      const [question, answer] = random.pick([
        ["Vocês abrem no sábado?", "Sim! Aos sábados atendemos das 8h às 12h."],
        ["Onde fica a clínica? Tem estacionamento?", "Ficamos na Rua Exemplo, 123, 2º andar. Há estacionamento conveniado ao lado do prédio."],
        ["Quais formas de pagamento vocês aceitam?", "Aceitamos Pix, cartão de débito e crédito, com parcelamento conforme o procedimento."],
      ]);
      const script: Script = [{ from: "paciente", text: question }, { from: "agente", text: answer, gap: 1 }];
      if (handedOff) {
        script.push({ from: "paciente", text: "E vocês atendem pelo meu convênio? É o do meu trabalho.", gap: 2 });
        script.push({ from: "agente", text: "Vou confirmar essa informação com a equipe e já te retorno por aqui.", gap: 1 });
        script.push({ from: "sistema", text: "Encaminhada para a equipe · pergunta fora da base de conhecimento" }, ...teamReply);
        return { script, handoffReason: "Pergunta fora da base de conhecimento", urgent: false };
      }
      if (status !== "agente") script.push({ from: "paciente", text: "Perfeito, obrigado!", gap: 2 }, { from: "agente", text: "Por nada! Se precisar, é só chamar.", gap: 1 });
      return { script, urgent: false };
    }
    case "dor": {
      const script: Script = [
        { from: "paciente", text: random.pick(["Estou com muita dor no dente desde ontem e o rosto está um pouco inchado.", "Meu dente do fundo está doendo muito, não consegui dormir."]), audio: random.chance(0.5) },
        { from: "agente", text: `Sinto muito, ${first}. Vou avisar a equipe agora para avaliar um horário de atendimento. Se tiver febre, dificuldade para engolir ou para respirar, procure um pronto-socorro imediatamente.`, gap: 1 },
        { from: "sistema", text: "Encaminhada para a equipe · relato de dor (prioridade)" },
      ];
      if (status === "encerrada") script.push({ from: "equipe", text: `${first}, conseguimos um encaixe hoje às 16h com a Dra. Helena. Pode vir?`, gap: 6 }, { from: "paciente", text: "Posso sim, obrigado!", gap: 2 });
      else script.push(...teamReply);
      return { script, handoffReason: "Relato de dor (prioridade)", urgent: true };
    }
    case "remarcacao": {
      const script: Script = [
        { from: "paciente", text: random.pick(["Preciso remarcar minha consulta de quinta.", "Oi, não vou conseguir ir amanhã. Dá para trocar o horário?"]) },
        { from: "agente", text: "Sem problemas! Para qual dia e período você prefere?", gap: 1 },
        { from: "paciente", text: "Semana que vem, depois das 18h.", gap: 4 },
        { from: "agente", text: "A agenda da clínica vai até as 18h. Vou pedir para a equipe ver a melhor opção para você.", gap: 1 },
        { from: "sistema", text: "Encaminhada para a equipe · pedido fora do horário de atendimento" },
      ];
      if (status === "encerrada") script.push({ from: "equipe", text: "Conseguimos às 17h da próxima terça. Fica bom?", gap: 20 }, { from: "paciente", text: "Fica ótimo!", gap: 3 });
      else script.push(...teamReply);
      return { script, handoffReason: "Pedido fora do horário de atendimento", urgent: false };
    }
    default: {
      const script: Script = [
        { from: "paciente", text: "Vocês emitem recibo para reembolso do plano?" },
        { from: "agente", text: "Vou confirmar com a equipe como funciona o recibo para reembolso e te retorno por aqui.", gap: 1 },
        { from: "sistema", text: "Encaminhada para a equipe · solicitação administrativa" },
      ];
      if (status === "encerrada") script.push({ from: "equipe", text: "Emitimos sim! Enviamos o recibo por e-mail após a consulta.", gap: 30 });
      else script.push(...teamReply);
      return { script, handoffReason: "Solicitação administrativa", urgent: false };
    }
  }
}

/** Conversas recentes (hoje e ontem), com mensagens. */
export function buildConversations(now: string): Conversation[] {
  const today = datePart(now);
  const nowMinutes = toMinutes(now);
  const random = createRandom(`conversas:${today}`);

  // Status atual de cada conversa. Encaminhamentos só acontecem nos motivos que exigem a equipe.
  const plan: Array<[ContactReason, ConversationStatus]> = [
    ["dor", "aguardando"], ["agendamento", "agente"], ["remarcacao", "aguardando"], ["duvida", "agente"], ["outros", "equipe"],
    ["agendamento", "encerrada"], ["dor", "equipe"], ["duvida", "encerrada"], ["agendamento", "agente"], ["duvida", "aguardando"],
    ["remarcacao", "encerrada"], ["agendamento", "encerrada"], ["outros", "aguardando"], ["duvida", "encerrada"], ["agendamento", "equipe"],
    ["dor", "encerrada"], ["agendamento", "encerrada"], ["duvida", "encerrada"], ["remarcacao", "equipe"], ["agendamento", "encerrada"],
  ];

  const people = [...patientsBase].sort(() => random.next() - 0.5);
  // A conversa mais recente termina alguns minutos antes de "agora"; as seguintes, cada vez mais cedo.
  let cursor = nowMinutes >= 7 * 60 + 30 ? at(today, nowMinutes - 4) : at(addDays(today, -1), 21 * 60 + 30);

  return plan.map(([reason, status], index) => {
    const patient = people[index % people.length];
    const { script, handoffReason, urgent } = scriptFor(reason, status, patient.name, random);
    const total = script.reduce((sum, step) => sum + (step.gap ?? 0), 0);
    let clock = shift(cursor, -total);
    const messages: Message[] = script.map(({ gap = 0, ...step }, i) => {
      clock = shift(clock, gap);
      return { ...step, id: `c${index + 1}-m${i + 1}`, at: clock };
    });

    // Próxima conversa (mais antiga): 12 a 70 minutos antes do início desta, sem entrar na madrugada.
    const previous = shift(messages[0].at, -random.int(12, 70));
    cursor = timePart(previous) >= "07:00" && datePart(previous) === datePart(messages[0].at) ? previous : at(addDays(datePart(messages[0].at), -1), 21 * 60 - random.int(0, 90));

    return {
      id: `conv-${index + 1}`,
      patientId: patient.id,
      patientName: patient.name,
      phoneMasked: patient.phoneMasked,
      status,
      reason,
      urgent,
      handoffReason,
      startedAt: messages[0].at,
      lastMessageAt: messages[messages.length - 1].at,
      messages,
    };
  });
}

/* ------------------------------------------------------------ Agenda */

const appointmentReasons = ["Avaliação inicial", "Limpeza", "Retorno", "Restauração", "Manutenção ortodôntica", "Avaliação para clareamento"];

export function buildAppointments(now: string): Appointment[] {
  const today = datePart(now);
  const nowTime = timePart(now);
  const list: Appointment[] = [];

  for (let offset = -AGENDA_PAST_DAYS; offset <= AGENDA_FUTURE_DAYS; offset++) {
    const date = addDays(today, offset);
    const dow = weekday(date);
    if (dow === 0) continue;
    const random = createRandom(`agenda:${date}`);
    const hours = dow === 6 ? [8, 9, 10, 11] : [8, 9, 10, 11, 13, 14, 15, 16, 17];
    const occupancy = offset < 0 ? 0.45 : Math.max(0.12, 0.5 - offset * 0.01);

    for (const pro of professionals) {
      for (const hour of hours) {
        if (!random.chance(occupancy)) continue;
        const time = `${pad(hour)}:00`;
        const past = offset < 0 || (offset === 0 && time < nowTime);
        const emergency = random.chance(0.05);
        let status: AppointmentStatus;
        if (past) status = random.weighted({ concluida: 82, faltou: 8, cancelada: 10 });
        else if (offset <= 2) status = random.weighted({ confirmada: 65, agendada: 25, cancelada: 10 });
        else status = random.weighted({ agendada: 75, confirmada: 15, cancelada: 10 });
        const patient = random.pick(patientsBase);
        list.push({
          id: `ag-${date}-${pro.id}-${hour}`,
          patientId: patient.id,
          patientName: patient.name,
          professionalId: pro.id,
          date,
          time,
          durationMinutes: 60,
          reason: emergency ? "Avaliação de urgência" : random.pick(appointmentReasons),
          status,
          emergency,
          origin: random.chance(0.6) ? "agente" : "equipe",
        });
      }
    }
  }
  return list.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.professionalId.localeCompare(b.professionalId));
}

/* ------------------------------------------------------------ Pacientes */

export function buildPatients(now: string, conversations: Conversation[], appointments: Appointment[]): Patient[] {
  const today = datePart(now);
  return patientsBase.map((base) => {
    const random = createRandom(`paciente:${base.id}:${today}`);
    const own = conversations.filter((c) => c.patientId === base.id);
    const latest = own.map((c) => c.lastMessageAt).sort().at(-1);
    const next = appointments
      .filter((a) => a.patientId === base.id && a.status !== "cancelada" && `${a.date}T${a.time}` >= now)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
    return {
      ...base,
      firstContact: addDays(today, -random.int(20, 420)),
      lastContact: latest ?? `${addDays(today, -random.int(2, 60))}T${pad(random.int(8, 20))}:${pad(random.int(0, 59))}`,
      conversationCount: own.length + random.int(1, 6),
      nextAppointment: next ? { date: next.date, time: next.time } : null,
    };
  });
}

/* ------------------------------------------------------------ Conhecimento */

export function buildKnowledge(now: string): KnowledgeEntry[] {
  const today = datePart(now);
  const ago = (days: number, time: string) => `${addDays(today, -days)}T${time}`;
  return [
    { id: "kb-1", category: "horarios", title: "Horário de funcionamento", content: "Segunda a sexta, das 8h às 18h. Sábados, das 8h às 12h. Não abrimos aos domingos e feriados nacionais.", published: true, updatedAt: ago(12, "10:14") },
    { id: "kb-2", category: "localizacao", title: "Endereço e estacionamento", content: "Rua Exemplo, 123, 2º andar, Centro. Há estacionamento conveniado ao lado do prédio, com 1 hora gratuita.", published: true, updatedAt: ago(30, "16:40") },
    { id: "kb-3", category: "valores", title: "Formas de pagamento", content: "Aceitamos Pix, cartão de débito e cartão de crédito. Parcelamento disponível conforme o procedimento, a combinar com a recepção.", published: true, updatedAt: ago(8, "09:02") },
    { id: "kb-4", category: "convenios", title: "Convênios atendidos", content: "Atendemos os convênios Exemplo Saúde e Plano Demonstração. Para outros planos, emitimos recibo para pedido de reembolso.", published: true, updatedAt: ago(3, "11:30") },
    { id: "kb-5", category: "orientacoes", title: "Antes da primeira consulta", content: "Chegar 10 minutos antes, com documento com foto e carteirinha do convênio, se houver. Menores de idade devem vir com um responsável.", published: true, updatedAt: ago(20, "14:22") },
    { id: "kb-6", category: "politicas", title: "Cancelamento e remarcação", content: "Pedimos aviso com pelo menos 24 horas de antecedência para cancelar ou remarcar. Remarcações podem ser feitas por aqui mesmo.", published: true, updatedAt: ago(45, "08:50") },
    { id: "kb-7", category: "politicas", title: "Atendimento de urgência", content: "Relatos de dor intensa, inchaço ou sangramento são encaminhados para a equipe com prioridade. Em caso de febre, dificuldade para respirar ou engolir, orientar a procurar um pronto-socorro.", published: true, updatedAt: ago(5, "17:05") },
    { id: "kb-8", category: "valores", title: "Valor da avaliação inicial", content: "Rascunho: aguardando a definição do valor pela coordenação da clínica.", published: false, updatedAt: ago(1, "18:12") },
  ];
}
