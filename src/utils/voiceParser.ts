import { PaymentType, VoiceParsedResult } from '../types';

/**
 * Deterministic parser for voice transcripts in English/Tamil/Tanglish.
 * Strictly records offline cash payments.
 */
export function parseVoiceCommand(transcript: string): VoiceParsedResult | null {
  if (!transcript || transcript.trim().length === 0) return null;

  const raw = transcript.trim();
  const lower = raw.toLowerCase();

  // All entries in this app are offline cash payments
  const type: PaymentType = 'offline';

  // 1. Extract Amount
  let processed = lower
    .replace(/\blakh\b/g, '00000')
    .replace(/\bthousand\b/g, '000')
    .replace(/\bhundred\b/g, '00');

  const numberRegex = /(?:rs\.?|inr|₹|\$)?\s*(\d+(?:[.,]\d+)?)/i;
  const numMatch = processed.match(numberRegex);

  let amount = 0;
  if (numMatch && numMatch[1]) {
    amount = parseFloat(numMatch[1].replace(/,/g, ''));
  }

  // 2. Extract Name
  const cleanTokens = lower
    .replace(/\b(add|record|enter|save|paid|send|sent|received|payment|amount|rupees|rupee|rs|inr|bucks|cash|offline|from|for|to|by|please)\b/gi, ' ')
    .replace(/\d+(?:[.,]\d+)?/g, ' ')
    .replace(/[₹$!?,.]/g, ' ')
    .trim();

  let name = '';
  const candidateNames = cleanTokens.split(/\s+/).filter(word => word.length >= 2);
  if (candidateNames.length > 0) {
    name = candidateNames.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  const fromMatch = raw.match(/(?:from|for)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (fromMatch && fromMatch[1]) {
    name = fromMatch[1].trim().replace(/\b\w/g, l => l.toUpperCase());
  }

  const paidMatch = raw.match(/([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+paid/i);
  if (paidMatch && paidMatch[1]) {
    name = paidMatch[1].trim().replace(/\b\w/g, l => l.toUpperCase());
  }

  if (!name && amount <= 0) {
    return null;
  }

  return {
    name: name || 'Member',
    amount: amount > 0 ? amount : 0,
    type,
    rawTranscript: raw,
    confidence: (name && amount > 0) ? 0.95 : 0.6
  };
}
