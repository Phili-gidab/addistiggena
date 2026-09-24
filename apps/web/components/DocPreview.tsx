'use client';

import { useCallback, useRef, useState } from 'react';
import { authorizedFetch } from '../lib/api';

/**
 * A document in the verification queue that shows itself on hover.
 *
 * The verification desk checks four or five documents per applicant. Opening
 * each one in a new tab and coming back is the slow part of the job, so
 * resting the cursor on a document pops the image up over the queue instead.
 * Clicking still opens the full file.
 *
 * Files sit behind the API's auth, so they cannot be used as a plain <img src>;
 * each one is fetched once and kept as an object URL for the life of the page.
 */

const cache = new Map<string, string>();

export function DocPreview({
  objectKey,
  label,
  approved,
}: {
  objectKey: string;
  label: string;
  approved?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(cache.get(objectKey) ?? null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOnce = useCallback(async () => {
    if (cache.has(objectKey)) {
      setUrl(cache.get(objectKey)!);
      return;
    }
    try {
      const res = await authorizedFetch(`/files/${objectKey}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      // a PDF cannot be shown in an <img>; the click-through handles those
      if (!blob.type.startsWith('image/')) {
        setFailed(true);
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      cache.set(objectKey, objectUrl);
      setUrl(objectUrl);
    } catch {
      setFailed(true);
    }
  }, [objectKey]);

  const show = () => {
    timer.current = setTimeout(() => {
      setOpen(true);
      fetchOnce();
    }, 180); // a brush past should not fire a download
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  const openFull = async () => {
    await fetchOnce();
    const target = cache.get(objectKey);
    if (target) window.open(target, '_blank', 'noopener');
  };

  return (
    <span className="doc-peek" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <button type="button" className="doc-link" onClick={openFull}>
        {approved ? '✓ ' : ''}
        {label}
      </button>
      {open && (
        <span className="doc-pop" role="tooltip">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} />
          ) : (
            <span className="doc-pop-note">{failed ? 'Open to view this file' : 'Loading…'}</span>
          )}
          <span className="doc-pop-label">{label}</span>
        </span>
      )}
    </span>
  );
}
