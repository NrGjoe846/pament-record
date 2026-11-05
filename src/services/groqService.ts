import { VoiceParsedResult } from '../types';
import { parseVoiceCommand as fallbackParseVoiceCommand } from '../utils/voiceParser';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_MODEL = import.meta.env.VITE_GROQ_LLM_MODEL || 'openai/gpt-oss-20b';

export const isGroqConfigured = Boolean(
  GROQ_API_KEY && 
  GROQ_API_KEY.startsWith('gsk_') && 
  !GROQ_API_KEY.includes('your_groq_api_key_here')
);

export interface ParsedCustomerVoice {
  name?: string;
  phone?: string;
  homeAddress?: string;
  monthlyDue?: number;
  totalTarget?: number;
  endingMonth?: string;
}

/**
 * Parses spoken voice input (Tamil, Tanglish, or English) into customer payment details using Groq AI.
 * Falls back to offline regex parser if Groq is unavailable or device is offline.
 */
export async function parseVoiceWithGroq(
  transcript: string,
  existingCustomerNames: string[] = []
): Promise<VoiceParsedResult | null> {
  if (!transcript || transcript.trim().length === 0) return null;

  // If Groq is not configured or user is offline, use fast deterministic regex parser
  if (!isGroqConfigured || !navigator.onLine) {
    return fallbackParseVoiceCommand(transcript);
  }

  try {
    const customerContext = existingCustomerNames.length > 0
      ? `Existing registered customers in the database: ${existingCustomerNames.join(', ')}. Prefer matching to one of these customers if phonetically similar.`
      : '';

    const systemPrompt = `You extract customer cash payment transaction details from user speech.
The speech can be in Tamil, Tanglish, or English.
${customerContext}

Tamil Number Reference:
- ஒன்று / ஒன்னு = 1, இரண்டு / ரெண்டு = 2, மூன்று / மூணு = 3, நான்கு / நாலு = 4, ஐந்து / அஞ்சு = 5
- ஆறு = 6, ஏழு = 7, எட்டு = 8, ஒன்பது = 9, பத்து = 10, நூறு = 100
- ஆயிரம் = 1000 (e.g. "அஞ்சு ஆயிரம்" / "anju aayiram" = 5000, "பத்தாயிரம்" = 10000, "இருபதாயிரம்" = 20000)
- லட்சம் = 100000 (e.g. "ஒரு லட்சம்" = 100000)

Return a strict JSON object with:
- "name": string (Customer's full name, transliterated to English letters)
- "amount": number (The numerical payment amount)

Respond ONLY with valid JSON. No prose.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Groq API returned ${response.status}. Using offline fallback.`);
      return fallbackParseVoiceCommand(transcript);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return fallbackParseVoiceCommand(transcript);
    }

    const parsed = JSON.parse(content);
    const parsedAmount = typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount);

    if (!parsed.name && (!parsedAmount || isNaN(parsedAmount))) {
      return fallbackParseVoiceCommand(transcript);
    }

    return {
      name: parsed.name || 'Member',
      amount: parsedAmount > 0 ? parsedAmount : 0,
      type: 'offline',
      rawTranscript: transcript,
      confidence: 0.98
    };
  } catch (err) {
    console.warn('Groq parsing failed or timed out, using offline parser:', err);
    return fallbackParseVoiceCommand(transcript);
  }
}

/**
 * Extracts complete customer details (Name, Phone, Home Address/Area, Monthly Due, Target, Ending Month)
 * from spoken voice in Tamil, Tanglish, or English.
 * Auto-slots into form fields for non-educated field agents and customers.
 */
export async function parseCustomerVoiceWithGroq(
  transcript: string,
  targetField?: 'name' | 'phone' | 'homeAddress' | 'monthlyDue' | 'totalTarget' | 'endingMonth'
): Promise<ParsedCustomerVoice | null> {
  if (!transcript || transcript.trim().length === 0) return null;

  // Single field fast extraction
  if (targetField === 'phone') {
    const digits = transcript.replace(/\D/g, '');
    if (digits.length >= 10) {
      return { phone: digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : digits };
    }
  }

  // If Groq is not configured or user is offline, use local regex extraction
  if (!isGroqConfigured || !navigator.onLine) {
    return fallbackCustomerParser(transcript, targetField);
  }

  try {
    const singleFieldGuide = targetField
      ? `The user is specifically speaking the "${targetField}" field. Focus on extracting that field accurately.`
      : '';

    const systemPrompt = `You are an AI assistant for a cash collection app designed for non-educated users.
Extract new customer registration information from speech in Tamil, Tanglish, or English.
${singleFieldGuide}

Expected fields:
- "name": string (Customer's full name transliterated into English letters e.g. "Karthik Raja")
- "phone": string (Phone number formatted like "+91 98765 43210" if 10 digits found)
- "homeAddress": string (Home address, street name, area, colony, or city mentioned)
- "monthlyDue": number (Monthly installment amount, e.g. 5000)
- "totalTarget": number (Total scheme commitment amount, e.g. 100000)
- "endingMonth": string (Completion month, e.g. "August 2027")

Tamil vocabulary notes:
- பெயர் / Name = name
- போன் / செல் நம்பர் = phone
- அட்ரஸ் / ஊர் / ஏரியா / தெரு / Address = homeAddress
- மாசம் / மாதாந்திர கட்டணம் = monthlyDue
- மொத்தம் / மொத்த தொகை = totalTarget
- அஞ்சு ஆயிரம் / 5000, பத்தாயிரம் / 10000, ஒரு லட்சம் / 100000

Return ONLY a valid JSON object with the detected fields. Omit nulls or empty strings.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return fallbackCustomerParser(transcript, targetField);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallbackCustomerParser(transcript, targetField);

    const parsed = JSON.parse(content);
    return {
      name: parsed.name ? String(parsed.name).trim() : undefined,
      phone: parsed.phone ? String(parsed.phone).trim() : undefined,
      homeAddress: parsed.homeAddress ? String(parsed.homeAddress).trim() : undefined,
      monthlyDue: parsed.monthlyDue ? Number(parsed.monthlyDue) : undefined,
      totalTarget: parsed.totalTarget ? Number(parsed.totalTarget) : undefined,
      endingMonth: parsed.endingMonth ? String(parsed.endingMonth).trim() : undefined,
    };
  } catch (err) {
    console.warn('Groq customer parse error, using fallback:', err);
    return fallbackCustomerParser(transcript, targetField);
  }
}

/**
 * Offline regex parser for customer form fields
 */
function fallbackCustomerParser(
  transcript: string,
  targetField?: 'name' | 'phone' | 'homeAddress' | 'monthlyDue' | 'totalTarget' | 'endingMonth'
): ParsedCustomerVoice {
  const result: ParsedCustomerVoice = {};
  const text = transcript.trim();

  // If specific field targeted
  if (targetField === 'name') {
    result.name = text;
    return result;
  }
  if (targetField === 'homeAddress') {
    result.homeAddress = text;
    return result;
  }

  // Phone regex (10 digits)
  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{9}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0];
  }

  // Amount regex
  const numMatch = text.match(/(?:rs\.?|inr|₹|\$)?\s*(\d{3,7})/i);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    if (val >= 1000 && val <= 50000) {
      result.monthlyDue = val;
    } else if (val > 50000) {
      result.totalTarget = val;
    }
  }

  // Name (words before phone or address)
  const clean = text
    .replace(/(?:\+91[\s-]?)?[6-9]\d{9}/g, '')
    .replace(/\b(phone|mobile|address|street|nagar|chennai|due|monthly|target|rs|rupees)\b/gi, '')
    .trim();
  
  if (clean.length > 2) {
    result.name = clean.split(/\s+/).slice(0, 3).join(' ');
  }

  return result;
}
