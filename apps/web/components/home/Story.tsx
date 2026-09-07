import { Dict } from '../../lib/i18n';
import { STORY_IMG } from '../../lib/images';

/** The Mitad origin story - from the official company profile. */
export function Story({ t }: { t: Dict }) {
  return (
    <section className="section" id="story">
      <div className="container story-grid">
        <div className="story-plate">
          <span className="photo" aria-hidden>
            {/* Photo: Unsplash (free license) - hands at work over a stove */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={STORY_IMG} alt="" loading="lazy" />
          </span>
          <div className="am">{t.story.lead}</div>
          <div className="en">{t.story.plate}</div>
        </div>
        <div className="story-copy">
          <span className="sec-kicker">{t.story.kicker}</span>
          <p className="lead">{t.story.lead}</p>
          <p>{t.story.p1}</p>
          <p>{t.story.p2}</p>
          <p>{t.story.p3}</p>
        </div>
      </div>
    </section>
  );
}
