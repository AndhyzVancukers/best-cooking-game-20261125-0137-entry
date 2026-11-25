/* Dapur Kilat — input.js: semua kendali mouse dan keyboard.
   Satu titik masuk: bindInput(state) dipanggil sekali saat boot. */

function bindInput(state) {
  // Papan pesanan: klik tiket memilih hidangan aktif.
  el('orderList').addEventListener('click', function (ev) {
    var ticket = ev.target.closest('[data-order]');
    if (!ticket) return;
    ensureAudio();
    selectOrder(state, Number(ticket.getAttribute('data-order')));
  });

  // Pantry: klik bahan menambahkannya ke piring (lewat stasiun bila perlu).
  el('pantryGrid').addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-ing]');
    if (!btn) return;
    ensureAudio();
    addIngredient(state, btn.getAttribute('data-ing'));
  });

  // Stasiun: klik stasiun yang salah tidak menghukum; hanya memberi tahu.
  // (Bahan masuk stasiun lewat pantry; klik stasiun memberi petunjuk bila kosong.)
  ['chopStation', 'cookStation'].forEach(function (id) {
    el(id).addEventListener('click', function () {
      ensureAudio();
      if (state.screen !== 'playing') return;
      var key = id === 'chopStation' ? 'chop' : 'cook';
      var job = state.stations[key];
      if (!job) {
        state.lastEvent = { kind: 'bad', text: stationName(key) + ' kosong — ambil bahan dari Pantry dulu' };
        soundError();
      }
    });
  });

  // Sajikan!
  el('serveBtn').addEventListener('click', function () {
    ensureAudio();
    serveOrder(state);
  });

  // Tombol-tombol overlay dan HUD.
  el('startBtn').addEventListener('click', function () {
    ensureAudio();
    soundStart();
    startGame(state);
  });
  el('restartBtn').addEventListener('click', function () {
    ensureAudio();
    soundStart();
    startGame(state);
  });
  el('resumeBtn').addEventListener('click', function () {
    if (state.screen === 'paused') { state.screen = 'playing'; soundClick(); }
  });
  el('pauseBtn').addEventListener('click', function () {
    if (state.screen === 'playing') { state.screen = 'paused'; soundClick(); }
    else if (state.screen === 'paused') { state.screen = 'playing'; soundClick(); }
  });
  el('muteBtn').addEventListener('click', function () {
    setMuted(!isMuted());
    if (!isMuted()) soundClick();
  });

  // Keyboard: 1–4 pilih pesanan, Spasi sajikan, P jeda, M bisu.
  document.addEventListener('keydown', function (ev) {
    if (ev.key >= '1' && ev.key <= '4') {
      var order = state.orders[Number(ev.key) - 1];
      if (order && state.screen === 'playing') { ensureAudio(); selectOrder(state, order.uid); }
    } else if (ev.code === 'Space') {
      ev.preventDefault();
      if (state.screen === 'start') { ensureAudio(); soundStart(); startGame(state); }
      else if (state.screen === 'playing') { ensureAudio(); serveOrder(state); }
      else if (state.screen === 'over') { ensureAudio(); soundStart(); startGame(state); }
    } else if (ev.key === 'p' || ev.key === 'P') {
      if (state.screen === 'playing') state.screen = 'paused';
      else if (state.screen === 'paused') state.screen = 'playing';
    } else if (ev.key === 'm' || ev.key === 'M') {
      setMuted(!isMuted());
    }
  });
}
