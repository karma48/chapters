// ============================================================
//  APP: screens and buttons.
//
//  Pages use the web address after # (the "hash"):
//    #library            the shared library
//    #book-ID            one book and its chapters
//    #read-ID-3          reading chapter 3 of a book
//    #write              author: my books
//    #new-book           author: create a book
//    #edit-ID            author: edit a book and its chapters
//    #readers            author: approve or remove readers
//    #avatar             dress up your avatar
// ============================================================

const COVERS = ['cover-1', 'cover-2', 'cover-3', 'cover-4', 'cover-5', 'cover-6'];

let me = null;            // the logged-in user's profile
let meKey = '';           // changes when role/status changes
let viewStops = [];       // live watchers for the current page
let globalStops = [];     // live watchers for the whole session
let myProgress = {};      // { bookId: progress }
let users = [];           // authors only: everyone's profiles
let owned = [];           // reward item ids this user has unlocked
let lastEarned = null;    // to celebrate new points
let libraryBooks = [];    // published books (for achievements)
let myBooksAll = [];      // authors: their own books
let allProgressAll = [];  // authors: everyone's progress
const unlocking = new Set();

// points = chapters + achievement bonuses (+ demo bonus) - spent
function myPoints() {
  return pointsSummary(myProgress, owned, (me.bonusPoints || 0) + achievementPoints(me.achievements));
}

const $ = sel => document.querySelector(sel);

// ---------- small helpers ----------
function esc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
function isAuthor() { return me && me.role === 'author'; }
function canRead() { return me && (me.role === 'author' || me.status === 'approved'); }

function toast(message) {
  const t = $('#toast');
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2600);
}

function errorText(e) {
  const code = (e && e.code) || '';
  if (/invalid-credential|wrong-password|user-not-found/.test(code)) return "That email and password don't match. Check them and try again.";
  if (/email-already-in-use/.test(code)) return 'That email already has an account. Log in instead.';
  if (/weak-password/.test(code)) return 'Use at least 6 characters for the password.';
  if (/invalid-email/.test(code)) return "That email address doesn't look right.";
  if (/permission-denied/.test(code)) return "You don't have permission to do that.";
  if (/too-many-requests/.test(code)) return 'Too many tries. Wait a minute, then try again.';
  if (/network-request-failed|unavailable/.test(code)) return "You're offline. Check your Wi-Fi, then try again.";
  return 'Something went wrong. Check your internet connection and try again.';
}

function stopView() { viewStops.forEach(stop => stop()); viewStops = []; }
function stopGlobal() { globalStops.forEach(stop => stop()); globalStops = []; if (typeof clearSearchCache === 'function') clearSearchCache(); }

function go(hash) {
  if (location.hash === '#' + hash) route(); else location.hash = hash;
}

function readFontSize() {
  try { return Number(localStorage.getItem('chapters-font')) || 19; } catch (e) { return 19; }
}
function saveFontSize(n) {
  try { localStorage.setItem('chapters-font', String(n)); } catch (e) { /* ignore */ }
}

// Two-tap delete (pop-up confirm boxes are not used)
function confirmTap(button, text) {
  if (button.dataset.armed) return true;
  button.dataset.armed = '1';
  const old = button.textContent;
  button.textContent = text || 'Tap again to delete';
  if (!text) button.classList.add('danger-armed');
  setTimeout(() => {
    delete button.dataset.armed;
    button.textContent = old;
    button.classList.remove('danger-armed');
  }, 3000);
  return false;
}

// ---------- pieces used on many screens ----------
function coverHTML(book, size) {
  const c = COVERS.includes(book.coverImage) ? book.coverImage : 'cover-1';
  return `<div class="cover ${c} cover-${size}" aria-hidden="true">
    <span class="cover-title">${esc(book.title)}</span>
    <span class="cover-author">${esc(book.authorName || '')}</span>
  </div>`;
}

function progressBar(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="progress" role="progressbar" aria-label="${done} of ${total}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
    <span style="width:${pct}%"></span></div>`;
}

// ---------- scheduled chapters ----------
// A chapter is out when it's Ready and its release time (if any) has passed
function isReleased(c) { return c.status === 'ready' && (!c.releaseAt || c.releaseAt <= Date.now()); }
function isScheduled(c) { return c.status === 'ready' && c.releaseAt && c.releaseAt > Date.now(); }
function fmtWhen(ms) {
  return new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
function toLocalInput(ms) {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 6e4);
  return d.toISOString().slice(0, 16);
}

function doneCount(bookId, readyNumbers) {
  const p = myProgress[bookId];
  if (!p || !p.chaptersDone) return 0;
  return readyNumbers ? p.chaptersDone.filter(n => readyNumbers.includes(n)).length : p.chaptersDone.length;
}

// ============================================================
//  LOGIN SCREEN
// ============================================================
function renderAuth(tab) {
  tab = tab || 'login';
  $('#app').innerHTML = `
  <main class="auth">
    <div class="auth-intro">
      <h1 class="brand-big">Chapters</h1>
      <p>A shared library where authors publish books chapter by chapter, and readers follow along on any device.</p>
    </div>
    <div class="auth-card">
      <div class="tabs" role="tablist">
        <button role="tab" class="tab ${tab === 'login' ? 'on' : ''}" data-action="auth-tab" data-tab="login" aria-selected="${tab === 'login'}">Log in</button>
        <button role="tab" class="tab ${tab === 'signup' ? 'on' : ''}" data-action="auth-tab" data-tab="signup" aria-selected="${tab === 'signup'}">Sign up</button>
      </div>
      ${tab === 'login' ? `
      <form data-form="login" class="stack">
        <label>Email<input id="login-email" type="email" autocomplete="email" required></label>
        <label>Password<input id="login-password" type="password" autocomplete="current-password" required></label>
        <p class="form-error" id="auth-error" hidden></p>
        <button class="btn primary" type="submit">Log in</button>
        <button class="link" type="button" data-action="forgot">Forgot password?</button>
      </form>` : `
      <form data-form="signup" class="stack">
        <label>Your name<input id="signup-name" maxlength="40" autocomplete="nickname" required></label>
        <label>Email<input id="signup-email" type="email" autocomplete="email" required></label>
        <label>Password<input id="signup-password" type="password" minlength="6" autocomplete="new-password" required>
          <small>At least 6 characters</small></label>
        <p class="form-error" id="auth-error" hidden></p>
        <button class="btn primary" type="submit">Create account</button>
        <p class="hint">New accounts are readers. An author needs to approve you before you can read.</p>
      </form>`}
    </div>

  </main>`;
}

function showAuthError(msg) {
  const el = $('#auth-error');
  if (!el) return toast(msg);
  el.textContent = msg;
  el.hidden = false;
}

// ============================================================
//  APP SHELL (header + page area)
// ============================================================
function renderShell() {
  $('#app').innerHTML = `
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="#library">Chapters</a>
      <nav class="nav" id="nav"></nav>
      <time class="hud-clock" id="hud-clock" aria-label="Current date and time"></time>
      <a class="search-btn" id="search-btn" href="#search" aria-label="Search books, authors and chapters"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 15.5 L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Search</span><kbd>/</kbd></a>
      <div class="me">
        <a href="#avatar" class="me-link" id="me-badge" aria-label="Your avatar"></a>
        <button class="btn small ghost" data-action="logout">Log out</button>
      </div>
    </div>
  </header>
  <main id="view" class="view"></main>`;
  updateHeader();
  tickClock();
}

function updateHeader() {
  const nav = $('#nav');
  if (!nav) return;
  const page = (location.hash || '#library').slice(1).split('-')[0];
  const waiting = users.filter(u => u.role === 'reader' && (u.status === 'waiting' || (u.authorRequest && u.status === 'approved'))).length;
  const link = (hash, label, extra) =>
    `<a href="#${hash}" class="${page === hash || (hash === 'write' && (page === 'edit' || page === 'new')) || (hash === 'library' && (page === 'book' || page === 'read')) ? 'on' : ''}">${label}${extra || ''}</a>`;
  nav.innerHTML = canRead()
    ? link('library', 'Library') + link('me', 'Dashboard') +
      link('rewards', 'Rewards', dropInfo().live ? ' <span class="count live-dot" title="Monthly Drop is live">!</span>' : '') +
      (isAuthor() ? link('write', 'Write') + link('readers', 'Readers', waiting ? ` <span class="count">${waiting}</span>` : '') : '')
    : '';
  const sb = $('#search-btn');
  if (sb) { sb.hidden = !canRead(); sb.classList.toggle('on', page === 'search'); }
  $('#me-badge').innerHTML = avatarBadge(me.avatar, 36) + `<span class="me-name">${esc(me.name)}</span>`;
}

// ============================================================
//  ROUTER: shows the right page for the web address
// ============================================================
function route() {
  if (!me) return;
  stopView();
  const view = $('#view');
  if (!view) return;
  window.scrollTo(0, 0);
  const hash = (location.hash || '#library').slice(1);
  const [page, ...rest] = hash.split('-');
  updateHeader();
  document.body.classList.toggle('reading', page === 'read');

  if (page === 'avatar') return viewAvatar(view);
  if (!canRead()) return viewWaiting(view);

  if (page === 'me') return viewDashboard(view);
  if (page === 'search') return viewSearch(view);
  if (page === 'rewards') return viewRewards(view);
  if (page === 'book') return viewBook(view, rest.join('-'));
  if (page === 'read') {
    const num = Number(rest.pop());
    return viewRead(view, rest.join('-'), num);
  }
  if (isAuthor()) {
    if (page === 'write') return viewWrite(view);
    if (page === 'new' && rest[0] === 'book') return viewBookForm(view, null);
    if (page === 'edit') return viewEdit(view, rest.join('-'));
    if (page === 'readers') return viewReaders(view);
  }
  return viewLibrary(view);
}

// ============================================================
//  WAITING FOR APPROVAL
// ============================================================
function viewWaiting(view) {
  const msg = me.status === 'waiting'
    ? { title: 'Waiting for approval', text: 'An author needs to approve your account before you can read. This page updates by itself as soon as they do.' }
    : me.status === 'missing'
    ? { title: "This account isn't set up", text: "Sign-up didn't finish, so there's no profile yet. Log out and sign up again with a different email, or ask an author for help." }
    : { title: "You don't have access right now", text: 'An author has not approved this account. Ask an author to approve you again.' };
  view.innerHTML = `
  <section class="narrow center stack-lg">
    <div class="waiting-avatar">${avatarSVG(me.avatar, 120)}</div>
    <h1>${msg.title}</h1>
    <p class="muted">${msg.text}</p>
    ${me.status === 'missing' ? '<button class="btn" data-action="logout">Log out</button>' : '<a class="btn" href="#avatar">Dress up your avatar while you wait</a>'}
  </section>`;
}

// ============================================================
//  LIBRARY
// ============================================================
function viewLibrary(view) {
  view.innerHTML = `
  <section class="stack-lg">
    <div class="page-head lib-head">
      <div class="stack-sm"><h1>Library</h1>
        <p class="muted">Every book published by our authors.</p></div>
      <label class="lib-search"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 15.5 L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <span class="sr-only">Search the library</span>
        <input id="lib-search" type="search" placeholder="Search books, authors, chapters…" autocomplete="off">
      </label>
    </div>
    <div id="continue"></div>
    <div id="shelf" class="shelf"><p class="muted">Loading books…</p></div>
    <div id="author-ask"></div>
  </section>`;
  drawAuthorAsk();

  let books = null;
  const draw = () => {
    if (!books || !$('#shelf')) return;
    // Continue reading: books started but not finished
    const started = books.filter(b => {
      const p = myProgress[b.id];
      return p && p.lastChapterOpened && doneCount(b.id) < (b.readyChapters || 0);
    });
    $('#continue').innerHTML = started.length ? `
      <h2 class="section-title">Continue reading</h2>
      <div class="continue-row">
        ${started.map(b => `
          <a class="continue-card" href="#read-${b.id}-${myProgress[b.id].lastChapterOpened}">
            ${coverHTML(b, 'xs')}
            <span class="stack-sm">
              <strong>${esc(b.title)}</strong>
              <span class="muted small">Chapter ${myProgress[b.id].lastChapterOpened}</span>
              ${progressBar(doneCount(b.id), b.readyChapters || 0)}
            </span>
          </a>`).join('')}
      </div>` : '';

    $('#shelf').innerHTML = books.length ? books.map(b => {
      const total = b.readyChapters || 0;
      const done = Math.min(doneCount(b.id), total);
      return `
      <a class="book-card" href="#book-${b.id}">
        ${coverHTML(b, 'md')}
        <span class="book-card-text">
          <strong class="book-card-title">${esc(b.title)}</strong>
          <span class="muted small">by ${esc(b.authorName)}</span>
          ${done ? progressBar(done, total) + `<span class="small muted">${done} of ${total} read</span>`
                 : `<span class="small muted">${plural(total, 'chapter')}</span>`}
        </span>
      </a>`;
    }).join('') : `
      <div class="empty">
        <p><strong>No books yet.</strong></p>
        <p class="muted">${isAuthor() ? 'Write one and publish it, and it will appear here for every reader.' : 'When an author publishes a book, it will appear here.'}</p>
        ${isAuthor() ? '<a class="btn primary" href="#new-book">Start a book</a>' : ''}
      </div>`;
  };
  viewStops.push(Store.watchLibrary(list => { books = list; draw(); }));
  viewStops.push(onProgressChange(draw));
}

// "Want to write?" box for readers at the bottom of the library
function drawAuthorAsk() {
  const el = $('#author-ask');
  if (!el) return;
  if (isAuthor() || !canRead()) { el.innerHTML = ''; return; }
  el.innerHTML = me.authorRequest ? `
    <div class="ask-box">
      <div class="stack-sm grow"><strong>Your author request is waiting</strong>
        <span class="muted small">An author will see it on their Readers page. You'll get a Write tab when they say yes.</span></div>
      <button class="btn ghost" data-action="request-author" data-on="0">Cancel request</button>
    </div>` : `
    <div class="ask-box">
      <div class="stack-sm grow"><strong>Want to write your own books?</strong>
        <span class="muted small">Ask to become an author. Any author can say yes.</span></div>
      <button class="btn" data-action="request-author" data-on="1">Ask to be an author</button>
    </div>`;
}

// ============================================================
//  BOOK PAGE
// ============================================================
function viewBook(view, bookId) {
  let book, chapters = [], upcoming = [];
  view.innerHTML = `<p class="muted">Loading…</p>`;

  const draw = () => {
    if (book === undefined) return;
    const mine = book && book.authorId === me.id;
    if (!book || (book.status !== 'published' && !mine)) {
      view.innerHTML = `<section class="narrow center stack"><h1>This book isn't available</h1>
        <p class="muted">It may have been unpublished by its author.</p><a class="btn" href="#library">Back to the library</a></section>`;
      return;
    }
    const numbers = chapters.map(c => c.number);
    const done = doneCount(book.id, numbers);
    const p = myProgress[book.id];
    const next = chapters.find(c => !(p && (p.chaptersDone || []).includes(c.number))) || chapters[0];
    const startNum = p && p.lastChapterOpened && numbers.includes(p.lastChapterOpened) ? p.lastChapterOpened : (next && next.number);

    view.innerHTML = `
    <section class="book-page">
      <a class="back" href="#library">← Library</a>
      <div class="book-layout">
      <div class="book-hero">
        ${coverHTML(book, 'lg')}
        <div class="stack">
          ${book.status !== 'published' ? '<span class="pill draft">Draft: only you can see this</span>' : ''}
          <h1>${esc(book.title)}</h1>
          <p class="muted">by ${esc(book.authorName)}</p>
          <p class="description">${esc(book.description)}</p>
          ${chapters.length ? `
            <div class="stack-sm">
              ${progressBar(done, chapters.length)}
              <span class="small muted">${done} of ${plural(chapters.length, 'chapter')} read${book.plannedChapters > chapters.length ? ` · ${book.plannedChapters - chapters.length} more coming` : ''}</span>
            </div>
            <div class="row">
              <a class="btn primary" href="#read-${book.id}-${startNum}">${p && p.lastChapterOpened ? 'Continue reading' : 'Start reading'}</a>
              ${mine ? `<a class="btn" href="#edit-${book.id}">Edit book</a>` : ''}
            </div>` : `<p class="muted">No chapters are ready yet.</p>${mine ? `<a class="btn" href="#edit-${book.id}">Edit book</a>` : ''}`}
        </div>
      </div>
      <section class="book-chapters" aria-label="Chapters">
      <h2 class="section-title">Chapters</h2>
      ${chapters.length ? `
      <ol class="chapter-list">
        ${chapters.map(c => {
          const isDone = p && (p.chaptersDone || []).includes(c.number);
          return `<li><a href="#read-${book.id}-${c.number}" class="${isDone ? 'done' : ''}">
            <span class="ch-num">${String(c.number).padStart(2, '0')}</span>
            <span class="ch-title">${esc(c.title)}</span>
            <span class="ch-state">${isDone ? '✓ Read' : ''}</span></a></li>`;
        }).join('')}
      </ol>` : '<p class="muted small">Chapters will appear here when the author marks them ready.</p>'}
      ${upcoming.length ? `<div class="upcoming">
        ${upcoming.map(c => `<div class="upcoming-row">
          <span class="ch-num">${String(c.number).padStart(2, '0')}</span>
          <span class="stack-sm grow"><span class="ch-title">${esc(c.title)}</span>
            <span class="small muted">Unlocks ${fmtWhen(c.releaseAt)}</span></span>
          <span class="countdown nums">${countdown(c.releaseAt)}</span></div>`).join('')}
      </div>` : ''}
      </section>
      </div>
    </section>`;
  };

  viewStops.push(Store.watchBook(bookId, b => { book = b; draw(); }));
  viewStops.push(Store.watchChapters(bookId, false, c => {
    chapters = c.filter(isReleased);
    upcoming = c.filter(isScheduled).sort((x, y) => x.releaseAt - y.releaseAt);
    draw();
  }));
  viewStops.push(onProgressChange(draw));
}

// lets a page redraw when my progress changes
const progressListeners = new Set();
function onProgressChange(fn) { progressListeners.add(fn); return () => progressListeners.delete(fn); }

// ============================================================
//  READING A CHAPTER
// ============================================================
function viewRead(view, bookId, number) {
  let book, chapters;
  let opened = false;
  let size = readFontSize();
  let lastKey = '';

  // ---- reading timer: counts only while the tab is visible and
  //      you've scrolled, tapped or typed in the last 2 minutes
  let pending = 0, lastActive = Date.now(), dayMarked = false;
  const bump = () => { lastActive = Date.now(); };
  const events = ['scroll', 'keydown', 'pointerdown', 'pointermove', 'touchstart', 'wheel'];
  events.forEach(e => window.addEventListener(e, bump, { passive: true }));
  const flush = () => {
    if (!pending || !opened) return;
    const secs = pending;
    pending = 0;
    Store.addReadingTime(me.id, bookId, number, secs).catch(() => {});
  };
  const tick = setInterval(() => {
    if (!opened || document.visibilityState !== 'visible' || Date.now() - lastActive > 120000) return;
    pending++;
    if (!dayMarked && pending >= 5) {
      dayMarked = true;
      const now = new Date(), today = dayKey(now), hour = now.getHours();
      if (!(me.readDays || []).includes(today)) Store.markDay(me.id, today).catch(() => {});
      // secret achievements: reading late at night or early in the morning
      const flags = me.flags || [];
      if (hour >= 22 && !flags.includes('night')) Store.addFlag(me.id, 'night').catch(() => {});
      if (hour < 7 && !flags.includes('early')) Store.addFlag(me.id, 'early').catch(() => {});
    }
    if (pending >= 30) flush();
  }, 1000);
  const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
  document.addEventListener('visibilitychange', onHide);
  viewStops.push(() => {
    flush();
    clearInterval(tick);
    events.forEach(e => window.removeEventListener(e, bump));
    document.removeEventListener('visibilitychange', onHide);
  });
  viewRead.secondsOnChapter = () => (((myProgress[bookId] || {}).chapterSeconds || {})[number] || 0) + pending;
  viewRead.flush = flush;

  const draw = () => {
    if (book === undefined || chapters === undefined) return;
    const i = chapters.findIndex(c => c.number === number);
    const ch = chapters[i];
    if (book && !ch && lockedUntil) {
      view.innerHTML = `<section class="narrow center stack"><span class="eyebrow">Coming soon</span><h1>This chapter unlocks ${fmtWhen(lockedUntil)}</h1>
        <p class="muted">That's in ${countdown(lockedUntil)}. Come back then!</p><a class="btn" href="#book-${book.id}">Back to the book</a></section>`;
      return;
    }
    if (!book || !ch || (book.status !== 'published' && book.authorId !== me.id)) {
      view.innerHTML = `<section class="narrow center stack"><h1>This chapter isn't available</h1>
        <a class="btn" href="#library">Back to the library</a></section>`;
      return;
    }
    if (!opened) { opened = true; Store.setLastOpened(me.id, book.id, number, !myProgress[book.id]).catch(() => {}); }
    const prev = chapters[i - 1], next = chapters[i + 1];
    const p = myProgress[book.id];
    const isDone = p && (p.chaptersDone || []).includes(number);
    const credited = p && (p.pointChapters || []).includes(number);
    // don't redraw (and lose your place) when only the timer changed
    const key = [ch.id, ch.updatedAt, ch.title, isDone, credited, chapters.length].join('|');
    if (key === lastKey) return;
    lastKey = key;
    const paragraphs = String(ch.text || '').split(/\n\s*\n/).map(t => `<p>${esc(t.trim()).replace(/\n/g, '<br>')}</p>`).join('');

    view.innerHTML = `
    <div class="reader-bar">
      <a class="back" href="#book-${book.id}">← ${esc(book.title)}</a>
      <div class="font-controls" aria-label="Text size">
        <button class="btn small ghost" data-action="font" data-step="-1" aria-label="Smaller text">A−</button>
        <button class="btn small ghost" data-action="font" data-step="1" aria-label="Bigger text">A+</button>
      </div>
    </div>
    <article class="chapter" style="--read-size:${size}px">
      <p class="eyebrow">Chapter ${ch.number} of ${chapters.length}</p>
      <h1>${esc(ch.title)}</h1>
      <div class="chapter-text">${paragraphs}</div>
      <div class="chapter-end">
        <button class="btn ${isDone ? 'done-btn' : 'primary'}" data-action="toggle-done" data-book="${book.id}" data-num="${number}" data-done="${isDone ? 1 : 0}">
          ${isDone ? '✓ Marked as read' : 'Mark as read'}</button>
        <p class="points-hint">${credited ? '◆ This chapter counted toward your points'
          : `◆ Every 2 chapters read = ${POINTS_PER_PAIR} points. A chapter counts after 1 minute of reading.`}</p>
        <div class="row between">
          ${prev ? `<a class="btn ghost" href="#read-${book.id}-${prev.number}">← ${esc(prev.title)}</a>` : '<span></span>'}
          ${next ? `<a class="btn ghost" href="#read-${book.id}-${next.number}">${esc(next.title)} →</a>`
                 : `<a class="btn ghost" href="#book-${book.id}">Back to book</a>`}
        </div>
      </div>
    </article>`;
    // came here from search? highlight the words and jump to the first one
    const hl = searchState.jump;
    if (hl && hl.bookId === book.id && hl.number === number) {
      searchState.jump = null;
      const n = markInside($('.chapter-text'), hl.words);
      if (n) {
        const bar = document.createElement('div');
        bar.className = 'hit-bar';
        bar.innerHTML = `<span>${n} ${n === 1 ? 'match' : 'matches'} for “${esc(hl.query)}”</span><button class="btn small ghost" data-action="clear-hits">Clear</button>`;
        $('.chapter').prepend(bar);
        const first = $('.chapter-text mark.search-hit');
        if (first) setTimeout(() => first.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
      }
    }
  };

  viewRead.setSize = n => {
    size = Math.min(26, Math.max(15, n));
    saveFontSize(size);
    const art = $('.chapter');
    if (art) art.style.setProperty('--read-size', size + 'px');
  };
  viewRead.getSize = () => size;

  viewStops.push(Store.watchBook(bookId, b => { book = b; draw(); }));
  // only released chapters (drafts and scheduled ones stay hidden)
  let lockedUntil = null;
  viewStops.push(Store.watchChapters(bookId, false, c => {
    chapters = c.filter(isReleased);
    const want = c.find(x => x.number === number);
    lockedUntil = want && isScheduled(want) ? want.releaseAt : null;
    draw();
  }));
  viewStops.push(onProgressChange(draw));
}

// ============================================================
//  AUTHOR: MY BOOKS
// ============================================================
function viewWrite(view) {
  view.innerHTML = `
  <section class="stack-lg">
    <div class="page-head row between">
      <div><h1>Your books</h1><p class="muted">Drafts are private. Publish a book to share it with every reader.</p></div>
      <a class="btn primary" href="#new-book">New book</a>
    </div>
    <div id="mine" class="stack"><p class="muted">Loading…</p></div>
  </section>`;
  viewStops.push(Store.watchMyBooks(me.id, books => {
    $('#mine').innerHTML = books.length ? books.map(b => `
      <a class="write-row" href="#edit-${b.id}">
        ${coverHTML(b, 'xs')}
        <span class="stack-sm grow">
          <strong>${esc(b.title)}</strong>
          <span class="small muted">${b.readyChapters || 0} of ${b.plannedChapters || 0} chapters ready</span>
          ${progressBar(b.readyChapters || 0, b.plannedChapters || 0)}
        </span>
        <span class="pill ${b.status === 'published' ? 'live' : 'draft'}">${b.status === 'published' ? 'Published' : 'Draft'}</span>
      </a>`).join('') : `
      <div class="empty"><p><strong>You haven't started a book yet.</strong></p>
      <a class="btn primary" href="#new-book">Start your first book</a></div>`;
  }));
}

// New book, or the details part of Edit
function bookFormHTML(book) {
  const b = book || { title: '', description: '', plannedChapters: 5, coverImage: 'cover-1' };
  return `
  <form data-form="book" data-id="${book ? book.id : ''}" class="stack">
    <label>Title<input id="book-title" maxlength="80" required value="${esc(b.title)}"></label>
    <label>Short description<textarea id="book-desc" rows="3" maxlength="300">${esc(b.description)}</textarea></label>
    <label>How many chapters do you plan?<input id="book-planned" type="number" min="1" max="200" required value="${esc(b.plannedChapters)}"></label>
    <fieldset class="cover-pick">
      <legend>Cover</legend>
      <div class="cover-options">
        ${COVERS.map(c => `
        <label class="cover-option">
          <input type="radio" name="cover" value="${c}" ${b.coverImage === c ? 'checked' : ''}>
          ${coverHTML({ title: b.title || 'Your title', coverImage: c, authorName: '' }, 'xs')}
        </label>`).join('')}
      </div>
    </fieldset>
    <button class="btn primary" type="submit">${book ? 'Save details' : 'Create book'}</button>
  </form>`;
}

function viewBookForm(view) {
  view.innerHTML = `
  <section class="narrow stack-lg">
    <a class="back" href="#write">← Your books</a>
    <h1>New book</h1>
    ${bookFormHTML(null)}
  </section>`;
}

// ============================================================
//  AUTHOR: EDIT A BOOK
// ============================================================
function viewEdit(view, bookId) {
  let book, chapters = [], progress = [];
  let built = false;

  const drawTop = () => {
    if (!book || book.authorId !== me.id) {
      view.innerHTML = `<section class="narrow center stack"><h1>Book not found</h1><a class="btn" href="#write">Back to your books</a></section>`;
      built = false;
      return;
    }
    if (!built) {
      built = true;
      view.innerHTML = `
      <section class="stack-lg">
        <a class="back" href="#write">← Your books</a>
        <div class="edit-head" id="edit-head"></div>
        <div class="edit-grid">
          <div class="stack-lg">
            <div class="panel stack">
              <h2>Chapters</h2>
              <div id="chapters"></div>
            </div>
            <div class="panel stack">
              <h2 id="chapter-form-title">Add a chapter</h2>
              <form data-form="chapter" data-book="${book.id}" data-edit="" class="stack">
                <label>Chapter title<input id="ch-title" maxlength="80" required></label>
                <label>Text<textarea id="ch-text" rows="12" required placeholder="Leave an empty line between paragraphs."></textarea></label>
                <fieldset class="release-pick">
                  <legend>When can readers see it?</legend>
                  <div class="part-options">
                    <label class="radio-chip"><input type="radio" name="ch-when" value="draft" checked><span>Keep as draft</span></label>
                    <label class="radio-chip"><input type="radio" name="ch-when" value="now"><span>Publish now</span></label>
                    <label class="radio-chip"><input type="radio" name="ch-when" value="later"><span>Schedule</span></label>
                  </div>
                  <label class="schedule-at" id="schedule-at" hidden>Release date and time
                    <input id="ch-at" type="datetime-local">
                    <small>The chapter unlocks for every reader at this time.</small></label>
                </fieldset>
                <div class="row">
                  <button class="btn primary" type="submit" id="ch-submit">Add chapter</button>
                  <button class="btn ghost" type="button" data-action="cancel-chapter" id="ch-cancel" hidden>Cancel</button>
                </div>
              </form>
            </div>
          </div>
          <div class="stack-lg">
            <div class="panel stack" id="reader-progress"></div>
            <details class="panel">
              <summary><h2>Book details</h2></summary>
              <div id="details-form"></div>
            </details>
            <button class="btn ghost danger" data-action="delete-book" data-book="${book.id}">Delete this book</button>
          </div>
        </div>
      </section>`;
      $('#details-form').innerHTML = bookFormHTML(book);
    }
    const ready = chapters.filter(isReleased).length;
    const sched = chapters.filter(isScheduled).length;
    $('#edit-head').innerHTML = `
      ${coverHTML(book, 'sm')}
      <div class="stack-sm grow">
        <span class="pill ${book.status === 'published' ? 'live' : 'draft'}">${book.status === 'published' ? 'Published: every reader can see it' : 'Draft: only you can see it'}</span>
        <h1>${esc(book.title)}</h1>
        <span class="small muted">${ready} of ${book.plannedChapters || 0} chapters out${sched ? ` · ${sched} scheduled` : ''}</span>
        ${progressBar(ready, book.plannedChapters || 0)}
      </div>
      <div class="row">
        ${book.status === 'published' ? `<a class="btn ghost" href="#book-${book.id}">View in library</a>` : ''}
        <button class="btn ${book.status === 'published' ? '' : 'primary'}" data-action="publish" data-book="${book.id}" data-to="${book.status === 'published' ? 'draft' : 'published'}">
          ${book.status === 'published' ? 'Unpublish' : 'Publish'}</button>
      </div>`;
    drawChapters();
    drawProgress();
  };

  const drawChapters = () => {
    const el = $('#chapters');
    if (!el) return;
    el.innerHTML = chapters.length ? `<ol class="edit-chapters">${chapters.map(c => `
      <li>
        <span class="ch-num">${String(c.number).padStart(2, '0')}</span>
        <span class="grow">${esc(c.title)}</span>
        <button class="pill ${isScheduled(c) ? 'scheduled' : c.status === 'ready' ? 'live' : 'draft'} pill-btn" data-action="toggle-ready" data-book="${bookId}" data-id="${c.id}" data-status="${isScheduled(c) ? 'scheduled' : c.status}"
          title="Tap to switch">${isScheduled(c) ? 'Scheduled · ' + fmtWhen(c.releaseAt) : c.status === 'ready' ? 'Ready' : 'Draft'}</button>
        <button class="btn small ghost" data-action="edit-chapter" data-id="${c.id}">Edit</button>
        <button class="btn small ghost danger" data-action="delete-chapter" data-book="${bookId}" data-id="${c.id}">Delete</button>
      </li>`).join('')}</ol>` : '<p class="muted">No chapters yet. Add the first one below.</p>';
  };

  const drawProgress = () => {
    const el = $('#reader-progress');
    if (!el) return;
    const readyNums = chapters.filter(isReleased).map(c => c.number);
    const rows = progress
      .filter(p => p.readerId !== me.id)
      .map(p => {
        const u = users.find(x => x.id === p.readerId);
        const done = (p.chaptersDone || []).filter(n => readyNums.includes(n)).length;
        return { name: u ? u.name : 'A reader', avatar: u && u.avatar, done };
      })
      .sort((a, b) => b.done - a.done);
    el.innerHTML = `<h2>Readers' progress</h2>` + (rows.length ? `<ul class="reader-progress">${rows.map(r => `
      <li>${avatarBadge(r.avatar, 32)}<span class="stack-sm grow"><span>${esc(r.name)}</span>
        ${progressBar(r.done, readyNums.length)}</span>
        <span class="small muted nums">${r.done}/${readyNums.length}</span></li>`).join('')}</ul>`
      : '<p class="muted">Nobody has started this book yet.</p>');
  };

  viewEdit.chapters = () => chapters;

  view.innerHTML = `<p class="muted">Loading…</p>`;
  viewStops.push(Store.watchBook(bookId, b => { book = b; drawTop(); }));
  viewStops.push(Store.watchChapters(bookId, true, c => {
    chapters = c;
    // keep the book's counts up to date for the library:
    // readyChapters = chapters out now, releases = when scheduled ones unlock
    const ready = c.filter(isReleased).length;
    const releases = c.filter(isScheduled).map(x => x.releaseAt).sort((a, b) => a - b);
    if (book && book.authorId === me.id &&
        (book.readyChapters !== ready || JSON.stringify(book.releases || []) !== JSON.stringify(releases))) {
      Store.updateBook(bookId, { readyChapters: ready, releases }).catch(() => {});
    }
    if (book) drawTop();
  }));
  viewStops.push(Store.watchBookProgress(bookId, p => { progress = p; drawProgress(); }));
}

// ============================================================
//  AUTHOR: READERS
// ============================================================
function viewReaders(view) {
  view.innerHTML = `
  <section class="stack-lg">
    <div class="page-head"><h1>Readers</h1>
      <p class="muted">Approving a reader lets them read every published book, from every author. Making someone an author gives them a Write tab.</p></div>
    <div id="readers-list" class="stack-lg"></div>
  </section>`;
  const draw = () => {
    const readers = users.filter(u => u.role === 'reader');
    const group = (title, list, buttons, emptyText) => `
      <div class="panel stack">
        <h2>${title} <span class="count-plain">${list.length}</span></h2>
        ${list.length ? `<ul class="people">${list.map(u => `
          <li>${avatarBadge(u.avatar, 40)}
            <span class="stack-sm grow"><strong>${esc(u.name)}</strong><span class="small muted">${esc(u.email)}</span></span>
            <span class="row">${buttons(u)}</span></li>`).join('')}</ul>` : `<p class="muted">${emptyText}</p>`}
      </div>`;
    const btn = (u, status, label, cls) => `<button class="btn small ${cls || ''}" data-action="set-status" data-id="${u.id}" data-status="${status}">${label}</button>`;
    const makeAuthor = (u, label, cls) => `<button class="btn small ${cls || ''}" data-action="make-author" data-id="${u.id}">${label}</button>`;
    const requests = readers.filter(u => u.authorRequest && u.status === 'approved');
    $('#readers-list').innerHTML =
      (requests.length ? group('Want to be authors', requests,
        u => makeAuthor(u, 'Make author', 'primary') + `<button class="btn small ghost" data-action="decline-author" data-id="${u.id}">Decline</button>`, '') : '') +
      group('Waiting for approval', readers.filter(u => u.status === 'waiting'),
        u => btn(u, 'approved', 'Accept', 'primary') + btn(u, 'rejected', 'Reject', 'ghost'), 'Nobody is waiting right now.') +
      group('Approved readers', readers.filter(u => u.status === 'approved'),
        u => makeAuthor(u, 'Make author', 'ghost') + btn(u, 'removed', 'Remove', 'ghost danger'), 'No approved readers yet.') +
      group('Not approved', readers.filter(u => u.status === 'rejected' || u.status === 'removed'),
        u => btn(u, 'approved', 'Approve', ''), 'Nobody here.');
  };
  draw();
  viewReaders.draw = draw;
  viewStops.push(() => { viewReaders.draw = null; });
}

// ============================================================
//  AVATAR
// ============================================================
function viewAvatar(view) {
  const draft = Object.assign({}, window.DEFAULT_AVATAR, me.avatar || {});
  draft.special = Object.assign({}, (me.avatar || {}).special || {});
  const isColor = v => String(v).startsWith('#');
  const wardrobe = () => {
    const mineItems = owned.map(itemById).filter(i => i && i.slot !== 'badge');
    if (!mineItems.length) return canRead()
      ? `<div class="part"><span class="part-label">Special items</span><p class="small muted">Unlock hats, capes and buddies in <a href="#rewards">Rewards</a>.</p></div>` : '';
    const slots = Object.keys(SLOT_NAMES).filter(sl => mineItems.some(i => i.slot === sl));
    return `<div class="part special-parts"><span class="part-label">Special items</span>${slots.map(sl => `
      <div class="part-options"><span class="slot-name">${SLOT_NAMES[sl]}</span>
        <button class="chip ${!draft.special[sl] ? 'on' : ''}" data-action="avatar-special" data-slot="${sl}" data-id="">None</button>
        ${mineItems.filter(i => i.slot === sl).map(i => `<button class="chip ${draft.special[sl] === i.id ? 'on' : ''}" data-action="avatar-special" data-slot="${sl}" data-id="${i.id}">${esc(i.name)}</button>`).join('')}
      </div>`).join('')}</div>`;
  };

  const draw = () => {
    view.innerHTML = `
    <section class="stack-lg">
      ${canRead() ? '' : '<a class="back" href="#library">← Back</a>'}
      <div class="page-head"><h1>Your avatar</h1><p class="muted">It shows next to your name.</p></div>
      <div class="avatar-grid">
        <div class="avatar-stage">${avatarSVG(draft, 180)}</div>
        <div class="stack">
          ${AVATAR_PARTS.map(part => `
            <div class="part">
              <span class="part-label">${part.label}</span>
              <div class="part-options">
                ${part.options.map((opt, i) => isColor(opt)
                  ? `<button class="swatch ${draft[part.key] === i ? 'on' : ''}" style="--sw:${opt}" data-action="avatar-pick" data-key="${part.key}" data-i="${i}" aria-label="${part.label} ${i + 1}" aria-pressed="${draft[part.key] === i}"></button>`
                  : `<button class="chip ${draft[part.key] === i ? 'on' : ''}" data-action="avatar-pick" data-key="${part.key}" data-i="${i}" aria-pressed="${draft[part.key] === i}">${opt}</button>`).join('')}
              </div>
            </div>`).join('')}
          ${wardrobe()}
          <div class="row">
            <button class="btn primary" data-action="avatar-save">Save avatar</button>
            <button class="btn ghost" data-action="avatar-random">Surprise me</button>
          </div>
        </div>
      </div>
    </section>`;
  };
  viewAvatar.draft = draft;
  viewAvatar.draw = draw;
  draw();
}

// ============================================================
//  READING REMINDERS
//  Saved on this device. They pop up while the app is open;
//  "Add to calendar" covers the times it's closed.
// ============================================================
function readReminder() {
  const base = { on: false, time: '19:00', lastShown: '' };
  try { return Object.assign(base, JSON.parse(localStorage.getItem('chapters-reminder') || '{}')); } catch (e) { return base; }
}
function saveReminder(r) { try { localStorage.setItem('chapters-reminder', JSON.stringify(r)); } catch (e) { /* ignore */ } }

function reminderPanel() {
  const r = readReminder();
  const [h, m] = r.time.split(':').map(Number);
  const when = new Date(); when.setHours(h, m, 0, 0);
  const label = when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `<div class="panel stack">
    <div class="row between"><h2>Reading reminder</h2>
      <button class="toggle ${r.on ? 'on' : ''}" data-action="remind-toggle" role="switch" aria-checked="${r.on}">
        <span class="toggle-knob"></span><span>${r.on ? 'On' : 'Off'}</span></button></div>
    <div class="remind-row">
      <label class="remind-time">Remind me every day at
        <input id="remind-time" type="time" value="${esc(r.time)}"></label>
      <div class="row">
        <a class="btn small" target="_blank" rel="noopener" href="${googleCalendarLink(r.time)}">Add to Google Calendar</a>
        ${window.PREVIEW_NO_EMBED ? '' : '<button class="btn small ghost" data-action="remind-ics">Download calendar file</button>'}
      </div>
    </div>
    <span class="small muted">${r.on
      ? `At ${label}, if you haven't read yet today, Chapters will remind you while it's open in a tab.`
      : 'Turn it on to get a daily nudge while Chapters is open.'} For reminders when the app is closed, add it to your calendar.</span>
  </div>`;
}

function calStamp(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}
function reminderStart(time) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d;
}
function appLink() { return location.origin + location.pathname; }
function googleCalendarLink(time) {
  const start = reminderStart(time), end = new Date(start.getTime() + 15 * 6e4);
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: 'Reading time', details: 'Read a chapter in Chapters to keep your streak going. ' + appLink(),
    dates: calStamp(start) + '/' + calStamp(end), recur: 'RRULE:FREQ=DAILY',
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
function downloadICS(time) {
  const start = reminderStart(time);
  const utc = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chapters//Reading reminder//EN', 'BEGIN:VEVENT',
    'UID:chapters-reminder-' + Date.now() + '@chapters', 'DTSTAMP:' + utc, 'DTSTART:' + calStamp(start), 'DURATION:PT15M',
    'RRULE:FREQ=DAILY', 'SUMMARY:Reading time', 'DESCRIPTION:Read a chapter in Chapters to keep your streak going.',
    'URL:' + appLink(), 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Reading time', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'reading-reminder.ics';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function checkReminder() {
  if (!me || !canRead()) return;
  const r = readReminder();
  if (!r.on) return;
  const now = new Date(), today = dayKey(now);
  if (r.lastShown === today) return;
  const [h, m] = r.time.split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
  r.lastShown = today;
  saveReminder(r);
  if ((me.readDays || []).includes(today)) return;   // already read today
  showReminder();
}
function showReminder() {
  const last = Object.values(myProgress).filter(p => p.lastChapterOpened).sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))[0];
  const href = last ? `#read-${last.bookId}-${last.lastChapterOpened}` : '#library';
  const streak = streakDays(me.readDays);
  const text = streak ? `Read a chapter today to keep your ${streak}-day streak going.` : 'A few pages today starts a new streak.';
  let box = $('#remind-pop');
  if (!box) {
    box = document.createElement('div');
    box.id = 'remind-pop';
    box.className = 'achieve-pop remind-pop';
    box.setAttribute('role', 'alert');
    document.body.appendChild(box);
  }
  box.innerHTML = `<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 9 v4 l3 2 M5 4 l3 -1 M19 4 l-3 -1" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
    <div class="stack-sm grow"><span class="eyebrow">Reading time</span><strong>Time for a chapter?</strong><span class="small muted">${text}</span>
      <span class="row"><a class="btn small primary" href="${href}" data-action="remind-close">${last ? 'Continue reading' : 'Open the library'}</a>
      <button class="btn small ghost" data-action="remind-close">Later</button></span></div>`;
  box.hidden = false;
  box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Reading time', { body: text });
  } catch (e) { /* not available here */ }
}

// ---------- scheduled chapters unlocking while the app is open ----------
let nextRelease = Infinity;
function noteReleases(books) {
  const now = Date.now();
  nextRelease = Math.min(Infinity, ...books.flatMap(b => (b.releases || []).filter(t => t > now)));
}
function checkReleases() {
  if (Date.now() < nextRelease) return;
  noteReleases(libraryBooks.concat(myBooksAll).map(b => ({ releases: (b.releases || []) })));
  // redraw, unless someone is reading or typing a chapter
  if ($('.chapter') || $('form[data-form="chapter"]') || $('form[data-form="book"]')) return;
  toast('A new chapter just unlocked!');
  route();
}

setInterval(() => { checkReminder(); checkReleases(); }, 15000);

// ============================================================
//  SEARCH
// ============================================================
const searchState = { q: '', scope: 'all', status: 'any', sort: 'relevance', jump: null };

function readRecent() { try { return JSON.parse(localStorage.getItem('chapters-recent-search') || '[]'); } catch (e) { return []; } }
function saveRecent(q) {
  q = String(q || '').trim();
  if (!q) return;
  const list = [q].concat(readRecent().filter(x => x !== q)).slice(0, 6);
  try { localStorage.setItem('chapters-recent-search', JSON.stringify(list)); } catch (e) { /* ignore */ }
}

// wrap matching words inside a chapter in <mark> (text only, safe)
function markInside(root, words) {
  const re = hitRegex(words);
  if (!root || !re) return 0;
  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const parts = node.nodeValue.split(re);
    if (parts.length < 2) return;
    const frag = document.createDocumentFragment();
    parts.forEach((part, i) => {
      if (!part) return;
      if (i % 2) { const m = document.createElement('mark'); m.className = 'search-hit'; m.textContent = part; frag.appendChild(m); count++; }
      else frag.appendChild(document.createTextNode(part));
    });
    node.parentNode.replaceChild(frag, node);
  });
  return count;
}

function bookStatus(b) {
  const p = myProgress[b.id];
  const done = p ? (p.chaptersDone || []).length : 0;
  if (!p || (!done && !p.lastChapterOpened)) return 'new';
  return b.readyChapters && done >= b.readyChapters ? 'finished' : 'reading';
}

// Chapters loaded for search stay loaded (and live) until you log out,
// so going back to Search doesn't download everything again.
const searchCache = { chaptersByBook: {}, stops: {} };
function clearSearchCache() {
  Object.values(searchCache.stops).forEach(stop => stop());
  searchCache.chaptersByBook = {};
  searchCache.stops = {};
}

function viewSearch(view) {
  let books = null;
  const chaptersByBook = searchCache.chaptersByBook;
  const chapterStops = searchCache.stops;
  let index = null, timer = null, results = null;

  view.innerHTML = `
  <section class="stack-lg search-page">
    <h1 class="sr-only">Search</h1>
    <div class="search-head">
      <label class="search-box">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 15.5 L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <span class="sr-only">Search</span>
        <input id="search-input" type="search" autocomplete="off" spellcheck="false"
          placeholder="Search titles, authors, chapters, words inside chapters…" value="${esc(searchState.q)}">
        <button class="dock-btn" data-action="search-clear" aria-label="Clear search" id="search-clear" ${searchState.q ? '' : 'hidden'}>×</button>
      </label>
      <p class="search-tips small muted">Tips: <code>"exact phrase"</code> · <code>author:name</code> · small typos are fine · press <kbd>Enter</kbd> to open the top result</p>
    </div>
    <div class="search-filters">
      <div class="part-options" role="group" aria-label="Show">
        ${[['all', 'Everything'], ['books', 'Books'], ['authors', 'Authors'], ['chapters', 'Chapters']].map(([k, l]) =>
          `<button class="chip ${searchState.scope === k ? 'on' : ''}" data-action="search-opt" data-key="scope" data-v="${k}">${l}</button>`).join('')}
      </div>
      <div class="part-options" role="group" aria-label="Reading status">
        ${[['any', 'Any status'], ['new', 'Not started'], ['reading', 'Reading'], ['finished', 'Finished']].map(([k, l]) =>
          `<button class="chip ${searchState.status === k ? 'on' : ''}" data-action="search-opt" data-key="status" data-v="${k}">${l}</button>`).join('')}
      </div>
      <label class="sort-pick"><span class="eyebrow">Sort books</span>
        <select id="search-sort">
          ${[['relevance', 'Best match'], ['newest', 'Newest'], ['title', 'Title A–Z']].map(([k, l]) =>
            `<option value="${k}" ${searchState.sort === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select></label>
    </div>
    <p class="search-meta" id="search-meta" aria-live="polite"></p>
    <div id="search-results" class="stack-lg"></div>
  </section>`;

  const input = $('#search-input');
  setTimeout(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 30);

  // rebuild the index once things settle, not once per book as chapters arrive
  let rebuildTimer = null;
  const rebuild = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      if (!books || !$('#search-results')) return;
      index = buildSearchIndex(books, chaptersByBook);
      draw();
    }, 60);
  };
  viewStops.push(() => clearTimeout(rebuildTimer));

  const draw = () => {
    const box = $('#search-results');
    if (!box || !index) return;
    const q = searchState.q.trim();
    $('#search-clear').hidden = !q;
    const loading = books.some(b => !chaptersByBook[b.id]);
    $('#search-meta').textContent = `Searching ${plural(books.length, 'book')} and ${plural(index.chapterCount, 'chapter')}${loading ? ' (still loading chapters…)' : ''}`;

    if (!q) {
      const recent = readRecent();
      box.innerHTML = `
        ${recent.length ? `<div class="stack"><h2 class="section-title">Recent searches</h2>
          <div class="part-options">${recent.map(r => `<button class="chip" data-action="search-set" data-q="${esc(r)}">${esc(r)}</button>`).join('')}
          <button class="link" data-action="search-forget">Clear history</button></div></div>` : ''}
        <div class="stack"><h2 class="section-title">Browse by author</h2>
          <div class="author-chips">${index.authorDocs.map(a => `<button class="author-chip" data-action="search-set" data-q='author:"${esc(a.name)}"'>
            <strong>${esc(a.name)}</strong><span class="small muted">${plural(a.books.length, 'book')}</span></button>`).join('') || '<p class="muted">No published books yet.</p>'}</div></div>`;
      results = null;
      return;
    }

    results = runSearch(index, q, { status: searchState.status, statusOf: bookStatus, sort: searchState.sort });
    const scope = searchState.scope;
    const show = k => scope === 'all' || scope === k;
    const total = results.books.length + results.chapters.length + results.authors.length;
    const allHits = Array.from(new Set([].concat(...results.books.map(r => r.hits), ...results.chapters.map(r => r.hits))));

    if (!total) {
      $('#search-meta').textContent = 'No matches';
      box.innerHTML = `<div class="empty"><p><strong>No matches for “${esc(q)}”.</strong></p>
        ${results.suggestion ? `<p>Did you mean <button class="link" data-action="search-set" data-q="${esc(results.suggestion)}">${esc(results.suggestion)}</button>?</p>` : ''}
        <p class="muted small">Try fewer words, check the spelling, or set the status filter to “Any status”.</p></div>`;
      return;
    }

    const bookRow = r => {
      const b = r.book, st = bookStatus(b);
      const p = myProgress[b.id], done = p ? Math.min((p.chaptersDone || []).length, b.readyChapters || 0) : 0;
      return `<a class="result book-result" href="#book-${b.id}" data-result>
        ${coverHTML(b, 'sm')}
        <span class="stack-sm grow">
          <strong class="result-title">${highlightHTML(b.title, r.hits)}</strong>
          <span class="small muted">by ${highlightHTML(b.authorName, r.hits)} · ${plural(b.readyChapters || 0, 'chapter')}</span>
          ${b.description ? `<span class="result-snip">${highlightHTML(b.description, r.hits)}</span>` : ''}
          <span class="row result-tags">
            <span class="pill ${st === 'finished' ? 'live' : st === 'reading' ? 'reading' : 'draft-none'}">${st === 'new' ? 'Not started' : st === 'reading' ? `Reading · ${done}/${b.readyChapters}` : 'Finished'}</span>
            ${r.chapterHits ? `<span class="small muted">Found in ${plural(r.chapterHits, 'chapter')}</span>` : ''}
          </span>
        </span></a>`;
    };
    const chapterRow = r => `
      <a class="result chapter-result" href="#read-${r.book.id}-${r.chapter.number}" data-result data-jump="${r.book.id}|${r.chapter.number}" data-words="${esc(r.hits.join(' '))}">
        <span class="ch-num">${String(r.chapter.number).padStart(2, '0')}</span>
        <span class="stack-sm grow">
          <strong class="result-title">${highlightHTML(r.chapter.title, r.hits)}</strong>
          <span class="small muted">${esc(r.book.title)} · ${esc(r.book.authorName)}</span>
          <span class="result-snip">${snippetHTML(r.chapter.text, r.hits)}</span>
        </span></a>`;

    box.innerHTML = `
      ${show('authors') && results.authors.length ? `<div class="stack"><h2 class="section-title">Authors · ${results.authors.length}</h2>
        <div class="author-chips">${results.authors.map(a => `<button class="author-chip" data-action="search-set" data-q='author:"${esc(a.author.name)}"'>
          <strong>${highlightHTML(a.author.name, allHits.concat(results.query.terms))}</strong><span class="small muted">${plural(a.author.books.length, 'book')}</span></button>`).join('')}</div></div>` : ''}
      ${show('books') && results.books.length ? `<div class="stack"><h2 class="section-title">Books · ${results.books.length}</h2>
        <div class="results">${results.books.slice(0, 30).map(bookRow).join('')}</div></div>` : ''}
      ${show('chapters') && results.chapters.length ? `<div class="stack"><h2 class="section-title">Chapters · ${results.chapters.length}</h2>
        <div class="results">${results.chapters.slice(0, 40).map(chapterRow).join('')}</div>
        ${results.chapters.length > 40 ? '<p class="small muted">Showing the best 40. Add another word to narrow it down.</p>' : ''}</div>` : ''}
      ${!['authors', 'books', 'chapters'].some(k => show(k) && results[k].length) ? '<p class="muted">Nothing in this section. Try “Everything”.</p>' : ''}`;
    $('#search-meta').textContent = `${plural(results.books.length, 'book')}, ${plural(results.chapters.length, 'chapter')} and ${plural(results.authors.length, 'author')} match`;
  };

  viewSearch.draw = () => { draw(); };
  viewSearch.setQuery = q => { searchState.q = q; input.value = q; draw(); input.focus(); };

  input.addEventListener('input', () => {
    searchState.q = input.value;
    clearTimeout(timer);
    timer = setTimeout(draw, 120);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = $('#search-results [data-result]');
      if (first) { saveRecent(searchState.q); first.click(); }
    }
    if (e.key === 'Escape') { viewSearch.setQuery(''); }
    if (e.key === 'ArrowDown') {
      const first = $('#search-results [data-result]');
      if (first) { e.preventDefault(); first.focus(); }
    }
  });
  $('#search-sort').addEventListener('change', e => { searchState.sort = e.target.value; draw(); });

  // load books, then every book's Ready chapters (live)
  viewStops.push(Store.watchLibrary(list => {
    books = list;
    list.forEach(b => {
      if (chapterStops[b.id]) return;
      chapterStops[b.id] = Store.watchChapters(b.id, false, chs => {
        chaptersByBook[b.id] = chs.filter(isReleased);
        searchCache.onChange && searchCache.onChange();
      });
    });
    Object.keys(chapterStops).forEach(id => {
      if (!list.some(b => b.id === id)) { chapterStops[id](); delete chapterStops[id]; delete chaptersByBook[id]; }
    });
    rebuild();
  }));
  searchCache.onChange = rebuild;
  viewStops.push(() => { searchCache.onChange = null; });
  viewStops.push(onProgressChange(draw));
}

// ============================================================
//  ACHIEVEMENTS: unlock new ones and show a pop-up
// ============================================================
function achievementContext() {
  return { me, progress: myProgress, books: libraryBooks, owned, myBooks: myBooksAll, allProgress: allProgressAll };
}
function checkAchievements() {
  if (!me || !canRead()) return;
  const stats = achievementStats(achievementContext());
  const have = new Set(me.achievements || []);
  const fresh = achievementsFor(isAuthor())
    .filter(a => !have.has(a.id) && !unlocking.has(a.id) && stats[a.stat] >= a.goal);
  if (!fresh.length) return;
  fresh.forEach(a => unlocking.add(a.id));
  Store.unlockAchievements(me.id, fresh.map(a => a.id))
    .then(() => fresh.forEach(showAchievement))
    .catch(() => fresh.forEach(a => unlocking.delete(a.id)));
}

const achieveQueue = [];
let achieveBusy = false;
function showAchievement(a) {
  achieveQueue.push(a);
  if (!achieveBusy) nextAchievement();
}
function nextAchievement() {
  const a = achieveQueue.shift();
  let box = $('#achieve-pop');
  if (!a) { achieveBusy = false; if (box) box.hidden = true; return; }
  achieveBusy = true;
  if (!box) {
    box = document.createElement('div');
    box.id = 'achieve-pop';
    box.className = 'achieve-pop';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  box.innerHTML = `${achievementBadge(a, 56, true)}
    <div class="stack-sm"><span class="eyebrow">Achievement unlocked</span>
      <strong>${esc(a.name)}</strong>
      <span class="small muted">${esc(a.desc)} · <span class="tier-${a.tier}">+${TIER_POINTS[a.tier]} points</span></span></div>`;
  box.hidden = false;
  box.classList.remove('in');
  void box.offsetWidth;
  box.classList.add('in');
  setTimeout(nextAchievement, 3600);
}

// ============================================================
//  DASHBOARD
// ============================================================
function fmtTime(s) {
  s = Math.round(s || 0);
  if (s < 60) return s ? '<1m' : '0m';
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
function daysAgo(t) {
  if (!t) return '—';
  const a = new Date(t); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  const d = Math.round((b - a) / 864e5);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d + ' days ago';
}
function lastDays(n) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) { out.unshift(dayKey(d)); d.setDate(d.getDate() - 1); }
  return out;
}
function streakDays(days) {
  const set = new Set(days || []);
  const d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);  // yesterday still counts
  let n = 0;
  while (set.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function viewDashboard(view) {
  let books = null, myBooks = [], allProgress = [];
  const draw = () => {
    if (!books) return;
    const pts = myPoints();
    const progressList = Object.values(myProgress);
    const totalSecs = progressList.reduce((n, p) => n + (p.seconds || 0), 0);
    const chaptersRead = progressList.reduce((n, p) => n + (p.chaptersDone || []).length, 0);
    const rows = books.filter(b => myProgress[b.id]).map(b => {
      const p = myProgress[b.id];
      const total = b.readyChapters || 0;
      return { b, p, total, done: Math.min((p.chaptersDone || []).length, total) };
    }).sort((x, y) => (y.p.lastReadAt || 0) - (x.p.lastReadAt || 0));
    const finished = rows.filter(r => r.total > 0 && r.done >= r.total).length;
    const streak = streakDays(me.readDays);
    const readSet = new Set(me.readDays || []);
    const badges = owned.map(itemById).filter(i => i && i.slot === 'badge');
    const list = achievementsFor(isAuthor());
    const have = new Set(me.achievements || []);
    const stats = achievementStats(achievementContext());
    const tierRank = { gold: 3, silver: 2, bronze: 1 };
    const top = list.filter(a => have.has(a.id)).sort((x, y) => tierRank[y.tier] - tierRank[x.tier]).slice(0, 3);

    view.innerHTML = `
    <section class="stack-lg">
      <div class="dash-head">
        <div class="dash-avatar">${avatarSVG(me.avatar, 86)}</div>
        <div class="stack-sm grow">
          <span class="eyebrow">${isAuthor() ? 'Author' : 'Reader'} profile</span>
          <h1>${esc(me.name)}</h1>
          ${top.length ? `<div class="badge-row">${top.map(a => `<span class="badge-chip ach-chip" title="${esc(a.name)}: ${esc(a.desc)}">${achievementBadge(a, 26, true)}<span>${esc(a.name)}</span></span>`).join('')}</div>` : ''}
          ${badges.length ? `<div class="badge-row">${badges.map(b => `<span class="badge-chip" title="${esc(b.name)}">${badgeSVG(b, 26)}<span>${esc(b.name.replace(' badge', ''))}</span></span>`).join('')}</div>` : ''}
        </div>
        <a class="btn" href="#rewards">Spend points</a>
      </div>

      <div class="tiles">
        <div class="tile"><span class="eyebrow">Reading time</span><strong class="nums">${fmtTime(totalSecs)}</strong><span class="small muted">across all books</span></div>
        <div class="tile"><span class="eyebrow">Chapters read</span><strong class="nums">${chaptersRead}</strong><span class="small muted">${pts.credited} counted for points</span></div>
        <div class="tile"><span class="eyebrow">Books finished</span><strong class="nums">${finished}</strong><span class="small muted">of ${plural(rows.length, 'book')} started</span></div>
        <div class="tile accent"><span class="eyebrow">Points</span><strong class="nums">${pts.balance}</strong>
          <span class="small muted">${pts.toNext === 1 ? '1 more chapter' : '2 more chapters'} to +${POINTS_PER_PAIR}</span></div>
      </div>

      <div class="panel stack">
        <div class="row between"><h2>Reading streak</h2><span class="streak nums">${streak} ${streak === 1 ? 'day' : 'days'}</span></div>
        <div class="streak-strip" aria-label="Days you read in the last two weeks">
          ${lastDays(14).map(d => `<span class="day ${readSet.has(d) ? 'on' : ''}" title="${d}"></span>`).join('')}
        </div>
        <span class="small muted">Last 14 days. Read a little every day to keep the streak going.</span>
      </div>

      ${reminderPanel()}

      <div class="panel stack">
        <div class="row between"><h2>Achievements</h2>
          <span class="small muted nums">${list.filter(a => have.has(a.id)).length} / ${list.length} unlocked · ${achievementPoints(me.achievements)} bonus points</span></div>
        <div class="ach-grid">
          ${list.map(a => {
            const on = have.has(a.id);
            const hidden = a.secret && !on;
            const val = Math.min(stats[a.stat] || 0, a.goal);
            return `<div class="ach ${on ? 'on' : ''}">
              ${achievementBadge(a, 44, on)}
              <div class="stack-sm grow">
                <strong>${hidden ? '???' : esc(a.name)}</strong>
                <span class="small muted">${hidden ? 'Secret achievement. Keep reading to find it.' : esc(a.desc)}</span>
                ${on ? `<span class="ach-tier tier-${a.tier}">${a.tier} · +${TIER_POINTS[a.tier]}</span>`
                  : hidden ? '' : `<span class="ach-progress">${progressBar(val, a.goal)}<span class="nums">${val}/${a.goal}</span></span>`}
              </div></div>`;
          }).join('')}
        </div>
      </div>

      <div class="panel stack">
        <h2>Your books</h2>
        ${rows.length ? `<div class="table-wrap"><table class="stats">
          <thead><tr><th>Book</th><th>Chapters</th><th>Time</th><th>Started</th><th>Last read</th></tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td><a href="#book-${r.b.id}" class="book-link">${coverHTML(r.b, 'xs')}<span>${esc(r.b.title)}<small>${esc(r.b.authorName)}</small></span></a></td>
            <td><span class="nums">${r.done}/${r.total}</span>${progressBar(r.done, r.total)}</td>
            <td class="nums">${fmtTime(r.p.seconds)}</td>
            <td>${daysAgo(r.p.startedAt)}</td>
            <td>${daysAgo(r.p.lastReadAt)}</td></tr>`).join('')}</tbody></table></div>`
          : `<p class="muted">Start a book in the <a href="#library">Library</a> and your stats show up here.</p>`}
      </div>

      ${isAuthor() ? `
      <div class="panel stack">
        <h2>Your books' readers</h2>
        ${myBooks.length ? `<div class="table-wrap"><table class="stats">
          <thead><tr><th>Book</th><th>Readers</th><th>Reading time</th><th>Chapters read</th><th>Finished</th></tr></thead>
          <tbody>${myBooks.map(b => {
            const ps = allProgress.filter(p => p.bookId === b.id && p.readerId !== me.id);
            const total = b.readyChapters || 0;
            return `<tr><td><a href="#edit-${b.id}" class="book-link">${coverHTML(b, 'xs')}<span>${esc(b.title)}<small>${b.status === 'published' ? 'Published' : 'Draft'}</small></span></a></td>
              <td class="nums">${ps.length}</td>
              <td class="nums">${fmtTime(ps.reduce((n, p) => n + (p.seconds || 0), 0))}</td>
              <td class="nums">${ps.reduce((n, p) => n + (p.chaptersDone || []).length, 0)}</td>
              <td class="nums">${ps.filter(p => total && (p.chaptersDone || []).length >= total).length}</td></tr>`;
          }).join('')}</tbody></table></div>` : '<p class="muted">You haven\'t written a book yet.</p>'}
      </div>` : ''}
    </section>`;
  };
  viewDashboard.draw = draw;
  view.innerHTML = '<p class="loading">Loading your stats…</p>';
  viewStops.push(Store.watchLibrary(list => { books = list; draw(); }));
  viewStops.push(onProgressChange(draw));
  if (isAuthor()) {
    viewStops.push(Store.watchMyBooks(me.id, list => { myBooks = list; draw(); }));
    viewStops.push(Store.watchAllProgress(list => { allProgress = list; draw(); }));
  }
}

// ============================================================
//  REWARDS SHOP + MONTHLY DROP
// ============================================================
function viewRewards(view) {
  const draw = () => {
    const pts = myPoints();
    const drop = dropInfo();
    const opens = drop.startsAt && drop.startsAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const special = (me.avatar && me.avatar.special) || {};
    const filter = viewRewards.filter || 'all';
    // big drops get filters, a "show all" button and a set tracker
    const setOwned = drop.items.filter(i => owned.includes(i.id)).length;
    const groupNames = Array.from(new Set(drop.items.map(i => i.group || SLOT_NAMES[i.slot]).filter(Boolean)));
    const groups = ['All'].concat(groupNames, drop.items.some(i => i.rare) ? ['Rare'] : [], ['Yours']);
    const dropFilter = groups.includes(viewRewards.dropFilter) ? viewRewards.dropFilter : 'All';
    const dropShown = drop.items.filter(i => dropFilter === 'All' ? true : dropFilter === 'Rare' ? i.rare
      : dropFilter === 'Yours' ? owned.includes(i.id) : (i.group || SLOT_NAMES[i.slot]) === dropFilter);
    const dropLimit = viewRewards.dropAll ? 1e9 : 24;
    const shopList = filter === 'all' ? SHOP
      : filter === 'owned' ? allItems().filter(i => owned.includes(i.id))
      : SHOP.filter(i => i.slot === filter);

    const card = (item, kind) => {
      const has = owned.includes(item.id);
      const wearing = item.slot !== 'badge' && special[item.slot] === item.id;
      const art = item.slot === 'badge'
        ? `<span class="badge-art">${badgeSVG(item, 54)}</span>`
        : avatarSVG(Object.assign({}, me.avatar, { special: Object.assign({}, special, { [item.slot]: item.id }) }), 78);
      let btn;
      if (has) btn = item.slot === 'badge' ? '<span class="pill live">Unlocked</span>'
        : `<button class="btn small ${wearing ? '' : 'primary'}" data-action="wear" data-id="${item.id}" data-slot="${item.slot}" data-on="${wearing ? 0 : 1}">${wearing ? 'Take off' : 'Wear'}</button>`;
      else if (kind === 'upcoming') btn = `<button class="btn small" disabled>Opens ${opens}</button>`;
      else if (pts.balance >= item.price) btn = `<button class="btn small primary" data-action="buy" data-id="${item.id}">Unlock · ${item.price}</button>`;
      else btn = `<button class="btn small" disabled>Need ${item.price - pts.balance} more</button>`;
      return `<div class="item ${kind === 'drop' ? 'limited' : ''} ${item.rare ? 'rare' : ''} ${has ? 'has' : ''}">
        ${item.rare ? '<span class="limited-tag rare-tag">Rare</span>' : kind === 'drop' ? '<span class="limited-tag">Limited</span>' : ''}
        <div class="item-art">${art}</div>
        <div class="stack-sm"><strong>${esc(item.name)}</strong>
          <span class="small muted">${has ? 'Yours' : item.price + ' points'} · ${item.slot === 'badge' ? 'Badge' : SLOT_NAMES[item.slot]}</span></div>
        ${btn}</div>`;
    };

    view.innerHTML = `
    <section class="stack-lg">
      <div class="page-head rewards-head">
        <div class="stack-sm"><h1>Rewards</h1>
          <p class="muted">Every 2 chapters you read earns ${POINTS_PER_PAIR} points. Spend them on things for your avatar.</p></div>
        <div class="balance"><span class="eyebrow">Balance</span><strong class="nums">${pts.balance}</strong>
          <span class="small muted">${pts.toNext === 1 ? '1 chapter' : '2 chapters'} to +${POINTS_PER_PAIR}</span></div>
      </div>

      <div class="panel drop ${drop.live ? 'is-live' : ''} stack">
        <div class="drop-head">
          <div class="stack-sm">
            <span class="eyebrow">${drop.live ? '<span class="live-pulse"></span>Monthly Drop · Live now' : 'Next Monthly Drop'}</span>
            <h2 class="drop-theme">${drop.theme ? esc(drop.theme) : 'Coming soon'}</h2>
            <span class="small muted">${drop.live
              ? `Only on days 1–${DROP_DAYS} of the month. After that these items are gone for good.`
              : `Opens on ${opens} for ${DROP_DAYS} days.`}</span>
          </div>
          <div class="drop-clock"><span class="eyebrow">${drop.live ? 'Ends in' : 'Opens in'}</span>
            <strong class="nums">${countdown(drop.live ? drop.endsAt : drop.startsAt)}</strong></div>
        </div>
        ${drop.items.length ? `
          <div class="set-tracker">
            <span class="eyebrow">${esc(drop.theme)} set</span>
            ${progressBar(setOwned, drop.items.length)}
            <span class="nums small">${setOwned} / ${drop.items.length}</span>
          </div>
          ${groups.length > 2 ? `<div class="part-options" role="group" aria-label="Filter the drop">
            ${groups.map(g => `<button class="chip ${dropFilter === g ? 'on' : ''}" data-action="drop-filter" data-f="${esc(g)}">${esc(g)}${g !== 'All' && g !== 'Yours' ? ` <span class="chip-count">${drop.items.filter(i => g === 'Rare' ? i.rare : i.group === g).length}</span>` : ''}</button>`).join('')}
          </div>` : ''}
          <div class="items">${dropShown.slice(0, dropLimit).map(i => card(i, drop.live ? 'drop' : 'upcoming')).join('')
            || '<p class="muted">Nothing here yet.</p>'}</div>
          ${dropShown.length > dropLimit ? `<button class="btn" data-action="drop-more">Show all ${dropShown.length} items</button>` : ''}` : ''}
      </div>

      <div class="stack">
        <h2 class="section-title">Shop</h2>
        <div class="part-options shop-filter" role="group" aria-label="Filter the shop">
          ${[['all', 'All']].concat(Object.entries(SLOT_NAMES), [['badge', 'Badges'], ['owned', 'Yours']]).map(([k, label]) =>
            `<button class="chip ${filter === k ? 'on' : ''}" data-action="shop-filter" data-f="${k}" aria-pressed="${filter === k}">${label}</button>`).join('')}
        </div>
        <div class="items">${shopList.length ? shopList.map(i => card(i, 'shop')).join('')
          : '<p class="muted">Nothing here yet. Keep reading to earn points.</p>'}</div>
      </div>
      ${me.bonusPoints ? `<p class="small muted">Demo: this account starts with ${me.bonusPoints} bonus points.</p>` : ''}
    </section>`;
  };
  viewRewards.draw = draw;
  draw();
  viewStops.push(onProgressChange(draw));
  const clock = setInterval(draw, 60000);
  viewStops.push(() => clearInterval(clock));
}

// ============================================================
//  BUTTON CLICKS
// ============================================================
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  try {
    if (a === 'auth-tab') return renderAuth(el.dataset.tab);
    if (a === 'forgot') {
      const email = $('#login-email').value.trim();
      if (!email) return showAuthError('Type your email above first, then tap Forgot password.');
      await Store.resetPassword(email);
      return toast(Store.mode === 'demo' ? 'Demo mode: no email is sent. The password is demo123.' : 'Password reset email sent');
    }
    if (a === 'logout') { await Store.signOut(); location.hash = ''; return; }

    if (a === 'font') return viewRead.setSize(viewRead.getSize() + Number(el.dataset.step) * 2);
    if (a === 'toggle-done') {
      const done = el.dataset.done !== '1';
      const bookId = el.dataset.book, num = Number(el.dataset.num);
      let credit = false, msg = done ? 'Marked as read' : 'Marked as unread';
      if (done) {
        const p = myProgress[bookId] || {};
        const secs = viewRead.secondsOnChapter ? viewRead.secondsOnChapter() : 0;
        if (viewRead.flush) viewRead.flush();
        if (!(p.pointChapters || []).includes(num)) {
          if (secs >= MIN_SECONDS) credit = true;
          else msg = 'Marked as read. Read for a full minute next time to earn points.';
        }
      }
      await Store.setChapterDone(me.id, bookId, num, done, credit);
      return toast(msg);
    }

    if (a === 'publish') {
      await Store.updateBook(el.dataset.book, { status: el.dataset.to });
      return toast(el.dataset.to === 'published' ? 'Published. Every reader can see it now.' : 'Unpublished. Only you can see it.');
    }
    if (a === 'delete-book') {
      if (!confirmTap(el)) return;
      await Store.deleteBook(el.dataset.book);
      toast('Book deleted');
      return go('write');
    }
    if (a === 'toggle-ready') {
      const to = el.dataset.status === 'draft' ? 'ready' : 'draft';
      await Store.updateChapter(el.dataset.book, el.dataset.id, { status: to, releaseAt: null });
      return toast(to === 'ready' ? 'Chapter is out for readers now' : 'Chapter moved to drafts');
    }
    if (a === 'edit-chapter') {
      const c = viewEdit.chapters().find(x => x.id === el.dataset.id);
      if (!c) return;
      const form = $('form[data-form="chapter"]');
      form.dataset.edit = c.id;
      $('#ch-title').value = c.title;
      $('#ch-text').value = c.text;
      setWhen(isScheduled(c) ? 'later' : c.status === 'ready' ? 'now' : 'draft', c.releaseAt);
      $('#chapter-form-title').textContent = 'Edit chapter ' + c.number;
      $('#ch-submit').textContent = 'Save chapter';
      $('#ch-cancel').hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (a === 'cancel-chapter') return resetChapterForm();
    if (a === 'delete-chapter') {
      if (!confirmTap(el)) return;
      await Store.deleteChapter(el.dataset.book, el.dataset.id);
      return toast('Chapter deleted');
    }
    if (a === 'set-status') {
      await Store.setStatus(el.dataset.id, el.dataset.status);
      const words = { approved: 'Approved', rejected: 'Rejected', removed: 'Removed' };
      return toast(words[el.dataset.status] || 'Saved');
    }

    if (a === 'request-author') {
      const on = el.dataset.on === '1';
      await Store.requestAuthor(me.id, on);
      return toast(on ? 'Request sent to the authors' : 'Request cancelled');
    }
    if (a === 'make-author') {
      if (!confirmTap(el, 'Tap again to confirm')) return;
      await Store.makeAuthor(el.dataset.id);
      return toast('They are an author now');
    }
    if (a === 'decline-author') {
      await Store.requestAuthor(el.dataset.id, false);
      return toast('Request declined');
    }

    if (a === 'buy') {
      const item = itemById(el.dataset.id);
      if (!item) return;
      const pts = myPoints();
      if (pts.balance < item.price) return toast(`You need ${item.price - pts.balance} more points.`);
      const drop = dropInfo();
      if (item.id.startsWith('drop-') && !(drop.live && drop.items.some(i => i.id === item.id))) return toast('This drop has closed.');
      if (!confirmTap(el, `Tap again to spend ${item.price}`)) return;
      try { await Store.buyItem(me.id, item.id); }
      catch (err) { return toast(item.id.startsWith('drop-') ? 'This drop has closed.' : errorText(err)); }
      return toast(item.slot === 'badge' ? `Unlocked ${item.name}! It shows on your dashboard.` : `Unlocked ${item.name}! Tap Wear to put it on.`);
    }
    if (a === 'remind-toggle') {
      const r = readReminder();
      r.on = !r.on;
      if (r.on) {
        // if today's reminder time has already passed, start from tomorrow
        const [h, m] = r.time.split(':').map(Number), now = new Date();
        r.lastShown = now.getHours() * 60 + now.getMinutes() >= h * 60 + m ? dayKey(now) : '';
        try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); } catch (err) { /* ignore */ }
      }
      saveReminder(r);
      if (viewDashboard.draw) viewDashboard.draw();
      return toast(r.on ? 'Daily reading reminder is on' : 'Reminder turned off');
    }
    if (a === 'remind-ics') { downloadICS(readReminder().time); return toast('Calendar file downloaded. Open it to add the reminder.'); }
    if (a === 'remind-close') { const b = $('#remind-pop'); if (b) b.hidden = true; return; }
    if (a === 'search-set') return viewSearch.setQuery(el.dataset.q);
    if (a === 'search-clear') return viewSearch.setQuery('');
    if (a === 'search-forget') { try { localStorage.removeItem('chapters-recent-search'); } catch (err) { /* ignore */ } return viewSearch.draw(); }
    if (a === 'search-opt') { searchState[el.dataset.key] = el.dataset.v; el.parentNode.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === el)); return viewSearch.draw(); }
    if (a === 'clear-hits') {
      document.querySelectorAll('mark.search-hit').forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
      el.closest('.hit-bar').remove();
      return;
    }
    if (a === 'drop-filter') { viewRewards.dropFilter = el.dataset.f; viewRewards.dropAll = false; return viewRewards.draw(); }
    if (a === 'drop-more') { viewRewards.dropAll = true; return viewRewards.draw(); }
    if (a === 'shop-filter') { viewRewards.filter = el.dataset.f; return viewRewards.draw(); }
    if (a === 'wear') {
      const special = Object.assign({}, (me.avatar && me.avatar.special) || {});
      if (el.dataset.on === '1') special[el.dataset.slot] = el.dataset.id; else delete special[el.dataset.slot];
      await Store.saveAvatar(me.id, Object.assign({}, me.avatar, { special }));
      return toast(el.dataset.on === '1' ? 'Looking good!' : 'Taken off');
    }
    if (a === 'avatar-special') {
      if (el.dataset.id) viewAvatar.draft.special[el.dataset.slot] = el.dataset.id;
      else delete viewAvatar.draft.special[el.dataset.slot];
      return viewAvatar.draw();
    }

    if (a === 'avatar-pick') {
      viewAvatar.draft[el.dataset.key] = Number(el.dataset.i);
      return viewAvatar.draw();
    }
    if (a === 'avatar-random') {
      AVATAR_PARTS.forEach(p => { viewAvatar.draft[p.key] = Math.floor(Math.random() * p.options.length); });
      return viewAvatar.draw();
    }
    if (a === 'avatar-save') {
      await Store.saveAvatar(me.id, { ...viewAvatar.draft });
      return toast('Avatar saved');
    }
  } catch (err) {
    if (/auth/.test(a) || a === 'forgot') showAuthError(errorText(err));
    else toast(errorText(err));
  }
});

function setWhen(when, releaseAt) {
  const r = document.querySelector(`input[name="ch-when"][value="${when}"]`);
  if (r) r.checked = true;
  const box = $('#schedule-at');
  if (box) box.hidden = when !== 'later';
  const at = $('#ch-at');
  if (at) {
    at.min = toLocalInput(Date.now() + 60e3);
    if (when === 'later') at.value = toLocalInput(releaseAt || (() => { const d = new Date(Date.now() + 864e5); d.setHours(18, 0, 0, 0); return d.getTime(); })());
  }
}
document.addEventListener('change', e => {
  if (e.target.name === 'ch-when') setWhen(e.target.value);
});

function resetChapterForm() {
  const form = $('form[data-form="chapter"]');
  if (!form) return;
  form.reset();
  setWhen('draft');
  form.dataset.edit = '';
  $('#chapter-form-title').textContent = 'Add a chapter';
  $('#ch-submit').textContent = 'Add chapter';
  $('#ch-cancel').hidden = true;
}

// ============================================================
//  FORMS
// ============================================================
document.addEventListener('submit', async e => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  const button = form.querySelector('[type="submit"]');
  if (button) button.disabled = true;
  try {
    if (kind === 'login') {
      await Store.signIn($('#login-email').value, $('#login-password').value);
    }
    if (kind === 'signup') {
      await Store.signUp($('#signup-name').value.trim(), $('#signup-email').value.trim(), $('#signup-password').value);
    }
    if (kind === 'book') {
      const checked = form.querySelector('input[name="cover"]:checked');
      const data = {
        title: form.querySelector('#book-title').value.trim(),
        description: form.querySelector('#book-desc').value.trim(),
        plannedChapters: Number(form.querySelector('#book-planned').value) || 1,
        coverImage: checked ? checked.value : 'cover-1'
      };
      if (form.dataset.id) {
        await Store.updateBook(form.dataset.id, data);
        toast('Details saved');
      } else {
        const id = await Store.createBook({ ...data, authorId: me.id, authorName: me.name, readyChapters: 0 });
        toast('Book created. Add your first chapter.');
        go('edit-' + id);
      }
    }
    if (kind === 'chapter') {
      const when = (form.querySelector('input[name="ch-when"]:checked') || {}).value || 'draft';
      let releaseAt = null;
      if (when === 'later') {
        releaseAt = new Date($('#ch-at').value).getTime();
        if (!releaseAt || releaseAt <= Date.now() + 30e3) { toast('Pick a release time in the future.'); return; }
      }
      const data = {
        title: $('#ch-title').value.trim(),
        text: $('#ch-text').value,
        status: when === 'draft' ? 'draft' : 'ready',
        releaseAt
      };
      if (form.dataset.edit) {
        await Store.updateChapter(form.dataset.book, form.dataset.edit, data);
        toast('Chapter saved');
      } else {
        await Store.addChapter(form.dataset.book, data);
        toast(releaseAt ? `Chapter scheduled for ${fmtWhen(releaseAt)}` : data.status === 'ready' ? 'Chapter added and ready for readers' : 'Chapter saved as a draft');
      }
      resetChapterForm();
    }
  } catch (err) {
    if (kind === 'login' || kind === 'signup') showAuthError(errorText(err));
    else toast(errorText(err));
  } finally {
    if (button && document.body.contains(button)) button.disabled = false;
  }
});

// clicking a search result: remember it, and where to jump in a chapter
document.addEventListener('click', e => {
  const r = e.target.closest('[data-result]');
  if (!r) return;
  saveRecent(searchState.q);
  if (r.dataset.jump) {
    const [bookId, num] = r.dataset.jump.split('|');
    searchState.jump = { bookId, number: Number(num), words: r.dataset.words.split(' ').filter(Boolean), query: searchState.q.trim() };
  }
});

// press "/" anywhere to search
document.addEventListener('keydown', e => {
  if (e.key !== '/' || !me || !canRead()) return;
  const t = e.target;
  if (t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
  e.preventDefault();
  if (location.hash === '#search') { const i = $('#search-input'); if (i) i.focus(); }
  else go('search');
});

// saving the reminder time
document.addEventListener('change', e => {
  if (e.target.id !== 'remind-time' || !e.target.value) return;
  const r = readReminder();
  r.time = e.target.value;
  r.lastShown = '';
  saveReminder(r);
  if (viewDashboard.draw) viewDashboard.draw();
  toast('Reminder time saved');
});

// the Library search box opens the search page as soon as you tap it
document.addEventListener('focusin', e => {
  if (e.target.id === 'lib-search') go('search');
});

// live cover title preview in the book form
document.addEventListener('input', e => {
  if (e.target.id === 'book-title') {
    const t = e.target.value || 'Your title';
    e.target.closest('form').querySelectorAll('.cover-option .cover-title').forEach(s => { s.textContent = t; });
  }
});

// ============================================================
//  START
// ============================================================
function setupGlobal() {
  stopGlobal();
  myProgress = {};
  users = [];
  owned = [];
  lastEarned = null;
  const refresh = () => {
    const pts = myPoints();
    const chapterPts = Math.floor(pts.credited / 2) * POINTS_PER_PAIR;
    if (lastEarned !== null && chapterPts > lastEarned) {
      const gained = chapterPts - lastEarned;
      setTimeout(() => toast(`+${gained} points! You have ${myPoints().balance} to spend.`), 700);
    }
    lastEarned = chapterPts;
    checkAchievements();
    progressListeners.forEach(fn => fn());
  };
  globalStops.push(Store.watchMyProgress(me.id, p => { myProgress = p; refresh(); }));
  globalStops.push(Store.watchOwned(me.id, list => { owned = list; refresh(); }));
  libraryBooks = []; myBooksAll = []; allProgressAll = [];
  unlocking.clear();
  if (canRead()) globalStops.push(Store.watchLibrary(list => { libraryBooks = list; noteReleases(list); checkAchievements(); }));
  if (isAuthor()) {
    globalStops.push(Store.watchMyBooks(me.id, list => { myBooksAll = list; checkAchievements(); }));
    globalStops.push(Store.watchAllProgress(list => { allProgressAll = list; checkAchievements(); }));
  }
  if (isAuthor()) {
    globalStops.push(Store.watchUsers(list => {
      users = list;
      updateHeader();
      if (viewReaders.draw) viewReaders.draw();
    }));
  }
}

window.addEventListener('hashchange', route);

// ---------- HUD clock in the header ----------
function tickClock() {
  const el = document.getElementById('hud-clock');
  if (!el) return;
  const now = new Date();
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const date = now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();
  el.dateTime = now.toISOString();
  el.innerHTML = `<span class="clock-time">${time}</span><span class="clock-date">${date}</span>`;
}
setInterval(tickClock, 1000);

window.startStore().then(store => {
  store.onAuth(user => {
    const key = user ? user.id + '|' + user.role + '|' + user.status : '';
    me = user;
    if (!user) {
      meKey = '';
      stopView();
      stopGlobal();
      document.body.classList.remove('reading');
      if (window.Player) Player.hide();
      renderAuth();
      return;
    }
    if (key !== meKey) {
      meKey = key;
      renderShell();
      setupGlobal();
      route();
      if (window.Player) Player.show();
    } else {
      updateHeader();
      drawAuthorAsk();
      checkAchievements();
      progressListeners.forEach(fn => fn());
    }
  });
}).catch(() => {
  $('#app').innerHTML = `<section class="narrow center stack"><h1>Couldn't start the app</h1>
    <p class="muted">Check your internet connection and the Firebase settings in js/config.js, then reload.</p></section>`;
});
