/**
 * Gerador do conjunto de DADOS FICTÍCIOS do modo demonstrativo.
 *
 * - Determinístico por dia (semente = data): a mesma página mostra os mesmos dados no dia.
 * - Datas relativas a "agora", para o painel parecer vivo.
 * - Nenhum dado aqui representa pessoas, clínicas ou resultados reais.
 */
import type {
  Appointment,
  AppointmentCategory,
  AppointmentStatus,
  BusinessHours,
  ChatMessage,
  ClinicSettings,
  Conversation,
  ConversationPriority,
  ConversationStatus,
  DailyPoint,
  Integration,
  KnowledgeItem,
  Patient,
  Professional,
  TeamMember,
} from "@/types/domain";
import { maskPhone, toClinicDay } from "@/lib/format";

const DAY_MS = 86_400_000;
const MIN_MS = 60_000;
/** O Brasil não tem horário de verão desde 2019: offset fixo para o fuso da clínica. */
const CLINIC_OFFSET = "-03:00";

/* ------------------------------ PRNG (mulberry32) ------------------------------ */

function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  };
}
type Rng = ReturnType<typeof createRng>;

const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Data/hora local da clínica → Date. day = YYYY-MM-DD, time = HH:mm */
const atClinic = (day: string, time: string) => new Date(`${day}T${time}:00${CLINIC_OFFSET}`);
const addDays = (day: string, n: number) => toClinicDay(new Date(atClinic(day, "12:00").getTime() + n * DAY_MS));
const weekdayOf = (day: string) => atClinic(day, "12:00").getUTCDay();
const pad = (n: number) => String(n).padStart(2, "0");

/* ------------------------------ Dados de referência ------------------------------ */

const FIRST_NAMES = [
  "Ana", "Bruno", "Camila", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João",
  "Larissa", "Lucas", "Mariana", "Matheus", "Natália", "Otávio", "Paula", "Rafaela", "Tiago", "Vanessa",
  "Vinícius", "Beatriz", "Carlos", "Daniela", "Fernanda", "Gustavo", "Juliana", "Leonardo", "Letícia",
  "Marcelo", "Patrícia", "Renata", "Rodrigo", "Tatiane", "Yasmin", "Caio", "Elisa", "Murilo", "Priscila", "Samuel",
] as const;
const LAST_NAMES = [
  "Almeida", "Barbosa", "Cardoso", "Costa", "Duarte", "Fernandes", "Freitas", "Gomes", "Lima", "Martins",
  "Mendes", "Moreira", "Nogueira", "Oliveira", "Pereira", "Ribeiro", "Rocha", "Santos", "Silva", "Teixeira", "Vieira",
] as const;

export const DEMO_PROFESSIONALS: Professional[] = [
  { id: "prof-1", name: "Dra. Helena Prado", specialty: "Clínica geral" },
  { id: "prof-2", name: "Dr. Rafael Moura", specialty: "Ortodontia" },
  { id: "prof-3", name: "Dra. Lívia Andrade", specialty: "Endodontia" },
];

const BUSINESS_HOURS: BusinessHours[] = [
  { weekday: 0, opens: null, closes: null },
  { weekday: 1, opens: "08:00", closes: "18:00" },
  { weekday: 2, opens: "08:00", closes: "18:00" },
  { weekday: 3, opens: "08:00", closes: "18:00" },
  { weekday: 4, opens: "08:00", closes: "18:00" },
  { weekday: 5, opens: "08:00", closes: "18:00" },
  { weekday: 6, opens: "08:00", closes: "12:00" },
];

const isOpenAt = (weekday: number, hour: number) => {
  const h = BUSINESS_HOURS[weekday];
  if (!h.opens || !h.closes) return false;
  return hour >= Number(h.opens.slice(0, 2)) && hour < Number(h.closes.slice(0, 2));
};

/* ------------------------------ Roteiros de conversa ------------------------------ */

interface Script {
  key: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  priorityReason: string | null;
  /** [autor, texto, minutos após a mensagem anterior] */
  lines: Array<[ChatMessage["author"], string, number, boolean?]>;
  /** Peso relativo na amostragem */
  weight: number;
}

const scripts = (first: string, full: string): Script[] => [
  {
    key: "agendamento",
    status: "encerrada",
    priority: "normal",
    priorityReason: null,
    weight: 6,
    lines: [
      ["paciente", "Oi, boa tarde! Queria marcar uma avaliação.", 0],
      ["agente", "Oi! Que bom falar com você 😊 Você prefere algum dia ou período?", 1],
      ["paciente", "Pode ser quinta de manhã?", 3],
      ["agente", "Na quinta de manhã tenho 9h ou 10h30. Qual fica melhor?", 1],
      ["paciente", "9h", 2],
      ["agente", "Perfeito! Para eu reservar, me passa seu nome completo?", 1],
      ["paciente", full, 1],
      ["agente", `Prontinho, ${first}! Sua avaliação ficou para quinta às 9h. Até lá!`, 1],
    ],
  },
  {
    key: "dor",
    status: "aguardando_equipe",
    priority: "alta",
    priorityReason: "Relato de dor com inchaço",
    weight: 2,
    lines: [
      ["paciente", "Estou com muita dor no dente desde ontem, vocês têm horário hoje?", 0],
      ["agente", "Poxa, sinto muito que esteja passando por isso. A dor começou ontem e está piorando? Tem inchaço?", 1],
      ["paciente", "Está inchado sim, do lado direito", 4],
      ["agente", "Obrigada por avisar. Sinalizei sua conversa para a equipe com prioridade, e alguém da clínica vai falar com você em seguida.", 1],
    ],
  },
  {
    key: "horario",
    status: "encerrada",
    priority: "normal",
    priorityReason: null,
    weight: 4,
    lines: [
      ["paciente", "Vocês abrem no sábado?", 0],
      ["agente", "Abrimos sim! Aos sábados o atendimento é das 8h às 12h.", 1],
      ["paciente", "Ótimo, obrigado!", 2],
    ],
  },
  {
    key: "convenio",
    status: "aguardando_equipe",
    priority: "normal",
    priorityReason: null,
    weight: 2,
    lines: [
      ["paciente", "Boa noite, vocês aceitam convênio?", 0],
      ["agente", "Boa noite! Essa informação eu prefiro confirmar com a equipe para te passar certinho. Alguém responde por aqui no próximo horário de atendimento, tudo bem?", 1],
      ["paciente", "Tudo bem, aguardo", 3],
    ],
  },
  {
    key: "remarcar",
    status: "em_atendimento_humano",
    priority: "normal",
    priorityReason: null,
    weight: 2,
    lines: [
      ["paciente", "Preciso remarcar minha consulta de amanhã, surgiu um imprevisto", 0],
      ["agente", "Sem problemas! Para qual dia você gostaria de remarcar?", 1],
      ["paciente", "Pode ser na semana que vem, de tarde", 5],
      ["equipe", `Oi, ${first}! Aqui é a Marina, da recepção. Consigo segunda às 14h ou terça às 15h30, qual prefere?`, 12],
    ],
  },
  {
    key: "valor",
    status: "agente",
    priority: "normal",
    priorityReason: null,
    weight: 3,
    lines: [
      ["paciente", "Quanto custa a avaliação?", 0],
      ["agente", "A avaliação inicial custa R$ 150,00. Quer que eu veja um horário para você?", 1],
    ],
  },
  {
    key: "pos-procedimento",
    status: "em_atendimento_humano",
    priority: "alta",
    priorityReason: "Sangramento após procedimento",
    weight: 1,
    lines: [
      ["paciente", "Fiz uma extração ontem e ainda está sangrando um pouco, é normal?", 0],
      ["agente", "Entendo a preocupação. Como envolve sangramento após um procedimento, encaminhei sua conversa para a equipe com prioridade.", 1],
      ["equipe", `Oi, ${first}, aqui é a Dra. Helena. Vou te orientar agora: consegue me ligar ou prefere que eu ligue?`, 6],
    ],
  },
  {
    key: "audio",
    status: "agente",
    priority: "normal",
    priorityReason: null,
    weight: 2,
    lines: [
      ["paciente", `Oi, aqui é a ${first}. Queria saber se tem horário para limpeza na semana que vem.`, 0, true],
      ["agente", `Oi, ${first}! Tenho terça às 15h ou quarta às 10h. Qual prefere?`, 1],
    ],
  },
  {
    key: "clareamento",
    status: "encerrada",
    priority: "normal",
    priorityReason: null,
    weight: 2,
    lines: [
      ["paciente", "Quanto fica um clareamento?", 0],
      ["agente", "O valor do clareamento depende da avaliação, porque cada caso é diferente. Posso agendar uma avaliação para você?", 1],
      ["paciente", "Vou pensar e te aviso", 6],
      ["agente", "Claro! Fico à disposição por aqui 😊", 1],
    ],
  },
];

/* ------------------------------ Conjunto completo ------------------------------ */

export interface DemoDataset {
  referenceAt: string;
  clinic: ClinicSettings;
  professionals: Professional[];
  patients: Patient[];
  conversations: Conversation[];
  appointments: Appointment[];
  daily: DailyPoint[]; // 180 dias até hoje
  byHourWeights: number[];
  knowledge: KnowledgeItem[];
  integrations: Integration[];
  team: TeamMember[];
}

interface PatientSeed {
  id: string;
  name: string;
  phone: string;
}

function buildPatients(rng: Rng, count: number): PatientSeed[] {
  const used = new Set<string>();
  const list: PatientSeed[] = [];
  while (list.length < count) {
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    if (used.has(name)) continue;
    used.add(name);
    const phone = `55${rng.pick(["11", "11", "21", "31", "41", "19"])}9${String(rng.int(10_000_000, 99_999_999))}`;
    list.push({ id: `pac-${pad(list.length + 1)}`, name, phone });
  }
  return list;
}

function buildDaily(rng: Rng, today: string): DailyPoint[] {
  // Volume típico por dia da semana (dom → sáb)
  const base = [4, 22, 19, 18, 19, 16, 9];
  const points: DailyPoint[] = [];
  for (let i = 179; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const trend = 1 + 0.12 * ((179 - i) / 179);
    const conversations = Math.max(0, Math.round(base[weekdayOf(day)] * trend * (0.82 + rng.next() * 0.36)));
    points.push({
      day,
      conversations,
      appointments: Math.round(conversations * (0.28 + rng.next() * 0.14)),
      escalated: Math.round(conversations * (0.05 + rng.next() * 0.07)),
    });
  }
  return points;
}

function buildConversations(rng: Rng, now: Date, today: string, patients: PatientSeed[]): Conversation[] {
  const conversations: Conversation[] = [];
  const pool = [...patients];
  for (let i = 0; i < 34; i += 1) {
    const patient = pool.splice(rng.int(0, pool.length - 1), 1)[0];
    const first = patient.name.split(" ")[0];
    const options = scripts(first, patient.name);
    const totalWeight = options.reduce((s, o) => s + o.weight, 0);
    let roll = rng.next() * totalWeight;
    let script = options[0];
    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) {
        script = option;
        break;
      }
    }

    // Conversas que ainda precisam de ação são recentes; as demais se espalham por 14 dias.
    const open = script.status !== "encerrada";
    const daysAgo = open ? rng.int(0, 1) : rng.int(0, 13);
    const day = addDays(today, -daysAgo);
    const afterHours = rng.chance(0.3);
    const hour = afterHours ? rng.pick([6, 7, 19, 20, 21, 22]) : rng.int(8, 17);
    let at = atClinic(day, `${pad(hour)}:${pad(rng.int(0, 59))}`).getTime();
    // Nunca no futuro
    if (at > now.getTime() - 20 * MIN_MS) at = now.getTime() - rng.int(25, 240) * MIN_MS;

    const messages: ChatMessage[] = script.lines.map(([author, text, minutes, isAudio], idx) => {
      at += minutes * MIN_MS + (idx === 0 ? 0 : rng.int(5, 50) * 1000);
      return {
        id: `msg-${i}-${idx}`,
        author,
        text,
        sentAt: new Date(at).toISOString(),
        ...(isAudio ? { isAudioTranscript: true } : {}),
      };
    });
    const last = messages[messages.length - 1];
    const trailingPatient = [...messages].reverse().findIndex((m) => m.author !== "paciente");

    conversations.push({
      id: `conv-${pad(i + 1)}`,
      patient: { id: patient.id, name: patient.name, phoneMasked: maskPhone(patient.phone) },
      channel: "whatsapp",
      status: script.status,
      priority: script.priority,
      priorityReason: script.priorityReason,
      lastMessagePreview: last.text,
      lastMessageAt: last.sentAt,
      startedAt: messages[0].sentAt,
      messagesCount: messages.length,
      unread: script.status === "aguardando_equipe" ? Math.max(1, trailingPatient === -1 ? messages.length : trailingPatient) : 0,
      messages,
    });
  }
  return conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

const CATEGORY_WEIGHTS: Array<[AppointmentCategory, number, number]> = [
  // categoria, peso, duração (min)
  ["Avaliação inicial", 9, 60],
  ["Retorno", 5, 30],
  ["Limpeza", 5, 60],
  ["Ortodontia", 3, 30],
  ["Canal", 2, 90],
  ["Clareamento", 1, 60],
  ["Urgência", 1, 60],
];

const REASONS: Record<AppointmentCategory, string[]> = {
  "Avaliação inicial": ["Primeira consulta", "Avaliação geral", "Dor ao mastigar", "Sensibilidade no dente"],
  Retorno: ["Retorno de tratamento", "Acompanhamento"],
  Limpeza: ["Limpeza e profilaxia"],
  Ortodontia: ["Manutenção do aparelho", "Avaliação ortodôntica"],
  Canal: ["Tratamento de canal (sessão)"],
  Clareamento: ["Avaliação para clareamento"],
  Urgência: ["Dor intensa", "Dente quebrado", "Inchaço na gengiva"],
};

function pickCategory(rng: Rng) {
  const total = CATEGORY_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let roll = rng.next() * total;
  for (const entry of CATEGORY_WEIGHTS) {
    roll -= entry[1];
    if (roll <= 0) return entry;
  }
  return CATEGORY_WEIGHTS[0];
}

function buildAppointments(rng: Rng, now: Date, today: string, patients: PatientSeed[]): Appointment[] {
  const list: Appointment[] = [];
  for (let offset = -30; offset <= 21; offset += 1) {
    const day = addDays(today, offset);
    const weekday = weekdayOf(day);
    const hours = BUSINESS_HOURS[weekday];
    if (!hours.opens || !hours.closes) continue;
    const openH = Number(hours.opens.slice(0, 2));
    const closeH = Number(hours.closes.slice(0, 2));
    const count = weekday === 6 ? rng.int(2, 4) : rng.int(4, 8);
    const taken = new Set<string>();

    for (let n = 0; n < count; n += 1) {
      const [category, , duration] = pickCategory(rng);
      const professional =
        category === "Ortodontia" ? DEMO_PROFESSIONALS[1] : category === "Canal" ? DEMO_PROFESSIONALS[2] : rng.pick([DEMO_PROFESSIONALS[0], DEMO_PROFESSIONALS[0], DEMO_PROFESSIONALS[2]]);
      const slotHour = rng.int(openH, closeH - 1);
      const slotMin = rng.pick([0, 30]);
      const key = `${professional.id}-${slotHour}-${slotMin}`;
      if (taken.has(key)) continue;
      taken.add(key);

      const startsAt = atClinic(day, `${pad(slotHour)}:${pad(slotMin)}`);
      const isPast = startsAt.getTime() < now.getTime();
      let status: AppointmentStatus;
      if (isPast) {
        const r = rng.next();
        status = r < 0.78 ? "concluido" : r < 0.86 ? "faltou" : "cancelado";
      } else if (offset <= 2) {
        status = rng.chance(0.7) ? "confirmado" : "agendado";
      } else {
        const r = rng.next();
        status = r < 0.62 ? "agendado" : r < 0.9 ? "confirmado" : "cancelado";
      }
      const patient = rng.pick(patients);
      list.push({
        id: `ag-${list.length + 1}`,
        patient: { id: patient.id, name: patient.name },
        professional: { id: professional.id, name: professional.name },
        startsAt: startsAt.toISOString(),
        durationMinutes: duration,
        category,
        reason: rng.pick(REASONS[category]),
        status,
        isEmergency: category === "Urgência",
        source: rng.chance(0.62) ? "agente" : "equipe",
      });
    }
  }
  return list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function buildPatientsView(seeds: PatientSeed[], conversations: Conversation[], appointments: Appointment[], now: Date): Patient[] {
  return seeds
    .map((seed) => {
      const convs = conversations.filter((c) => c.patient.id === seed.id);
      const appts = appointments.filter((a) => a.patient.id === seed.id);
      const dates = [...convs.map((c) => c.lastMessageAt), ...appts.filter((a) => a.startsAt <= now.toISOString()).map((a) => a.startsAt)].sort();
      const next = appts.find((a) => a.startsAt > now.toISOString() && (a.status === "agendado" || a.status === "confirmado"));
      if (dates.length === 0 && !next) return null;
      const first = dates[0] ?? next!.startsAt;
      return {
        id: seed.id,
        name: seed.name,
        phoneMasked: maskPhone(seed.phone),
        firstContactAt: first,
        lastContactAt: dates[dates.length - 1] ?? first,
        conversationsCount: convs.length,
        appointmentsCount: appts.length,
        nextAppointmentAt: next?.startsAt ?? null,
      } satisfies Patient;
    })
    .filter((p): p is Patient => p !== null)
    .sort((a, b) => b.lastContactAt.localeCompare(a.lastContactAt));
}

function buildKnowledge(today: string): KnowledgeItem[] {
  const at = (daysAgo: number, time: string) => atClinic(addDays(today, -daysAgo), time).toISOString();
  return [
    { id: "kb-1", title: "Horário de atendimento", category: "Horários", status: "publicado", updatedAt: at(12, "10:20"), updatedBy: "Marina Costa", content: "Segunda a sexta, das 8h às 18h. Sábados, das 8h às 12h. Domingos e feriados: fechado." },
    { id: "kb-2", title: "Valor da avaliação inicial", category: "Pagamentos", status: "publicado", updatedAt: at(30, "09:00"), updatedBy: "Dra. Helena Prado", content: "A avaliação inicial custa R$ 150,00. Valores de tratamentos são informados após a avaliação." },
    { id: "kb-3", title: "Formas de pagamento", category: "Pagamentos", status: "publicado", updatedAt: at(30, "09:05"), updatedBy: "Dra. Helena Prado", content: "Pix, cartão de débito e cartão de crédito." },
    { id: "kb-4", title: "Convênios", category: "Perguntas frequentes", status: "rascunho", updatedAt: at(2, "16:40"), updatedBy: "Marina Costa", content: "Lista de convênios em atualização. Até a publicação, o agente encaminha a pergunta para a equipe." },
    { id: "kb-5", title: "Serviços oferecidos", category: "Serviços", status: "publicado", updatedAt: at(45, "11:15"), updatedBy: "Dra. Helena Prado", content: "Clínica geral, limpeza, restaurações, tratamento de canal, ortodontia e clareamento." },
    { id: "kb-6", title: "Endereço e estacionamento", category: "Localização", status: "publicado", updatedAt: at(60, "08:30"), updatedBy: "Marina Costa", content: "Endereço de exemplo para demonstração. Há estacionamento conveniado ao lado." },
    { id: "kb-7", title: "Orientação para dor intensa ou inchaço", category: "Orientações", status: "publicado", updatedAt: at(8, "14:00"), updatedBy: "Dra. Helena Prado", content: "Acolher, sinalizar a conversa para a equipe com prioridade e oferecer o primeiro horário disponível. Se houver dificuldade para respirar ou engolir, orientar a procurar um serviço de urgência imediatamente." },
    { id: "kb-8", title: "Remarcação e cancelamento", category: "Orientações", status: "publicado", updatedAt: at(20, "17:45"), updatedBy: "Marina Costa", content: "Pedimos aviso com 24 horas de antecedência. Remarcações são confirmadas pela recepção." },
    { id: "kb-9", title: "Primeira consulta: o que levar", category: "Perguntas frequentes", status: "rascunho", updatedAt: at(1, "09:10"), updatedBy: "Marina Costa", content: "Documento com foto e exames anteriores, se houver." },
  ];
}

function buildIntegrations(now: Date): Integration[] {
  const checked = now.toISOString();
  return [
    { id: "whatsapp", name: "WhatsApp", description: "Recebe e envia mensagens pelo número da clínica (Evolution API).", status: "demonstrativo", detail: "Modo demonstrativo · nenhuma mensagem real é enviada", lastCheckedAt: checked, setupHint: "Configure a API administrativa do agente (AGENT_ADMIN_API_URL e AGENT_ADMIN_API_TOKEN) para ver o status real da conexão." },
    { id: "agenda", name: "Google Agenda", description: "Consulta horários livres e registra as consultas marcadas pelo agente.", status: "demonstrativo", detail: "Horários fictícios gerados localmente", lastCheckedAt: checked, setupHint: "No backend do agente, defina GOOGLE_CALENDAR_ENABLED=true e as credenciais da conta de serviço." },
    { id: "ia", name: "Provedor de IA", description: "Interpreta as mensagens e redige as respostas do agente.", status: "demonstrativo", detail: "Respostas roteirizadas, sem chamadas a um provedor de IA", lastCheckedAt: checked, setupHint: "Defina OPENAI_API_KEY no backend do agente após avaliar o contrato de tratamento de dados com o provedor." },
    { id: "banco", name: "Banco de dados", description: "Guarda conversas, pacientes e agendamentos (PostgreSQL).", status: "demonstrativo", detail: "Dados mantidos apenas na memória desta demonstração", lastCheckedAt: checked, setupHint: "Conecte o painel à API administrativa para ler os dados reais do PostgreSQL." },
  ];
}

const cache = new Map<string, DemoDataset>();

/** Retorna o conjunto demonstrativo para o instante informado (cacheado por hora). */
export function getDemoDataset(reference: Date = new Date()): DemoDataset {
  const now = new Date(Math.floor(reference.getTime() / MIN_MS) * MIN_MS);
  const today = toClinicDay(now);
  const cacheKey = `${today}T${pad(Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(now)))}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const rng = createRng(hashString(today));
  const seeds = buildPatients(rng, 64);
  const conversations = buildConversations(rng, now, today, seeds);
  const appointments = buildAppointments(rng, now, today, seeds);
  const daily = buildDaily(rng, today);

  // Mensagens por hora do dia: picos de manhã e à noite (fora do expediente).
  const byHourWeights = Array.from({ length: 24 }, (_, h) => {
    if (h < 6) return 0.15;
    if (h < 8) return 0.9;
    if (h < 12) return 2.6 - Math.abs(h - 10) * 0.35;
    if (h < 14) return 1.6;
    if (h < 18) return 2.0 - Math.abs(h - 15) * 0.2;
    if (h < 23) return 1.7 - Math.abs(h - 20) * 0.25;
    return 0.4;
  });

  const dataset: DemoDataset = {
    referenceAt: now.toISOString(),
    clinic: {
      id: "clinica-demo",
      name: "Clínica Exemplo",
      timezone: "America/Sao_Paulo",
      phoneDisplay: "(11) 0000-0000",
      address: "Endereço fictício para demonstração",
      businessHours: BUSINESS_HOURS,
      agent: { name: "Sofia", afterHours: true, sessionTimeoutHours: 12, escalateUrgent: true },
    },
    professionals: DEMO_PROFESSIONALS,
    patients: buildPatientsView(seeds, conversations, appointments, now),
    conversations,
    appointments,
    daily,
    byHourWeights,
    knowledge: buildKnowledge(today),
    integrations: buildIntegrations(now),
    team: [
      { id: "eq-1", name: "Dra. Helena Prado", email: "helena@example.com", role: "gestor", lastAccessAt: new Date(now.getTime() - 3 * 60 * MIN_MS).toISOString() },
      { id: "eq-2", name: "Marina Costa", email: "marina@example.com", role: "recepcao", lastAccessAt: new Date(now.getTime() - 25 * MIN_MS).toISOString() },
      { id: "eq-3", name: "Dr. Rafael Moura", email: "rafael@example.com", role: "profissional", lastAccessAt: new Date(now.getTime() - 2 * DAY_MS).toISOString() },
      { id: "eq-4", name: "Dra. Lívia Andrade", email: "livia@example.com", role: "profissional", lastAccessAt: null },
    ],
  };

  cache.clear();
  cache.set(cacheKey, dataset);
  return dataset;
}

export { isOpenAt, BUSINESS_HOURS as DEMO_BUSINESS_HOURS };
