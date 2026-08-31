import { createHmac, timingSafeEqual } from "crypto";
import type { OutgoingMessage } from "./flow";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v22.0";

export type WhatsAppConfig = {
  verifyToken: string;
  accessToken: string;
  phoneNumberId: string;
  appSecret: string;
};

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!verifyToken || !accessToken || !phoneNumberId || !appSecret) {
    return null;
  }
  return { verifyToken, accessToken, phoneNumberId, appSecret };
}

export function isValidWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (process.env.NODE_ENV !== "production" && process.env.WHATSAPP_SKIP_SIGNATURE_VERIFY === "true") {
    return true;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function markWhatsAppRead(config: WhatsAppConfig, messageId: string): Promise<void> {
  await graphPost(config, {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}

export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  message: OutgoingMessage
): Promise<void> {
  const payload = toGraphPayload(to, message);
  await graphPost(config, payload);
}

function toGraphPayload(to: string, message: OutgoingMessage): Record<string, unknown> {
  if (message.type === "text") {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: message.body },
    };
  }

  if (message.type === "buttons") {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: message.body },
        action: {
          buttons: message.buttons.map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    };
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: message.body },
      action: {
        button: message.button.slice(0, 20),
        sections: [
          {
            title: message.sectionTitle.slice(0, 24),
            rows: message.rows.map((row) => ({
              id: row.id,
              title: row.title.slice(0, 24),
              ...(row.description ? { description: row.description.slice(0, 72) } : {}),
            })),
          },
        ],
      },
    },
  };
}

async function graphPost(config: WhatsAppConfig, body: Record<string, unknown>): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${config.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`WhatsApp Graph ${res.status}: ${detail.slice(0, 500)}`);
  }
}
