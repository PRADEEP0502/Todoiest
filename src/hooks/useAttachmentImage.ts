import { useEffect, useState } from 'react';

/** How the picture is coming along: still loading, ready to show, or not available. */
export type ImageState = { status: 'loading' } | { status: 'ready'; src: string } | { status: 'unavailable' };

/**
 * A Todoist picture, ready for an <img>.
 *
 * Todoist serves its files only to a signed-in Todoist session, so the file is fetched through
 * this app's own `/api/attachment`, which passes the token along in a header. The bytes become a
 * blob URL that lives only as long as the preview is on screen. A demo picture (a data: URL) is
 * used as it is. Anything that fails simply reports "unavailable" — nothing throws.
 */
export function useAttachmentImage(url: string | null, token: string): ImageState {
  const [state, setState] = useState<ImageState>(() => (url ? { status: 'loading' } : { status: 'unavailable' }));

  useEffect(() => {
    if (!url) {
      setState({ status: 'unavailable' });
      return;
    }
    // Demo Mode draws its own pictures; they need no fetching.
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      setState({ status: 'ready', src: url });
      return;
    }
    if (!token) {
      setState({ status: 'unavailable' });
      return;
    }

    let objectUrl: string | null = null;
    const abort = new AbortController();
    setState({ status: 'loading' });
    fetch(`/api/attachment?url=${encodeURIComponent(url)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: abort.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const blob = await response.blob();
        if (abort.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', src: objectUrl });
      })
      .catch(() => {
        if (!abort.signal.aborted) setState({ status: 'unavailable' });
      });

    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, token]);

  return state;
}
