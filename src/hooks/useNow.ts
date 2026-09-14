import { useEffect, useState } from 'react';

/** Current time, refreshed periodically so "Today" and "Just now" stay correct on a long-open tab. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
