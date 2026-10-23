/**
 * Helper to build dynamic UPI payment URIs and formatted WhatsApp reminder messages.
 */

export interface UpiPaymentDetails {
  upiId?: string;
  payeeName?: string;
  amount: number;
  partyCode: string;
  partyName: string;
  mobile?: string;
  pendingDays?: number;
}

export const DEFAULT_UPI_ID = '9876543210@okbizaxis';
export const DEFAULT_PAYEE_NAME = 'Shreeji Healthcare';

export function generateUpiUrl(details: UpiPaymentDetails): string {
  const upiId = details.upiId || DEFAULT_UPI_ID;
  const payeeName = details.payeeName || DEFAULT_PAYEE_NAME;
  const amountStr = Number(details.amount).toFixed(2);
  const note = encodeURIComponent(`${details.partyCode} Bill Payment`);
  const encodedName = encodeURIComponent(payeeName);

  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amountStr}&cu=INR&tn=${note}`;
}

export function generateWhatsAppReminderMessage(details: UpiPaymentDetails): string {
  const upiUrl = generateUpiUrl(details);
  const amountFormatted = Number(details.amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  const lines = [
    `*નમસ્તે ${details.partyName}*,`,
    `*શ્રીજી હેલ્થકેર (Shreeji Healthcare)* તરફથી બાકી બિલની વિગત:`,
    '',
    `📋 *પાર્ટી કોડ*: ${details.partyCode}`,
    `💰 *કુલ બાકી રકમ*: ₹${amountFormatted}`,
    ...(details.pendingDays !== undefined ? [`⏳ *વિલંબિત દિવસો*: ${details.pendingDays} દિવસ`] : []),
    '',
    `📲 *તરત ચૂકવણી કરવા માટે UPI Link*:`,
    `${upiUrl}`,
    '',
    `કૃપા કરીને વહેલી તકે ચુકવણી કરશો. સહકાર બદલ આભાર! 🙏`,
    `_શ્રીજી હેલ્થકેર, અમદાવાદ_`,
  ];

  return lines.join('\n');
}

export function getWhatsAppReminderUrl(details: UpiPaymentDetails): string {
  const message = generateWhatsAppReminderMessage(details);
  let mobileClean = (details.mobile || '').replace(/\D/g, '');
  if (mobileClean.length === 10) {
    mobileClean = `91${mobileClean}`;
  }

  if (mobileClean) {
    return `https://wa.me/${mobileClean}?text=${encodeURIComponent(message)}`;
  } else {
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  }
}
