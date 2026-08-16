const TRADES = [
  'ኤሌክትሪክ · Electrical',
  'ቧንቧ · Plumbing',
  'ኤሌክትሮኒክስ · Electronics',
  'አይቲ · IT & Office',
  'የቤት እቃ · Appliances',
  'ጋዝ · Gas & Heating',
  'አናጢነት · Carpentry',
  'ቀለም · Painting',
  'ጥገና · Handyman',
  'ግቢ · Outdoor',
  'መኪና · Automotive',
];

/** Infinite trades ticker - pure CSS animation, duplicated track. */
export function Marquee() {
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {[...TRADES, ...TRADES].map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}
