// ============================================================
//  STORE: everything that saves or loads data lives here.
//
//  There are two versions with the SAME functions:
//   - FirebaseStore: real accounts, shared by every device
//   - DemoStore:     saved in this browser only (for practice)
//
//  The rest of the app only calls Store.something(), so it
//  doesn't care which one is running.
//
//  "watch..." functions call your callback now AND every time
//  the data changes (live updates). They return a function
//  you call to stop watching.
// ============================================================

const DEFAULT_AVATAR = {
  skin: 1, hairStyle: 0, hairColor: 1, eyes: 0, mouth: 0,
  top: 0, topColor: 0, bottom: 0, shoes: 0, accessory: 0
};

// "2026-11-01" for a date, in the reader's own time zone
window.dayKey = function (d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

function isOwnerEmail(email) {
  const owner = String(window.OWNER_EMAIL || '').trim().toLowerCase();
  return !!owner && String(email).trim().toLowerCase() === owner;
}
function byNumber(a, b) { return a.number - b.number; }

// Scheduled chapters: a book keeps "releases" (future release times).
// When a release time passes, that chapter counts as ready.
function bookOut(b) {
  if (!b) return b;
  const now = Date.now(), rel = b.releases || [];
  return { ...b, readyChapters: (b.readyChapters || 0) + rel.filter(t => t <= now).length, releases: rel.filter(t => t > now) };
}
function newestFirst(a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); }

// ------------------------------------------------------------
//  FIREBASE STORE
// ------------------------------------------------------------
async function createFirebaseStore(config) {
  const V = '10.12.2';
  const base = 'https://www.gstatic.com/firebasejs/' + V + '/';
  const { initializeApp } = await import(base + 'firebase-app.js');
  const A = await import(base + 'firebase-auth.js');
  const F = await import(base + 'firebase-firestore.js');

  const app = initializeApp(config);
  const auth = A.getAuth(app);
  // Keep a copy of data on this device: pages open faster, it keeps
  // working when Wi-Fi drops, and it uses fewer free Firestore reads.
  let db;
  try {
    db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  } catch (e) {
    db = F.getFirestore(app);
  }

  const listOf = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const now = () => Date.now();

  return {
    mode: 'firebase',

    // ---------- accounts ----------
    onAuth(cb) {
      let stopProfile = null;
      return A.onAuthStateChanged(auth, user => {
        if (stopProfile) { stopProfile(); stopProfile = null; }
        if (!user) { cb(null); return; }
        // Watch our own profile, so approval shows up instantly.
        // If the profile never appears (sign-up stopped halfway), say so
        // instead of loading forever.
        let missingTimer = null;
        const missing = () => cb({ id: user.uid, name: user.email || 'New reader', role: 'reader', status: 'missing', avatar: DEFAULT_AVATAR });
        stopProfile = F.onSnapshot(F.doc(db, 'users', user.uid), snap => {
          clearTimeout(missingTimer);
          if (snap.exists()) cb({ id: user.uid, ...snap.data() });
          else missingTimer = setTimeout(missing, 4000);
        }, () => missing());
      });
    },
    async signUp(name, email, password) {
      const cred = await A.createUserWithEmailAndPassword(auth, email, password);
      // Everyone starts as a waiting reader, except the owner email
      // in config.js, which becomes the first author.
      const owner = isOwnerEmail(email);
      await F.setDoc(F.doc(db, 'users', cred.user.uid), {
        name, email, role: owner ? 'author' : 'reader', status: owner ? 'approved' : 'waiting',
        avatar: DEFAULT_AVATAR, createdAt: now()
      });
    },
    signIn: (email, password) => A.signInWithEmailAndPassword(auth, email, password),
    signOut: () => A.signOut(auth),
    resetPassword: email => A.sendPasswordResetEmail(auth, email),

    // ---------- users (authors manage readers) ----------
    watchUsers(cb) {
      return F.onSnapshot(F.collection(db, 'users'), s => cb(listOf(s)));
    },
    setStatus: (uid, status) => F.updateDoc(F.doc(db, 'users', uid), { status }),
    saveAvatar: (uid, avatar) => F.updateDoc(F.doc(db, 'users', uid), { avatar }),
    // a reader asks (or stops asking) to become an author
    requestAuthor: (uid, on) => F.updateDoc(F.doc(db, 'users', uid), { authorRequest: on }),
    // an author turns a reader into an author
    makeAuthor: uid => F.updateDoc(F.doc(db, 'users', uid), { role: 'author', status: 'approved', authorRequest: false }),

    // ---------- books ----------
    watchLibrary(cb) {
      const q = F.query(F.collection(db, 'books'), F.where('status', '==', 'published'));
      return F.onSnapshot(q, s => cb(listOf(s).map(bookOut).sort(newestFirst)));
    },
    watchMyBooks(uid, cb) {
      const q = F.query(F.collection(db, 'books'), F.where('authorId', '==', uid));
      return F.onSnapshot(q, s => cb(listOf(s).map(bookOut).sort(newestFirst)));
    },
    watchBook(id, cb) {
      return F.onSnapshot(F.doc(db, 'books', id),
        s => cb(s.exists() ? bookOut({ id: s.id, ...s.data() }) : null),
        () => cb(null));
    },
    async createBook(data) {
      const ref = await F.addDoc(F.collection(db, 'books'), { ...data, status: 'draft', updatedAt: now() });
      return ref.id;
    },
    updateBook: (id, patch) => F.updateDoc(F.doc(db, 'books', id), { ...patch, updatedAt: now() }),
    async deleteBook(id) {
      const chs = await F.getDocs(F.collection(db, 'books', id, 'chapters'));
      const batch = F.writeBatch(db);
      chs.forEach(c => batch.delete(c.ref));
      batch.delete(F.doc(db, 'books', id));
      await batch.commit();
    },

    // ---------- chapters ----------
    watchChapters(bookId, includeDrafts, cb) {
      const col = F.collection(db, 'books', bookId, 'chapters');
      const q = includeDrafts ? col : F.query(col, F.where('status', '==', 'ready'));
      return F.onSnapshot(q, s => cb(listOf(s).sort(byNumber)), () => cb([]));
    },
    async addChapter(bookId, data) {
      const col = F.collection(db, 'books', bookId, 'chapters');
      const all = await F.getDocs(col);
      const number = all.docs.reduce((m, d) => Math.max(m, d.data().number || 0), 0) + 1;
      await F.addDoc(col, { ...data, number, updatedAt: now() });
      await F.updateDoc(F.doc(db, 'books', bookId), { updatedAt: now() });
    },
    updateChapter: (bookId, id, patch) =>
      F.updateDoc(F.doc(db, 'books', bookId, 'chapters', id), { ...patch, updatedAt: now() }),
    deleteChapter: (bookId, id) => F.deleteDoc(F.doc(db, 'books', bookId, 'chapters', id)),

    // ---------- progress ----------
    watchMyProgress(uid, cb) {
      const q = F.query(F.collection(db, 'progress'), F.where('readerId', '==', uid));
      return F.onSnapshot(q, s => {
        const map = {};
        listOf(s).forEach(p => { map[p.bookId] = p; });
        cb(map);
      });
    },
    watchBookProgress(bookId, cb) {
      const q = F.query(F.collection(db, 'progress'), F.where('bookId', '==', bookId));
      return F.onSnapshot(q, s => cb(listOf(s)), () => cb([]));
    },
    watchAllProgress(cb) { // authors only: stats for their books
      return F.onSnapshot(F.collection(db, 'progress'), s => cb(listOf(s)), () => cb([]));
    },
    // credit = true means this chapter earns points (it is never removed)
    setChapterDone(uid, bookId, number, done, credit) {
      const data = { readerId: uid, bookId, chaptersDone: done ? F.arrayUnion(number) : F.arrayRemove(number) };
      if (credit) data.pointChapters = F.arrayUnion(number);
      return F.setDoc(F.doc(db, 'progress', uid + '_' + bookId), data, { merge: true });
    },
    setLastOpened(uid, bookId, number, isNew) {
      const data = { readerId: uid, bookId, lastChapterOpened: number, lastReadAt: now() };
      if (isNew) data.startedAt = now();
      return F.setDoc(F.doc(db, 'progress', uid + '_' + bookId), data, { merge: true });
    },
    addReadingTime(uid, bookId, number, seconds) {
      return F.setDoc(F.doc(db, 'progress', uid + '_' + bookId), {
        readerId: uid, bookId, lastReadAt: now(),
        seconds: F.increment(seconds),
        chapterSeconds: { [String(number)]: F.increment(seconds) }
      }, { merge: true });
    },
    markDay: (uid, day) => F.updateDoc(F.doc(db, 'users', uid), { readDays: F.arrayUnion(day) }),
    addFlag: (uid, flag) => F.updateDoc(F.doc(db, 'users', uid), { flags: F.arrayUnion(flag) }),
    unlockAchievements: (uid, ids) => F.updateDoc(F.doc(db, 'users', uid), { achievements: F.arrayUnion(...ids) }),

    // ---------- rewards ----------
    watchOwned(uid, cb) {
      return F.onSnapshot(F.collection(db, 'users', uid, 'items'), s => cb(s.docs.map(d => d.id)), () => cb([]));
    },
    buyItem: (uid, itemId) => F.setDoc(F.doc(db, 'users', uid, 'items', itemId), { boughtAt: now() })
  };
}

// ------------------------------------------------------------
//  DEMO STORE (browser only, for practice)
// ------------------------------------------------------------
function createDemoStore() {
  const KEY = 'chapters-demo-v5';
  const SESSION = 'chapters-demo-session';
  const watchers = new Set();
  let authCb = null;

  // Safe storage helpers (storage can be blocked in some browsers)
  function read(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function write(store, key, val) { try { store.setItem(key, val); } catch (e) { /* memory only */ } }
  function remove(store, key) { try { store.removeItem(key); } catch (e) { /* ignore */ } }
  const local = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const session = (() => { try { return window.sessionStorage; } catch (e) { return null; } })();

  let memorySession = null;
  let db = load();

  function load() {
    const raw = local && read(local, KEY);
    if (raw) { try { return JSON.parse(raw); } catch (e) { /* fall through */ } }
    return seed();
  }
  function save() {
    if (local) write(local, KEY, JSON.stringify(db));
    notify();
  }
  function notify() {
    watchers.forEach(w => w());
    if (authCb) authCb(currentUser());
  }
  function uid() { return Math.random().toString(36).slice(2, 12); }
  function currentId() { return (session && read(session, SESSION)) || memorySession; }
  function setSession(id) {
    memorySession = id;
    if (session) { id ? write(session, SESSION, id) : remove(session, SESSION); }
  }
  function currentUser() {
    const id = currentId();
    return id && db.users[id] ? { id, ...db.users[id] } : null;
  }
  function watch(fn) {
    fn();
    watchers.add(fn);
    return () => watchers.delete(fn);
  }
  const wait = () => new Promise(r => setTimeout(r, 120));
  function prog(id, bookId) {
    const key = id + '_' + bookId;
    return db.progress[key] || (db.progress[key] = { readerId: id, bookId, chaptersDone: [] });
  }
  const values = obj => Object.entries(obj).map(([id, v]) => ({ id, ...v }));

  // Another tab changed the data: reload and update the screen.
  window.addEventListener('storage', e => {
    if (e.key === KEY) { db = load(); notify(); }
  });

  return {
    mode: 'demo',

    onAuth(cb) { authCb = cb; cb(currentUser()); return () => { authCb = null; }; },
    async signUp(name, email, password) {
      await wait();
      email = email.trim().toLowerCase();
      if (db.logins[email]) throw { code: 'auth/email-already-in-use' };
      if (password.length < 6) throw { code: 'auth/weak-password' };
      const id = uid();
      const owner = isOwnerEmail(email);
      db.users[id] = { name, email, role: owner ? 'author' : 'reader', status: owner ? 'approved' : 'waiting', avatar: { ...DEFAULT_AVATAR }, createdAt: Date.now() };
      db.logins[email] = { id, password };
      setSession(id);
      save();
    },
    async signIn(email, password) {
      await wait();
      const login = db.logins[email.trim().toLowerCase()];
      if (!login || login.password !== password) throw { code: 'auth/invalid-credential' };
      setSession(login.id);
      notify();
    },
    async signOut() { setSession(null); notify(); },
    async resetPassword() { await wait(); },

    watchUsers(cb) { return watch(() => cb(values(db.users))); },
    async setStatus(id, status) { db.users[id].status = status; save(); },
    async saveAvatar(id, avatar) { db.users[id].avatar = avatar; save(); },
    async requestAuthor(id, on) { db.users[id].authorRequest = on; save(); },
    async makeAuthor(id) { Object.assign(db.users[id], { role: 'author', status: 'approved', authorRequest: false }); save(); },

    watchLibrary(cb) {
      return watch(() => cb(values(db.books).filter(b => b.status === 'published').map(bookOut).sort(newestFirst)));
    },
    watchMyBooks(id, cb) {
      return watch(() => cb(values(db.books).filter(b => b.authorId === id).map(bookOut).sort(newestFirst)));
    },
    watchBook(id, cb) { return watch(() => cb(db.books[id] ? bookOut({ id, ...db.books[id] }) : null)); },
    async createBook(data) {
      const id = uid();
      db.books[id] = { ...data, status: 'draft', updatedAt: Date.now() };
      save();
      return id;
    },
    async updateBook(id, patch) { Object.assign(db.books[id], patch, { updatedAt: Date.now() }); save(); },
    async deleteBook(id) {
      delete db.books[id];
      Object.keys(db.chapters).forEach(c => { if (db.chapters[c].bookId === id) delete db.chapters[c]; });
      save();
    },

    watchChapters(bookId, includeDrafts, cb) {
      return watch(() => cb(values(db.chapters)
        .filter(c => c.bookId === bookId && (includeDrafts || c.status === 'ready'))
        .sort(byNumber)));
    },
    async addChapter(bookId, data) {
      const number = values(db.chapters).filter(c => c.bookId === bookId)
        .reduce((m, c) => Math.max(m, c.number), 0) + 1;
      db.chapters[uid()] = { ...data, bookId, number, updatedAt: Date.now() };
      db.books[bookId].updatedAt = Date.now();
      save();
    },
    async updateChapter(bookId, id, patch) { Object.assign(db.chapters[id], patch, { updatedAt: Date.now() }); save(); },
    async deleteChapter(bookId, id) { delete db.chapters[id]; save(); },

    watchMyProgress(id, cb) {
      return watch(() => {
        const map = {};
        values(db.progress).filter(p => p.readerId === id).forEach(p => { map[p.bookId] = p; });
        cb(map);
      });
    },
    watchBookProgress(bookId, cb) {
      return watch(() => cb(values(db.progress).filter(p => p.bookId === bookId)));
    },
    watchAllProgress(cb) { return watch(() => cb(values(db.progress))); },
    async setChapterDone(id, bookId, number, done, credit) {
      const p = prog(id, bookId);
      p.chaptersDone = (p.chaptersDone || []).filter(n => n !== number);
      if (done) p.chaptersDone.push(number);
      if (credit && !(p.pointChapters || []).includes(number)) p.pointChapters = (p.pointChapters || []).concat(number);
      save();
    },
    async setLastOpened(id, bookId, number, isNew) {
      const p = prog(id, bookId);
      p.lastChapterOpened = number;
      p.lastReadAt = Date.now();
      if (isNew || !p.startedAt) p.startedAt = Date.now();
      save();
    },
    async addReadingTime(id, bookId, number, seconds) {
      const p = prog(id, bookId);
      p.seconds = (p.seconds || 0) + seconds;
      p.chapterSeconds = p.chapterSeconds || {};
      p.chapterSeconds[number] = (p.chapterSeconds[number] || 0) + seconds;
      p.lastReadAt = Date.now();
      save();
    },
    async markDay(id, day) {
      const u = db.users[id];
      u.readDays = (u.readDays || []).filter(d => d !== day).concat(day);
      save();
    },

    async addFlag(id, flag) {
      const u = db.users[id];
      if (!(u.flags || []).includes(flag)) { u.flags = (u.flags || []).concat(flag); save(); }
    },
    async unlockAchievements(id, ids) {
      const u = db.users[id];
      u.achievements = Array.from(new Set((u.achievements || []).concat(ids)));
      save();
    },

    watchOwned(id, cb) { return watch(() => cb((db.users[id] && db.users[id].owned) || [])); },
    async buyItem(id, itemId) {
      const u = db.users[id];
      if (!(u.owned || []).includes(itemId)) u.owned = (u.owned || []).concat(itemId);
      save();
    },

    // Extra for demo mode: start over with the sample data
    resetDemo() { db = seed(); setSession(null); save(); }
  };
}

// Sample data so the demo has something to read
function seed() {
  const t = Date.now();
  const DAY = 864e5;
  const day = n => window.dayKey(new Date(t - n * DAY));
  // demo: one chapter unlocks 2 minutes after you first open the demo, one in 2 days at 6 pm
  const soon2m = t + 2 * 60e3;
  const d2 = new Date(t + 2 * DAY); d2.setHours(18, 0, 0, 0);
  const soon2d = d2.getTime();
  const av = (o) => ({ ...DEFAULT_AVATAR, ...o });
  return {
    logins: {
      'meera@demo.app': { id: 'u_meera', password: 'demo123' },
      'kabir@demo.app': { id: 'u_kabir', password: 'demo123' },
      'riya@demo.app': { id: 'u_riya', password: 'demo123' },
      'sam@demo.app': { id: 'u_sam', password: 'demo123' }
    },
    users: {
      u_meera: { name: 'Meera', email: 'meera@demo.app', role: 'author', status: 'approved', avatar: av({ skin: 1, hairStyle: 1, hairColor: 0, top: 1, topColor: 3, bottom: 2, accessory: 1 }) },
      u_kabir: { name: 'Kabir', email: 'kabir@demo.app', role: 'author', status: 'approved', avatar: av({ skin: 2, hairStyle: 2, hairColor: 0, topColor: 1, accessory: 3 }) },
      // Riya has demo bonus points so you can try the Rewards shop
      u_riya: { name: 'Riya', email: 'riya@demo.app', role: 'reader', status: 'approved', avatar: av({ skin: 0, hairStyle: 3, hairColor: 2, top: 2, topColor: 2, bottom: 1, shoes: 2 }),
        bonusPoints: 150, owned: ['badge-bookworm'], readDays: [day(1), day(2), day(3)] },
      u_sam: { name: 'Sam', email: 'sam@demo.app', role: 'reader', status: 'waiting', avatar: av({ skin: 3, hairStyle: 0, accessory: 2 }) }
    },
    books: {
      b_light: {
        title: "The Lighthouse Keeper's Map", authorId: 'u_meera', authorName: 'Meera',
        description: 'A girl finds a map hidden inside an old lighthouse, and it shows an island that is not on any chart.',
        coverImage: 'cover-1', plannedChapters: 5, readyChapters: 3, releases: [soon2d], status: 'published', updatedAt: t
      },
      b_robots: {
        title: 'Robots of Rainy Street', authorId: 'u_kabir', authorName: 'Kabir',
        description: 'Every robot on Rainy Street has one job. Bolt the delivery robot wants a second one.',
        coverImage: 'cover-4', plannedChapters: 4, readyChapters: 2, releases: [soon2m], status: 'published', updatedAt: t - 1000
      },
      b_space: {
        title: 'Untitled Space Story', authorId: 'u_meera', authorName: 'Meera',
        description: 'Still being written.', coverImage: 'cover-6', plannedChapters: 6, readyChapters: 0, status: 'draft', updatedAt: t - 2000
      }
    },
    chapters: {
      c1: { bookId: 'b_light', number: 1, status: 'ready', title: 'The Locked Room', updatedAt: t,
        text: "Nobody had climbed the lighthouse in eleven years, so when Anu found the key under the third step, she did not tell anyone.\n\nThe door at the top was painted the same grey as the sea in winter. It opened with a cough of dust. Inside there was a desk, a broken telescope, and a tin box with a sailing ship on the lid.\n\nThe box was not locked. That was the first strange thing. The second strange thing was the map." },
      c2: { bookId: 'b_light', number: 2, status: 'ready', title: 'An Island Called Nowhere', updatedAt: t,
        text: "The map was drawn in brown ink on paper as soft as cloth. It showed the bay, the harbour and the lighthouse itself, all exactly right.\n\nBut past the harbour wall, where Anu knew there was only open water, the map showed an island shaped like a sleeping cat. Someone had written a name beside it in tiny letters: Nowhere.\n\nAnu held the map up to the window. Out on the water, just for a second, the fog thinned, and she saw a dark shape on the horizon." },
      c3: { bookId: 'b_light', number: 3, status: 'ready', title: 'Grandpa Remembers', updatedAt: t,
        text: "\"Where did you get that?\" Grandpa asked. His tea went cold in his hand.\n\nAnu told him everything. He listened without interrupting, which he never did.\n\nWhen she finished, he walked to the cupboard and took down a photograph she had never seen. It showed a young man standing on a beach beside a rock shaped like a cat's ear. On the back, in the same brown ink, someone had written: Nowhere, 1971." },
      c4: { bookId: 'b_light', number: 4, status: 'ready', releaseAt: soon2d, title: 'The Boat', updatedAt: t,
        text: "Grandpa's boat had not left the shed since the summer Anu was born.\n\nThey pulled the cover off together. Under the dust, the paint was still blue, and someone had carved a small cat's ear into the bow." },
      r1: { bookId: 'b_robots', number: 1, status: 'ready', title: 'Bolt Delivers', updatedAt: t,
        text: "Bolt delivered forty-two parcels every day, rain or shine. On Rainy Street, it was always rain.\n\nHe was good at it. He never dropped a box and never rang the wrong bell. But at the end of each day, when he rolled back to the charging dock, he watched the painting robot across the road and wondered what it felt like to make something new." },
      r2: { bookId: 'b_robots', number: 2, status: 'ready', title: 'A Paintbrush in a Parcel', updatedAt: t,
        text: "Parcel forty-three was not on the list.\n\nIt was small, wrapped in newspaper, and addressed simply to: The Delivery Robot. Inside was a paintbrush with a red handle and a note that said: Everyone deserves a second job.\n\nBolt looked up and down the street. The painting robot waved." },
      r3: { bookId: 'b_robots', number: 3, status: 'ready', releaseAt: soon2m, title: 'First Colours', updatedAt: t,
        text: "Bolt's first painting was a wobbly blue square.\n\nThe painting robot studied it for a long time. Then it nodded, picked up a brush of its own, and added one small yellow dot in the corner. \"Now it has a sun,\" it said." }
    },
    progress: {
      u_riya_b_light: { readerId: 'u_riya', bookId: 'b_light', chaptersDone: [1, 2], pointChapters: [1, 2], lastChapterOpened: 3,
        seconds: 1260, chapterSeconds: { 1: 540, 2: 720 }, startedAt: t - 3 * DAY, lastReadAt: t - DAY },
      u_riya_b_robots: { readerId: 'u_riya', bookId: 'b_robots', chaptersDone: [1], pointChapters: [1], lastChapterOpened: 2,
        seconds: 410, chapterSeconds: { 1: 410 }, startedAt: t - 2 * DAY, lastReadAt: t - 2 * 3600e3 }
    }
  };
}

// Pick the right store when the app starts
window.startStore = async function () {
  if (window.FIREBASE_CONFIG) {
    window.Store = await createFirebaseStore(window.FIREBASE_CONFIG);
  } else {
    window.Store = createDemoStore();
  }
  return window.Store;
};
window.DEFAULT_AVATAR = DEFAULT_AVATAR;
