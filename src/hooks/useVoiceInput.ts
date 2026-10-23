import { useState, useEffect, useRef, useCallback } from 'react';

export type VoiceLanguage = 'gu-IN' | 'hi-IN' | 'en-IN';

interface VoiceInputOptions {
  onResult?: (transcript: string, parsed?: { query: string; quantity?: number; unit?: string }) => void;
  defaultLang?: VoiceLanguage;
}

// Convert Indic numerals (Gujarati/Devanagari) to ASCII digits
export function normalizeIndicNumerals(text: string): string {
  const gujaratiNums: Record<string, string> = {
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
  };
  const hindiNums: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };

  let res = text;
  for (const [k, v] of Object.entries(gujaratiNums)) {
    res = res.split(k).join(v);
  }
  for (const [k, v] of Object.entries(hindiNums)) {
    res = res.split(k).join(v);
  }
  return res;
}

// Helper to extract product name and quantity from speech
// e.g., "Dolo 650 10 box", "Paracetamol 5 strip", "Azithromycin 2"
export function parseVoiceOrder(rawText: string): { query: string; quantity?: number; unit?: string } {
  const text = normalizeIndicNumerals(rawText.trim());

  // Match trailing quantity e.g. "10 box", "5 strip", "10", "3 કેસ"
  const qtyRegex = /(?:(\d+)\s*(?:strip|strips|box|boxes|case|cases|pkt|pkts|બોક્સ|પેટા|સ્ટ્રીપ|ટેબ્લેટ)?|\s+(?:qty|quantity)\s*(\d+))\s*$/i;
  const match = text.match(qtyRegex);

  if (match) {
    const qty = parseInt(match[1] || match[2], 10);
    const cleanedQuery = text.replace(qtyRegex, '').trim();

    let unit = 'unit';
    const lower = text.toLowerCase();
    if (lower.includes('box') || lower.includes('બોક્સ')) unit = 'box';
    else if (lower.includes('strip') || lower.includes('સ્ટ્રીપ')) unit = 'strip';
    else if (lower.includes('case') || lower.includes('કેસ')) unit = 'case';

    return {
      query: cleanedQuery || text,
      quantity: isNaN(qty) ? undefined : qty,
      unit
    };
  }

  return { query: text };
}

export function useVoiceInput({ onResult, defaultLang = 'gu-IN' }: VoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState<VoiceLanguage>(defaultLang);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const resultText = event.results[current][0].transcript;
      const normalized = normalizeIndicNumerals(resultText);
      setTranscript(normalized);

      const parsed = parseVoiceOrder(normalized);
      if (onResult) {
        onResult(normalized, parsed);
      }
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please grant permission.');
      } else if (event.error !== 'no-speech') {
        setError(`Speech error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [language, onResult]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = language;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        console.warn('Recognition start error:', err);
        try {
          recognitionRef.current.stop();
        } catch {}
        setIsListening(false);
      }
    } else {
      setError('Speech recognition not available.');
    }
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const isSupported = typeof window !== 'undefined' && 
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return {
    isListening,
    transcript,
    language,
    setLanguage,
    error,
    startListening,
    stopListening,
    isSupported,
  };
}
