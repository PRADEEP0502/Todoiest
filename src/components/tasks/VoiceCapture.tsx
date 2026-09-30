import { Languages, Loader2, Mic, MicOff, Square } from 'lucide-react';
import { useState } from 'react';
import { useSpeech } from '../../hooks/useSpeech';

/** Tamil speech is recognised as Tamil; English and Tanglish both come through as English. */
const LANGUAGES = [
  { value: 'en-IN', label: 'English' },
  { value: 'ta-IN', label: 'தமிழ்' },
];

interface VoiceCaptureProps {
  /**
   * The tasks heard, already written as professional English. Nothing is created here: the caller
   * puts them where they can be read and edited first.
   */
  onTasks: (tasks: string[]) => void;
  /** Wording for the button that hands the tasks over, e.g. "Use this task". */
  useLabel?: string;
  /** Only the first task is kept when the caller can hold one, e.g. the task name field. */
  single?: boolean;
}

/**
 * Speak a task instead of typing it: a microphone beside the field.
 *
 * The browser turns speech into words; the words go to this app's own endpoint, which writes them
 * as professional English task titles and sends them back. What was heard and what will be created
 * are both shown, and nothing is created until the person hands them over.
 */
export function VoiceCapture({ onTasks, useLabel = 'Use this', single = false }: VoiceCaptureProps) {
  const speech = useSpeech();
  const [language, setLanguage] = useState(LANGUAGES[0].value);
  const [thinking, setThinking] = useState(false);
  const [tasks, setTasks] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [failure, setFailure] = useState('');

  // Firefox and very old Safari cannot listen. Rather than leave a gap, say where the microphone is.
  if (!speech.supported) {
    return (
      <span className="text-[11.5px] text-ink-3">Use your keyboard’s microphone to dictate</span>
    );
  }

  const heard = speech.text.trim();
  const showPanel = !!heard || thinking || tasks.length > 0 || !!question || !!failure || !!speech.error;

  const rewrite = async () => {
    speech.stop();
    const said = speech.text.trim();
    if (!said || thinking) return;
    setThinking(true);
    setFailure('');
    setQuestion('');
    setTasks([]);
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: said }),
      });
      const data = (await response.json()) as { tasks?: string[]; question?: string; error?: string };
      if (!response.ok) {
        // Without the writing service the words themselves are still usable.
        setFailure(data.error ?? 'The words could not be rewritten.');
        setTasks([said]);
      } else if (data.tasks?.length) {
        setTasks(single ? data.tasks.slice(0, 1) : data.tasks);
      } else {
        setQuestion(data.question ?? 'That was not clear enough to make a task from.');
      }
    } catch {
      setFailure('The words could not be rewritten.');
      setTasks([said]);
    }
    setThinking(false);
  };

  const clear = () => {
    speech.reset();
    setTasks([]);
    setQuestion('');
    setFailure('');
  };

  return (
    <>
      <span className="inline-flex shrink-0 items-center gap-1.5">
        {speech.listening ? (
          <button type="button" onClick={rewrite} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-p1 px-3 text-[12.5px] font-medium text-white" aria-label="Stop listening">
            <Square size={12} /> Stop
            <span className="ml-0.5 h-2 w-2 animate-pulse rounded-full bg-white/80" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => speech.start(language)}
            disabled={thinking}
            className="icon-btn h-8 w-8 text-ink-2 disabled:opacity-50"
            aria-label="Speak the task"
            title="Speak the task"
          >
            {thinking ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />}
          </button>
        )}
        {!speech.listening && (
          <label className="inline-flex items-center gap-1 text-ink-3" title="Language you will speak">
            <Languages size={13} aria-hidden />
            <span className="sr-only">Language</span>
            <select
              className="h-8 rounded-lg border border-line bg-surface px-1.5 text-[12px] text-ink-2 focus:outline-none"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </label>
        )}
      </span>

      {showPanel && (
        <section className="mt-2 w-full rounded-xl border border-line bg-canvas px-3 py-2.5" aria-label="Speak a task">
          {speech.listening && (
            <p className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden /> Listening…
            </p>
          )}
          {thinking && (
            <p className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
              <Loader2 size={13} className="animate-spin" aria-hidden /> Writing it up…
            </p>
          )}
          {speech.error && (
            <p className="inline-flex items-start gap-1.5 text-[12.5px] text-p1">
              <MicOff size={13} className="mt-0.5 shrink-0" aria-hidden /> {speech.error}
            </p>
          )}

          {heard && (
            <p className="mt-1 text-[12.5px] text-ink-3">
              <span className="font-semibold text-ink-2">Heard:</span> {heard}
            </p>
          )}
          {question && <p className="mt-1.5 text-[12.5px] text-p1">{question}</p>}
          {failure && <p className="mt-1.5 text-[12.5px] text-p1">{failure} The words are kept as they were heard.</p>}

          {tasks.length > 0 && (
            <div className="mt-2">
              <h4 className="mb-1.5 text-[12.5px] font-semibold text-ink">
                {single ? 'Professional task' : `Professional ${tasks.length === 1 ? 'task' : `tasks · ${tasks.length}`}`}
              </h4>
              <ul className="space-y-1">
                {tasks.map((t, i) => (
                  <li key={`${i}-${t}`} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink">
                    {tasks.length > 1 && <span className="mr-1.5 text-ink-3">{i + 1}.</span>}
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(tasks.length > 0 || (!speech.listening && heard)) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {tasks.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary h-8 text-[12.5px]"
                  onClick={() => {
                    onTasks(tasks);
                    clear();
                  }}
                >
                  {useLabel}
                </button>
              )}
              <button type="button" className="btn-ghost h-8 text-[12.5px]" onClick={clear}>
                Clear
              </button>
              {tasks.length > 0 && <span className="text-[11.5px] text-ink-3">You can edit it before creating.</span>}
            </div>
          )}
        </section>
      )}
    </>
  );
}
