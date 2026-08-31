export type BotStep = "idle" | "store" | "system" | "demo" | "handoff";

export type SessionState = {
  wa_id: string;
  profile_name: string | null;
  step: BotStep;
  store_status: string | null;
  inventory_system: string | null;
  wants_demo: boolean | null;
};

export type IncomingReply = {
  kind: "text" | "interactive";
  text?: string;
  replyId?: string;
};

export type OutgoingMessage =
  | { type: "text"; body: string }
  | {
      type: "buttons";
      body: string;
      buttons: { id: string; title: string }[];
    }
  | {
      type: "list";
      body: string;
      button: string;
      sectionTitle: string;
      rows: { id: string; title: string; description?: string }[];
    };

export type TurnResult = {
  session: SessionState;
  messages: OutgoingMessage[];
  saveLead: boolean;
};

type Option = { id: string; title: string; match: string[]; description?: string };

const STORE_OPTIONS: Option[] = [
  {
    id: "store:has_store",
    title: "Sí, tengo tienda",
    match: ["si", "sí", "si tengo", "tengo una tienda", "tienda", "1"],
  },
  {
    id: "store:opening",
    title: "Estoy por abrirla",
    match: ["estoy por abrirla", "por abrirla", "abriendo", "voy a abrir", "2"],
  },
  {
    id: "store:other",
    title: "Otro negocio",
    match: ["otro negocio", "interesado para otro", "otro", "3"],
  },
];

const SYSTEM_OPTIONS: Option[] = [
  {
    id: "system:excel",
    title: "Excel",
    description: "Ventas e inventario en hojas de cálculo",
    match: ["excel", "hoja de calculo", "spreadsheet", "1"],
  },
  {
    id: "system:notebook",
    title: "Cuaderno",
    description: "Registro en papel o cuaderno",
    match: ["cuaderno", "papel", "manual", "2"],
  },
  {
    id: "system:other",
    title: "Otro sistema",
    description: "Ya usas otro software",
    match: ["otro sistema", "otro software", "sistema", "3"],
  },
  {
    id: "system:none",
    title: "No tengo sistema",
    description: "Aún no llevas un control formal",
    match: ["no tengo sistema", "ninguno", "nada", "4"],
  },
];

const DEMO_OPTIONS: Option[] = [
  {
    id: "demo:yes",
    title: "Sí, agendar demo",
    match: ["si", "sí", "agendar", "demo", "quiero", "1"],
  },
  {
    id: "demo:no",
    title: "No, por ahora",
    match: ["no", "ahora no", "despues", "después", "2"],
  },
];

const STORE_QUESTION = "¿Tienes una tienda de tecnología?";
const SYSTEM_QUESTION = "¿Cómo manejas actualmente tus ventas e inventario?";
const DEMO_QUESTION = "¿Le interesa agendar una demo gratis para conocer nuestro sistema?";

const WELCOME =
  "Hola, soy el asistente de *Berea Tecnología*. En 3 preguntas te ayudo a agendar una demo gratis.";

const RESTART_RE =
  /^(hola+|holi+s?|buenos?\s*d[ií]as?|buenas(?:\s*(tardes|noches))?|hey|hi|hello|menu|inicio|empezar|info)$/i;

export function emptySession(waId: string, profileName: string | null): SessionState {
  return {
    wa_id: waId,
    profile_name: profileName,
    step: "idle",
    store_status: null,
    inventory_system: null,
    wants_demo: null,
  };
}

export function nextTurn(session: SessionState, incoming: IncomingReply): TurnResult {
  const restart = incoming.kind === "text" && isRestart(incoming.text ?? "");

  if (session.step === "handoff" && !restart) {
    return { session, messages: [], saveLead: false };
  }

  if (session.step === "idle" || restart) {
    const next: SessionState = {
      ...session,
      step: "store",
      store_status: null,
      inventory_system: null,
      wants_demo: null,
    };
    return {
      session: next,
      messages: [{ type: "text", body: WELCOME }, storeQuestion()],
      saveLead: false,
    };
  }

  if (session.step === "store") {
    const option = matchOption(STORE_OPTIONS, incoming);
    if (!option) {
      return {
        session,
        messages: [
          { type: "text", body: "Elige una de las opciones (o escribe 1, 2 o 3)." },
          storeQuestion(),
        ],
        saveLead: false,
      };
    }
    const next: SessionState = {
      ...session,
      step: "system",
      store_status: option.id,
    };
    return { session: next, messages: [systemQuestion()], saveLead: false };
  }

  if (session.step === "system") {
    const option = matchOption(SYSTEM_OPTIONS, incoming);
    if (!option) {
      return {
        session,
        messages: [
          { type: "text", body: "Elige una de las opciones (o escribe 1, 2, 3 o 4)." },
          systemQuestion(),
        ],
        saveLead: false,
      };
    }
    const next: SessionState = {
      ...session,
      step: "demo",
      inventory_system: option.id,
    };
    return { session: next, messages: [demoQuestion()], saveLead: false };
  }

  const option = matchOption(DEMO_OPTIONS, incoming);
  if (!option) {
    return {
      session,
      messages: [
        { type: "text", body: "Responde *1* para sí o *2* si por ahora no." },
        demoQuestion(),
      ],
      saveLead: false,
    };
  }

  const wantsDemo = option.id === "demo:yes";
  const next: SessionState = {
    ...session,
    step: "handoff",
    wants_demo: wantsDemo,
  };

  const body = wantsDemo
    ? "Listo. La demo es *gratis*. Un asesor de Berea te escribe por este mismo WhatsApp para coordinar el horario.\n\nSi quieres repetir el menú más adelante, escribe *hola*."
    : "Entendido. Cuando quieras conocernos, escribe *hola* y volvemos a empezar.";

  return {
    session: next,
    messages: [{ type: "text", body }],
    saveLead: true,
  };
}

export function optionLabel(id: string | null): string {
  if (!id) return "—";
  const all = [...STORE_OPTIONS, ...SYSTEM_OPTIONS, ...DEMO_OPTIONS];
  return all.find((o) => o.id === id)?.title ?? id;
}

function storeQuestion(): OutgoingMessage {
  return {
    type: "buttons",
    body: `${STORE_QUESTION}\n\n1. Sí, tengo una tienda\n2. Estoy por abrirla\n3. Estoy interesado para otro negocio`,
    buttons: STORE_OPTIONS.map(({ id, title }) => ({ id, title })),
  };
}

function systemQuestion(): OutgoingMessage {
  return {
    type: "list",
    body: `${SYSTEM_QUESTION}\n\n1. Excel\n2. Cuaderno\n3. Otro sistema\n4. No tengo sistema`,
    button: "Ver opciones",
    sectionTitle: "Sistema actual",
    rows: SYSTEM_OPTIONS.map(({ id, title, description }) => ({ id, title, description })),
  };
}

function demoQuestion(): OutgoingMessage {
  return {
    type: "buttons",
    body: `${DEMO_QUESTION}\n\n1. Sí\n2. No, por ahora`,
    buttons: DEMO_OPTIONS.map(({ id, title }) => ({ id, title })),
  };
}

function isRestart(text: string): boolean {
  return RESTART_RE.test(normalize(text));
}

function matchOption(options: Option[], incoming: IncomingReply): Option | null {
  if (incoming.kind === "interactive" && incoming.replyId) {
    return options.find((o) => o.id === incoming.replyId) ?? null;
  }
  const text = normalize(incoming.text ?? "");
  if (!text) return null;
  const byNumber = options.find((o) => o.match.includes(text));
  if (byNumber) return byNumber;
  return (
    options.find((o) => o.match.some((m) => m.length > 1 && (text === m || text.includes(m)))) ?? null
  );
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
