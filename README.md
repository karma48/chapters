# Chapters

A shared ebook library. Authors publish books chapter by chapter, and approved readers read them on any phone or computer. Everything here is free and works on a Chromebook without Linux.

## What's in this folder

| File | What it does |
| --- | --- |
| `index.html` | The page that loads everything |
| `css/style.css` | All the colours, fonts and layout (dark mode included) |
| `js/config.js` | Your Firebase settings. Empty = demo mode |
| `js/store.js` | Saving and loading data (Firebase or demo) |
| `js/rewards.js` | Points, the Rewards shop and the Monthly Drop |
| `js/pirate.js` | The ~100-item Pirate Captain collection (November drop) |
| `js/achievements.js` | Achievement list, how each is checked, and badge pictures |
| `js/search.js` | The search engine: typo-tolerant matching, ranking and snippets |
| `js/avatar.js` | Draws the dress-up avatar |
| `js/player.js` | The YouTube mini-player |
| `js/app.js` | Every screen and button |
| `firestore.rules` | Security rules to paste into Firebase |

## Step 1: Try the demo

The app starts in **demo mode** when `js/config.js` has no Firebase settings. Demo data is saved only in your browser.

- Log in with a sample account: `meera@demo.app` or `kabir@demo.app` (authors), `riya@demo.app` (reader) or `sam@demo.app` (waiting for approval). The password for all of them is `demo123`.
- Open a **second tab**, log in as someone else, and publish a chapter. It shows up in the other tab straight away.
- To start the demo over, clear the site's data in Chrome (padlock icon in the address bar > Site settings > Delete data).

## Step 2: Put it on GitHub Pages

1. Make a free account at github.com.
2. Create a **new repository** called `chapters`. Keep it **Public** (Pages on private repos costs money).
3. Click **Add file > Upload files** and drag in everything from this folder (keep the `css` and `js` folders). Click **Commit changes**.
4. Go to **Settings > Pages**. Under "Branch", pick `main` and `/ (root)`, then **Save**.
5. Wait 1–2 minutes. Your app is at `https://YOUR-USERNAME.github.io/chapters/`.

To edit code later, open your repo and press the **.** (full stop) key. That opens github.dev, a code editor in the browser. Save, then **Commit** from the left sidebar. Pages updates in about a minute.

## Step 3: Turn on Firebase (do this with an adult)

Everything stays on the free **Spark** plan. Never click "Upgrade to Blaze", and don't turn on Storage or Functions.

1. Go to console.firebase.google.com and click **Create a project**. Analytics can be turned off.
2. **Build > Authentication > Get started**, then turn on **Email/Password**.
3. In Authentication, open **Settings > Authorized domains**, click **Add domain** and add `YOUR-USERNAME.github.io`.
4. **Build > Firestore Database > Create database**. Pick **production mode** and a location near you (for India: `asia-south1`, Mumbai).
5. In Firestore, open the **Rules** tab, delete what's there, paste everything from `firestore.rules`, and press **Publish**.
6. Go to **Project settings** (the gear) > **Your apps** > the **web** icon `</>`. Give it a name and register. Copy the `firebaseConfig` values.
7. Open `js/config.js` in github.dev and replace `null` with your settings, like the example in that file. Commit.

The Firebase settings are safe to have in a public repo. The security rules are what protect the data.

## Step 4: Make yourself the first author

1. Before uploading, put your email in `js/config.js` as `OWNER_EMAIL`.
2. Put the **same email** in `firestore.rules`, replacing `owner@example.com`. Publish the rules again.
3. Sign up on your live site with that email. You're an author straight away.

Do this before you share the link with anyone. After that, everything happens in the app:

- A reader taps **Ask to be an author** at the bottom of the Library.
- Any author sees the request at the top of the **Readers** tab and taps **Make author**.
- Authors can also tap **Make author** next to any approved reader.

## How the data is stored

| Collection | One record is | Fields |
| --- | --- | --- |
| `users` | One person | name, email, role, status, avatar, readDays, flags, achievements |
| `books` | One book | title, description, coverImage, authorId, authorName, status, plannedChapters, readyChapters, releases |
| `books/{id}/chapters` | One chapter | number, title, text, status, releaseAt |
| `progress` | One reader's record for one book | readerId, bookId, chaptersDone, pointChapters, lastChapterOpened, seconds, chapterSeconds, startedAt, lastReadAt |
| `users/{id}/items` | One unlocked reward | boughtAt |

## Dashboard, points and rewards

- **Dashboard** shows reading time, chapters read, books finished, points, a 14-day reading streak, and stats for every book you've started. Authors also see how readers are doing with their books.
- **Reading time** only counts while a chapter is open, the tab is in view, and you've scrolled or tapped in the last 2 minutes.
- **Points:** every 2 chapters read earns 10 points. A chapter counts once, and only after 1 minute of reading.
- **Rewards shop:** 25 items to spend points on: hats, face items, neck items, things for the back, things to hold, buddies and badges. Filter by slot or see only yours. Once unlocked, items are yours forever.
- **Monthly Drop:** special items you can only unlock on days 1–7 of a month. November's Pirate Captain drop has about 100 original items (hats, face items, outfits, boots, gear, buddies, and 10 rare gold ones), with filters, a set tracker, and a Crew Collector achievement for unlocking 10 from one drop. The security rules check Firebase's clock, so changing a phone's date doesn't open it early.

- **Achievements** unlock by themselves when you hit a milestone (chapters read, books finished, streaks, reading time, and author goals). Bronze gives 10 bonus points, Silver 25, Gold 50. Two are secret. To add one, add a line to the list in `js/achievements.js`.

### Adding next month's drop

Open `js/rewards.js`. Copy a block inside `DROPS`, change the key to the month (`"2027-1"` is January 2027, no leading zero), and start every item id with `drop-2027-1-`. Then draw each item in `ITEM_ART` at the bottom of the same file. Drops are already written for Nov 2026 (Pirate Captain), Dec 2026 (Space Explorer), Jan 2027 (Ninja Scroll) and Feb 2027 (Robot Lab).

## Date and time features

- **HUD clock:** the live time and date sit in the top bar.
- **Scheduled chapters:** when adding or editing a chapter, an author picks **Keep as draft**, **Publish now** or **Schedule** with a date and time. The chapter unlocks for every reader at that moment, on any device, even if the author is offline. Book pages show upcoming chapters with a countdown, and open pages update by themselves when a chapter unlocks.
  - Honest limit: the free Firebase plan can't run code on a timer, so scheduled chapters are hidden by the app until their time. Someone using browser developer tools could peek early. Fully locking them would need paid Cloud Functions.
- **Reading reminders:** on the Dashboard, pick a daily time and turn it on. If you haven't read yet that day, a reminder pops up (and a browser notification, if allowed) while Chapters is open. For reminders when the app is closed, use **Add to Google Calendar** or **Download calendar file**. Reminder settings are saved on each device.

## Search

Tap **Search** in the header, press **/** anywhere, or tap the box on the Library page.

- Searches book titles, authors, descriptions, chapter titles and the full text of every Ready chapter in published books.
- Small typos are fine (`lighthuose`, `robbot`), and partly typed words match (`light`).
- `"exact phrase"` finds those words together; `author:meera` (or `by:meera`) shows one author's books.
- Results are split into Authors, Books and Chapters, with matching words highlighted. Chapter results show a snippet, and opening one highlights the words inside the chapter and scrolls to the first match.
- Filter by reading status (not started, reading, finished), sort books by best match, newest or A–Z, and press **Enter** to open the top result.
- If nothing matches, it suggests a spelling ("Did you mean the map?"). Recent searches are remembered on each device.

Firebase's free plan has no full-text search, so the app loads published chapters when you open Search and searches them in the browser. That's fine for a family-and-friends library; with hundreds of long books it would start to slow down.

## Music player

The round music button in the corner opens a YouTube mini-player. Paste a video or playlist link and it keeps playing while you move around the app. YouTube needs the video to stay visible, so the minus button only hides the controls. It works on the live site, not in the Claude preview.

## Ideas for later (from the PRD extras)

- Unlock avatar items by reading (finish 5 chapters to get the cap)
- Install on the phone home screen (PWA)
