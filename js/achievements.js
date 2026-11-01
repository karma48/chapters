// ============================================================
//  ACHIEVEMENTS: badges that unlock by themselves when you hit
//  a milestone. Each gives bonus points by tier.
//
//  Each achievement has:
//    id, name, desc   what it's called and how to get it
//    tier             bronze / silver / gold (sets the points)
//    icon             picture inside the badge (see ICONS below)
//    who              'reader' (everyone) or 'author' (authors only)
//    secret           true = shows as ??? until unlocked
//    stat, goal       which number to check, and the target
//
//  To add one: add a line to the list. If it needs a new number,
//  add it to achievementStats() too.
// ============================================================

const TIER_POINTS = { bronze: 10, silver: 25, gold: 50 };
const TIER_COLORS = { bronze: '#D9935A', silver: '#C9D6E8', gold: '#F2C94C' };

const ACHIEVEMENTS = [
  { id: 'first-page', name: 'First Page', desc: 'Read your first chapter', tier: 'bronze', icon: 'book', stat: 'chapters', goal: 1 },
  { id: 'bookworm-1', name: 'Bookworm I', desc: 'Read 5 chapters', tier: 'bronze', icon: 'book', stat: 'chapters', goal: 5 },
  { id: 'bookworm-2', name: 'Bookworm II', desc: 'Read 25 chapters', tier: 'silver', icon: 'book', stat: 'chapters', goal: 25 },
  { id: 'bookworm-3', name: 'Bookworm III', desc: 'Read 100 chapters', tier: 'gold', icon: 'book', stat: 'chapters', goal: 100 },
  { id: 'finisher', name: 'Finisher', desc: 'Finish your first book', tier: 'bronze', icon: 'check', stat: 'finished', goal: 1 },
  { id: 'collector', name: 'Collector', desc: 'Finish 5 books', tier: 'silver', icon: 'check', stat: 'finished', goal: 5 },
  { id: 'explorer', name: 'Explorer', desc: 'Read books by 3 different authors', tier: 'silver', icon: 'compass', stat: 'authors', goal: 3 },
  { id: 'marathon', name: 'Marathon', desc: 'Read for 1 hour in total', tier: 'bronze', icon: 'clock', stat: 'minutes', goal: 60 },
  { id: 'deep-diver', name: 'Deep Diver', desc: 'Spend 3 hours on one book', tier: 'silver', icon: 'clock', stat: 'bookMinutes', goal: 180 },
  { id: 'streak-3', name: 'On a Roll', desc: 'Read 3 days in a row', tier: 'bronze', icon: 'flame', stat: 'streak', goal: 3 },
  { id: 'streak-7', name: 'Unstoppable', desc: 'Read 7 days in a row', tier: 'silver', icon: 'flame', stat: 'streak', goal: 7 },
  { id: 'streak-30', name: 'Legend', desc: 'Read 30 days in a row', tier: 'gold', icon: 'flame', stat: 'streak', goal: 30 },
  { id: 'fashionista', name: 'Fashionista', desc: 'Unlock 5 reward items', tier: 'bronze', icon: 'gem', stat: 'items', goal: 5 },
  { id: 'drop-hunter', name: 'Drop Hunter', desc: 'Unlock a Monthly Drop item', tier: 'silver', icon: 'star', stat: 'dropItems', goal: 1 },
  { id: 'crew-collector', name: 'Crew Collector', desc: 'Unlock 10 items from one Monthly Drop', tier: 'gold', icon: 'star', stat: 'bestDropSet', goal: 10 },
  { id: 'night-owl', name: 'Night Owl', desc: 'Read after 10 pm', tier: 'bronze', icon: 'moon', stat: 'night', goal: 1, secret: true },
  { id: 'early-bird', name: 'Early Bird', desc: 'Read before 7 am', tier: 'bronze', icon: 'sun', stat: 'early', goal: 1, secret: true },

  { id: 'first-draft', name: 'First Draft', desc: 'Publish your first book', tier: 'bronze', icon: 'quill', stat: 'published', goal: 1, who: 'author' },
  { id: 'storyteller', name: 'Storyteller', desc: 'Have 10 chapters ready across your books', tier: 'silver', icon: 'quill', stat: 'readyChapters', goal: 10, who: 'author' },
  { id: 'fan-club', name: 'Fan Club', desc: 'Get 5 readers on one of your books', tier: 'silver', icon: 'people', stat: 'fans', goal: 5, who: 'author' },
  { id: 'page-turner', name: 'Page Turner', desc: 'Readers spend 5 hours on your books', tier: 'gold', icon: 'clock', stat: 'readerMinutes', goal: 300, who: 'author' }
];

// The longest run of days in a row (so a streak badge stays earned)
function bestStreak(days) {
  const sorted = Array.from(new Set(days || [])).sort();
  let best = 0, run = 0, prev = null;
  sorted.forEach(d => {
    const t = Date.parse(d + 'T12:00:00');
    run = prev !== null && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  });
  return best;
}

// All the numbers achievements check, worked out from saved data
function achievementStats(ctx) {
  const prog = Object.values(ctx.progress || {});
  const books = ctx.books || [];
  const byId = {};
  books.forEach(b => { byId[b.id] = b; });
  const authors = new Set();
  let finished = 0;
  prog.forEach(p => {
    const b = byId[p.bookId];
    const done = (p.chaptersDone || []).length;
    if (b && done > 0) authors.add(b.authorId);
    if (b && b.readyChapters > 0 && done >= b.readyChapters) finished++;
  });
  const flags = (ctx.me && ctx.me.flags) || [];
  const myBooks = ctx.myBooks || [];
  const mineIds = new Set(myBooks.map(b => b.id));
  const readerProg = (ctx.allProgress || []).filter(p => mineIds.has(p.bookId) && p.readerId !== (ctx.me && ctx.me.id));
  const fans = {};
  readerProg.forEach(p => { fans[p.bookId] = (fans[p.bookId] || 0) + 1; });
  return {
    chapters: prog.reduce((n, p) => n + (p.chaptersDone || []).length, 0),
    finished,
    authors: authors.size,
    minutes: Math.floor(prog.reduce((n, p) => n + (p.seconds || 0), 0) / 60),
    bookMinutes: Math.floor(prog.reduce((m, p) => Math.max(m, p.seconds || 0), 0) / 60),
    streak: bestStreak(ctx.me && ctx.me.readDays),
    items: (ctx.owned || []).length,
    dropItems: (ctx.owned || []).filter(id => id.startsWith('drop-')).length,
    bestDropSet: Object.values((ctx.owned || []).filter(id => id.startsWith('drop-')).reduce((m, id) => {
      const key = id.split('-').slice(1, 3).join('-'); m[key] = (m[key] || 0) + 1; return m; }, {})).reduce((a, b) => Math.max(a, b), 0),
    night: flags.includes('night') ? 1 : 0,
    early: flags.includes('early') ? 1 : 0,
    published: myBooks.filter(b => b.status === 'published').length,
    readyChapters: myBooks.reduce((n, b) => n + (b.readyChapters || 0), 0),
    fans: Object.values(fans).reduce((m, n) => Math.max(m, n), 0),
    readerMinutes: Math.floor(readerProg.reduce((n, p) => n + (p.seconds || 0), 0) / 60)
  };
}

function achievementsFor(isAuthorUser) {
  return ACHIEVEMENTS.filter(a => a.who !== 'author' || isAuthorUser);
}
function achievementPoints(ids) {
  return (ids || []).reduce((n, id) => {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    return n + (a ? TIER_POINTS[a.tier] : 0);
  }, 0);
}

// ------------------------------------------------------------
//  Badge pictures: a hexagon in the tier colour with an icon
// ------------------------------------------------------------
const ICONS = {
  book: '<path d="M-8 -6 h6 q2 0 2 2 v11 q0 -2 -2 -2 h-6z M8 -6 h-6 q-2 0 -2 2 v11 q0 -2 2 -2 h6z"/>',
  check: '<path d="M-7 0 l5 5 l9 -10"/>',
  compass: '<circle r="8"/><path d="M0 -5 l2.5 5 l-2.5 5 l-2.5 -5z" fill="currentColor"/>',
  clock: '<circle r="8"/><path d="M0 -5 v5 l4 3"/>',
  flame: '<path d="M0 -9 C5 -4 7 0 5 4 C3 8 -3 8 -5 4 C-7 0 -3 -3 0 -9z M0 1 C2 3 2 5 0 6 C-2 5 -2 3 0 1z"/>',
  gem: '<path d="M-8 -3 l4 -5 h8 l4 5 l-8 10z M-8 -3 h16"/>',
  star: '<path d="M0 -9 l2.6 5.6 l6 .7 l-4.5 4.1 l1.2 6 l-5.3 -3 l-5.3 3 l1.2 -6 l-4.5 -4.1 l6 -.7z"/>',
  moon: '<path d="M3 -8 A8 8 0 1 0 8 4 A6.5 6.5 0 0 1 3 -8z"/>',
  sun: '<circle r="3.5"/><path d="M0 -9 v2.5 M0 6.5 v2.5 M-9 0 h2.5 M6.5 0 h2.5 M-6.4 -6.4 l1.8 1.8 M4.6 4.6 l1.8 1.8 M-6.4 6.4 l1.8 -1.8 M4.6 -4.6 l1.8 -1.8"/>',
  quill: '<path d="M-7 8 L6 -6 M6 -6 C9 -9 9 -3 4 0 C1 2 -2 2 -3 3"/>',
  people: '<circle cx="-4" cy="-3" r="3"/><circle cx="5" cy="-2" r="2.5"/><path d="M-10 7 q6 -8 12 0 M2 7 q4 -6 8 0"/>',
  lock: '<rect x="-6" y="-1" width="12" height="9" rx="1.5"/><path d="M-3.5 -1 v-3 a3.5 3.5 0 0 1 7 0 v3"/>'
};

function achievementBadge(a, size, unlocked) {
  const color = unlocked ? TIER_COLORS[a.tier] : 'currentColor';
  const icon = unlocked || !a.secret ? ICONS[a.icon] : ICONS.lock;
  return `<svg viewBox="0 0 40 44" width="${size}" height="${Math.round(size * 1.1)}" aria-hidden="true" style="color:${color}" class="ach-svg ${unlocked ? 'on' : 'off'}">
    <polygon points="20,2 38,12 38,32 20,42 2,32 2,12" fill="currentColor" fill-opacity="${unlocked ? '.16' : '.05'}" stroke="currentColor" stroke-width="1.6"/>
    <polygon points="20,7 33.5,14.5 33.5,29.5 20,37 6.5,29.5 6.5,14.5" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-width="1"/>
    <g transform="translate(20 22) scale(.9)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</g></svg>`;
}

Object.assign(window, {
  TIER_POINTS, TIER_COLORS, ACHIEVEMENTS, bestStreak, achievementStats,
  achievementsFor, achievementPoints, achievementBadge
});
