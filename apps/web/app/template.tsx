'use client';

import { useRef } from 'react';
import { gsap, reducedMotion, useGSAP } from '../lib/motion';

/** Soft page transition — every route change fades/slides its content in. */
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', clearProps: 'all' },
      );
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}
