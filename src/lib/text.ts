import { parseTitle } from './cd';

/**
 * Todoist marks a task as non-completable (a heading-style row) by starting its name with "* ".
 * Such tasks have no checkbox in Todoist, so the dashboard doesn't offer one either.
 */
export const isUncompletable = (content: string) => /^\*\s/.test(content);

/** Todoist names may contain Markdown links and emphasis, and the "* " heading marker; show plain text. */
export function plainText(text: string): string {
  return text
    .replace(/^\*\s+/, '')
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .trim();
}

/** A task's name as people read it: no CD/IDD written into the title, no Markdown, no "* " marker. */
export const taskTitle = (content: string) => plainText(parseTitle(content).title);
