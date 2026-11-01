// ============================================================
//  PIRATE CAPTAIN COLLECTION (November 2026 drop)
//  About 100 original pirate items, made from a few designs in
//  different colours. Rare ones cost more and glow gold.
//
//  To add an item: call add(...) at the bottom with
//  an id, a name, the slot, the price, and its drawing.
// ============================================================

(function () {
  const drop = DROPS['2026-11'];
  if (!drop) return;
  const GOLD = '#D9A441';

  function darken(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = sh => Math.round(((n >> sh) & 255) * (1 - f));
    return '#' + [16, 8, 0].map(sh => ch(sh).toString(16).padStart(2, '0')).join('');
  }
  function add(id, name, slot, price, art, rare) {
    const full = 'drop-2026-11-' + id;
    if (drop.items.some(i => i.id === full)) return;
    drop.items.push({ id: full, name, slot, price, rare: !!rare, group: GROUPS[slot] || slot });
    ITEM_ART[full] = art;
  }
  const GROUPS = { head: 'Hats', face: 'Face', neck: 'Neck', outfit: 'Outfits', back: 'Back', hand: 'Gear', feet: 'Boots', pet: 'Buddies' };
  drop.items.forEach(i => { i.group = GROUPS[i.slot] || i.slot; });

  // ---------- drawings (same 120 x 150 space as the avatar) ----------
  const tricorne = (c, trim) => `<path d="M26 31 Q34 12 60 10 Q86 12 94 31 Q78 24 60 26 Q42 24 26 31 Z" fill="${c}"/><path d="M28 30 Q44 23 60 25 Q76 23 92 30" fill="none" stroke="${trim}" stroke-width="2"/><circle cx="60" cy="18" r="3" fill="${trim}"/>`;
  const bandana = c => `<path d="M37 34 Q37 17 60 17 Q83 17 83 34 Q60 27 37 34 Z" fill="${c}"/><circle cx="47" cy="26" r="1.6" fill="#FFFFFF" fill-opacity=".7"/><circle cx="62" cy="21" r="1.6" fill="#FFFFFF" fill-opacity=".7"/><circle cx="73" cy="28" r="1.6" fill="#FFFFFF" fill-opacity=".7"/><path d="M82 31 L94 38 L89 30 L96 27 Z" fill="${darken(c, .15)}"/>`;
  const bicorne = (c, plume) => `<path d="M28 31 Q60 4 92 31 Q60 23 28 31 Z" fill="${c}"/><path d="M30 30 Q60 22 90 30" stroke="${GOLD}" stroke-width="1.6" fill="none"/><path d="M58 16 Q70 3 78 11 Q68 10 62 20 Z" fill="${plume}"/><circle cx="60" cy="23" r="2.6" fill="${GOLD}"/>`;
  const brimHat = (c, feather) => `<ellipse cx="60" cy="30" rx="31" ry="6" fill="${c}"/><path d="M42 30 Q42 11 60 11 Q78 11 78 30 Z" fill="${c}"/><rect x="42" y="23" width="36" height="4" fill="${darken(c, .35)}"/><path d="M73 24 Q89 3 97 9 Q86 12 78 26 Z" fill="${feather}"/>`;
  const patch = c => `<line x1="40" y1="33" x2="82" y2="48" stroke="${darken(c, .3)}" stroke-width="2"/><ellipse cx="68" cy="43" rx="6" ry="5.5" fill="${c}"/>`;
  const beard = c => `<path d="M39 47 Q41 70 60 72 Q79 70 81 47 Q75 59 60 59 Q45 59 39 47 Z" fill="${c}"/><path d="M53 55 Q60 51 67 55" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const braidBeard = c => beard(c) + `<path d="M57 70 h6 l-1 6 h-4 z M57.5 76 h5 l-1 6 h-3 z" fill="${darken(c, .2)}"/><circle cx="60" cy="84" r="2" fill="${GOLD}"/>`;
  const mustache = (c, curly) => `<path d="M60 52 Q54 47.5 46 52 Q51 55.5 60 53.5 Q69 55.5 74 52 Q66 47.5 60 52 Z" fill="${c}"/>` + (curly ? `<path d="M46 52 q-3 -1 -2 -4 M74 52 q3 -1 2 -4" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>` : '');
  const monocle = c => `<circle cx="68" cy="43" r="6.5" fill="#BFEFFF" fill-opacity=".25" stroke="${c}" stroke-width="2"/><path d="M74 45 Q79 60 73 72" stroke="${c}" stroke-width="1" fill="none"/>`;
  const sash = c => `<path d="M42 70 Q60 80 78 70 L78 76 Q60 86 42 76 Z" fill="${c}"/><path d="M70 78 L76 94 L69 92 L66 80 Z" fill="${darken(c, .15)}"/>`;
  const coinChain = c => `<path d="M50 66 Q60 80 70 66" stroke="${c}" stroke-width="2" fill="none" stroke-dasharray="2 1.5"/><circle cx="60" cy="79" r="4.6" fill="${c}" stroke="#00000033"/><circle cx="60" cy="79" r="2" fill="none" stroke="#00000044"/>`;
  const compassPendant = c => `<path d="M50 66 Q60 80 70 66" stroke="${c}" stroke-width="1.5" fill="none"/><circle cx="60" cy="80" r="5.5" fill="#F1E3C2" stroke="${c}" stroke-width="1.8"/><path d="M60 76 L61.5 80 L60 84 L58.5 80 Z" fill="#B03A2E"/>`;
  const jabot = c => `<path d="M54 66 Q49 72 55 76 Q49 80 56 85 L60 87 L64 85 Q71 80 65 76 Q71 72 66 66 Z" fill="${c}" stroke="#00000022"/>`;
  const pearls = () => [[48, 68], [51, 72], [55, 75], [60, 76], [65, 75], [69, 72], [72, 68]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#F4F1EA" stroke="#C9C1AE" stroke-width=".5"/>`).join('');
  const coat = (c, trim) => `<rect x="26" y="74" width="13" height="31" rx="5" fill="${c}"/><rect x="81" y="74" width="13" height="31" rx="5" fill="${c}"/><rect x="26" y="98" width="13" height="5" fill="${trim}"/><rect x="81" y="98" width="13" height="5" fill="${trim}"/><path d="M38 74 Q60 66 82 74 L87 124 L67 124 L64 86 L56 86 L53 124 L33 124 Z" fill="${c}"/><path d="M54 72 L60 86 L66 72" stroke="${trim}" stroke-width="2.2" fill="none"/><g fill="${trim}"><circle cx="52" cy="92" r="1.7"/><circle cx="52" cy="101" r="1.7"/><circle cx="68" cy="92" r="1.7"/><circle cx="68" cy="101" r="1.7"/></g>`;
  const sailor = c => `<path d="M38 74 Q60 66 82 74 L80 106 L40 106 Z" fill="#F4F1EA"/><rect x="27" y="74" width="12" height="12" rx="5" fill="#F4F1EA"/><rect x="81" y="74" width="12" height="12" rx="5" fill="#F4F1EA"/><g stroke="${c}" stroke-width="3"><line x1="39" y1="81" x2="81" y2="81"/><line x1="40" y1="89" x2="80" y2="89"/><line x1="40" y1="97" x2="80" y2="97"/><line x1="27" y1="81" x2="39" y2="81"/><line x1="81" y1="81" x2="93" y2="81"/></g>`;
  const vest = c => `<path d="M39 76 Q46 71 54 72 L56 106 L40 106 Z M81 76 Q74 71 66 72 L64 106 L80 106 Z" fill="${c}"/><g fill="${GOLD}"><circle cx="53" cy="84" r="1.4"/><circle cx="53" cy="94" r="1.4"/></g>`;
  const cape = c => `<path d="M38 74 L20 136 L100 136 L82 74 Z" fill="${c}"/><path d="M38 74 L82 74 L78 80 L42 80 Z" fill="${darken(c, .25)}"/>`;
  const flag = c => `<line x1="22" y1="142" x2="22" y2="10" stroke="#6B4A2B" stroke-width="2.5"/><path d="M22 10 L42 12 Q38 19 42 26 L22 24 Z" fill="${c}"/><circle cx="31" cy="17.5" r="3" fill="none" stroke="#F4F1EA" stroke-width="1.4"/>`;
  const barrel = () => `<rect x="28" y="72" width="64" height="38" rx="10" fill="#8B5E34"/><g stroke="#3B2A1E" stroke-width="2"><line x1="28" y1="80" x2="92" y2="80"/><line x1="28" y1="102" x2="92" y2="102"/></g>`;
  const sack = () => `<path d="M17 92 Q19 72 33 76 L36 110 Q24 114 17 106 Z" fill="#B8925A"/><path d="M23 78 Q28 74 33 78" stroke="#6B4A2B" stroke-width="2" fill="none"/><circle cx="26" cy="96" r="3" fill="${GOLD}"/>`;
  const wheel = () => `<circle cx="60" cy="88" r="34" fill="none" stroke="#8B5E34" stroke-width="4"/>` +
    [0, 45, 90, 135].map(a => `<line x1="${60 + 40 * Math.cos(a * Math.PI / 180)}" y1="${88 + 40 * Math.sin(a * Math.PI / 180)}" x2="${60 - 40 * Math.cos(a * Math.PI / 180)}" y2="${88 - 40 * Math.sin(a * Math.PI / 180)}" stroke="#8B5E34" stroke-width="3" stroke-linecap="round"/>`).join('');
  const cutlass = c => `<path d="M87 104 Q101 92 98 70 Q94 90 85 102 Z" fill="${c}" stroke="#00000033" stroke-width=".6"/><path d="M82 103 h9" stroke="${GOLD}" stroke-width="2.5" stroke-linecap="round"/><path d="M85 105 L83 111" stroke="#5C3B1E" stroke-width="3" stroke-linecap="round"/>`;
  const spyglass = c => `<line x1="84" y1="108" x2="99" y2="88" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/><line x1="93" y1="96" x2="103" y2="83" stroke="${darken(c, .25)}" stroke-width="3.8" stroke-linecap="round"/><circle cx="103" cy="83" r="1.5" fill="#BFEFFF"/>`;
  const mapScroll = () => `<rect x="80" y="95" width="19" height="13" rx="1.5" fill="#E9D7AE" stroke="#A88A52"/><path d="M83 103 Q88 98 93 102" stroke="#8C6A3A" stroke-width="1" fill="none" stroke-dasharray="2 1.5"/><path d="M93 99 l3 3 m0 -3 l-3 3" stroke="#C0392B" stroke-width="1.5"/>`;
  const compassHand = () => `<circle cx="90" cy="103" r="7" fill="#F1E3C2" stroke="#B8891F" stroke-width="2"/><path d="M90 97.5 L92 103 L90 108.5 L88 103 Z" fill="#B03A2E"/>`;
  const lantern = glass => `<line x1="87" y1="100" x2="87" y2="106" stroke="#555555" stroke-width="1.2"/><rect x="81" y="106" width="12" height="14" rx="2" fill="${glass}" fill-opacity=".85" stroke="#3B3B3B"/><circle cx="87" cy="113" r="3" fill="#FFF3C4"/>`;
  const pouch = () => `<path d="M82 100 Q80 114 90 114 Q100 114 98 100 Q90 104 82 100 Z" fill="#8B5E34"/><path d="M83 100 Q90 96 97 100" stroke="#3B2A1E" stroke-width="1.6" fill="none"/><circle cx="94" cy="98" r="2.4" fill="${GOLD}"/>`;
  const key = () => `<circle cx="90" cy="94" r="4" fill="none" stroke="${GOLD}" stroke-width="2.2"/><line x1="90" y1="98" x2="90" y2="112" stroke="${GOLD}" stroke-width="2.2"/><path d="M90 108 h4 M90 111 h3" stroke="${GOLD}" stroke-width="2"/>`;
  const bottle = () => `<rect x="84" y="94" width="10" height="17" rx="3" fill="#8FD4C1" fill-opacity=".7" stroke="#4E8C7C"/><rect x="86.5" y="90" width="5" height="5" fill="#8B5E34"/><rect x="86.5" y="99" width="5" height="8" fill="#F1E3C2"/>`;
  const anchor = () => `<g stroke="#5D6B7D" stroke-width="2.4" fill="none" stroke-linecap="round"><line x1="90" y1="93" x2="90" y2="113"/><path d="M83 107 Q90 117 97 107"/><line x1="86" y1="97" x2="94" y2="97"/></g><circle cx="90" cy="90.5" r="2.4" fill="none" stroke="#5D6B7D" stroke-width="1.8"/>`;
  const oar = () => `<line x1="80" y1="120" x2="100" y2="70" stroke="#8B5E34" stroke-width="3"/><ellipse cx="99" cy="74" rx="3.6" ry="8" transform="rotate(22 99 74)" fill="#A97C4F"/>`;
  const handFlag = c => `<line x1="86" y1="110" x2="86" y2="80" stroke="#6B4A2B" stroke-width="2"/><path d="M86 80 L102 83 L86 92 Z" fill="${c}"/>`;
  const boots = (c, buckle) => [44, 63].map(x => `<rect x="${x - 1}" y="118" width="15" height="5" rx="1.5" fill="${darken(c, .3)}"/><rect x="${x}" y="121" width="13" height="15" rx="2" fill="${c}"/><ellipse cx="${x + 6}" cy="138" rx="10" ry="5.5" fill="${c}"/>` + (buckle ? `<rect x="${x + 3.5}" y="126" width="6" height="4" fill="none" stroke="${GOLD}" stroke-width="1.4"/>` : '')).join('');
  const parrot = (body, head, wing) => `<ellipse cx="90" cy="68" rx="7" ry="10" fill="${body}"/><circle cx="90" cy="56" r="6" fill="${head}"/><path d="M95 54 Q101 57 95 60 Z" fill="#F2B233"/><circle cx="91.5" cy="55" r="1.2" fill="#111111"/><path d="M84 64 Q80 73 86 80 Z" fill="${wing}"/><path d="M88 77 L86 88 L91 78 Z" fill="${wing}"/>`;
  const monkey = () => `<circle cx="30" cy="62" r="8" fill="#8B5E34"/><circle cx="30" cy="64" r="5" fill="#E2C49A"/><circle cx="22" cy="60" r="3" fill="#8B5E34"/><circle cx="38" cy="60" r="3" fill="#8B5E34"/><circle cx="28" cy="62" r="1" fill="#111111"/><circle cx="32" cy="62" r="1" fill="#111111"/><path d="M28 66 Q30 68 32 66" stroke="#5C3B1E" stroke-width="1" fill="none"/><path d="M36 70 Q44 72 40 82" stroke="#8B5E34" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  const crab = c => `<ellipse cx="92" cy="134" rx="9" ry="6" fill="${c}"/><circle cx="82" cy="128" r="3.5" fill="${c}"/><circle cx="102" cy="128" r="3.5" fill="${c}"/><line x1="89" y1="129" x2="88" y2="125" stroke="${c}" stroke-width="1.5"/><line x1="95" y1="129" x2="96" y2="125" stroke="${c}" stroke-width="1.5"/><circle cx="88" cy="124.5" r="1.5" fill="#111111"/><circle cx="96" cy="124.5" r="1.5" fill="#111111"/>`;
  const octopus = c => `<path d="M82 66 Q82 52 92 52 Q102 52 102 66 Z" fill="${c}"/>` + [84, 88, 92, 96, 100].map(x => `<path d="M${x} 65 q-2 6 1 9" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join('') + `<circle cx="89" cy="60" r="1.4" fill="#111111"/><circle cx="95" cy="60" r="1.4" fill="#111111"/>`;
  const gull = () => `<path d="M82 26 Q90 20 98 26 Q90 24 82 26 Z" fill="#9AA4B2"/><ellipse cx="90" cy="28" rx="6" ry="3.5" fill="#FFFFFF"/><circle cx="95" cy="26.5" r="2.6" fill="#FFFFFF"/><path d="M97.5 26.5 l3 1 l-3 1 z" fill="#F2B233"/><circle cx="95.5" cy="26" r=".7" fill="#111111"/>`;
  const turtle = () => `<ellipse cx="28" cy="134" rx="10" ry="6.5" fill="#3E8E5A"/><path d="M20 134 h16 M28 128 v12" stroke="#2C6B42" stroke-width="1.2"/><circle cx="39" cy="131" r="3.5" fill="#7FBF8E"/><circle cx="40" cy="130.3" r=".9" fill="#111111"/>`;
  const chest = () => `<rect x="82" y="124" width="20" height="14" rx="2" fill="#8B5E34"/><path d="M82 128 Q92 118 102 128 Z" fill="#A97C4F"/><rect x="90" y="127" width="4" height="5" fill="${GOLD}"/><circle cx="87" cy="133" r="1.4" fill="#FFFFFF"/><circle cx="97" cy="133" r="1.4" fill="#FFFFFF"/><circle cx="87" cy="133" r=".7" fill="#111111"/><circle cx="97" cy="133" r=".7" fill="#111111"/>`;
  const seaStar = () => `<path d="M30 122 l3 6.5 l7 .8 l-5.2 4.8 l1.4 7 l-6.2 -3.5 l-6.2 3.5 l1.4 -7 l-5.2 -4.8 l7 -.8z" fill="#F28C28"/><circle cx="28.5" cy="131" r=".8" fill="#111111"/><circle cx="31.5" cy="131" r=".8" fill="#111111"/>`;

  const C = { black: '#1F1B1E', navy: '#1F2E55', crimson: '#9E2A2B', forest: '#2D5A3D', plum: '#5B2A5E', red: '#C0392B', blue: '#2F6FA3',
    green: '#3D8B5C', purple: '#6E46A8', white: '#F4F1EA', orange: '#E08A2E', brown: '#6B4226', teal: '#1F7A7A', burgundy: '#6E1F35', gold: '#E3B341' };

  // ---------- the collection ----------
  // Hats
  [['navy', 'Navy'], ['crimson', 'Crimson'], ['forest', 'Forest'], ['plum', 'Plum']].forEach(([k, n]) => add('tricorne-' + k, n + ' tricorne', 'head', 45, tricorne(C[k], GOLD)));
  add('tricorne-gold', 'Golden tricorne', 'head', 140, tricorne(C.gold, '#FFF1C2'), true);
  [['red', 'Red'], ['blue', 'Blue'], ['green', 'Green'], ['purple', 'Purple'], ['black', 'Black'], ['white', 'White'], ['orange', 'Orange']].forEach(([k, n]) => add('bandana-' + k, n + ' bandana', 'head', 30, bandana(C[k])));
  [['navy', 'Navy', '#F4F1EA'], ['black', 'Black', '#C0392B'], ['white', 'White', '#2F6FA3']].forEach(([k, n, p]) => add('bicorne-' + k, n + ' admiral hat', 'head', 55, bicorne(C[k], p)));
  add('bicorne-gold', 'Golden admiral hat', 'head', 150, bicorne(C.gold, '#F4F1EA'), true);
  [['brown', 'Brown', '#E8C547'], ['teal', 'Teal', '#F4F1EA'], ['burgundy', 'Burgundy', '#E8C547']].forEach(([k, n, f]) => add('brim-' + k, n + ' feathered hat', 'head', 50, brimHat(C[k], f)));
  add('brim-gold', 'Golden feathered hat', 'head', 140, brimHat(C.gold, '#C0392B'), true);

  // Face
  [['red', 'Red'], ['brown', 'Leather']].forEach(([k, n]) => add('patch-' + k, n + ' eye patch', 'face', 35, patch(C[k])));
  add('patch-gold', 'Gold-rim eye patch', 'face', 120, patch('#1F1B1E') + `<ellipse cx="68" cy="43" rx="6" ry="5.5" fill="none" stroke="${GOLD}" stroke-width="1.5"/>`, true);
  [['black', 'Black', '#2A211E'], ['brown', 'Brown', '#6B4226'], ['ginger', 'Ginger', '#C0652B'], ['grey', 'Grey', '#9AA0A6']].forEach(([k, n, c]) => add('beard-' + k, n + ' beard', 'face', 40, beard(c)));
  add('beard-braid', 'Braided beard', 'face', 60, braidBeard('#6B4226'));
  [['black', 'Black', '#2A211E', false], ['brown', 'Brown', '#6B4226', false], ['ginger', 'Ginger', '#C0652B', false], ['curly', 'Curly', '#2A211E', true]].forEach(([k, n, c, curl]) => add('mustache-' + k, n + ' mustache', 'face', 30, mustache(c, curl)));
  add('monocle-silver', 'Silver monocle', 'face', 45, monocle('#C9D6E8'));
  add('monocle-gold', 'Gold monocle', 'face', 120, monocle(GOLD), true);

  // Neck
  [['red', 'Red'], ['blue', 'Blue'], ['gold', 'Gold'], ['green', 'Green']].forEach(([k, n]) => add('sash-' + k, n + ' neck sash', 'neck', 30, sash(C[k])));
  add('coins-silver', 'Silver coin chain', 'neck', 40, coinChain('#C9D6E8'));
  add('coins-gold', 'Gold coin chain', 'neck', 120, coinChain(GOLD), true);
  add('compass-brass', 'Brass compass pendant', 'neck', 45, compassPendant('#B8891F'));
  add('compass-silver', 'Silver compass pendant', 'neck', 45, compassPendant('#9AA4B2'));
  add('jabot-white', 'White frilly collar', 'neck', 35, jabot('#F4F1EA'));
  add('jabot-cream', 'Cream frilly collar', 'neck', 35, jabot('#EADBB8'));
  add('pearls', 'Pearl necklace', 'neck', 55, pearls());

  // Outfits
  [['red', 'Red'], ['navy', 'Navy'], ['black', 'Black'], ['forest', 'Green'], ['plum', 'Purple']].forEach(([k, n]) => add('coat-' + k, n + ' captain coat', 'outfit', 60, coat(C[k], GOLD)));
  add('coat-royal', 'Royal white coat', 'outfit', 150, coat('#F4F1EA', GOLD), true);
  [['blue', 'Blue'], ['red', 'Red'], ['black', 'Black']].forEach(([k, n]) => add('sailor-' + k, n + ' striped shirt', 'outfit', 35, sailor(C[k])));
  [['brown', 'Brown'], ['black', 'Black'], ['teal', 'Teal']].forEach(([k, n]) => add('vest-' + k, n + ' vest', 'outfit', 35, vest(C[k])));

  // Back
  [['red', 'Red'], ['black', 'Black'], ['navy', 'Navy']].forEach(([k, n]) => add('cape-' + k, n + ' cape', 'back', 50, cape(C[k])));
  [['black', 'Black'], ['red', 'Red'], ['blue', 'Blue'], ['green', 'Green']].forEach(([k, n]) => add('flag-' + k, n + ' ship flag', 'back', 45, flag(C[k])));
  add('barrel', 'Barrel backpack', 'back', 40, barrel());
  add('sack', 'Treasure sack', 'back', 45, sack());
  add('wheel', "Ship's wheel", 'back', 70, wheel());

  // Gear (hand)
  add('cutlass-silver', 'Silver cutlass', 'hand', 55, cutlass('#C9D6E8'));
  add('cutlass-gold', 'Golden cutlass', 'hand', 140, cutlass(GOLD), true);
  add('spyglass-brass', 'Brass spyglass', 'hand', 45, spyglass('#B8891F'));
  add('spyglass-silver', 'Silver spyglass', 'hand', 45, spyglass('#9AA4B2'));
  add('map', 'Treasure map', 'hand', 35, mapScroll());
  add('compass', 'Hand compass', 'hand', 40, compassHand());
  add('lantern-green', 'Sea-glass lantern', 'hand', 40, lantern('#5FC9A0'));
  add('lantern-red', 'Signal lantern', 'hand', 40, lantern('#E5484D'));
  add('pouch', 'Coin pouch', 'hand', 35, pouch());
  add('key', 'Golden key', 'hand', 50, key());
  add('bottle', 'Message in a bottle', 'hand', 40, bottle());
  add('anchor', 'Little anchor', 'hand', 35, anchor());
  add('oar', 'Rowing oar', 'hand', 30, oar());
  add('handflag', 'Crew pennant', 'hand', 25, handFlag('#C0392B'));

  // Boots
  [['black', 'Black'], ['brown', 'Brown'], ['red', 'Red']].forEach(([k, n]) => add('boots-' + k, n + ' boots', 'feet', 35, boots(C[k], false)));
  add('boots-gold', 'Gold-buckle boots', 'feet', 120, boots('#1F1B1E', true), true);

  // Buddies
  add('parrot-blue', 'Blue parrot', 'pet', 80, parrot('#2F6FA3', '#F2C94C', '#1F4F7A'));
  add('parrot-yellow', 'Sunny parrot', 'pet', 80, parrot('#F2C94C', '#E08A2E', '#3D8B5C'));
  add('parrot-rainbow', 'Rainbow parrot', 'pet', 150, parrot('#8456C2', '#E5484D', '#2DE2E6'), true);
  add('monkey', 'Ship monkey', 'pet', 90, monkey());
  add('crab-red', 'Red crab', 'pet', 60, crab('#D9483B'));
  add('crab-blue', 'Blue crab', 'pet', 60, crab('#3D7BC4'));
  add('octopus-purple', 'Purple octopus', 'pet', 85, octopus('#8456C2'));
  add('octopus-pink', 'Pink octopus', 'pet', 85, octopus('#E07AA8'));
  add('gull', 'Seagull', 'pet', 60, gull());
  add('turtle', 'Sea turtle', 'pet', 70, turtle());
  add('chest', 'Treasure-chest buddy', 'pet', 100, chest());
  add('seastar', 'Sea star', 'pet', 50, seaStar());
})();
