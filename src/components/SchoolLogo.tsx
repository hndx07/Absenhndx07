import React from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = '',
  size = 48,
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center rounded-full shadow-md overflow-hidden bg-gradient-to-tr from-purple-900 via-indigo-900 to-purple-800 border-2 border-amber-400 p-0.5"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer circle */}
          <circle cx="50" cy="50" r="48" fill="#4c1d95" stroke="#f59e0b" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="43" fill="#311042" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" />

          {/* Curving text path */}
          <path
            id="textPathUpper"
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
          />
          <path
            id="textPathLower"
            d="M 88 50 A 38 38 0 0 1 12 50"
            fill="none"
          />

          <text fill="#fef08a" fontSize="7" fontWeight="bold" letterSpacing="1">
            <textPath href="#textPathUpper" startOffset="50%" textAnchor="middle">
              SMK MUHAMMADIYAH
            </textPath>
          </text>
          <text fill="#fef08a" fontSize="6.5" fontWeight="bold" letterSpacing="1">
            <textPath href="#textPathLower" startOffset="50%" textAnchor="middle">
              BAWANG - BATANG
            </textPath>
          </text>

          {/* Central Sunburst of Muhammadiyah */}
          <g transform="translate(50,50)">
            {/* 12 Radiant Sun Rays */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <polygon
                key={deg}
                points="0,-24 3.5,-16 0,-14 -3.5,-16"
                fill="#fbbf24"
                transform={`rotate(${deg})`}
              />
            ))}
            {/* Center disc */}
            <circle cx="0" cy="0" r="14" fill="#047857" stroke="#fbbf24" strokeWidth="1.2" />
            
            {/* Central Calligraphy / Icon symbol */}
            <circle cx="0" cy="0" r="7" fill="#ffffff" />
            <text
              x="0"
              y="2.5"
              textAnchor="middle"
              fill="#065f46"
              fontSize="6"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              م
            </text>
            
            {/* 2 Stars */}
            <polygon points="-10,0 -8.5,-2 -7,0 -8.5,2" fill="#fbbf24" />
            <polygon points="10,0 8.5,-2 7,0 8.5,2" fill="#fbbf24" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 tracking-tight leading-tight text-base sm:text-lg">
            SMK Muhammadiyah Bawang
          </span>
          <span className="text-xs text-indigo-600 font-medium tracking-wide uppercase">
            Presensi & Nilai Siswa 2026
          </span>
        </div>
      )}
    </div>
  );
};
