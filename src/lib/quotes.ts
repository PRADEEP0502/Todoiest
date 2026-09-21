/** Short quotes on discipline, consistency, growth, confidence, productivity and success. */
export const QUOTES: readonly string[] = [
  'Small progress every day leads to big results.',
  'Discipline is choosing what you want most over what you want now.',
  'Consistency beats intensity.',
  'Show up today. Tomorrow will thank you.',
  'Focus on the next right task, not the whole mountain.',
  'What you do daily matters more than what you do occasionally.',
  'Confidence is built by keeping promises to yourself.',
  'Done is better than perfect, and better than planned.',
  'Growth begins where comfort ends.',
  'Success is the sum of small efforts repeated daily.',
  'Start where you are. Use what you have. Do what you can.',
  'Clarity comes from action, not from waiting.',
  'Your future is shaped by what you do today.',
  'Do the hard thing first; the rest gets easy.',
  'Productivity is doing the important things, not everything.',
  'Excellence is a habit, not an act.',
  'Progress, not perfection.',
  'Great teams are built on reliable habits.',
  'Every finished task is a step towards the goal.',
  'Be so consistent that results have no choice.',
  'Plan the work, then work the plan.',
  'Momentum starts with a single completed task.',
  'Standards rise when you decide they will.',
  'Ownership turns problems into progress.',
  'Do it well, do it on time, do it again.',
  'Patience and persistence beat talent that quits.',
  'A clear priority is worth more than a long list.',
  'Believe in the work you have put in.',
  'Winners are ordinary people who keep going.',
  'Deadlines are promises; keep them.',
  'Learn something today that you did not know yesterday.',
  'Discipline today creates freedom tomorrow.',
  'Trust the process and keep moving.',
  'The best time to start was earlier. The next best is now.',
  'Effort compounds. So do habits.',
  'Courage is taking the next step while unsure.',
  'Make today’s work something you are proud of.',
  'Stay steady; results follow the routine.',
  'Turn “someday” into a date on the calendar.',
  'Quality is remembered long after speed is forgotten.',
  'One focused hour beats a distracted day.',
  'Improve by one percent every day.',
  'Lead by doing what you say you will do.',
  'Strong habits make hard goals ordinary.',
  'Finish what you start.',
  'Growth is uncomfortable, and worth it.',
  'Success loves preparation.',
  'Take responsibility, then take action.',
  'Small wins build big confidence.',
  'Work with purpose and the results will follow.',
  'Simplify, prioritise, execute.',
  'What gets scheduled gets done.',
  'Keep your word, keep your pace, keep going.',
  'Resilience is showing up after a bad day.',
  'Aim high, start small, stay consistent.',
  'Your only competition is who you were yesterday.',
  'Action cures doubt.',
  'Great work is the result of steady, unglamorous effort.',
  'Be the reason the team can rely on tomorrow.',
  'Every day is a fresh page. Write something worth reading.',
];

const DAY_MS = 86_400_000;

/** The day the run of quotes starts from, so the first quote in the list is the one shown then. */
const FIRST_DAY = Date.UTC(2026, 8, 20) / DAY_MS;

/** A small deterministic generator, so the order below is the same everywhere and every run. */
function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The quotes in a shuffled order, so they do not read as a list going top to bottom. */
function shuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  const rand = seeded(20260920);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // The first quote in the list opens the run; the rest keep their shuffled order.
  const at = order.indexOf(0);
  [order[0], order[at]] = [order[at], order[0]];
  return order;
}

/**
 * The step between one day and the next. Any step that shares no factor with the number of quotes
 * walks through all of them before coming back, which is what keeps a quote from returning early.
 */
function stepFor(length: number): number {
  for (let step = Math.max(2, Math.round(length * 0.38)); step < length; step++) {
    let a = step;
    let b = length;
    while (b) [a, b] = [b, a % b];
    if (a === 1) return step;
  }
  return 1;
}

/**
 * One quote per calendar day (local time). Because the day number moves by a step that is coprime
 * with the list, no quote comes back until every other one has been shown — 60 days apart here.
 */
export function quoteForDay(date: Date, quotes: readonly string[] = QUOTES): string {
  const n = quotes.length;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
  const order = shuffledOrder(n);
  return quotes[order[((((day - FIRST_DAY) * stepFor(n)) % n) + n) % n]];
}
