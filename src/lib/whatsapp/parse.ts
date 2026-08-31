import type { IncomingReply } from "./flow";

type WhatsAppChangeValue = {
  metadata?: { phone_number_id?: string };
  contacts?: { profile?: { name?: string }; wa_id?: string }[];
  messages?: WhatsAppIncomingMessage[];
};

type WhatsAppIncomingMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
};

export type ParsedInbound = {
  from: string;
  wamid: string;
  profileName: string | null;
  phoneNumberId: string | null;
  reply: IncomingReply;
};

export function parseInboundMessages(payload: unknown): ParsedInbound[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as {
    object?: string;
    entry?: { changes?: { value?: WhatsAppChangeValue }[] }[];
  };
  if (root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) {
    return [];
  }

  const out: ParsedInbound[] = [];
  for (const entry of root.entry) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages?.length) continue;
      const phoneNumberId = value.metadata?.phone_number_id ?? null;
      const nameByWaId = new Map(
        (value.contacts ?? [])
          .filter((c) => c.wa_id)
          .map((c) => [c.wa_id as string, c.profile?.name ?? null])
      );
      for (const message of value.messages) {
        const parsed = parseOne(message, phoneNumberId, nameByWaId);
        if (parsed) out.push(parsed);
      }
    }
  }
  return out;
}

function parseOne(
  message: WhatsAppIncomingMessage,
  phoneNumberId: string | null,
  nameByWaId: Map<string, string | null>
): ParsedInbound | null {
  const from = message.from?.trim();
  const wamid = message.id?.trim();
  if (!from || !wamid) return null;

  let reply: IncomingReply | null = null;
  if (message.type === "text" && message.text?.body) {
    reply = { kind: "text", text: message.text.body };
  } else if (message.type === "interactive") {
    const id =
      message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id ?? undefined;
    const title =
      message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? undefined;
    if (id || title) {
      reply = { kind: "interactive", replyId: id, text: title };
    }
  }

  if (!reply) return null;

  return {
    from,
    wamid,
    profileName: nameByWaId.get(from) ?? null,
    phoneNumberId,
    reply,
  };
}
