import { Customer, PaymentType, VoiceParsedResult } from '../types';

/**
 * Deterministic parser for voice transcripts in English/Tamil/Tanglish.
 * Strictly records offline cash payments.
 * Never invents a "Member" placeholder when no name is spoken.
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

  // 2. Extract Name (only if actually spoken)
  const cleanTokens = lower
    .replace(/\b(add|record|enter|save|paid|pay|send|sent|received|payment|amount|rupees|rupee|rs|inr|bucks|cash|offline|from|for|to|by|please|in|hand)\b/gi, ' ')
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

  if (name.toLowerCase() === 'member') {
    name = '';
  }

  if (!name && amount <= 0) {
    return null;
  }

  return {
    name,
    amount: amount > 0 ? amount : 0,
    type,
    rawTranscript: raw,
    confidence: (name && amount > 0) ? 0.95 : 0.5
  };
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function consonantSkeleton(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '').replace(/[aeiou]/g, '');
}

/**
 * Finds and ranks related customers from the database matching a spoken name query.
 * If query is empty, returns all customers so the user can choose who paid.
 */
export function findMatchingCustomers(query: string, customers: Customer[]): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;

  const queryWords = q.split(/\s+/).filter(Boolean);
  const querySkel = consonantSkeleton(q);

  const scored = customers.map((customer) => {
    const cName = customer.name.toLowerCase();
    const cWords = cName.split(/\s+/).filter(Boolean);
    let score = 0;

    if (cName === q) score += 100;
    else if (cName.startsWith(q)) score += 80;
    else if (cName.includes(q)) score += 65;

    for (const qw of queryWords) {
      if (qw.length < 2) continue;
      for (const cw of cWords) {
        if (cw === qw) {
          score += 50;
        } else if (cw.startsWith(qw) || qw.startsWith(cw)) {
          score += 35;
        } else if (cw.includes(qw)) {
          score += 25;
        } else {
          const dist = levenshtein(qw, cw);
          const maxLen = Math.max(qw.length, cw.length);
          if (dist <= 2 && maxLen >= 3) {
            score += 30 - dist * 8;
          } else {
            const cSkel = consonantSkeleton(cw);
            const qWordSkel = consonantSkeleton(qw);
            if (qWordSkel.length >= 2 && cSkel && (cSkel.includes(qWordSkel) || qWordSkel.includes(cSkel) || levenshtein(qWordSkel, cSkel) <= 1)) {
              score += 20;
            }
          }
        }
      }
    }

    if (score === 0 && querySkel.length >= 3) {
      const fullSkel = consonantSkeleton(cName);
      if (fullSkel.includes(querySkel)) {
        score += 15;
      }
    }

    return { customer, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.customer);
}
