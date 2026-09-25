import { ExternalLink, FileText, ImageOff, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { isImage, previewUrl, type TaskAttachment } from '../../lib/attachments';
import { useAttachmentImage } from '../../hooks/useAttachmentImage';
import { useWorkspace } from '../../store/workspace';

const KB = 1024;

function fileSize(bytes: number | null): string | null {
  if (!bytes || bytes < 0) return null;
  if (bytes < KB) return `${bytes} B`;
  if (bytes < KB * KB) return `${Math.round(bytes / KB)} KB`;
  return `${(bytes / (KB * KB)).toFixed(1)} MB`;
}

/**
 * One picture, fetched through this app's own endpoint because Todoist serves its files only to a
 * signed-in Todoist session. A file that cannot be read says so and offers itself in Todoist,
 * rather than leaving a blank box or breaking the page.
 */
function Photo({ file, token }: { file: TaskAttachment; token: string }) {
  const [broken, setBroken] = useState(false);
  const picture = useAttachmentImage(previewUrl(file), token);

  if (picture.status === 'loading') {
    return <span className="block h-24 w-full animate-pulse rounded-xl border border-line bg-canvas" aria-label={`Loading ${file.name}`} />;
  }
  if (picture.status === 'unavailable' || broken) {
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-canvas px-2 text-center text-[11.5px] text-ink-3 hover:bg-hover hover:text-ink"
        title={`${file.name} — open in Todoist`}
      >
        <ImageOff size={16} aria-hidden />
        Attachment unavailable
        <span className="inline-flex items-center gap-1 font-medium text-accent">
          Open in Todoist <ExternalLink size={11} aria-hidden />
        </span>
      </a>
    );
  }
  return (
    <a
      href={file.url}
      target="_blank"
      // The file lives on Todoist; open it there without handing that page this one.
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className="group block overflow-hidden rounded-xl border border-line bg-canvas"
      title={`${file.name} — open in Todoist`}
    >
      <img
        src={picture.src}
        alt={file.name}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className="h-24 w-full object-cover transition-transform group-hover:scale-[1.03]"
      />
    </a>
  );
}

/** A file that is not a picture: its name, opening in Todoist. */
function FileChip({ file }: { file: TaskAttachment }) {
  const size = fileSize(file.size);
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className="flex h-24 w-full flex-col items-start justify-center gap-1 rounded-xl border border-line bg-canvas px-3 text-left hover:bg-hover"
    >
      <FileText size={16} className="text-ink-3" aria-hidden />
      <span className="line-clamp-2 break-words text-[12px] font-medium text-ink">{file.name}</span>
      {size && <span className="text-[11.5px] text-ink-3">{size}</span>}
    </a>
  );
}

/**
 * Photos and files attached to a task in Todoist. Nothing is rendered when a task has none, so a
 * task without a photo shows no empty area.
 */
export function TaskAttachments({ files }: { files: TaskAttachment[] }) {
  const { settings } = useWorkspace();
  if (files.length === 0) return null;
  return (
    <section className="mt-4 border-t border-line pt-3" aria-label="Attachments">
      <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        <Paperclip size={13} aria-hidden /> Attachments <span className="font-normal text-ink-3">{files.length}</span>
      </h3>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {files.map((file) => (
          <li key={`${file.commentId}-${file.url}`} className="min-w-0">
            {isImage(file) ? <Photo file={file} token={settings.token} /> : <FileChip file={file} />}
            <span className="mt-1 block truncate text-[11.5px] text-ink-3" title={file.name}>
              {file.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
