/* Dapur Kilat — render.js: membaca state dan menggambar DOM.
   Dipanggil tiap frame; hanya menulis teks/atribut yang berubah. */

function el(id) { return document.getElementById(id); }
function setText(id, text) {
  var node = el(id);
  if (node && node.textContent !== String(text)) node.textContent = text;
}
function fmtTime(seconds) {
  var s = Math.max(0, Math.ceil(seconds));
  var m = Math.floor(s / 60);
  var r = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
}

function renderHud(state) {
  setText('timer', fmtTime(state.timeLeft));
  setText('score', state.score);
  setText('combo', '×' + Math.max(1, state.combo));
  setText('served', state.served);
  setText('mistakes', state.mistakes);
  el('timerBox').classList.toggle('low', state.timeLeft <= 10 && state.screen === 'playing');
  el('rushBanner').classList.toggle('hidden', !state.rush || state.screen !== 'playing');
  el('muteBtn').textContent = isMuted() ? '🔇' : '🔊';
}

var lastOrderSignature = '';
function renderOrders(state) {
  var list = el('orderList');
  // Bangun ulang tiket hanya saat susunan pesanan berubah; kalau tidak,
  // cukup perbarui bar kesabaran agar klik tidak kehilangan elemennya.
  var signature = state.orders.map(function (o) { return o.uid + ':' + o.dishId; }).join('|')
    + '#active=' + state.activeOrderUid;
  if (signature !== lastOrderSignature) {
    lastOrderSignature = signature;
    var html = '';
    for (var i = 0; i < MAX_ORDERS; i++) {
      var order = state.orders[i];
      if (!order) {
        html += '<div class="order-empty">— slot kosong —</div>';
        continue;
      }
      var dish = dishById(order.dishId);
      var ings = dish.ingredients.map(function (id) { return ingredientById(id).emoji; }).join('');
      html += '<div class="order-ticket" data-order="' + order.uid + '">' +
        '<div class="ticket-dish">' + dish.emoji + ' ' + dish.name +
        '<span class="pts">+' + dish.points + ' pts</span></div>' +
        '<div class="ticket-ings">' + ings + '</div>' +
        '<div class="patience"><div class="patience-fill"></div></div>' +
        '<div class="ticket-customer">👤 ' + order.customer + '</div>' +
        '</div>';
    }
    list.innerHTML = html;
  }
  for (var j = 0; j < state.orders.length; j++) {
    var ticket = list.querySelector('[data-order="' + state.orders[j].uid + '"]');
    if (!ticket) continue;
    var frac = Math.max(0, state.orders[j].patience / state.orders[j].maxPatience);
    ticket.classList.toggle('active', state.orders[j].uid === state.activeOrderUid);
    ticket.classList.toggle('urgent', frac < 0.3);
    var fill = ticket.querySelector('.patience-fill');
    fill.style.width = Math.round(frac * 100) + '%';
    fill.className = 'patience-fill' + (frac < 0.3 ? ' crit' : frac < 0.55 ? ' warn' : '');
    var label = ticket.querySelector('.ticket-customer');
    var text = '👤 ' + state.orders[j].customer + ' • sabar ' + Math.ceil(state.orders[j].patience) + ' dtk';
    if (label.textContent !== text) label.textContent = text;
  }
}

function renderPantry(state) {
  var grid = el('pantryGrid');
  var needed = [];
  var order = activeOrder(state);
  if (order) needed = dishById(order.dishId).ingredients;
  var html = '';
  for (var i = 0; i < INGREDIENTS.length; i++) {
    var ing = INGREDIENTS[i];
    var slot = plateSlot(state, ing.id);
    var done = slot && slot.status !== 'waiting';
    var cls = 'pantry-btn' + (needed.indexOf(ing.id) !== -1 ? ' needed' : '') + (done ? ' used' : '');
    html += '<button class="' + cls + '" data-ing="' + ing.id + '">' +
      '<span class="ing-emoji">' + ing.emoji + '</span>' +
      '<span class="ing-name">' + ing.name + '</span><br>' +
      '<span class="ing-station">' + ing.hint + '</span></button>';
  }
  if (grid.innerHTML !== html) grid.innerHTML = html;
}

function renderStations(state) {
  [['chop', 'chopItem', 'chopFill'], ['cook', 'cookItem', 'cookFill']].forEach(function (row) {
    var key = row[0], itemId = row[1], fillId = row[2];
    var job = state.stations[key];
    var box = el(key === 'chop' ? 'chopStation' : 'cookStation');
    box.classList.toggle('busy', !!job);
    if (job) {
      var ing = ingredientById(job.ingId);
      setText(itemId, ing.emoji + ' ' + ing.name + '… ' + Math.round(job.progress * 100) + '%');
      el(fillId).style.width = Math.round(job.progress * 100) + '%';
    } else {
      setText(itemId, '— kosong —');
      el(fillId).style.width = '0%';
    }
  });
}

function renderPlate(state) {
  var order = activeOrder(state);
  var dish = order ? dishById(order.dishId) : null;
  setText('activeDish', dish ? dish.emoji + ' ' + dish.name + ' — di piring:' : 'Pilih pesanan dulu!');
  var slots = el('plateSlots');
  var html = '';
  if (state.plate) {
    for (var i = 0; i < state.plate.slots.length; i++) {
      var slot = state.plate.slots[i];
      var ing = ingredientById(slot.ingId);
      var mark = slot.status === 'ready' ? ' ✅' : slot.status === 'processing' ? ' ⏳' : '';
      html += '<div class="plate-slot ' + slot.status + '">' + ing.emoji +
        '<span class="slot-name">' + ing.name + mark + '</span></div>';
    }
  } else {
    html = '<div class="plate-slot waiting">🍽️<span class="slot-name">piring kosong</span></div>';
  }
  if (slots.innerHTML !== html) slots.innerHTML = html;
  el('serveBtn').disabled = !plateComplete(state);
}

function renderRecipes(state) {
  var list = el('recipeList');
  var html = '';
  for (var i = 0; i < DISHES.length; i++) {
    var dish = DISHES[i];
    var ings = dish.ingredients.map(function (id) { return ingredientById(id).emoji; }).join(' + ');
    html += '<div class="recipe-card">' +
      '<div class="dish-name">' + dish.emoji + ' ' + dish.name +
      '<span class="dish-pts">' + dish.points + ' pts</span></div>' +
      '<div class="dish-ings">' + ings + '</div>' +
      '<div class="dish-steps">' + dish.steps + '</div></div>';
  }
  if (list.innerHTML !== html) list.innerHTML = html;
}

var lastToastText = '';
var toastTimer = null;
function renderToast(state) {
  var toast = el('toast');
  var ev = state.lastEvent;
  // Dalam mode screenshot beku, toast disembunyikan agar tidak menutupi resep.
  if (!ev || state.frozen) { toast.classList.add('hidden'); return; }
  var key = ev.kind + ':' + ev.text;
  if (key !== lastToastText) {
    lastToastText = key;
    toast.textContent = ev.text;
    toast.className = ev.kind === 'good' ? 'good' : 'bad';
    toast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.add('hidden'); }, 2200);
  }
}

function renderOverlays(state) {
  el('startOverlay').classList.toggle('hidden', state.screen !== 'start');
  el('endOverlay').classList.toggle('hidden', state.screen !== 'over');
  el('pauseOverlay').classList.toggle('hidden', state.screen !== 'paused');
  if (state.screen === 'over') {
    var rows = [
      ['⭐ Skor akhir', state.score],
      ['🍽️ Hidangan tersaji', state.served],
      ['🔥 Kombo terbaik', '×' + Math.max(1, state.bestCombo)],
      ['✖️ Kesalahan', state.mistakes],
      ['😤 Pelanggan pergi', state.lost],
    ];
    var html = '';
    for (var i = 0; i < rows.length; i++) html += '<div>' + rows[i][0] + '<b>' + rows[i][1] + '</b></div>';
    var stats = el('finalStats');
    if (stats.innerHTML !== html) stats.innerHTML = html;
  }
}

function render(state) {
  renderHud(state);
  renderOrders(state);
  renderPantry(state);
  renderStations(state);
  renderPlate(state);
  renderRecipes(state);
  renderToast(state);
  renderOverlays(state);
}
