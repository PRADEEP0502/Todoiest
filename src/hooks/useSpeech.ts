import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The browser's own speech recognition, wrapped so a component can just start and stop it.
 *
 * Chrome, Edge and Safari (iPhone and iPad included) have it; Firefox does not, so `supported`
 * says whether the microphone is worth offering at all. Nothing is sent anywhere by this hook —
 * the browser does the listening and hands back words.
 */

type Listener = (event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void;

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: Listener | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionClass = new () => Recognition;

function recognitionClass(): RecognitionClass | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Plain words for what went wrong, since the browser's own codes mean nothing to a reader. */
function describeError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'The microphone is blocked. Allow it for this site in your browser settings, then try again.';
    case 'no-speech':
      return 'Nothing was heard. Try again, a little closer to the microphone.';
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return 'Speech recognition needs the internet, and it could not be reached.';
    case 'aborted':
      return '';
    default:
      return 'The microphone stopped unexpectedly. Try again.';
  }
}

/** Safari stops at every pause; starting again this many times covers a long dictation. */
const MAX_RESTARTS = 20;

export interface SpeechState {
  supported: boolean;
  listening: boolean;
  /** Everything heard so far, including the part still being said. */
  text: string;
  error: string;
  start: (language: string) => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeech(): SpeechState {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const engine = useRef<Recognition | null>(null);
  const settled = useRef('');
  // True between Speak and Stop. Safari ignores `continuous` and ends at the first pause, so the
  // engine is started again while this is true; Chrome simply never ends on its own.
  const wanted = useRef(false);
  const restarts = useRef(0);

  useEffect(
    () => () => {
      wanted.current = false;
      engine.current?.abort();
    },
    [],
  );

  const start = useCallback((language: string) => {
    const Recogniser = recognitionClass();
    if (!Recogniser) return;
    engine.current?.abort();
    settled.current = '';
    restarts.current = 0;
    wanted.current = true;
    setText('');
    setError('');

    const listen = () => {
      const recognition = new Recogniser();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let pending = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const said = result[0]?.transcript ?? '';
          if (result.isFinal) settled.current = `${settled.current} ${said}`.trim();
          else pending += said;
        }
        setText(`${settled.current} ${pending}`.trim());
      };

      recognition.onerror = (event) => {
        // A pause is not a failure while we are still meant to be listening.
        if (event.error === 'no-speech' && wanted.current) return;
        const message = describeError(event.error);
        if (message) setError(message);
        wanted.current = false;
        setListening(false);
      };

      recognition.onend = () => {
        if (wanted.current && restarts.current < MAX_RESTARTS) {
          restarts.current += 1;
          try {
            listen();
            return;
          } catch {
            // Could not start again: fall through and stop quietly.
          }
        }
        wanted.current = false;
        setListening(false);
      };

      engine.current = recognition;
      recognition.start();
      setListening(true);
    };

    try {
      listen();
    } catch {
      wanted.current = false;
      setError('The microphone could not be started.');
    }
  }, []);

  const stop = useCallback(() => {
    wanted.current = false;
    engine.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    wanted.current = false;
    engine.current?.abort();
    settled.current = '';
    setText('');
    setError('');
    setListening(false);
  }, []);

  return { supported: !!recognitionClass(), listening, text, error, start, stop, reset };
}
