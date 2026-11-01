// ============================================================
//  SEARCH: finds books, authors and chapters.
//
//  It searches in your browser (Firebase has no full-text
//  search on the free plan), over every published book and
//  every Ready chapter.
//
//  What it understands:
//    lighthouse map        books/chapters with BOTH words
//    lighthuose            small typos still match
//    light                 the start of a word matches too
//    "sleeping cat"        an exact phrase
//    author:meera          only books by that author (also by:meera)
//
//  Ranking: title > author > chapter title > description > text.
// ============================================================

const SEARCH_WEIGHTS = { title: 10, author: 7, chapterTitle: 6, description: 3, text: 1.5 };

// lowercase, remove accents and punctuation: "Kéeper's!" -> "keepers"
function normalizeText(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '').replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function wordsOf(s) { return normalizeText(s).split(' ').filter(Boolean); }

// how many single-letter changes turn a into b (stops early past max)
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let prev2 = null;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // letters swapped ("teh" -> "the") count as one change
      if (prev2 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}
function typoAllowance(term) { return term.length >= 8 ? 2 : term.length >= 4 ? 1 : 0; }

// How well one search word matches one word list. Returns { score, word }
function matchTerm(term, wordSet) {
  let best = { score: 0, word: null };
  if (wordSet.has(term)) return { score: 1, word: term };
  const allow = typoAllowance(term);
  for (const w of wordSet) {
    let sc = 0;
    if (term.length >= 2 && w.startsWith(term)) sc = 0.8;
    else if (term.length >= 4 && w.includes(term)) sc = 0.5;
    else if (allow && editDistance(term, w, allow) <= allow) sc = 0.45;
    // typo while still typing: "keepr" -> "keepers"
    else if (allow && w.length > term.length && editDistance(term, w.slice(0, term.length), 1) <= 1) sc = 0.35;
    if (sc > best.score) { best = { score: sc, word: w }; if (sc >= 0.8) break; }
  }
  return best;
}

// Pull out author:… and "phrases" from what was typed
function parseQuery(q) {
  let rest = String(q || '');
  const phrases = [];
  let author = '';
  rest = rest.replace(/"([^"]+)"/g, (_, p) => { const n = normalizeText(p); if (n) phrases.push(n); return ' '; });
  rest = rest.replace(/\b(?:author|by):\s*("[^"]*"|\S+)/gi, (_, a) => { author = normalizeText(a.replace(/"/g, '')); return ' '; });
  const terms = Array.from(new Set(wordsOf(rest)));
  return { terms, phrases, author, empty: !terms.length && !phrases.length && !author };
}

// Build a searchable copy of the library
function buildSearchIndex(books, chaptersByBook) {
  const field = s => ({ raw: s || '', norm: normalizeText(s), words: new Set(wordsOf(s)) });
  const vocab = new Map();      // words used for "did you mean"
  const allWords = new Set();    // every word anywhere, for fast matching
  const addVocab = set => set.forEach(w => { allWords.add(w); if (w.length > 2) vocab.set(w, (vocab.get(w) || 0) + 1); });
  const bookDocs = books.map(b => {
    const d = { book: b, title: field(b.title), author: field(b.authorName), description: field(b.description) };
    addVocab(d.title.words); addVocab(d.author.words); addVocab(d.description.words);
    return d;
  });
  const chapterDocs = [];
  books.forEach(b => (chaptersByBook[b.id] || []).forEach(c => {
    const d = { book: b, chapter: c, chapterTitle: field(c.title), text: field(c.text), title: field(b.title), author: field(b.authorName) };
    addVocab(d.chapterTitle.words); addVocab(d.text.words);
    chapterDocs.push(d);
  }));
  const authors = {};
  books.forEach(b => {
    const key = b.authorId || b.authorName;
    authors[key] = authors[key] || { id: key, name: b.authorName, books: [] };
    authors[key].books.push(b);
  });
  books.forEach(b => wordsOf(b.authorName).forEach(w => allWords.add(w)));
  return {
    bookDocs, chapterDocs, vocab, allWords,
    authorDocs: Object.values(authors).map(a => ({ ...a, nameF: field(a.name) })),
    chapterCount: chapterDocs.length
  };
}

// Find every word in the library that a search word matches, ONCE per
// search (instead of once per chapter). This keeps big libraries fast.
function expandTerm(term, allWords) {
  const out = [];
  const allow = typoAllowance(term);
  for (const w of allWords) {
    let sc = 0;
    if (w === term) sc = 1;
    else if (term.length >= 2 && w.startsWith(term)) sc = 0.8;
    else if (term.length >= 4 && w.includes(term)) sc = 0.5;
    else if (allow && Math.abs(w.length - term.length) <= allow && editDistance(term, w, allow) <= allow) sc = 0.45;
    else if (allow && w.length > term.length && editDistance(term, w.slice(0, term.length), 1) <= 1) sc = 0.35;
    if (sc) out.push([w, sc]);
  }
  return out.sort((a, b) => b[1] - a[1]);
}

// Score one document. fields = [[fieldObj, weight], ...]
function scoreDoc(q, fields) {
  let total = 0;
  const hits = new Set();
  for (const term of q.terms) {
    const options = (q.expanded && q.expanded[term]) || null;
    let best = 0;
    for (const [f, w] of fields) {
      if (options) {
        for (const [word, sc] of options) {
          if (sc * w <= best) break;            // sorted best-first: nothing better left
          if (f.words.has(word)) { best = sc * w; hits.add(word); break; }
        }
      } else {
        const m = matchTerm(term, f.words);
        if (m.score && m.score * w > best) best = m.score * w;
        if (m.word) hits.add(m.word);
      }
    }
    if (!best) return null;          // every word must match somewhere
    total += best;
  }
  for (const p of q.phrases) {
    let found = 0;
    for (const [f, w] of fields) if (f.norm.includes(p)) { found = Math.max(found, w * 1.5); p.split(' ').forEach(x => hits.add(x)); }
    if (!found) return null;
    total += found;
  }
  return { score: total, hits: Array.from(hits) };
}

function runSearch(index, query, opts) {
  opts = opts || {};
  const q = parseQuery(query);
  const authorOk = b => !q.author || normalizeText(b.authorName).includes(q.author);
  const statusOk = b => !opts.statusOf || !opts.status || opts.status === 'any' || opts.statusOf(b) === opts.status;
  const out = { query: q, books: [], authors: [], chapters: [], suggestion: null };
  if (q.empty) return out;
  if (index.allWords) {
    q.expanded = {};
    q.terms.forEach(t => { q.expanded[t] = expandTerm(t, index.allWords); });
  }
  const W = SEARCH_WEIGHTS;
  const onlyAuthor = !q.terms.length && !q.phrases.length;

  // Books
  index.bookDocs.forEach(d => {
    if (!authorOk(d.book) || !statusOk(d.book)) return;
    const r = onlyAuthor ? { score: 1, hits: [] } : scoreDoc(q, [[d.title, W.title], [d.author, W.author], [d.description, W.description]]);
    if (r) out.books.push({ book: d.book, score: r.score, hits: r.hits });
  });

  // Chapters (skip when only filtering by author)
  if (!onlyAuthor) {
    index.chapterDocs.forEach(d => {
      if (!authorOk(d.book) || !statusOk(d.book)) return;
      const r = scoreDoc(q, [[d.chapterTitle, W.chapterTitle], [d.text, W.text], [d.title, 1], [d.author, 1]]);
      // the chapter itself must contain at least one of the words
      const own = r && (r.hits.some(h => d.chapterTitle.words.has(h) || d.text.words.has(h))
        || q.phrases.some(ph => d.chapterTitle.norm.includes(ph) || d.text.norm.includes(ph)));
      if (r && own) out.chapters.push({ book: d.book, chapter: d.chapter, score: r.score, hits: r.hits });
    });
    // books whose chapters match get a small boost / are added
    const perBook = {};
    out.chapters.forEach(c => { perBook[c.book.id] = (perBook[c.book.id] || 0) + 1; });
    out.books.forEach(b => { b.chapterHits = perBook[b.book.id] || 0; b.score += Math.min(b.chapterHits, 5) * 0.5; });
    Object.keys(perBook).forEach(id => {
      if (!out.books.some(b => b.book.id === id)) {
        const c = out.chapters.find(x => x.book.id === id);
        out.books.push({ book: c.book, score: 1 + perBook[id] * 0.5, hits: [], chapterHits: perBook[id], viaChapters: true });
      }
    });
  }

  // Authors
  index.authorDocs.forEach(a => {
    if (q.author) { if (normalizeText(a.name).includes(q.author)) out.authors.push({ author: a, score: 10 }); return; }
    const r = q.terms.length ? scoreDoc({ terms: q.terms, phrases: [] }, [[a.nameF, 1]]) : null;
    if (r) out.authors.push({ author: a, score: r.score });
  });

  const sorters = {
    relevance: (a, b) => b.score - a.score,
    newest: (a, b) => (b.book.updatedAt || 0) - (a.book.updatedAt || 0),
    title: (a, b) => a.book.title.localeCompare(b.book.title)
  };
  out.books.sort(sorters[opts.sort] || sorters.relevance);
  out.chapters.sort((a, b) => b.score - a.score || a.chapter.number - b.chapter.number);
  out.authors.sort((a, b) => b.score - a.score);

  // "Did you mean": for words that matched nothing anywhere
  if (!out.books.length && !out.chapters.length && q.terms.length) {
    const fixed = q.terms.map(t => {
      let best = null, bestD = 3;
      index.vocab.forEach((count, w) => {
        const d = editDistance(t, w, 2);
        if (d < bestD || (d === bestD && best && count > index.vocab.get(best))) { best = w; bestD = d; }
      });
      return bestD <= 2 ? best : t;
    });
    if (fixed.join(' ') !== q.terms.join(' ')) out.suggestion = fixed.join(' ');
  }
  return out;
}

// ---------- showing results ----------
function escHtml(t) {
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function hitRegex(words) {
  const list = (words || []).filter(w => w && w.length > 1).sort((a, b) => b.length - a.length)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return list.length ? new RegExp('(' + list.join('|') + ')', 'gi') : null;
}
// Escape text and wrap matching words in <mark>
function highlightHTML(text, words) {
  const re = hitRegex(words);
  if (!re) return escHtml(text);
  return String(text).split(re).map((part, i) => i % 2 ? `<mark>${escHtml(part)}</mark>` : escHtml(part)).join('');
}
// A short piece of the chapter around the first match
function snippetHTML(text, words, size) {
  size = size || 180;
  text = String(text || '').replace(/\s+/g, ' ').trim();
  const re = hitRegex(words);
  let at = 0;
  if (re) { const m = re.exec(text); if (m) at = m.index; }
  let start = Math.max(0, at - Math.floor(size / 3));
  if (start > 0) { const sp = text.indexOf(' ', start); if (sp > -1 && sp < at) start = sp + 1; }
  let end = Math.min(text.length, start + size);
  if (end < text.length) { const sp = text.lastIndexOf(' ', end); if (sp > at) end = sp; }
  return (start > 0 ? '… ' : '') + highlightHTML(text.slice(start, end), words) + (end < text.length ? ' …' : '');
}

Object.assign(window, {
  normalizeText, parseQuery, buildSearchIndex, runSearch, highlightHTML, snippetHTML, hitRegex, editDistance
});
