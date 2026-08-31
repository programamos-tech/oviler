import type { WhatsAppConfig } from "./cloud-api";
import { markWhatsAppRead, sendWhatsAppMessage } from "./cloud-api";
import { nextTurn } from "./flow";
import type { ParsedInbound } from "./parse";
import { claimMessage, loadSession, saveLead, saveSession } from "./store";

export async function handleInbound(config: WhatsAppConfig, inbound: ParsedInbound): Promise<void> {
  if (config.phoneNumberId && inbound.phoneNumberId && inbound.phoneNumberId !== config.phoneNumberId) {
    return;
  }

  const claimed = await claimMessage(inbound.wamid);
  if (!claimed) return;

  await markWhatsAppRead(config, inbound.wamid).catch(() => {});

  const session = await loadSession(inbound.from, inbound.profileName);
  const turn = nextTurn(session, inbound.reply);

  for (const message of turn.messages) {
    await sendWhatsAppMessage(config, inbound.from, message);
  }

  await saveSession(turn.session);
  if (turn.saveLead) {
    await saveLead(turn.session);
  }
}
