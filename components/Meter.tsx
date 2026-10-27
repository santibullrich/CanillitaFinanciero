import { mood } from '@/lib/format';

export default function Meter({ c }: { c: number }) {
  const pos = Math.max(0, Math.min(20, Math.round(10 + (c / 2) * 10)));
  return (
    <div className="pl-meter">
      <div className="pl-meter-bar" aria-label={`Termómetro del día: ${mood(c).word.toLowerCase()}`}>
        {Array.from({ length: 21 }, (_, i) => (
          <i key={i} className={i === pos ? 'now' : i > 10 && i < pos ? 'on-up' : i < 10 && i > pos ? 'on-down' : ''} style={{ animationDelay: `${i * 25}ms` }} />
        ))}
      </div>
      <div className="pl-meter-lbl"><span>DÍA DIFÍCIL</span><span>TRANQUILO</span><span>BUENÍSIMO</span></div>
    </div>
  );
}
