// ============================================================
//  REWARDS: points, the shop, and the Monthly Drop.
//
//  POINTS: every 2 chapters read earns 10 points.
//  A chapter counts once, and only after 1 minute of reading.
//
//  SHOP: items anyone can unlock with points, any time.
//  MONTHLY DROP: special items you can only unlock on days
//  1 to 7 of that month. After that they're gone for good
//  (but you keep anything you already unlocked).
//
//  TO ADD NEXT MONTH'S DROP: copy a block in DROPS below,
//  change the month key ("2027-1" = January 2027, no zero),
//  give each item an id starting with "drop-2027-1-",
//  then draw it in ITEM_ART at the bottom.
// ============================================================

const POINTS_PER_PAIR = 10;      // points for every 2 chapters
const MIN_SECONDS = 60;          // reading time needed for a chapter to count
const DROP_DAYS = 7;             // the drop is open on days 1..7

// slot = where it goes on the avatar
//   head, face, neck, outfit, back, hand, feet, pet = wearable · badge = shows on your dashboard
const SHOP = [
  // badges (show on your dashboard)
  { id: 'badge-bookworm', name: 'Bookworm badge', slot: 'badge', price: 15, mark: 'BW' },
  { id: 'badge-night', name: 'Night Reader badge', slot: 'badge', price: 25, mark: 'NR' },
  { id: 'badge-speed', name: 'Speed Reader badge', slot: 'badge', price: 30, mark: 'SR' },
  { id: 'badge-smith', name: 'Story Smith badge', slot: 'badge', price: 30, mark: 'SS' },
  // head
  { id: 'headband', name: 'Pink headband', slot: 'head', price: 15 },
  { id: 'cap-gold', name: 'Gold cap', slot: 'head', price: 20 },
  { id: 'beanie', name: 'Cosy beanie', slot: 'head', price: 25 },
  { id: 'cat-ears', name: 'Cat ears', slot: 'head', price: 35 },
  { id: 'wizard-hat', name: 'Wizard hat', slot: 'head', price: 50 },
  { id: 'crown', name: 'Reading crown', slot: 'head', price: 60 },
  { id: 'halo', name: 'Golden halo', slot: 'head', price: 70 },
  // face
  { id: 'face-stars', name: 'Star face paint', slot: 'face', price: 20 },
  { id: 'shades', name: 'Round shades', slot: 'face', price: 30 },
  { id: 'visor', name: 'Cyber visor', slot: 'face', price: 40 },
  // neck
  { id: 'bowtie', name: 'Bow tie', slot: 'neck', price: 15 },
  { id: 'scarf', name: 'Starry scarf', slot: 'neck', price: 30 },
  { id: 'medal', name: 'Gold medal', slot: 'neck', price: 40 },
  // back
  { id: 'backpack', name: 'Explorer backpack', slot: 'back', price: 25 },
  { id: 'wings', name: 'Crystal wings', slot: 'back', price: 60 },
  // hand
  { id: 'paper-plane', name: 'Paper plane', slot: 'hand', price: 20 },
  { id: 'glow-book', name: 'Glowing book', slot: 'hand', price: 35 },
  { id: 'lantern', name: 'Reading lantern', slot: 'hand', price: 40 },
  { id: 'star-wand', name: 'Star wand', slot: 'hand', price: 55 },
  // buddies
  { id: 'cat', name: 'Cat buddy', slot: 'pet', price: 60 },
  { id: 'dragon', name: 'Mini dragon', slot: 'pet', price: 90 }
];

const DROPS = {
  '2026-11': {
    theme: 'Pirate Captain',
    items: [
      { id: 'drop-2026-11-eyepatch', name: 'Eye patch', slot: 'face', price: 50 },
      { id: 'drop-2026-11-cape', name: 'Treasure-map cape', slot: 'back', price: 70 },
      { id: 'drop-2026-11-hat', name: 'Captain hat', slot: 'head', price: 80 },
      { id: 'drop-2026-11-parrot', name: 'Shoulder parrot', slot: 'pet', price: 100 }
    ]
  },
  '2026-12': {
    theme: 'Space Explorer',
    items: [
      { id: 'drop-2026-12-jetpack', name: 'Jetpack', slot: 'back', price: 80 },
      { id: 'drop-2026-12-helmet', name: 'Space helmet', slot: 'head', price: 90 },
      { id: 'drop-2026-12-robot', name: 'Robot buddy', slot: 'pet', price: 110 }
    ]
  },
  '2027-1': {
    theme: 'Ninja Scroll',
    items: [
      { id: 'drop-2027-1-scroll', name: 'Secret scroll', slot: 'hand', price: 50 },
      { id: 'drop-2027-1-mask', name: 'Ninja mask', slot: 'face', price: 60 },
      { id: 'drop-2027-1-band', name: 'Ninja headband', slot: 'head', price: 70 },
      { id: 'drop-2027-1-sword', name: 'Practice sword', slot: 'back', price: 90 },
      { id: 'drop-2027-1-fox', name: 'Fox buddy', slot: 'pet', price: 110 }
    ]
  },
  '2027-2': {
    theme: 'Robot Lab',
    items: [
      { id: 'drop-2027-2-wrench', name: 'Lab wrench', slot: 'hand', price: 50 },
      { id: 'drop-2027-2-antenna', name: 'Antenna', slot: 'head', price: 60 },
      { id: 'drop-2027-2-goggles', name: 'Lab goggles', slot: 'face', price: 70 },
      { id: 'drop-2027-2-core', name: 'Power core', slot: 'back', price: 90 }
    ]
  }
};

const SLOT_NAMES = { head: 'Head', face: 'Face', neck: 'Neck', outfit: 'Outfit', back: 'Back', hand: 'Hand', feet: 'Feet', pet: 'Buddy' };

function allItems() {
  return SHOP.concat(...Object.values(DROPS).map(d => d.items.map(i => ({ ...i, drop: d.theme }))));
}
function itemById(id) { return allItems().find(i => i.id === id); }

// Which drop is open (or next)?  Uses UTC dates, exactly like the
// security rules, so the screen and the rules always agree.
// (In India the drop opens at 5:30 am on the 1st and closes at 5:30 am on the 8th.)
function dropInfo(now) {
  now = now || new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth() + 1;
  const key = y + '-' + m;
  const live = now.getUTCDate() <= DROP_DAYS && !!DROPS[key];
  if (live) return { live: true, key, ...DROPS[key], endsAt: new Date(Date.UTC(y, m - 1, DROP_DAYS + 1)) };
  const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y;
  const nextKey = ny + '-' + nm;
  return { live: false, key: nextKey, ...(DROPS[nextKey] || { theme: null, items: [] }), startsAt: new Date(Date.UTC(ny, nm - 1, 1)) };
}

function countdown(to) {
  const ms = Math.max(0, to - Date.now());
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, mi = Math.floor(ms / 6e4) % 60;
  return d ? `${d}d ${h}h` : h ? `${h}h ${mi}m` : `${mi}m`;
}

// Points from progress records + owned items
function pointsSummary(progressMap, owned, bonus) {
  const credited = Object.values(progressMap || {}).reduce((n, p) => n + ((p.pointChapters || []).length), 0);
  const earned = Math.floor(credited / 2) * POINTS_PER_PAIR + (bonus || 0);
  const spent = (owned || []).reduce((n, id) => n + ((itemById(id) || {}).price || 0), 0);
  return { credited, earned, spent, balance: Math.max(0, earned - spent), toNext: credited % 2 === 0 ? 2 : 1 };
}

// Hexagon badge picture
function badgeSVG(item, size) {
  return `<svg viewBox="0 0 40 44" width="${size}" height="${Math.round(size * 1.1)}" aria-hidden="true">
    <polygon points="20,2 38,12 38,32 20,42 2,32 2,12" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.5"/>
    <polygon points="20,8 33,15 33,29 20,36 7,29 7,15" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1"/>
    <text x="20" y="26" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="600" fill="currentColor">${item.mark || '★'}</text></svg>`;
}

// ------------------------------------------------------------
//  ITEM ART: SVG drawn on the avatar (same 120 x 150 space as
//  avatar.js). Head is a circle at x=60, y=42, radius 22.
// ------------------------------------------------------------
const ITEM_ART = {
  'cap-gold': `<path d="M36 34 Q38 16 60 16 Q82 16 84 34 Z" fill="#E3B341"/><path d="M60 34 L94 34 Q92 39 84 38 L60 38 Z" fill="#C8962A"/><circle cx="60" cy="17" r="2.5" fill="#FFF1C2"/>`,
  'crown': `<path d="M42 26 L42 11 L50 19 L60 7 L70 19 L78 11 L78 26 Z" fill="#F2C94C" stroke="#B8891F" stroke-width="1.2"/><circle cx="60" cy="18" r="2.4" fill="#2DE2E6"/><circle cx="49" cy="22" r="1.8" fill="#E5484D"/><circle cx="71" cy="22" r="1.8" fill="#E5484D"/>`,
  'visor': `<rect x="39" y="36" width="42" height="13" rx="6.5" fill="#2DE2E6" fill-opacity=".45" stroke="#2DE2E6" stroke-width="1.5"/><rect x="43" y="39" width="14" height="3" rx="1.5" fill="#FFFFFF" fill-opacity=".7"/>`,
  'scarf': `<path d="M44 64 Q60 74 76 64 L78 72 Q60 82 42 72 Z" fill="#33408F"/><path d="M68 72 L74 92 L66 92 L63 74 Z" fill="#33408F"/><circle cx="52" cy="70" r="1.1" fill="#FFE27A"/><circle cx="62" cy="73" r="1.1" fill="#FFE27A"/><circle cx="70" cy="69" r="1.1" fill="#FFE27A"/><circle cx="70" cy="84" r="1.1" fill="#FFE27A"/>`,

  // more shop items
  'headband': `<path d="M38 33 Q60 22 82 33 L82 37 Q60 26 38 37 Z" fill="#E84A8B"/><circle cx="76" cy="29" r="4" fill="#F7C548"/>`,
  'beanie': `<path d="M37 36 Q37 14 60 14 Q83 14 83 36 Z" fill="#C0392B"/><rect x="36" y="32" width="48" height="7" rx="3" fill="#962D22"/><circle cx="60" cy="12" r="4.5" fill="#F4F1EA"/>`,
  'cat-ears': `<path d="M39 31 L41 11 L54 22 Z" fill="#2A211E"/><path d="M81 31 L79 11 L66 22 Z" fill="#2A211E"/><path d="M43 26 L44 17 L50 22 Z M77 26 L76 17 L70 22 Z" fill="#F2A3B5"/>`,
  'wizard-hat': `<path d="M42 31 L60 6 L78 31 Z" fill="#4B3699"/><path d="M33 30 Q60 37 87 30 L85 35 Q60 41 35 35 Z" fill="#3B2A7A"/><circle cx="58" cy="17" r="1.6" fill="#F7E07A"/><circle cx="66" cy="24" r="1.2" fill="#F7E07A"/><path d="M53 21 l1.6 3.3 l3.6 .5 l-2.6 2.5 l.6 3.6 l-3.2 -1.7 l-3.2 1.7 l.6 -3.6 l-2.6 -2.5 l3.6 -.5z" fill="#F7E07A"/>`,
  'halo': `<ellipse cx="60" cy="13" rx="15" ry="4" fill="none" stroke="#F7E07A" stroke-width="5" stroke-opacity=".25"/><ellipse cx="60" cy="13" rx="15" ry="4" fill="none" stroke="#F7E07A" stroke-width="2.2"/>`,
  'face-stars': `<path d="M44 47 l1.6 3.3 l3.6 .5 l-2.6 2.5 l.6 3.6 l-3.2 -1.7 l-3.2 1.7 l.6 -3.6 l-2.6 -2.5 l3.6 -.5z" fill="#2DE2E6"/><path d="M76 47 l1.6 3.3 l3.6 .5 l-2.6 2.5 l.6 3.6 l-3.2 -1.7 l-3.2 1.7 l.6 -3.6 l-2.6 -2.5 l3.6 -.5z" fill="#E84A8B"/>`,
  'shades': `<circle cx="52" cy="43" r="6.2" fill="#1A1A2E"/><circle cx="68" cy="43" r="6.2" fill="#1A1A2E"/><line x1="58" y1="43" x2="62" y2="43" stroke="#1A1A2E" stroke-width="2"/><circle cx="50" cy="41" r="1.6" fill="#FFFFFF" fill-opacity=".6"/><circle cx="66" cy="41" r="1.6" fill="#FFFFFF" fill-opacity=".6"/>`,
  'bowtie': `<path d="M60 72 L50 66 L50 78 Z M60 72 L70 66 L70 78 Z" fill="#C0392B"/><circle cx="60" cy="72" r="2.6" fill="#962D22"/>`,
  'medal': `<path d="M53 64 L60 82 L67 64" fill="none" stroke="#2F6FA3" stroke-width="3.2"/><circle cx="60" cy="87" r="6.5" fill="#F2C94C" stroke="#B8891F" stroke-width="1.2"/><path d="M60 82.5 l1.6 3.3 l3.6 .5 l-2.6 2.5 l.6 3.6 l-3.2 -1.7 l-3.2 1.7 l.6 -3.6 l-2.6 -2.5 l3.6 -.5z" fill="#B8891F"/>`,
  'backpack': `<rect x="30" y="74" width="60" height="34" rx="8" fill="#6B8E3D"/><rect x="26" y="88" width="8" height="14" rx="3" fill="#56742F"/>`,
  'wings': `<path d="M40 82 Q16 58 21 90 Q25 104 40 94 Z" fill="#BDE8F5" fill-opacity=".8" stroke="#7FD3EA" stroke-width="1.2"/><path d="M80 82 Q104 58 99 90 Q95 104 80 94 Z" fill="#BDE8F5" fill-opacity=".8" stroke="#7FD3EA" stroke-width="1.2"/>`,
  'paper-plane': `<path d="M78 100 L100 92 L88 108 Z" fill="#F4F1EA" stroke="#9AA4B2" stroke-width=".8"/><path d="M100 92 L86 103" stroke="#9AA4B2" stroke-width=".8"/>`,
  'glow-book': `<rect x="79" y="94" width="18" height="13" rx="1.5" fill="#2DE2E6" fill-opacity=".3" stroke="#2DE2E6" stroke-width="1.5"/><line x1="88" y1="94" x2="88" y2="107" stroke="#2DE2E6" stroke-width="1.2"/>`,
  'lantern': `<line x1="87" y1="100" x2="87" y2="106" stroke="#555555" stroke-width="1.2"/><rect x="81" y="106" width="12" height="14" rx="2" fill="#F2B233" fill-opacity=".9" stroke="#7A5A1E"/><circle cx="87" cy="113" r="3" fill="#FFF3C4"/>`,
  'star-wand': `<line x1="84" y1="110" x2="96" y2="90" stroke="#5C3B1E" stroke-width="2.6" stroke-linecap="round"/><path d="M97 81 l1.6 3.3 l3.6 .5 l-2.6 2.5 l.6 3.6 l-3.2 -1.7 l-3.2 1.7 l.6 -3.6 l-2.6 -2.5 l3.6 -.5z" fill="#F7E07A"/>`,
  'cat': `<ellipse cx="30" cy="132" rx="9" ry="7" fill="#E39A4C"/><circle cx="30" cy="121" r="6.5" fill="#E39A4C"/><path d="M24.5 117 L25 110 L29 115 Z M35.5 117 L35 110 L31 115 Z" fill="#E39A4C"/><circle cx="28" cy="121" r="1" fill="#222222"/><circle cx="32" cy="121" r="1" fill="#222222"/><path d="M38 134 Q46 128 42 120" stroke="#E39A4C" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  'dragon': `<path d="M84 66 Q90 52 98 58 Q94 62 96 70 Q90 76 84 66 Z" fill="#3FA66B"/><circle cx="96" cy="57" r="4.5" fill="#3FA66B"/><circle cx="97.5" cy="56" r="1" fill="#111111"/><path d="M86 62 L80 52 L90 58 Z" fill="#7FD49B"/><path d="M92 53 l1 -4 l2 4z" fill="#F2C94C"/>`,
  'drop-2027-1-band': `<path d="M38 34 Q60 26 82 34 L82 39 Q60 31 38 39 Z" fill="#1F2A44"/><rect x="55" y="29" width="10" height="7" rx="1" fill="#C9D6E8"/><path d="M82 35 Q92 38 96 48 M82 37 Q90 42 92 52" stroke="#1F2A44" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  'drop-2027-1-mask': `<path d="M39 47 Q60 41 81 47 Q80 60 60 64 Q40 60 39 47 Z" fill="#1F2A44"/>`,
  'drop-2027-1-scroll': `<rect x="80" y="96" width="18" height="10" rx="2" fill="#F1E3C2" stroke="#B89A5E"/><circle cx="80" cy="101" r="3" fill="#B03A2E"/><circle cx="98" cy="101" r="3" fill="#B03A2E"/>`,
  'drop-2027-1-sword': `<line x1="30" y1="128" x2="92" y2="70" stroke="#8B5E34" stroke-width="4" stroke-linecap="round"/><line x1="40" y1="112" x2="48" y2="122" stroke="#3B2A1E" stroke-width="3" stroke-linecap="round"/>`,
  'drop-2027-1-fox': `<ellipse cx="92" cy="132" rx="9" ry="7" fill="#E8742C"/><circle cx="92" cy="121" r="6.5" fill="#E8742C"/><path d="M86.5 117 L86 109 L90.5 115 Z M97.5 117 L98 109 L93.5 115 Z" fill="#E8742C"/><path d="M89 123 Q92 127 95 123 Z" fill="#FFFFFF"/><circle cx="90" cy="120.5" r="1" fill="#222222"/><circle cx="94" cy="120.5" r="1" fill="#222222"/>`,
  'drop-2027-2-antenna': `<rect x="55" y="16" width="10" height="5" rx="1" fill="#8D99AB"/><line x1="60" y1="16" x2="60" y2="9" stroke="#8D99AB" stroke-width="2"/><circle cx="60" cy="9" r="3" fill="#E5484D"/>`,
  'drop-2027-2-goggles': `<rect x="40" y="36" width="40" height="14" rx="5" fill="#2A2F3A"/><circle cx="52" cy="43" r="5" fill="#F28C28"/><circle cx="68" cy="43" r="5" fill="#F28C28"/><circle cx="51" cy="42" r="1.6" fill="#FFFFFF" fill-opacity=".7"/><circle cx="67" cy="42" r="1.6" fill="#FFFFFF" fill-opacity=".7"/>`,
  'drop-2027-2-wrench': `<line x1="84" y1="110" x2="95" y2="93" stroke="#9AA4B2" stroke-width="3.5" stroke-linecap="round"/><circle cx="97" cy="89" r="5" fill="#9AA4B2"/><circle cx="99" cy="86" r="2.4" fill="#0D121D"/>`,
  'drop-2027-2-core': `<rect x="30" y="66" width="60" height="46" rx="8" fill="#3A4252"/><rect x="30" y="66" width="60" height="7" rx="3" fill="#4C5668"/><path d="M28 78 Q14 94 28 110" stroke="#2DE2E6" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M92 78 Q106 94 92 110" stroke="#2DE2E6" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="36" cy="69.5" r="2" fill="#2DE2E6"/><circle cx="84" cy="69.5" r="2" fill="#2DE2E6"/>`,

  // November drop: Pirate Captain
  'drop-2026-11-hat': `<path d="M26 31 Q34 12 60 10 Q86 12 94 31 Q78 24 60 26 Q42 24 26 31 Z" fill="#1F1B1E"/><path d="M28 30 Q44 23 60 25 Q76 23 92 30" fill="none" stroke="#D9A441" stroke-width="2"/><path d="M60 12.5 L62 17.5 L67 17.5 L63 20.5 L64.5 25 L60 22.5 L55.5 25 L57 20.5 L53 17.5 L58 17.5 Z" fill="#D9A441"/>`,
  'drop-2026-11-eyepatch': `<line x1="40" y1="33" x2="82" y2="48" stroke="#1F1B1E" stroke-width="2"/><ellipse cx="68" cy="43" rx="6" ry="5.5" fill="#1F1B1E"/>`,
  'drop-2026-11-cape': `<path d="M38 74 L20 136 L100 136 L82 74 Z" fill="#D8BF8A"/><path d="M30 104 Q46 96 58 108 T 90 114" fill="none" stroke="#8C6A3A" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M84 118 l6 6 m0 -6 l-6 6" stroke="#C0392B" stroke-width="2"/>`,
  'drop-2026-11-parrot': `<ellipse cx="90" cy="68" rx="7" ry="10" fill="#2FA84F"/><circle cx="90" cy="56" r="6" fill="#E74C3C"/><path d="M95 54 Q101 57 95 60 Z" fill="#F2B233"/><circle cx="91.5" cy="55" r="1.2" fill="#111"/><path d="M84 64 Q80 73 86 80 Z" fill="#1F7FBF"/><path d="M88 77 L86 88 L91 78 Z" fill="#1F7FBF"/>`,

  // December drop: Space Explorer
  'drop-2026-12-helmet': `<circle cx="60" cy="42" r="30" fill="#BFEFFF" fill-opacity=".14" stroke="#E6F7FF" stroke-width="2.5"/><path d="M42 26 Q50 18 60 17" stroke="#FFFFFF" stroke-opacity=".8" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  'drop-2026-12-jetpack': `<rect x="22" y="72" width="14" height="30" rx="5" fill="#9AA4B2"/><rect x="84" y="72" width="14" height="30" rx="5" fill="#9AA4B2"/><path d="M25 102 L29 114 L33 102 Z M87 102 L91 114 L95 102 Z" fill="#F28C28"/>`,
  'drop-2026-12-robot': `<rect x="83" y="58" width="14" height="12" rx="3" fill="#B8C4D6"/><circle cx="87.5" cy="63.5" r="1.6" fill="#2DE2E6"/><circle cx="92.5" cy="63.5" r="1.6" fill="#2DE2E6"/><line x1="90" y1="58" x2="90" y2="53" stroke="#B8C4D6" stroke-width="1.5"/><circle cx="90" cy="52" r="1.8" fill="#E5484D"/><rect x="85" y="70" width="10" height="6" rx="2" fill="#8D99AB"/>`
};

Object.assign(window, {
  POINTS_PER_PAIR, MIN_SECONDS, DROP_DAYS, SHOP, DROPS, SLOT_NAMES, ITEM_ART,
  allItems, itemById, dropInfo, countdown, pointsSummary, badgeSVG
});
