// ============================================================
//  AVATAR: a dress-up character drawn as layers, like stickers.
//  Each choice is just a number (for example hairStyle: 2).
//  To add a new option, add it to the list AND draw it below.
// ============================================================

const AVATAR_PARTS = [
  { key: 'skin',      label: 'Skin',        options: ['#F7D7BC', '#E2AD84', '#B77A52', '#7A4B30'] },
  { key: 'hairStyle', label: 'Hair style',  options: ['Short', 'Long', 'Curly', 'Bun'] },
  { key: 'hairColor', label: 'Hair colour', options: ['#2A211E', '#6B4226', '#D6A24A', '#B2457A'] },
  { key: 'eyes',      label: 'Eyes',        options: ['Dots', 'Happy', 'Big'] },
  { key: 'mouth',     label: 'Mouth',       options: ['Smile', 'Grin', 'Calm'] },
  { key: 'top',       label: 'Top',         options: ['T-shirt', 'Hoodie', 'Stripes'] },
  { key: 'topColor',  label: 'Top colour',  options: ['#2F6FA3', '#3D8B5C', '#E08A2E', '#8456C2'] },
  { key: 'bottom',    label: 'Bottom',      options: ['Jeans', 'Shorts', 'Skirt'] },
  { key: 'shoes',     label: 'Shoes',       options: ['#26282C', '#F1F1EE', '#C9433A'] },
  { key: 'accessory', label: 'Extra',       options: ['None', 'Glasses', 'Cap', 'Headphones'] }
];

function pick(part, a) {
  const p = AVATAR_PARTS.find(x => x.key === part);
  const i = Math.min(Math.max(a[part] || 0, 0), p.options.length - 1);
  return p.options[i];
}

// Returns an <svg> string of the character
function avatarSVG(a, size) {
  a = Object.assign({}, window.DEFAULT_AVATAR, a || {});
  const skin = pick('skin', a), hair = pick('hairColor', a), top = pick('topColor', a), shoe = pick('shoes', a);
  const ink = '#2A211E';
  let s = '';
  // Special items from the Rewards shop (see rewards.js)
  const sp = a.special || {};
  const art = id => (id && window.ITEM_ART && window.ITEM_ART[id]) || '';

  // Things worn on the back go behind everything
  s += art(sp.back);

  // Long hair goes BEHIND the head
  if (a.hairStyle === 1) s += `<path d="M35 42 Q35 22 60 20 Q85 22 85 42 L87 86 Q72 80 60 82 Q48 80 33 86 Z" fill="${hair}"/>`;

  // Bottom (legs)
  if (a.bottom === 0) { // jeans
    s += `<rect x="45" y="104" width="13" height="32" rx="3" fill="#3D5B8C"/><rect x="62" y="104" width="13" height="32" rx="3" fill="#3D5B8C"/>`;
  } else if (a.bottom === 1) { // shorts
    s += `<rect x="47" y="116" width="9" height="20" fill="${skin}"/><rect x="64" y="116" width="9" height="20" fill="${skin}"/>`;
    s += `<rect x="44" y="102" width="32" height="16" rx="3" fill="#5C6B54"/>`;
  } else { // skirt
    s += `<rect x="48" y="116" width="8" height="20" fill="${skin}"/><rect x="64" y="116" width="8" height="20" fill="${skin}"/>`;
    s += `<path d="M44 102 L76 102 L82 122 L38 122 Z" fill="#7A3E5E"/>`;
  }
  // Shoes
  s += `<ellipse cx="50" cy="138" rx="9" ry="5" fill="${shoe}" stroke="#00000022"/><ellipse cx="70" cy="138" rx="9" ry="5" fill="${shoe}" stroke="#00000022"/>`;
  s += art(sp.feet);   // boots from the shop go over the shoes

  // Arms
  s += `<rect x="28" y="76" width="10" height="30" rx="5" fill="${skin}"/><rect x="82" y="76" width="10" height="30" rx="5" fill="${skin}"/>`;
  // Neck
  s += `<rect x="54" y="58" width="12" height="16" fill="${skin}"/>`;

  // Top
  if (a.top === 1) { // hoodie: long sleeves + hood
    s += `<path d="M44 66 Q60 58 76 66 L76 74 L44 74 Z" fill="${top}" opacity="0.8"/>`;
    s += `<rect x="27" y="74" width="12" height="28" rx="6" fill="${top}"/><rect x="81" y="74" width="12" height="28" rx="6" fill="${top}"/>`;
  } else {
    s += `<rect x="27" y="74" width="12" height="12" rx="5" fill="${top}"/><rect x="81" y="74" width="12" height="12" rx="5" fill="${top}"/>`;
  }
  s += `<path d="M38 74 Q60 66 82 74 L80 106 L40 106 Z" fill="${top}"/>`;
  if (a.top === 2) { // stripes
    s += `<g stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="3"><line x1="40" y1="84" x2="80" y2="84"/><line x1="40" y1="94" x2="80" y2="94"/></g>`;
  }
  if (a.top === 1) s += `<line x1="56" y1="76" x2="55" y2="86" stroke="#FFFFFF" stroke-width="1.5"/><line x1="64" y1="76" x2="65" y2="86" stroke="#FFFFFF" stroke-width="1.5"/>`;
  s += art(sp.outfit); // coats and shirts from the shop go over the top

  // Head
  s += `<circle cx="60" cy="42" r="22" fill="${skin}"/>`;
  s += `<circle cx="47" cy="50" r="3.5" fill="#E8836F" opacity="0.35"/><circle cx="73" cy="50" r="3.5" fill="#E8836F" opacity="0.35"/>`;

  // Hair (front)
  if (a.hairStyle === 0 || a.hairStyle === 1) {
    s += `<path d="M37 44 Q36 19 60 18 Q84 19 83 44 Q76 30 62 31 Q48 30 37 44 Z" fill="${hair}"/>`;
  } else if (a.hairStyle === 2) { // curly
    [[42,30],[50,22],[60,19],[70,22],[78,30],[38,40],[82,40]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="8" fill="${hair}"/>`; });
  } else { // bun
    s += `<circle cx="60" cy="15" r="9" fill="${hair}"/>`;
    s += `<path d="M38 40 Q38 20 60 20 Q82 20 82 40 Q72 28 60 28 Q48 28 38 40 Z" fill="${hair}"/>`;
  }

  // Eyes
  if (a.eyes === 0) s += `<circle cx="52" cy="43" r="2.6" fill="${ink}"/><circle cx="68" cy="43" r="2.6" fill="${ink}"/>`;
  if (a.eyes === 1) s += `<path d="M48 44 Q52 39 56 44 M64 44 Q68 39 72 44" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  if (a.eyes === 2) s += `<circle cx="52" cy="43" r="4.5" fill="#FFFFFF"/><circle cx="68" cy="43" r="4.5" fill="#FFFFFF"/><circle cx="53" cy="44" r="2.4" fill="${ink}"/><circle cx="69" cy="44" r="2.4" fill="${ink}"/>`;

  // Mouth
  if (a.mouth === 0) s += `<path d="M54 52 Q60 57 66 52" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  if (a.mouth === 1) s += `<path d="M53 51 Q60 61 67 51 Z" fill="${ink}"/><path d="M55 52 L65 52 L64 54 L56 54 Z" fill="#FFFFFF"/>`;
  if (a.mouth === 2) s += `<line x1="55" y1="54" x2="65" y2="54" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;

  // Accessories
  if (a.accessory === 1) s += `<g fill="none" stroke="${ink}" stroke-width="1.8"><circle cx="52" cy="43" r="6"/><circle cx="68" cy="43" r="6"/><line x1="58" y1="43" x2="62" y2="43"/></g>`;
  if (a.accessory === 2 && !sp.head) s += `<path d="M36 34 Q38 16 60 16 Q82 16 84 34 Z" fill="#C9433A"/><path d="M60 34 L94 34 Q92 39 84 38 L60 38 Z" fill="#A8352E"/>`;
  if (a.accessory === 3 && !sp.head) s += `<path d="M36 44 Q36 14 60 14 Q84 14 84 44" stroke="${ink}" stroke-width="3.5" fill="none"/><rect x="31" y="38" width="9" height="14" rx="4" fill="${ink}"/><rect x="80" y="38" width="9" height="14" rx="4" fill="${ink}"/>`;

  // Special items on top: neck, face, head, something in the hand, then a buddy
  s += art(sp.neck) + art(sp.face) + art(sp.head) + art(sp.hand) + art(sp.pet);

  return `<svg viewBox="16 6 88 140" width="${size}" height="${Math.round(size * 140 / 88)}" role="img" aria-label="Avatar" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// Small round head-and-shoulders version for the header and lists
function avatarBadge(a, size) {
  const full = avatarSVG(a, size);
  return `<span class="avatar-badge" style="width:${size}px;height:${size}px">${full.replace('viewBox="16 6 88 140"', 'viewBox="30 8 60 60"').replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}</span>`;
}

window.AVATAR_PARTS = AVATAR_PARTS;
window.avatarSVG = avatarSVG;
window.avatarBadge = avatarBadge;
