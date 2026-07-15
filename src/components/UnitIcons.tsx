import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

// ⚔️ Solid Heavy Broadsword (High contrast, easy to assess)
export const OffenseIcon: React.FC<IconProps> = ({ className, size = 26, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Thick Broadsword blade */}
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5z" fill={color} fillOpacity="0.8" />
    {/* Guard crossbar */}
    <path d="m11 9 4 4" strokeWidth="4" />
    {/* Handle / Pommel */}
    <path d="m14 14 5 5" strokeWidth="4" />
    <circle cx="20" cy="20" r="1.5" fill={color} />
  </svg>
);

// 🏹 Bold Bow and Arrow (High contrast)
export const SupportIcon: React.FC<IconProps> = ({ className, size = 26, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Bow curve */}
    <path d="M6 3c5 0 9 4.5 9 9s-4 9-9 9" strokeWidth="3" />
    {/* String */}
    <line x1="6" y1="3" x2="6" y2="21" strokeWidth="1.5" strokeDasharray="1.5,1.5" />
    {/* Arrow shaft */}
    <line x1="5" y1="12" x2="20" y2="12" strokeWidth="3" />
    {/* Arrow head */}
    <path d="m17 9 3 3-3 3" fill={color} />
  </svg>
);

// ⛏️ Heavy single pickaxe (High contrast)
export const GathererIcon: React.FC<IconProps> = ({ className, size = 26, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Pickaxe Head (Solid heavy curve) */}
    <path d="M14 3c2 0.5 4.5 1.5 6 3s2.5 4 3 6" strokeWidth="4.5" />
    {/* Heavy Pickaxe point */}
    <path d="m23 12-2 1-1-3z" fill={color} />
    {/* Wooden handle */}
    <line x1="3" y1="21" x2="16" y2="8" strokeWidth="3.5" />
  </svg>
);

// 🏔️ High Contrast Mountain Peak
export const MountainIcon: React.FC<IconProps> = ({ className, size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 20h18" strokeWidth="3" />
    <path d="m2 20 10-16 10 16" strokeWidth="3" fill="rgba(255, 255, 255, 0.08)" />
    <path d="m9 10 3-4 3 4" strokeWidth="2.5" />
  </svg>
);

// 🪨 High Contrast Angular Rock Obstacle
export const ObstacleIcon: React.FC<IconProps> = ({ className, size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m12 3 7 4-1 9-6 5-8-3-2-8z" fill="#444946" strokeWidth="3" />
    <path d="m9 8 3 4h4" strokeWidth="2" />
  </svg>
);

// 🪙 Solid Glimmering Gold Pile
export const GoldIcon: React.FC<IconProps> = ({ className, size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2 4 12l8 8 8-8Z" fill={color} fillOpacity="0.4" strokeWidth="3" />
    <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1.5" />
    <line x1="4" y1="12" x2="20" y2="12" strokeWidth="1.5" />
  </svg>
);

// 🏰 Thick Castle Base HQ
export const BaseIcon: React.FC<IconProps> = ({ className, size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 21V9l3-3h10l3 3v12" strokeWidth="3.5" fill="rgba(255,255,255,0.05)" />
    <path d="M2 21h20" strokeWidth="4" />
    <path d="M9 21v-5a3 3 0 0 1 6 0v5" strokeWidth="2.5" fill="rgba(0,0,0,0.5)" />
    <path d="M4 9h16" strokeWidth="2.5" />
  </svg>
);
