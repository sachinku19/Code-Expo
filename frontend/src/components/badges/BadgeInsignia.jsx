import React from "react";

// Handcrafted, high-fidelity SVG Insignia badges with metallic gradients, geometric shields & radiant cores
export const BadgeInsignia = ({ id, rarity = "COMMON", isUnlocked = true, size = 56, className = "" }) => {
  const getGradientId = (name) => `badge_grad_${name}_${id || "default"}`;
  
  // Rarity color schemes
  const rarityColors = {
    COMMON: { primary: "#f59e0b", secondary: "#b45309", accent: "#fef3c7", ring: "#d97706" },
    RARE: { primary: "#fbbf24", secondary: "#d97706", accent: "#ffffff", ring: "#f59e0b" },
    EPIC: { primary: "#fcd34d", secondary: "#b45309", accent: "#ffffff", ring: "#fbbf24" },
    LEGENDARY: { primary: "#ffd700", secondary: "#ea580c", accent: "#ffffff", ring: "#fbbf24" },
  };

  const scheme = rarityColors[rarity] || rarityColors.COMMON;
  const primColor = isUnlocked ? scheme.primary : "#6b7280";
  const secColor = isUnlocked ? scheme.secondary : "#374151";
  const accColor = isUnlocked ? scheme.accent : "#9ca3af";
  const ringColor = isUnlocked ? scheme.ring : "#4b5563";

  // Specialized visual insignia vector art per badge ID
  const renderBadgeGlyph = () => {
    switch (id) {
      case "creator_pro":
        // Workspace Forge / Hex Shield with nested folder & star
        return (
          <g>
            <path d="M26 18L38 18L44 24L44 44L20 44L20 18Z" fill={secColor} fillOpacity="0.4" stroke={primColor} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M20 24L44 24" stroke={primColor} strokeWidth="1.5" />
            <path d="M32 30L34 34L38 34L35 37L36 41L32 38.5L28 41L29 37L26 34L30 34Z" fill={primColor} />
            <circle cx="32" cy="32" r="1.5" fill={accColor} />
          </g>
        );

      case "team_player":
        // Collaboration Guild Insignia: Triple Nodes interconnected with laurel arcs
        return (
          <g>
            <circle cx="32" cy="24" r="5" fill={secColor} fillOpacity="0.5" stroke={primColor} strokeWidth="1.5" />
            <path d="M23 40C23 35 27 32 32 32C37 32 41 35 41 40" stroke={primColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <circle cx="21" cy="27" r="3.5" fill={secColor} fillOpacity="0.5" stroke={ringColor} strokeWidth="1.2" />
            <path d="M15 39C15 35.5 18 33.5 21 33.5" stroke={ringColor} strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <circle cx="43" cy="27" r="3.5" fill={secColor} fillOpacity="0.5" stroke={ringColor} strokeWidth="1.2" />
            <path d="M49 39C49 35.5 46 33.5 43 33.5" stroke={ringColor} strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </g>
        );

      case "script_master":
        // Terminal Core: Octagonal console with radiant command prompt >_
        return (
          <g>
            <rect x="18" y="20" width="28" height="24" rx="4" fill={secColor} fillOpacity="0.5" stroke={primColor} strokeWidth="1.5" />
            <path d="M23 27L28 32L23 37" stroke={primColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="31" y1="37" x2="39" y2="37" stroke={primColor} strokeWidth="2" strokeLinecap="round" />
            <circle cx="23" cy="23.5" r="1" fill={primColor} />
            <circle cx="27" cy="23.5" r="1" fill={primColor} />
          </g>
        );

      case "marathoner":
        // Chrono Diamond: Precision dial with lightning bolt
        return (
          <g>
            <circle cx="32" cy="32" r="13" fill={secColor} fillOpacity="0.4" stroke={primColor} strokeWidth="1.5" />
            <circle cx="32" cy="32" r="9" stroke={ringColor} strokeWidth="1" strokeDasharray="2 2" fill="none" />
            <path d="M33 23L27 33H33L31 41L37 31H31L33 23Z" fill={primColor} stroke={accColor} strokeWidth="0.8" strokeLinejoin="round" />
          </g>
        );

      case "social_coder":
        // Heart Beacon: Crest with faceted heart & radiate pulses
        return (
          <g>
            <path d="M32 42L22 32C19 29 19 24 23 21C26 19 30 20 32 23C34 20 38 19 41 21C45 24 45 29 42 32L32 42Z" 
              fill={secColor} fillOpacity="0.6" stroke={primColor} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M32 37L25 30C23 28 23 25 25.5 23.5C27.5 22 30 23 32 25C34 23 36.5 22 38.5 23.5C41 25 41 28 39 30L32 37Z" 
              fill={primColor} />
            <circle cx="32" cy="28" r="1.5" fill={accColor} />
          </g>
        );

      case "polyglot":
        // Multi-Language Matrix: Prism diamond with interlocking code brackets
        return (
          <g>
            <path d="M32 17L46 25L46 39L32 47L18 39L18 25Z" fill={secColor} fillOpacity="0.4" stroke={primColor} strokeWidth="1.5" />
            <path d="M25 28L21 32L25 36" stroke={primColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M39 28L43 32L39 36" stroke={primColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M34 26L30 38" stroke={ringColor} strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );

      case "rising_star":
        // Celestial Starburst: 8-Pointed Master Star with orbiting planetary dust
        return (
          <g>
            <path d="M32 17L35.5 26.5L45 27L37.5 33L40.5 42L32 36.5L23.5 42L26.5 33L19 27L28.5 26.5Z" 
              fill={secColor} fillOpacity="0.6" stroke={primColor} strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="32" cy="31" r="4.5" fill={primColor} />
            <circle cx="32" cy="31" r="2" fill={accColor} />
            <circle cx="18" cy="20" r="1" fill={primColor} />
            <circle cx="46" cy="44" r="1" fill={primColor} />
            <circle cx="48" cy="20" r="1" fill={primColor} />
          </g>
        );

      case "elite_architect":
      case "master_architect":
      default:
        // Sovereign Sunburst Crest: Grandmaster Royal Crown and Sovereign Halo
        return (
          <g>
            <path d="M32 16L45 23L45 41L32 48L19 41L19 23Z" fill={secColor} fillOpacity="0.5" stroke={primColor} strokeWidth="1.6" />
            <path d="M23 38L23 27L27.5 31L32 25L36.5 31L41 27L41 38Z" fill={primColor} stroke={accColor} strokeWidth="0.8" strokeLinejoin="round" />
            <circle cx="23" cy="25" r="1.5" fill={accColor} />
            <circle cx="32" cy="23" r="1.8" fill={accColor} />
            <circle cx="41" cy="25" r="1.5" fill={accColor} />
            <line x1="25" y1="36" x2="39" y2="36" stroke={secColor} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );
    }
  };

  return (
    <div className={`badge-insignia-wrapper ${rarity.toLowerCase()} ${isUnlocked ? "unlocked" : "locked"} ${className}`} style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="badge-svg-emblem">
        <defs>
          <radialGradient id={getGradientId("radial")} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primColor} stopOpacity={isUnlocked ? "0.3" : "0.08"} />
            <stop offset="100%" stopColor={secColor} stopOpacity={isUnlocked ? "0.05" : "0.02"} />
          </radialGradient>
          <linearGradient id={getGradientId("frame")} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accColor} stopOpacity={isUnlocked ? "0.9" : "0.3"} />
            <stop offset="50%" stopColor={primColor} stopOpacity={isUnlocked ? "0.8" : "0.2"} />
            <stop offset="100%" stopColor={secColor} stopOpacity={isUnlocked ? "0.9" : "0.2"} />
          </linearGradient>
        </defs>

        {/* Outer Shield Container */}
        <polygon 
          points="32,4 56,16 56,48 32,60 8,48 8,16" 
          fill={`url(#${getGradientId("radial")})`}
          stroke={`url(#${getGradientId("frame")})`} 
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Inner Facet Ring */}
        <polygon 
          points="32,8 52,18 52,46 32,56 12,46 12,18" 
          fill="none"
          stroke={primColor} 
          strokeWidth="0.8"
          strokeOpacity={isUnlocked ? "0.4" : "0.15"}
          strokeDasharray="3 3"
        />

        {/* Corner Rivet Highlights */}
        {isUnlocked && (
          <>
            <circle cx="32" cy="7" r="1.2" fill={accColor} />
            <circle cx="53" cy="18" r="1.2" fill={accColor} />
            <circle cx="53" cy="46" r="1.2" fill={accColor} />
            <circle cx="32" cy="57" r="1.2" fill={accColor} />
            <circle cx="11" cy="46" r="1.2" fill={accColor} />
            <circle cx="11" cy="18" r="1.2" fill={accColor} />
          </>
        )}

        {/* Center Badge Glyph */}
        {renderBadgeGlyph()}
      </svg>
    </div>
  );
};

// Handcrafted, High-Tier SVG Ranking Crest for "Current Development Standing"
export const RankingCrest = ({ tierName = "Junior Coder", points = 0, size = 68 }) => {
  // Determine tier metadata
  let tierLevel = 1;
  let crestTheme = { primary: "#f59e0b", secondary: "#b45309", title: "Novice Tier", stars: 1 };

  if (points >= 1000) {
    tierLevel = 5;
    crestTheme = { primary: "#ffd700", secondary: "#ea580c", title: "Apex Tier", stars: 5 };
  } else if (points >= 400) {
    tierLevel = 4;
    crestTheme = { primary: "#fbbf24", secondary: "#d97706", title: "Architect Tier", stars: 4 };
  } else if (points >= 150) {
    tierLevel = 3;
    crestTheme = { primary: "#f59e0b", secondary: "#b45309", title: "Hero Tier", stars: 3 };
  } else if (points >= 50) {
    tierLevel = 2;
    crestTheme = { primary: "#fbbf24", secondary: "#b45309", title: "Artisan Tier", stars: 2 };
  }

  return (
    <div className="ranking-crest-container" style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="ranking-svg-crest">
        <defs>
          <linearGradient id="crestGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.95" />
            <stop offset="40%" stopColor={crestTheme.primary} />
            <stop offset="100%" stopColor={crestTheme.secondary} />
          </linearGradient>
          <radialGradient id="crestBackdrop" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={crestTheme.primary} stopOpacity="0.35" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Glow Aura */}
        <circle cx="40" cy="40" r="36" fill="url(#crestBackdrop)" />

        {/* Outer Laurel Wings / Crest Frame */}
        <path d="M40 8L64 20L64 54L40 72L16 54L16 20Z" fill="#111217" stroke="url(#crestGoldGrad)" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M40 13L59 23L59 51L40 66L21 51L21 23Z" stroke={crestTheme.primary} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3 3" fill="none" />

        {/* Laurel Wreath Border Arcs */}
        <path d="M22 45C19 36 21 26 29 20" stroke={crestTheme.primary} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M58 45C61 36 59 26 51 20" stroke={crestTheme.primary} strokeWidth="1.5" strokeLinecap="round" fill="none" />

        {/* Inner Shield / Insignia */}
        <path d="M40 22L52 30L52 48L40 58L28 48L28 30Z" fill={crestTheme.secondary} fillOpacity="0.4" stroke="url(#crestGoldGrad)" strokeWidth="1.8" />

        {/* Central Crown / Glyph */}
        <path d="M33 46L33 36L36.5 40L40 33L43.5 40L47 36L47 46Z" fill="url(#crestGoldGrad)" stroke="#fff" strokeWidth="0.6" strokeLinejoin="round" />
        
        {/* Tier Stars Cluster */}
        {crestTheme.stars >= 1 && <circle cx="40" cy="27" r="2.2" fill="#fff" />}
        {crestTheme.stars >= 2 && <circle cx="34" cy="29" r="1.8" fill={crestTheme.primary} />}
        {crestTheme.stars >= 3 && <circle cx="46" cy="29" r="1.8" fill={crestTheme.primary} />}
        {crestTheme.stars >= 4 && <circle cx="29" cy="32" r="1.5" fill="#fff" />}
        {crestTheme.stars >= 5 && <circle cx="51" cy="32" r="1.5" fill="#fff" />}

        {/* Bottom Level Ribbon Banner */}
        <rect x="26" y="59" width="28" height="12" rx="3" fill="#000000" stroke={crestTheme.primary} strokeWidth="1.2" />
        <text x="40" y="68" fill={crestTheme.primary} fontSize="7.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.8">
          LVL {tierLevel}
        </text>
      </svg>
    </div>
  );
};
