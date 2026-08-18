// Self-Made Legends — Avatar Builder
// Generates fully customizable SVG character avatars
(function () {
  const AB = (window.AvatarBuilder = {});

  // ── Data ─────────────────────────────────────────────────────────────────

  AB.SKIN_TONES = [
    { id: 'ivory',  label: 'Ivory',      color: '#FFE0C8', shadow: '#D4B090', lip: '#CC8878' },
    { id: 'peach',  label: 'Peach',      color: '#F5C09A', shadow: '#D49468', lip: '#C07060' },
    { id: 'warm',   label: 'Warm',       color: '#E8986A', shadow: '#C07040', lip: '#A85848' },
    { id: 'tan',    label: 'Tan',        color: '#C87C38', shadow: '#9A5C1A', lip: '#884030' },
    { id: 'brown',  label: 'Brown',      color: '#8C5020', shadow: '#6A340C', lip: '#6A3020' },
    { id: 'deep',   label: 'Deep',       color: '#4A2208', shadow: '#2E1204', lip: '#481810' },
  ];

  // 'rainbow' is a sentinel — resolved to url(#abRainbow) in SVG
  AB.HAIR_COLORS = [
    { id: 'black',   label: 'Black',    color: '#18100A',         dark: '#0C0804' },
    { id: 'brown',   label: 'Brown',    color: '#4A2810',         dark: '#2E1800' },
    { id: 'auburn',  label: 'Auburn',   color: '#823200',         dark: '#5A2000' },
    { id: 'blonde',  label: 'Blonde',   color: '#D4A020',         dark: '#A87808' },
    { id: 'red',     label: 'Red',      color: '#B81818',         dark: '#880000' },
    { id: 'silver',  label: 'Silver',   color: '#B8B8B8',         dark: '#888888' },
    { id: 'gold',    label: 'Gold',     color: '#FFD700',         dark: '#C8A800' },
    { id: 'blue',    label: 'Blue',     color: '#0070E0',         dark: '#0050A8' },
    { id: 'purple',  label: 'Purple',   color: '#8800CC',         dark: '#600088' },
    { id: 'rainbow', label: 'Rainbow',  color: 'url(#abRainbow)', dark: 'url(#abRainbowDark)', isGradient: true },
  ];

  AB.EYE_COLORS = [
    { id: 'dark',    label: 'Dark',    color: '#1E0E08' },
    { id: 'brown',   label: 'Brown',   color: '#5A3018' },
    { id: 'hazel',   label: 'Hazel',   color: '#7A5028' },
    { id: 'green',   label: 'Green',   color: '#1E6040' },
    { id: 'blue',    label: 'Blue',    color: '#1848A0' },
    { id: 'gray',    label: 'Gray',    color: '#405060' },
  ];

  const OUTFIT_PALETTES = {
    blue:    { m: '#1840B0', d: '#102880', l: '#3870E0', a: '#B0D0FF' },
    purple:  { m: '#6020C8', d: '#401890', l: '#8848E8', a: '#D8C0FF' },
    red:     { m: '#B81818', d: '#881010', l: '#E84040', a: '#FFB8B8' },
    green:   { m: '#0A6040', d: '#085030', l: '#18B878', a: '#A8F0D0' },
    black:   { m: '#202830', d: '#101820', l: '#384858', a: '#90A8B8' },
    rainbow: { m: 'url(#abRainbow)', d: 'url(#abRainbowDark)', l: 'url(#abRainbowLight)', a: '#FFFFFF', isGradient: true },
  };

  AB.OUTFITS = [
    { id: 'hoodie',  label: 'SML Hoodie',   colors: ['blue','purple','red','green','black','rainbow'] },
    { id: 'suit',    label: 'SML Suit',      colors: ['black','blue','purple','red','green','rainbow'] },
    { id: 'street',  label: 'Street Wear',   colors: ['black','red','blue','green','purple','rainbow'] },
    { id: 'jersey',  label: 'SML Jersey',    colors: ['blue','red','green','purple','black','rainbow'] },
    { id: 'blazer',  label: 'Luxury Blazer', colors: ['black','blue','purple','red','green','rainbow'] },
    { id: 'tee',     label: 'Graphic Tee',   colors: ['black','blue','red','green','purple','rainbow'] },
  ];

  AB.ACCESSORIES = [
    { id: 'none',          label: 'None' },
    { id: 'chain',         label: 'Gold Chain' },
    { id: 'diamond_chain', label: 'Diamond Chain' },
    { id: 'rainbow_chain', label: 'Rainbow Chain' },
    { id: 'sunglasses',    label: 'Sunglasses' },
    { id: 'prism_shades',  label: 'Prism Shades' },
    { id: 'cap',           label: 'SML Cap' },
    { id: 'crown',         label: 'Crown' },
    { id: 'halo',          label: 'Rainbow Halo' },
    { id: 'earrings',      label: 'Diamond Earrings' },
    { id: 'headphones',    label: 'Headphones' },
  ];

  AB.HAIR_STYLES = {
    female: [
      { id: 'long_straight', label: 'Long Straight' },
      { id: 'afro_puffs',    label: 'Afro Puffs' },
      { id: 'bob',           label: 'Bob Cut' },
      { id: 'braids',        label: 'Braids' },
      { id: 'curly_f',       label: 'Curly Natural' },
      { id: 'ponytail',      label: 'Ponytail' },
      { id: 'locs',          label: 'Locs' },
      { id: 'space_buns',    label: 'Space Buns' },
    ],
    male: [
      { id: 'fade',      label: 'Short Fade' },
      { id: 'afro_m',    label: 'Afro' },
      { id: 'waves',     label: 'Waves' },
      { id: 'dreads',    label: 'Dreads' },
      { id: 'man_bun',   label: 'Man Bun' },
      { id: 'bald',      label: 'Clean Bald' },
      { id: 'curly_m',   label: 'Curly' },
      { id: 'tapered',   label: 'Tapered' },
    ],
  };

  AB.BG_STYLES = [
    { id: 'default', label: 'Dark Night',  colors: ['#1A2838','#0D1520'] },
    { id: 'gold',    label: 'Gold Rush',   colors: ['#2A1C00','#100A00'] },
    { id: 'diamond', label: 'Diamond',     colors: ['#001828','#000C18'] },
    { id: 'fire',    label: 'Fire',        colors: ['#2A0800','#140000'] },
    { id: 'neon',    label: 'Neon City',   colors: ['#08082A','#040410'] },
    { id: 'prism',   label: 'Prism',       colors: ['#180018','#001020'] },
  ];

  // ── SVG Gradient Defs (always injected) ───────────────────────────────────
  // Rainbow uses userSpaceOnUse across the full 200px width so all elements
  // share the same coherent spectrum band.
  const RAINBOW_DEFS = `
    <linearGradient id="abRainbow" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="180" y2="0">
      <stop offset="0%"   stop-color="#FF2020"/>
      <stop offset="18%"  stop-color="#FF8800"/>
      <stop offset="36%"  stop-color="#FFE000"/>
      <stop offset="54%"  stop-color="#00D840"/>
      <stop offset="72%"  stop-color="#0088FF"/>
      <stop offset="90%"  stop-color="#CC00FF"/>
      <stop offset="100%" stop-color="#FF0088"/>
    </linearGradient>
    <linearGradient id="abRainbowDark" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="180" y2="0">
      <stop offset="0%"   stop-color="#AA0000"/>
      <stop offset="18%"  stop-color="#AA5500"/>
      <stop offset="36%"  stop-color="#AA9000"/>
      <stop offset="54%"  stop-color="#008030"/>
      <stop offset="72%"  stop-color="#0055AA"/>
      <stop offset="90%"  stop-color="#880099"/>
      <stop offset="100%" stop-color="#AA0055"/>
    </linearGradient>
    <linearGradient id="abRainbowLight" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="180" y2="0">
      <stop offset="0%"   stop-color="#FF7070"/>
      <stop offset="18%"  stop-color="#FFBB44"/>
      <stop offset="36%"  stop-color="#FFFF80"/>
      <stop offset="54%"  stop-color="#80FF90"/>
      <stop offset="72%"  stop-color="#70C0FF"/>
      <stop offset="90%"  stop-color="#EE88FF"/>
      <stop offset="100%" stop-color="#FF80BB"/>
    </linearGradient>
    <linearGradient id="abRainbowV" gradientUnits="userSpaceOnUse" x1="0" y1="120" x2="0" y2="200">
      <stop offset="0%"   stop-color="#FF2020"/>
      <stop offset="25%"  stop-color="#FFDD00"/>
      <stop offset="50%"  stop-color="#00D840"/>
      <stop offset="75%"  stop-color="#0088FF"/>
      <stop offset="100%" stop-color="#CC00FF"/>
    </linearGradient>`;

  // ── SVG Layers ────────────────────────────────────────────────────────────

  function svgBg(bgId) {
    const s = AB.BG_STYLES.find(b => b.id === bgId) || AB.BG_STYLES[0];

    // Prism background: rotating rainbow gradient overlay
    const prismOverlay = bgId === 'prism' ? `
      <defs>
        <radialGradient id="abBG" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#300040"/>
          <stop offset="100%" stop-color="#001030"/>
        </radialGradient>
        <clipPath id="abClip"><circle cx="100" cy="100" r="100"/></clipPath>
        ${RAINBOW_DEFS}
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#abBG)"/>
      <circle cx="100" cy="100" r="100" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      <ellipse cx="60" cy="60" rx="80" ry="60" fill="url(#abRainbow)" opacity="0.12" transform="rotate(-30 100 100)"/>
      <ellipse cx="140" cy="140" rx="80" ry="60" fill="url(#abRainbow)" opacity="0.1" transform="rotate(30 100 100)"/>` : `
      <defs>
        <radialGradient id="abBG" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stop-color="${s.colors[0]}"/>
          <stop offset="100%" stop-color="${s.colors[1]}"/>
        </radialGradient>
        <clipPath id="abClip"><circle cx="100" cy="100" r="100"/></clipPath>
        ${RAINBOW_DEFS}
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#abBG)"/>
      <circle cx="100" cy="100" r="100" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;

    return prismOverlay;
  }

  // Hair layer drawn BEHIND the head (hair around/below)
  function svgHairBack(styleId, hc) {
    const h = hc.color, d = hc.dark;
    switch (styleId) {
      // ── FEMALE ──────────────────────────────────────────────────────────
      case 'long_straight':
        return `
          <path d="M57,90 Q48,128 50,176 Q60,186 70,182 Q76,152 73,108 Z" fill="${h}"/>
          <path d="M143,90 Q152,128 150,176 Q140,186 130,182 Q124,152 127,108 Z" fill="${h}"/>
          <path d="M57,90 Q54,44 100,36 Q146,44 143,90 Q121,76 100,74 Q79,76 57,90 Z" fill="${h}"/>`;

      case 'afro_puffs':
        return `
          <circle cx="65" cy="55" r="34" fill="${h}"/>
          <circle cx="135" cy="55" r="34" fill="${h}"/>
          <path d="M57,88 Q55,46 100,36 Q145,46 143,88 Q121,74 100,72 Q79,74 57,88 Z" fill="${h}"/>`;

      case 'bob':
        return `
          <path d="M56,90 Q54,44 100,36 Q146,44 144,90 Q148,114 135,128 Q118,140 100,140 Q82,140 65,128 Q52,114 56,90 Z" fill="${h}"/>`;

      case 'braids':
        return `
          <path d="M57,90 Q54,44 100,36 Q146,44 143,90 Q121,76 100,74 Q79,76 57,90 Z" fill="${h}"/>
          <path d="M74,136 Q70,164 69,188" stroke="${h}" stroke-width="9" fill="none" stroke-linecap="round"/>
          <path d="M86,138 Q83,167 82,195" stroke="${h}" stroke-width="9" fill="none" stroke-linecap="round"/>
          <path d="M100,138 Q100,170 100,200" stroke="${h}" stroke-width="9" fill="none" stroke-linecap="round"/>
          <path d="M114,138 Q117,167 118,195" stroke="${h}" stroke-width="9" fill="none" stroke-linecap="round"/>
          <path d="M126,136 Q130,164 131,188" stroke="${h}" stroke-width="9" fill="none" stroke-linecap="round"/>
          <circle cx="69" cy="188" r="3.5" fill="${d}"/>
          <circle cx="82" cy="195" r="3.5" fill="${d}"/>
          <circle cx="100" cy="200" r="3.5" fill="${d}"/>
          <circle cx="118" cy="195" r="3.5" fill="${d}"/>
          <circle cx="131" cy="188" r="3.5" fill="${d}"/>
          <circle cx="69" cy="166" r="2" fill="${d}" opacity="0.7"/>
          <circle cx="82" cy="172" r="2" fill="${d}" opacity="0.7"/>
          <circle cx="100" cy="174" r="2" fill="${d}" opacity="0.7"/>
          <circle cx="118" cy="172" r="2" fill="${d}" opacity="0.7"/>
          <circle cx="131" cy="166" r="2" fill="${d}" opacity="0.7"/>`;

      case 'curly_f':
        return `
          <circle cx="100" cy="60" r="58" fill="${h}"/>
          <circle cx="65" cy="72" r="28" fill="${h}"/>
          <circle cx="135" cy="72" r="28" fill="${h}"/>
          <circle cx="78" cy="50" r="20" fill="${h}"/>
          <circle cx="122" cy="50" r="20" fill="${h}"/>`;

      case 'ponytail':
        return `
          <path d="M57,90 Q54,44 100,36 Q146,44 143,90 Q121,76 100,74 Q79,76 57,90 Z" fill="${h}"/>
          <path d="M106,38 Q124,26 132,50 Q138,74 128,114 Q114,80 106,76 Z" fill="${h}"/>
          <path d="M126,56 Q134,68 130,82 Q124,76 122,64 Z" fill="${d}" opacity="0.4"/>`;

      case 'locs':
        return `
          <path d="M57,90 Q54,44 100,36 Q146,44 143,90 Q121,76 100,74 Q79,76 57,90 Z" fill="${h}"/>
          <path d="M60,112 Q54,146 53,178" stroke="${h}" stroke-width="8" fill="none" stroke-linecap="round"/>
          <path d="M72,132 Q67,164 65,192" stroke="${h}" stroke-width="8" fill="none" stroke-linecap="round"/>
          <path d="M86,138 Q83,170 81,200" stroke="${h}" stroke-width="8" fill="none" stroke-linecap="round"/>
          <path d="M100,138 Q100,172 100,200" stroke="${h}" stroke-width="8" fill="none" stroke-linecap="round"/>
          <path d="M114,138 Q117,170 119,200" stroke="${h}" stroke-width="8" fill="none" stroke-linecap="round"/>
          <path d="M128,132 Q133,164 135,192" stroke="${h}" stroke-width="8" fill="none" stroke-linecap="round"/>
          <path d="M140,112 Q146,146 147,178" stroke="${h}" stroke-width="8" fill="none" stroke-linecap="round"/>`;

      case 'space_buns':
        return `
          <circle cx="72" cy="44" r="24" fill="${h}"/>
          <circle cx="128" cy="44" r="24" fill="${h}"/>
          <ellipse cx="72" cy="64" rx="16" ry="9" fill="${h}"/>
          <ellipse cx="128" cy="64" rx="16" ry="9" fill="${h}"/>
          <path d="M57,90 Q54,52 72,42 Q80,36 100,34 Q120,36 128,42 Q146,52 143,90 Q121,76 100,74 Q79,76 57,90 Z" fill="${h}"/>`;

      // ── MALE ─────────────────────────────────────────────────────────────
      case 'fade':
        return `
          <path d="M58,92 Q56,48 100,36 Q144,48 142,92 Q122,79 100,77 Q78,79 58,92 Z" fill="${h}"/>
          <path d="M58,92 Q52,100 53,112 Q62,109 64,100 Z" fill="${h}"/>
          <path d="M142,92 Q148,100 147,112 Q138,109 136,100 Z" fill="${h}"/>`;

      case 'afro_m':
        return `
          <circle cx="100" cy="60" r="62" fill="${h}"/>
          <circle cx="61" cy="78" r="32" fill="${h}"/>
          <circle cx="139" cy="78" r="32" fill="${h}"/>
          <circle cx="80" cy="46" r="24" fill="${h}"/>
          <circle cx="120" cy="46" r="24" fill="${h}"/>`;

      case 'waves':
        return `
          <path d="M58,92 Q56,48 100,36 Q144,48 142,92 Q122,79 100,77 Q78,79 58,92 Z" fill="${h}"/>
          <path d="M58,92 Q52,100 53,110 Q62,107 64,100 Z" fill="${h}"/>
          <path d="M142,92 Q148,100 147,110 Q138,107 136,100 Z" fill="${h}"/>`;

      case 'dreads':
        return `
          <path d="M57,90 Q54,44 100,36 Q146,44 143,90 Q121,76 100,74 Q79,76 57,90 Z" fill="${h}"/>
          <path d="M62,112 Q55,148 53,178" stroke="${h}" stroke-width="11" fill="none" stroke-linecap="round"/>
          <path d="M76,132 Q70,165 68,196" stroke="${h}" stroke-width="11" fill="none" stroke-linecap="round"/>
          <path d="M90,138 Q87,170 85,200" stroke="${h}" stroke-width="11" fill="none" stroke-linecap="round"/>
          <path d="M100,138 Q100,172 100,200" stroke="${h}" stroke-width="11" fill="none" stroke-linecap="round"/>
          <path d="M110,138 Q113,170 115,200" stroke="${h}" stroke-width="11" fill="none" stroke-linecap="round"/>
          <path d="M124,132 Q130,165 132,196" stroke="${h}" stroke-width="11" fill="none" stroke-linecap="round"/>
          <path d="M138,112 Q145,148 147,178" stroke="${h}" stroke-width="11" fill="none" stroke-linecap="round"/>`;

      case 'man_bun':
        return `
          <path d="M58,92 Q56,56 72,46 Q80,38 100,36 Q120,38 128,46 Q144,56 142,92 Q122,80 100,78 Q78,80 58,92 Z" fill="${h}"/>`;

      case 'bald': return '';

      case 'curly_m':
        return `
          <circle cx="100" cy="58" r="54" fill="${h}"/>
          <circle cx="66" cy="74" r="24" fill="${h}"/>
          <circle cx="134" cy="74" r="24" fill="${h}"/>`;

      case 'tapered':
        return `
          <path d="M60,92 Q58,50 100,38 Q142,50 140,92 Q122,80 100,78 Q78,80 60,92 Z" fill="${h}"/>
          <path d="M60,92 Q51,102 53,114 Q62,109 64,100 Z" fill="${h}"/>
          <path d="M140,92 Q149,102 147,114 Q138,109 136,100 Z" fill="${h}"/>`;

      default: return '';
    }
  }

  // Hair drawn ON TOP of the head (buns, top pieces, texture details)
  function svgHairFront(styleId, hc) {
    const h = hc.color, d = hc.dark;
    switch (styleId) {
      case 'waves':
        return `
          <path d="M65,82 Q72,78 80,82 Q88,86 96,82 Q104,78 112,82 Q120,86 128,82 Q133,80 135,83" stroke="${d}" stroke-width="2.2" fill="none" opacity="0.65"/>
          <path d="M64,88 Q74,84 84,88 Q94,92 104,88 Q114,84 124,88 Q130,90 134,88" stroke="${d}" stroke-width="2.2" fill="none" opacity="0.65"/>`;

      case 'man_bun':
        return `
          <circle cx="100" cy="40" r="19" fill="${h}"/>
          <ellipse cx="100" cy="56" rx="14" ry="7" fill="${d}" opacity="0.5"/>
          <path d="M87,44 Q100,38 113,44" stroke="${d}" stroke-width="2" fill="none" opacity="0.4"/>`;

      case 'ponytail':
        return `
          <path d="M82,50 Q90,44 100,42 Q110,44 118,50" stroke="${d}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.5"/>`;

      case 'space_buns':
        return `
          <path d="M63,36 Q72,30 81,36" stroke="${d}" stroke-width="2" fill="none" opacity="0.4"/>
          <path d="M119,36 Q128,30 137,36" stroke="${d}" stroke-width="2" fill="none" opacity="0.4"/>`;

      case 'fade':
      case 'tapered':
        return `
          <path d="M68,76 Q84,70 100,68 Q116,70 132,76" stroke="${d}" stroke-width="1.8" fill="none" opacity="0.4"/>`;

      case 'braids':
        return `
          <path d="M70,80 Q80,74 100,72 Q120,74 130,80" stroke="${d}" stroke-width="2" fill="none" opacity="0.4"/>
          <path d="M75,66 Q87,60 100,58 Q113,60 125,66" stroke="${d}" stroke-width="2" fill="none" opacity="0.4"/>`;

      default: return '';
    }
  }

  function svgEars(skin) {
    return `
      <ellipse cx="56" cy="91" rx="8" ry="11" fill="${skin.color}"/>
      <ellipse cx="144" cy="91" rx="8" ry="11" fill="${skin.color}"/>
      <ellipse cx="55.5" cy="91" rx="4.5" ry="7" fill="${skin.shadow}" opacity="0.35"/>
      <ellipse cx="144.5" cy="91" rx="4.5" ry="7" fill="${skin.shadow}" opacity="0.35"/>`;
  }

  function svgHead(skin) {
    return `<ellipse cx="100" cy="87" rx="45" ry="51" fill="${skin.color}"/>`;
  }

  function svgNeck(skin) {
    return `<rect x="89" y="130" width="22" height="18" rx="7" fill="${skin.color}"/>`;
  }

  function svgFace(skin, gender, eyeColor) {
    const s = skin.color, ss = skin.shadow, lip = skin.lip;
    const isFemale = gender === 'female';
    const browW = isFemale ? 2.2 : 3;

    function eye(cx, dir) {
      const lashSign = dir === 'L' ? 1 : -1;
      const lx = dir === 'L' ? cx - 12 : cx + 12;
      const rx = dir === 'L' ? cx + 10 : cx - 10;
      return `
        <ellipse cx="${cx}" cy="84" rx="${isFemale ? 9 : 8}" ry="${isFemale ? 7 : 6.5}" fill="white"/>
        <circle cx="${cx}" cy="84.5" r="${isFemale ? 5 : 4.5}" fill="${eyeColor}"/>
        <circle cx="${cx}" cy="84.5" r="${isFemale ? 3 : 2.5}" fill="#0C0808"/>
        <circle cx="${cx - 1.5}" cy="${isFemale ? 83 : 83.5}" r="${isFemale ? 1.2 : 1}" fill="white"/>
        ${isFemale ? `
          <path d="M${lx},79 Q${cx},76 ${rx},79" stroke="#1A1010" stroke-width="1.4" fill="none" stroke-linecap="round"/>
          <line x1="${lx + lashSign * 1}" y1="79" x2="${lx + lashSign * 1.5}" y2="76.5" stroke="#1A1010" stroke-width="1.1"/>
          <line x1="${lx + lashSign * 3}" y1="78" x2="${lx + lashSign * 3.5}" y2="75.5" stroke="#1A1010" stroke-width="1.1"/>
          <line x1="${lx + lashSign * 5}" y1="77" x2="${lx + lashSign * 5.5}" y2="75" stroke="#1A1010" stroke-width="1.1"/>
          <line x1="${cx}" y1="77" x2="${cx}" y2="74.5" stroke="#1A1010" stroke-width="1.1"/>
        ` : ''}`;
    }

    const eyeL = eye(84, 'L');
    const eyeR = eye(116, 'R');

    const brows = `
      <path d="M76,74 Q84,71 93,73" stroke="${ss}" stroke-width="${browW}" fill="none" stroke-linecap="round"/>
      <path d="M124,74 Q116,71 107,73" stroke="${ss}" stroke-width="${browW}" fill="none" stroke-linecap="round"/>`;

    const nose = `
      <path d="M96,96 Q100,104 104,96" stroke="${ss}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="96" cy="100" r="2.2" fill="${ss}" opacity="0.35"/>
      <circle cx="104" cy="100" r="2.2" fill="${ss}" opacity="0.35"/>`;

    const mouth = isFemale
      ? `<path d="M90,109 Q95,106 100,107 Q105,106 110,109" stroke="${lip}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
         <path d="M90,109 Q100,117 110,109" fill="${lip}" opacity="0.72"/>
         <path d="M93,107 Q100,110 107,107" stroke="rgba(255,255,255,0.25)" stroke-width="1" fill="none"/>`
      : `<path d="M90,110 Q100,117 110,110" stroke="${lip}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;

    const blush = isFemale
      ? `<ellipse cx="74" cy="100" rx="12" ry="7" fill="${lip}" opacity="0.15"/>
         <ellipse cx="126" cy="100" rx="12" ry="7" fill="${lip}" opacity="0.15"/>`
      : '';

    return `${brows}${eyeL}${eyeR}${nose}${mouth}${blush}`;
  }

  function svgClothes(outfitId, colorId, gender) {
    const c = OUTFIT_PALETTES[colorId] || OUTFIT_PALETTES.black;
    const isFemale = gender === 'female';

    switch (outfitId) {
      case 'hoodie': return `
        <path d="M10,200 L12,150 C30,130 54,122 76,120 L82,133 Q100,143 118,133 L124,120 C146,122 170,130 188,150 L190,200 Z" fill="${c.m}"/>
        <path d="M68,120 Q74,108 82,105 Q100,101 118,105 Q126,108 132,120 Q117,114 100,112 Q83,114 68,120 Z" fill="${c.d}"/>
        <rect x="83" y="163" width="34" height="26" rx="7" fill="${c.d}" opacity="0.45"/>
        <text x="100" y="156" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="13" font-weight="900" fill="rgba(255,255,255,0.95)" letter-spacing="2">SML</text>
        <path d="M82,133 Q77,142 75,154 Q83,157 83,163" stroke="${c.d}" stroke-width="1" fill="none" opacity="0.35"/>
        <path d="M118,133 Q123,142 125,154 Q117,157 117,163" stroke="${c.d}" stroke-width="1" fill="none" opacity="0.35"/>`;

      case 'suit': return `
        <path d="M10,200 L12,150 C30,130 54,122 76,120 L88,130 Q100,140 112,130 L124,120 C146,122 170,130 188,150 L190,200 Z" fill="${c.m}"/>
        <path d="M88,130 Q100,140 112,130 L116,200 L84,200 Z" fill="white" opacity="0.92"/>
        <path d="M96,132 L93,200" fill="${c.l}" opacity="0.9"/>
        <path d="M104,132 L107,200" fill="${c.l}" opacity="0.9"/>
        <path d="M100,130 L96,150 L100,146 L104,150 L100,130 Z" fill="${c.l}"/>
        <path d="M88,130 L72,120 L76,200 L84,200 Z" fill="${c.d}"/>
        <path d="M112,130 L128,120 L124,200 L116,200 Z" fill="${c.d}"/>
        <path d="M116,150 L124,148 L126,154 L118,154 Z" fill="${c.a}" opacity="0.85"/>
        <circle cx="100" cy="160" r="2.2" fill="#C8C8C8" opacity="0.6"/>
        <circle cx="100" cy="170" r="2.2" fill="#C8C8C8" opacity="0.6"/>
        <circle cx="100" cy="180" r="2.2" fill="#C8C8C8" opacity="0.6"/>`;

      case 'street': return `
        <path d="M10,200 L12,150 C30,132 54,124 76,122 L82,133 Q100,141 118,133 L124,122 C146,124 170,132 188,150 L190,200 Z" fill="${c.m}"/>
        <path d="M82,133 Q100,143 118,133 L122,200 L78,200 Z" fill="${c.d}" opacity="0.55"/>
        <text x="100" y="162" text-anchor="middle" font-size="24">👑</text>
        <text x="100" y="180" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="10" font-weight="900" fill="${c.a}" letter-spacing="1.5">SELF-MADE</text>
        <text x="100" y="192" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="8" fill="${c.l}" letter-spacing="1" opacity="0.8">LEGENDS</text>`;

      case 'jersey': return `
        <path d="M10,200 L12,150 C30,130 54,122 76,120 L82,131 Q100,139 118,131 L124,120 C146,122 170,130 188,150 L190,200 Z" fill="${c.m}"/>
        <path d="M82,131 L80,200" stroke="${c.l}" stroke-width="7" fill="none" opacity="0.65"/>
        <path d="M118,131 L120,200" stroke="${c.l}" stroke-width="7" fill="none" opacity="0.65"/>
        <text x="100" y="175" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="30" font-weight="900" fill="${c.a}" opacity="0.95">00</text>
        <text x="100" y="140" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="10" font-weight="900" fill="white" letter-spacing="1" opacity="0.85">SML</text>`;

      case 'blazer': return `
        <path d="M10,200 L12,150 C30,130 54,122 76,120 L88,131 Q100,141 112,131 L124,120 C146,122 170,130 188,150 L190,200 Z" fill="${c.m}"/>
        <path d="M88,131 Q100,141 112,131 L116,200 L84,200 Z" fill="#F0EEE8"/>
        <path d="M88,131 L74,120 L76,200 L84,200 Z" fill="${c.d}"/>
        <path d="M112,131 L126,120 L124,200 L116,200 Z" fill="${c.d}"/>
        <circle cx="100" cy="154" r="3" fill="#FFD700"/>
        <circle cx="100" cy="166" r="3" fill="#FFD700"/>
        <circle cx="100" cy="178" r="3" fill="#FFD700"/>
        <path d="M114,144 L124,141 L126,148 L116,148 Z" fill="${c.a}"/>
        <path d="M88,131 L84,123 L100,130 L116,123 L112,131" stroke="#E0E0E0" stroke-width="1.5" fill="none" opacity="0.6"/>`;

      case 'tee': return `
        <path d="M10,200 L12,152 C30,132 54,126 74,124 L82,135 Q100,143 118,135 L126,124 C146,126 170,132 188,152 L190,200 Z" fill="${c.m}"/>
        <path d="M78,152 L82,140 L88,147 L100,137 L112,147 L118,140 L122,152 Z" fill="${c.l}" opacity="0.82"/>
        <text x="100" y="170" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="14" font-weight="900" fill="${c.a}" letter-spacing="2">SML</text>
        <text x="100" y="184" text-anchor="middle" font-family="Arial,sans-serif" font-size="8.5" fill="${c.a}" letter-spacing="1.5" opacity="0.65">LEGENDS</text>`;

      default: return '';
    }
  }

  function svgAccessory(id) {
    switch (id) {
      case 'chain': return `
        <path d="M73,138 Q84,149 100,153 Q116,149 127,138" stroke="#FFD700" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M81,151 Q90,158 100,160 Q110,158 119,151" stroke="#FFD700" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <circle cx="100" cy="162" r="7" fill="#FFD700"/>
        <text x="100" y="165.5" text-anchor="middle" font-size="7.5" fill="#8B6914" font-weight="bold">$</text>
        <path d="M87,153 Q93,157 100,158 Q107,157 113,153" stroke="#DAA520" stroke-width="1" fill="none" opacity="0.5"/>`;

      case 'diamond_chain': return `
        <path d="M73,138 Q84,149 100,153 Q116,149 127,138" stroke="#90D8F8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M81,151 Q90,158 100,160 Q110,158 119,151" stroke="#90D8F8" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <polygon points="100,157 92,165 100,174 108,165" fill="#00E5FF" opacity="0.92"/>
        <polygon points="100,157 92,165 100,161 108,165" fill="white" opacity="0.55"/>
        <circle cx="84" cy="152" r="1.8" fill="white" opacity="0.8"/>
        <circle cx="100" cy="153" r="1.8" fill="white" opacity="0.8"/>
        <circle cx="116" cy="152" r="1.8" fill="white" opacity="0.8"/>`;

      case 'rainbow_chain': return `
        <path d="M73,138 Q84,149 100,153 Q116,149 127,138" stroke="url(#abRainbow)" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M81,151 Q90,158 100,160 Q110,158 119,151" stroke="url(#abRainbow)" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="78" cy="142" r="3" fill="#FF2020" opacity="0.9"/>
        <circle cx="88" cy="149" r="3" fill="#FF8800" opacity="0.9"/>
        <circle cx="100" cy="153" r="3" fill="#00D840" opacity="0.9"/>
        <circle cx="112" cy="149" r="3" fill="#0088FF" opacity="0.9"/>
        <circle cx="122" cy="142" r="3" fill="#CC00FF" opacity="0.9"/>
        <polygon points="100,157 93,164 100,172 107,164" fill="url(#abRainbow)" opacity="0.95"/>
        <polygon points="100,157 93,164 100,161 107,164" fill="white" opacity="0.6"/>`;

      case 'sunglasses': return `
        <rect x="71" y="78" width="25" height="17" rx="9" fill="#111" opacity="0.92"/>
        <rect x="71" y="78" width="25" height="17" rx="9" fill="#1A3A60" opacity="0.45"/>
        <rect x="104" y="78" width="25" height="17" rx="9" fill="#111" opacity="0.92"/>
        <rect x="104" y="78" width="25" height="17" rx="9" fill="#1A3A60" opacity="0.45"/>
        <path d="M96,86 L104,86" stroke="#808080" stroke-width="2.8" fill="none"/>
        <path d="M71,86 L55,84" stroke="#808080" stroke-width="2.8" fill="none"/>
        <path d="M129,86 L145,84" stroke="#808080" stroke-width="2.8" fill="none"/>
        <path d="M75,82 Q80,81 88,82" stroke="white" stroke-width="1.4" fill="none" opacity="0.35"/>
        <path d="M108,82 Q113,81 121,82" stroke="white" stroke-width="1.4" fill="none" opacity="0.35"/>`;

      case 'prism_shades': return `
        <rect x="71" y="78" width="25" height="17" rx="9" fill="url(#abRainbow)" opacity="0.75"/>
        <rect x="71" y="78" width="25" height="17" rx="9" fill="rgba(0,0,0,0.35)"/>
        <rect x="104" y="78" width="25" height="17" rx="9" fill="url(#abRainbow)" opacity="0.75"/>
        <rect x="104" y="78" width="25" height="17" rx="9" fill="rgba(0,0,0,0.35)"/>
        <path d="M96,86 L104,86" stroke="#888" stroke-width="2.8" fill="none"/>
        <path d="M71,86 L55,84" stroke="#888" stroke-width="2.8" fill="none"/>
        <path d="M129,86 L145,84" stroke="#888" stroke-width="2.8" fill="none"/>
        <path d="M73,81 Q83,79 92,81" stroke="rgba(255,255,255,0.6)" stroke-width="1.6" fill="none"/>
        <path d="M106,81 Q116,79 125,81" stroke="rgba(255,255,255,0.6)" stroke-width="1.6" fill="none"/>`;

      case 'cap': return `
        <path d="M50,76 Q100,68 150,76 L154,84 Q100,76 46,84 Z" fill="#1A2230"/>
        <path d="M56,76 Q58,36 100,32 Q142,36 144,76 Q122,70 100,68 Q78,70 56,76 Z" fill="#1A2230"/>
        <text x="100" y="58" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="10" font-weight="900" fill="#00D4FF" letter-spacing="1">SML</text>
        <text x="100" y="47" text-anchor="middle" font-size="10">👑</text>
        <circle cx="100" cy="34" r="5" fill="#2A3240"/>
        <path d="M50,76 Q100,80 150,76" stroke="#2A3240" stroke-width="1" fill="none" opacity="0.5"/>`;

      case 'crown': return `
        <path d="M63,68 L63,48 L77,60 L89,42 L100,56 L111,42 L123,60 L137,48 L137,68 Z" fill="#FFD700"/>
        <path d="M63,68 L137,68" stroke="#DAA520" stroke-width="2" fill="none"/>
        <rect x="63" y="66" width="74" height="9" rx="2.5" fill="#DAA520"/>
        <circle cx="89" cy="45" r="5.5" fill="#FF1493"/>
        <circle cx="100" cy="59" r="5.5" fill="#00E5FF"/>
        <circle cx="111" cy="45" r="5.5" fill="#FF6B00"/>
        <circle cx="63" cy="68" r="3" fill="#FFD700"/>
        <circle cx="137" cy="68" r="3" fill="#FFD700"/>
        <path d="M63,48 L77,60 L89,42 L100,56 L111,42 L123,60 L137,48" stroke="#B8960A" stroke-width="1.5" fill="none"/>
        <path d="M68,64 Q100,58 132,64" stroke="rgba(255,220,100,0.5)" stroke-width="1" fill="none"/>`;

      case 'halo': return `
        <ellipse cx="100" cy="32" rx="36" ry="10" fill="none" stroke="url(#abRainbow)" stroke-width="5.5" opacity="0.95"/>
        <ellipse cx="100" cy="32" rx="36" ry="10" fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/>
        <ellipse cx="100" cy="32" rx="34" ry="8" fill="none" stroke="url(#abRainbowLight)" stroke-width="1" opacity="0.6"/>
        <circle cx="100" cy="22" r="3" fill="white" opacity="0.8"/>
        <circle cx="88" cy="24" r="2" fill="white" opacity="0.6"/>
        <circle cx="112" cy="24" r="2" fill="white" opacity="0.6"/>`;

      case 'earrings': return `
        <circle cx="56" cy="96" r="5" fill="#00E5FF" opacity="0.95"/>
        <circle cx="56" cy="96" r="2.5" fill="white" opacity="0.7"/>
        <circle cx="56" cy="96" r="7" fill="none" stroke="#00E5FF" stroke-width="0.8" opacity="0.45"/>
        <circle cx="144" cy="96" r="5" fill="#00E5FF" opacity="0.95"/>
        <circle cx="144" cy="96" r="2.5" fill="white" opacity="0.7"/>
        <circle cx="144" cy="96" r="7" fill="none" stroke="#00E5FF" stroke-width="0.8" opacity="0.45"/>`;

      case 'headphones': return `
        <path d="M56,88 Q56,38 100,34 Q144,38 144,88" stroke="#22303A" stroke-width="11" fill="none" stroke-linecap="round"/>
        <path d="M56,88 Q56,38 100,34 Q144,38 144,88" stroke="#38505A" stroke-width="8" fill="none" stroke-linecap="round"/>
        <circle cx="56" cy="88" r="17" fill="#22303A"/>
        <circle cx="56" cy="88" r="13" fill="#38505A"/>
        <circle cx="56" cy="88" r="8" fill="#141E24"/>
        <circle cx="144" cy="88" r="17" fill="#22303A"/>
        <circle cx="144" cy="88" r="13" fill="#38505A"/>
        <circle cx="144" cy="88" r="8" fill="#141E24"/>
        <path d="M52,84 Q56,88 60,92" stroke="#505860" stroke-width="1.2" fill="none"/>
        <path d="M52,88 L60,88" stroke="#505860" stroke-width="1.2" fill="none"/>
        <path d="M52,92 Q56,88 60,84" stroke="#505860" stroke-width="1.2" fill="none"/>
        <path d="M140,84 Q144,88 148,92" stroke="#505860" stroke-width="1.2" fill="none"/>
        <path d="M140,88 L148,88" stroke="#505860" stroke-width="1.2" fill="none"/>
        <path d="M140,92 Q144,88 148,84" stroke="#505860" stroke-width="1.2" fill="none"/>
        <path d="M47,92 Q56,98 65,92" stroke="#00D4FF" stroke-width="2" fill="none" opacity="0.75"/>
        <path d="M135,92 Q144,98 153,92" stroke="#00D4FF" stroke-width="2" fill="none" opacity="0.75"/>`;

      default: return '';
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  AB.generate = function (cfg) {
    const {
      gender = 'male', skinId = 'warm', hairStyleId = null,
      hairColorId = 'black', eyeColorId = 'dark',
      outfitId = 'hoodie', outfitColorId = 'blue',
      accessoryId = 'none', bgId = 'default',
    } = cfg;

    const skin     = AB.SKIN_TONES.find(s => s.id === skinId)      || AB.SKIN_TONES[2];
    const hc       = AB.HAIR_COLORS.find(h => h.id === hairColorId) || AB.HAIR_COLORS[0];
    const ec       = (AB.EYE_COLORS.find(e => e.id === eyeColorId)  || AB.EYE_COLORS[0]).color;
    const styleId  = hairStyleId || (gender === 'female' ? 'long_straight' : 'fade');

    const bg       = svgBg(bgId);
    const clothes  = svgClothes(outfitId, outfitColorId, gender);
    const neck     = svgNeck(skin);
    const head     = svgHead(skin);
    const ears     = svgEars(skin);
    const hairBack = svgHairBack(styleId, hc);
    const face     = svgFace(skin, gender, ec);
    const hairFront = svgHairFront(styleId, hc);
    const acc      = svgAccessory(accessoryId);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  ${bg}
  <g clip-path="url(#abClip)">
    ${clothes}
    ${neck}
    ${head}
    ${ears}
    ${hairBack}
    ${hairFront}
    ${face}
    ${acc}
  </g>
</svg>`;
  };

  AB.toDataURL = function (svgStr) {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  };

  AB.defaultConfig = function (gender) {
    return {
      gender: gender || 'male',
      skinId: 'warm',
      hairStyleId: gender === 'female' ? 'long_straight' : 'fade',
      hairColorId: 'black',
      eyeColorId: 'dark',
      outfitId: 'hoodie',
      outfitColorId: 'blue',
      accessoryId: 'none',
      bgId: 'default',
    };
  };

})();
