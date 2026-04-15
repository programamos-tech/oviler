/** WhatsApp programamos (mismo enlace que en el dashboard). */
const WA_PHONE = "573002061711";

export function programamosWhatsAppUrl(prefill: string): string {
  const text = encodeURIComponent(prefill);
  return `https://wa.me/${WA_PHONE}?text=${text}`;
}

export const PROGRAMAMOS_WA_LICENSE =
  programamosWhatsAppUrl(
    "Hola programamos, escribo desde Berea Comercios para adquirir o renovar la licencia de mi tienda."
  );

/** Licencia comercial — contacto directo (WhatsApp y llamada). */
export const COMMERCIAL_LICENSE_WA_E164 = "573004934434";

export const COMMERCIAL_LICENSE_TEL_HREF = `tel:+${COMMERCIAL_LICENSE_WA_E164}`;

export function commercialLicenseWhatsAppUrl(
  prefill = "Hola, quiero información sobre la licencia comercial de Berea Comercios."
): string {
  return `https://wa.me/${COMMERCIAL_LICENSE_WA_E164}?text=${encodeURIComponent(prefill)}`;
}

export function commercialLicenseWhatsAppPrefill(planLabelForUser: string): string {
  return `Hola, quiero información sobre la licencia comercial de Berea Comercios. Mi plan actual: ${planLabelForUser}.`;
}
