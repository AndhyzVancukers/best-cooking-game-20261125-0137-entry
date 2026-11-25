/* Dapur Kilat — main.js: boot, loop utama, dan mode screenshot.
   Buka game/?shot=start|play|serve|end&seed=1 untuk keadaan beku yang bisa diulang. */

var gameState = null;

function bootGame() {
  var params = new URLSearchParams(window.location.search);
  var seed = parseInt(params.get('seed') || '1', 10) || 1;
  var shot = params.get('shot');
  gameState = createState(seed);
  bindInput(gameState);
  if (shot) {
    applyShot(gameState, shot);
    render(gameState);
  } else {
    render(gameState);
    var last = performance.now();
    (function loop(now) {
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tick(gameState, dt);
      render(gameState);
      requestAnimationFrame(loop);
    })(last);
  }
  // Pegangan untuk playtest otomatis: window.__game.
  window.__game = {
    state: gameState,
    start: function () { startGame(gameState); },
    selectOrder: function (uid) { selectOrder(gameState, uid); },
    addIngredient: function (id) { addIngredient(gameState, id); },
    serve: function () { serveOrder(gameState); },
    tick: function (dt) { tick(gameState, dt); },
    // Terapkan shot apa pun dari konsol.
    applyShot: function (name) { applyShot(gameState, name); render(gameState); },
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}
