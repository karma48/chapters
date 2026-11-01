// ============================================================
//  MINI-PLAYER: listen to YouTube while reading or writing.
//
//  It lives outside the pages, so it keeps playing when you
//  move between the library, a book, or the editor.
//  YouTube's rules: the video must stay visible (at least
//  200px tall), so "minimise" only hides the controls.
//  The last few links are remembered on this device only.
// ============================================================

(function () {
  const KEY = 'chapters-player';
  let state = load();   // { link, recent: [], open, collapsed }
  let dock;

  function load() {
    try { return Object.assign({ link: '', recent: [], open: false, collapsed: false }, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { return { link: '', recent: [], open: false, collapsed: false }; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function esc(t) {
    return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Turn any YouTube link into an embed address (or null if it isn't one)
  function toEmbed(link) {
    let url;
    try { url = new URL(link.trim()); } catch (e) { return null; }
    const host = url.hostname.replace(/^www\.|^m\.|^music\./, '');
    const ok = /^[\w-]{6,64}$/;
    const params = 'autoplay=1&rel=0&playsinline=1&modestbranding=1';
    const list = url.searchParams.get('list');
    let id = null;
    if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else {
        const m = url.pathname.match(/^\/(shorts|live|embed)\/([\w-]+)/);
        if (m) id = m[2];
      }
      if (!id && url.pathname === '/playlist' && list && ok.test(list)) {
        return 'https://www.youtube-nocookie.com/embed/videoseries?list=' + list + '&' + params;
      }
    } else return null;
    if (!id || !ok.test(id)) return null;
    return 'https://www.youtube-nocookie.com/embed/' + id + '?' + params + (list && ok.test(list) ? '&list=' + list : '');
  }

  function build() {
    dock = document.createElement('div');
    dock.className = 'dock';
    dock.innerHTML = `
      <button class="dock-launch" data-player="toggle" aria-label="Music player" title="Music player">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="6.5" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="16" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </button>
      <section class="dock-panel" aria-label="Music player" hidden>
        <header class="dock-head">
          <span class="dock-title"><span class="dock-dot"></span>Audio link</span>
          <span class="row">
            <button class="dock-btn" data-player="collapse" aria-label="Hide controls">–</button>
            <button class="dock-btn" data-player="close" aria-label="Stop and close">×</button>
          </span>
        </header>
        <div class="dock-screen" id="dock-screen"></div>
        <form class="dock-form" data-player-form>
          <label class="sr-only" for="dock-link">YouTube link</label>
          <input id="dock-link" placeholder="Paste a YouTube link or playlist" autocomplete="off">
          <button class="btn small primary" type="submit">Play</button>
        </form>
        <p class="dock-error" id="dock-error" hidden>That isn't a YouTube link. Copy the address from YouTube and paste it here.</p>
        <div class="dock-recent" id="dock-recent"></div>
      </section>`;
    document.body.appendChild(dock);

    dock.addEventListener('click', e => {
      const b = e.target.closest('[data-player]');
      if (!b) return;
      const act = b.dataset.player;
      if (act === 'toggle') { state.open = !state.open; state.collapsed = false; }
      if (act === 'collapse') state.collapsed = !state.collapsed;
      if (act === 'close') { state.open = false; state.link = ''; }
      if (act === 'recent') { play(b.dataset.link); return; }
      save(); render();
    });
    dock.querySelector('[data-player-form]').addEventListener('submit', e => {
      e.preventDefault();
      play(dock.querySelector('#dock-link').value);
    });
  }

  function play(link) {
    const embed = toEmbed(link || '');
    const err = dock.querySelector('#dock-error');
    if (!embed) { err.hidden = false; return; }
    err.hidden = true;
    state.link = link.trim();
    state.recent = [state.link].concat(state.recent.filter(l => l !== state.link)).slice(0, 3);
    state.open = true;
    save();
    render(true);
  }

  let shownLink = null;
  function render(force) {
    const panel = dock.querySelector('.dock-panel');
    panel.hidden = !state.open;
    dock.classList.toggle('open', state.open);
    dock.classList.toggle('collapsed', state.collapsed);
    dock.querySelector('[data-player="collapse"]').textContent = state.collapsed ? '+' : '–';
    document.body.classList.toggle('dock-open', state.open);

    // Only rebuild the video when the link changes, so music doesn't restart
    const screen = dock.querySelector('#dock-screen');
    const link = state.open ? state.link : '';
    if (force || link !== shownLink) {
      shownLink = link;
      const embed = link && toEmbed(link);
      if (!embed) screen.innerHTML = `<div class="dock-empty"><span class="dock-ring"></span><span>Paste a link to start listening</span></div>`;
      // Claude's preview can't embed other sites, so offer the video in a new tab instead
      else if (window.PREVIEW_NO_EMBED) screen.innerHTML = `<div class="dock-empty"><span class="dock-ring spin"></span>
        <span>The player works on your live site. In this preview, open it on YouTube:</span>
        <a class="btn small primary" href="${esc(link)}" target="_blank" rel="noopener">Open on YouTube ↗</a></div>`;
      else screen.innerHTML = `<iframe src="${esc(embed)}" title="YouTube player" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    }
    dock.querySelector('#dock-recent').innerHTML = state.recent.length
      ? `<span class="dock-label">Recent</span>` + state.recent.map(l =>
          `<button class="dock-chip" data-player="recent" data-link="${esc(l)}" title="${esc(l)}">${esc(l.replace(/^https?:\/\/(www\.)?/, '').slice(0, 34))}</button>`).join('')
      : '';
  }

  window.Player = {
    toEmbed,   // exposed for tests
    show() { if (!dock) build(); dock.hidden = false; render(); },
    hide() { if (!dock) return; state.open = false; dock.hidden = true; render(); document.body.classList.remove('dock-open'); }
  };
})();
