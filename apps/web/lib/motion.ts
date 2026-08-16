'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
  gsap.defaults({ ease: 'power3.out', duration: 1 });
}

export { gsap, ScrollTrigger, SplitText, useGSAP };

/** True when the user asked the OS to minimise motion. */
export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True on mouse-driven devices - gates cursor & magnetic effects. */
export const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

/** Resolves when webfonts are loaded so SplitText measures the real glyphs. */
export const fontsReady = (): Promise<void> =>
  typeof document !== 'undefined' && 'fonts' in document
    ? document.fonts.ready.then(() => undefined)
    : Promise.resolve(undefined);

/** Ask the smooth-scroll provider to freeze/unfreeze the page (menus, preloader). */
export function lockScroll(locked: boolean) {
  window.dispatchEvent(new CustomEvent('tg-scroll-lock', { detail: locked }));
  document.body.classList.toggle('scroll-locked', locked);
}
