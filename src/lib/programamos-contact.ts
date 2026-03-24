/** WhatsApp programamos (mismo enlace que en el dashboard). */
const WA_PHONE = "573002061711";

export function programamosWhatsAppUrl(prefill: string): string {
  const text = encodeURIComponent(prefill);
  return `https://wa.me/${WA_PHONE}?text=${text}`;
}

export const PROGRAMAMOS_WA_LICENSE =
  programamosWhatsAppUrl(
    "Hola programamos, escribo desde NOU para adquirir o renovar la licencia de mi tienda."
  );
