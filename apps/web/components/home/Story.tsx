import { STORY } from '../../lib/content';
import { STORY_IMG } from '../../lib/images';

/** The Mitad origin story - from the official company profile. */
export function Story() {
  return (
    <section className="section" id="story">
      <div className="container story-grid">
        <div className="story-plate">
          <span className="photo" aria-hidden>
            {/* Photo: Unsplash (free license) - hands at work over a stove */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={STORY_IMG} alt="" loading="lazy" />
          </span>
          <div className="am">{STORY.titleAm}</div>
          <div className="en">
            From one broken Injera baking plate to a citywide network of verified technicians -
            backed by Amnen Marketing &amp; Promotion.
          </div>
        </div>
        <div className="story-copy">
          <span className="sec-kicker">Our story · ታሪካችን</span>
          <p className="lead">{STORY.title}</p>
          {STORY.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
