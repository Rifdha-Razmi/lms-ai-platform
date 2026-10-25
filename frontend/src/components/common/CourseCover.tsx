import { cn } from '@/utils/cn';

/**
 * Generated course artwork. Each category gets its own motif drawn from its
 * subject (a tree for CS, a scatter for data science…) so the catalog reads at
 * a glance without stock photos. Uploaded thumbnails take precedence.
 */
const palettes: Record<string, { bg: string; fg: string }> = {
  'Computer Science': { bg: '#1F3A8A', fg: '#C7D4FF' },
  'Web Development': { bg: '#0F5E57', fg: '#B6F0E6' },
  'Data Science': { bg: '#5B2A86', fg: '#E3CCFF' },
  Databases: { bg: '#7A3412', fg: '#FFD9C2' },
  DevOps: { bg: '#1E4D6B', fg: '#C6E8FF' },
  Communication: { bg: '#3D4A1F', fg: '#E4F2B8' },
};

function Motif({ category, fg }: { category: string; fg: string }) {
  const s = { stroke: fg, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const };
  switch (category) {
    case 'Computer Science':
      return (
        <g {...s}>
          <path d="M200 30 L150 75 M200 30 L250 75 M150 75 L120 120 M150 75 L175 120 M250 75 L280 120" />
          {[
            [200, 30],
            [150, 75],
            [250, 75],
            [120, 120],
            [175, 120],
            [280, 120],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={9} fill={i === 3 ? '#FFD84D' : '#00000033'} />
          ))}
        </g>
      );
    case 'Web Development':
      return (
        <g {...s}>
          <path d="M150 50 L120 80 L150 110 M250 50 L280 80 L250 110 M215 40 L185 120" strokeWidth={3} />
          <rect x="300" y="40" width="60" height="80" rx="4" />
          <path d="M310 58h40M310 72h28M310 86h34" />
        </g>
      );
    case 'Data Science':
      return (
        <g {...s}>
          <path d="M90 130 L330 130 M90 130 L90 25" />
          <path d="M100 118 L320 40" stroke="#FFD84D" strokeWidth={3} />
          {[
            [120, 105],
            [150, 112],
            [170, 88],
            [200, 92],
            [230, 70],
            [250, 78],
            [280, 55],
            [305, 52],
            [190, 110],
            [270, 74],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={4} fill={fg} />
          ))}
        </g>
      );
    case 'Databases':
      return (
        <g {...s}>
          <rect x="110" y="35" width="90" height="90" rx="3" />
          <path d="M110 57h90M110 79h90M110 101h90M150 35v90" />
          <rect x="240" y="35" width="90" height="68" rx="3" />
          <path d="M240 57h90M240 79h90M280 35v68" />
          <path d="M200 68 C220 68 220 46 240 46" stroke="#FFD84D" strokeWidth={3} />
        </g>
      );
    case 'DevOps':
      return (
        <g {...s}>
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={140 + i * 14}
              y={100 - i * 28}
              width="120"
              height="24"
              rx="3"
              fill={i === 2 ? '#FFD84D33' : 'none'}
            />
          ))}
          <path d="M300 60 a28 28 0 1 1 -8 -20 M292 30 v12 h12" />
        </g>
      );
    default:
      return (
        <g {...s}>
          {[40, 60, 80, 100, 120].map((y, i) => (
            <path
              key={y}
              d={`M110 ${y} H${[310, 280, 300, 240, 270][i]}`}
              stroke={i === 2 ? '#FFD84D' : fg}
              strokeWidth={i === 2 ? 6 : 2}
            />
          ))}
        </g>
      );
  }
}

export function CourseCover({
  category,
  title,
  thumbnailUrl,
  className,
}: {
  category: string;
  title: string;
  thumbnailUrl?: string | null;
  className?: string;
}) {
  if (thumbnailUrl) {
    return <img src={thumbnailUrl} alt="" className={cn('aspect-[16/9] w-full object-cover', className)} />;
  }
  const pal = palettes[category] ?? palettes['Computer Science'];
  return (
    <svg
      viewBox="0 0 420 160"
      role="img"
      aria-label={`${title} cover`}
      className={cn('block aspect-[21/8] w-full', className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="420" height="160" fill={pal.bg} />
      <g opacity="0.12" stroke={pal.fg}>
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M0 ${20 * i + 10} H420`} />
        ))}
      </g>
      <Motif category={category} fg={pal.fg} />
    </svg>
  );
}
