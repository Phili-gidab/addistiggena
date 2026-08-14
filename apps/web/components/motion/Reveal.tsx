'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll-reveal wrapper: fades/slides children in the first time they enter
 * the viewport. Pure IntersectionObserver + CSS — respects reduced motion via
 * the .reveal styles in globals.css.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'span';
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // fail-open: anything already in (or near) the viewport on mount reveals
    // immediately — covers anchor deep-links and environments without IO
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 1.15 && rect.bottom > -40) {
      el.classList.add('in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    // belt-and-braces: never leave content hidden forever
    const safety = setTimeout(() => el.classList.add('in'), 4000);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, []);

  return (
    <Tag
      // @ts-expect-error — ref type varies with the rendered tag
      ref={ref}
      className={`reveal ${className}`.trim()}
      style={delay ? ({ '--reveal-delay': `${delay}s` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
