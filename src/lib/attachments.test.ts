import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../services/todoist/demoData';
import type { TodoistComment } from '../types/todoist';
import { attachmentCount, isImage, previewUrl, taskAttachments } from './attachments';

const file = (over: Partial<NonNullable<TodoistComment['attachment']>> = {}) => ({
  name: 'photo.jpg',
  type: 'image/jpeg',
  url: 'https://files.todoist.com/a.jpg',
  image: 'https://files.todoist.com/a.jpg',
  thumbnail: 'https://image-resize.todoist.com/t.jpg',
  width: 480,
  height: 320,
  size: 1024,
  ...over,
});

const comment = (id: string, taskId: string, attachment: TodoistComment['attachment'] = null, postedAt = '2026-09-20T10:00:00Z'): TodoistComment => ({
  id,
  task_id: taskId,
  posted_uid: 'u1',
  content: 'see photo',
  posted_at: postedAt,
  attachment,
});

describe('task attachments', () => {
  const comments = [
    comment('c1', 't1', file(), '2026-09-20T10:00:00Z'),
    comment('c2', 't1', file({ name: 'second.jpg' }), '2026-09-21T10:00:00Z'),
    comment('c3', 't1'),
    comment('c4', 't2', file({ name: 'quote.pdf', type: 'application/pdf', image: null, thumbnail: null })),
  ];

  it('collects every file of a task, oldest first', () => {
    const files = taskAttachments(comments, 't1');
    expect(files.map((f) => f.name)).toEqual(['photo.jpg', 'second.jpg']);
    expect(files[0].commentId).toBe('c1');
  });

  it('gives a task with no file an empty list, so nothing is rendered for it', () => {
    expect(taskAttachments(comments, 't3')).toEqual([]);
    expect(attachmentCount(comments, 't3')).toBe(0);
    expect(attachmentCount(comments, 't1')).toBe(2);
  });

  it('knows a picture from any other file', () => {
    expect(isImage(file())).toBe(true);
    expect(isImage(file({ type: 'application/pdf', image: null }))).toBe(false);
    // Todoist sometimes gives the picture without a type.
    expect(isImage(file({ type: null }))).toBe(true);
  });

  it('prefers the thumbnail for a preview, then the image, then the file itself', () => {
    expect(previewUrl(file())).toBe('https://image-resize.todoist.com/t.jpg');
    expect(previewUrl(file({ thumbnail: null }))).toBe('https://files.todoist.com/a.jpg');
    expect(previewUrl(file({ thumbnail: null, image: null }))).toBe('https://files.todoist.com/a.jpg');
    expect(previewUrl(file({ thumbnail: null, image: null, type: 'application/pdf' }))).toBeNull();
  });

  it('the demo workspace carries photos, a document and a link that no longer works', () => {
    const snapshot = createDemoSnapshot(new Date(2026, 8, 25, 9, 0));
    const withFiles = snapshot.comments.filter((c) => c.attachment);
    expect(withFiles.length).toBeGreaterThanOrEqual(4);
    expect(withFiles.some((c) => isImage(c.attachment!))).toBe(true);
    expect(withFiles.some((c) => c.attachment!.type === 'application/pdf')).toBe(true);
  });
});
