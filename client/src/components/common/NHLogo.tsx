interface NHLogoProps {
  size?: number;
  radius?: number;
  className?: string;
  showWordmark?: boolean;
  wordmarkClass?: string;
}

export default function NHLogo({
  size = 36,
  radius,
  className = '',
  showWordmark = false,
  wordmarkClass = 'text-xl font-bold text-slate-800',
}: NHLogoProps) {
  const r  = radius ?? Math.round(size * 0.22);
  const s  = size / 56;
  const sw = Math.max(1, Math.round(4.5 * s));
  const nx0 = Math.round(13 * s), ny0 = Math.round(14 * s);
  const nH  = Math.round(28 * s);
  const diagW = Math.round(13 * s);
  const hx0 = Math.round(32 * s);
  const hW  = Math.round(11 * s);
  const cbY = Math.round(24 * s), cbH = Math.max(2, Math.round(6 * s));

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="NextHire logo mark">
        <rect width={size} height={size} rx={r} fill="#0F172A" />
        <rect x={nx0} y={ny0} width={sw} height={nH} rx={Math.max(1, Math.round(sw * 0.4))} fill="white" />
        <polygon points={`${nx0},${ny0} ${nx0 + sw},${ny0} ${nx0 + sw + diagW},${ny0 + nH} ${nx0 + diagW},${ny0 + nH}`} fill="white" />
        <rect x={nx0 + diagW} y={ny0} width={sw} height={nH} rx={Math.max(1, Math.round(sw * 0.4))} fill="white" />
        <rect x={hx0} y={ny0} width={sw} height={nH} rx={Math.max(1, Math.round(sw * 0.4))} fill="white" />
        <rect x={hx0} y={cbY} width={hW} height={cbH} rx={Math.max(1, Math.round(cbH * 0.4))} fill="white" />
        <rect x={hx0 + hW - sw} y={ny0} width={sw} height={nH} rx={Math.max(1, Math.round(sw * 0.4))} fill="white" />
      </svg>
      {showWordmark && <span className={wordmarkClass}>NextHire</span>}
    </span>
  );
}
