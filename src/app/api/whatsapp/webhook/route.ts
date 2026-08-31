import { NextResponse } from "next/server";
import { getWhatsAppConfig, isValidWhatsAppSignature } from "@/lib/whatsapp/cloud-api";
import { handleInbound } from "@/lib/whatsapp/handle";
import { parseInboundMessages } from "@/lib/whatsapp/parse";

/**
 * Webhook de WhatsApp Cloud API.
 * Callback URL: https://<dominio>/api/whatsapp/webhook
 *
 * Variables: WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN,
 * WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const config = getWhatsAppConfig();
  if (!config) {
    console.error("[whatsapp] Faltan WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_APP_SECRET");
    return new NextResponse("WhatsApp no configurado", { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!isValidWhatsAppSignature(rawBody, signature, config.appSecret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const inbound = parseInboundMessages(payload);
  try {
    for (const message of inbound) {
      await handleInbound(config, message);
    }
  } catch (error) {
    console.error("[whatsapp] Error procesando mensaje", error);
    return new NextResponse("Error", { status: 500 });
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
