/* Dapur Kilat — state.js: mesin permainan. Tidak tahu apa-apa soal DOM;
   render.js yang membaca state ini dan menggambarnya. */

var nextOrderUid = 1;

function createState(seed) {
  return {
    screen: 'start',           // start | playing | paused | over
    seed: seed || 1,
    rng: mulberry32(seed || 1),
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    served: 0,
    mistakes: 0,
    lost: 0,
    orders: [],                // {uid, dishId, customer, patience, maxPatience}
    activeOrderUid: null,
    plate: null,               // {dishId, slots:[{ingId, status}]}
    stations: { chop: null, cook: null },  // {ingId, dishId, progress, duration}
    spawnTimer: 0,
    rush: false,
    servedByDish: {},
    frozen: false,             // mode screenshot: jam tidak jalan
    lastEvent: null,           // {kind, text} untuk toast
  };
}

function startGame(state) {
  var fresh = createState(state.seed);
  fresh.screen = 'playing';
  for (var k in fresh) state[k] = fresh[k];
  spawnOrder(state);
  spawnOrder(state);
  state.spawnTimer = ORDER_SPAWN_EVERY;
  state.lastEvent = { kind: 'good', text: 'Shift dimulai! Pilih pesanan 🍳' };
}

function patienceFor(state) {
  var progress = state.elapsed / SHIFT_SECONDS;
  return PATIENCE_BASE - (PATIENCE_BASE - PATIENCE_MIN) * progress;
}

function spawnOrder(state) {
  if (state.orders.length >= MAX_ORDERS) return false;
  // Hindari hidangan yang sama dengan pesanan yang sudah ada, bila masih ada pilihan.
  var taken = {};
  for (var i = 0; i < state.orders.length; i++) taken[state.orders[i].dishId] = true;
  var pool = [];
  for (var j = 0; j < DISHES.length; j++) if (!taken[DISHES[j].id]) pool.push(DISHES[j]);
  if (pool.length === 0) pool = DISHES;
  var dish = pool[Math.floor(state.rng() * pool.length)];
  var customer = CUSTOMERS[Math.floor(state.rng() * CUSTOMERS.length)];
  var patience = patienceFor(state);
  state.orders.push({
    uid: nextOrderUid++,
    dishId: dish.id,
    customer: customer,
    patience: patience,
    maxPatience: patience,
  });
  return true;
}

function activeOrder(state) {
  for (var i = 0; i < state.orders.length; i++) {
    if (state.orders[i].uid === state.activeOrderUid) return state.orders[i];
  }
  return null;
}

function selectOrder(state, uid) {
  var order = null;
  for (var i = 0; i < state.orders.length; i++) {
    if (state.orders[i].uid === uid) order = state.orders[i];
  }
  if (!order) return;
  if (state.activeOrderUid === uid) return;
  if (state.plate && state.plate.dishId !== order.dishId) {
    state.plate = null;
    state.stations.chop = null;
    state.stations.cook = null;
    state.lastEvent = { kind: 'bad', text: 'Piring dikosongkan — ganti pesanan' };
  }
  state.activeOrderUid = uid;
  if (!state.plate) {
    var dish = dishById(order.dishId);
    state.plate = {
      dishId: dish.id,
      slots: dish.ingredients.map(function (ingId) { return { ingId: ingId, status: 'waiting' }; }),
    };
  }
  soundClick();
}

function plateSlot(state, ingId) {
  if (!state.plate) return null;
  for (var i = 0; i < state.plate.slots.length; i++) {
    if (state.plate.slots[i].ingId === ingId) return state.plate.slots[i];
  }
  return null;
}

function mistake(state, text) {
  state.score = Math.max(0, state.score - MISTAKE_PENALTY);
  state.mistakes++;
  state.combo = 0;
  state.comboTimer = 0;
  state.lastEvent = { kind: 'bad', text: text + ' −' + MISTAKE_PENALTY };
  soundError();
}

function addIngredient(state, ingId) {
  if (state.screen !== 'playing') return;
  var order = activeOrder(state);
  if (!order) { state.lastEvent = { kind: 'bad', text: 'Pilih tiket pesanan dulu!' }; soundError(); return; }
  var dish = dishById(order.dishId);
  var ing = ingredientById(ingId);
  if (dish.ingredients.indexOf(ingId) === -1) {
    mistake(state, 'Bahan salah! ' + dish.name + ' tidak pakai ' + ing.name);
    return;
  }
  var slot = plateSlot(state, ingId);
  if (!slot || slot.status !== 'waiting') {
    state.lastEvent = { kind: 'bad', text: ing.name + ' sudah disiapkan' };
    return;
  }
  if (ing.station === 'raw') {
    slot.status = 'ready';
    state.lastEvent = { kind: 'good', text: ing.emoji + ' ' + ing.name + ' langsung ke piring' };
    soundClick();
    return;
  }
  var station = state.stations[ing.station];
  if (station) {
    state.lastEvent = { kind: 'bad', text: stationName(ing.station) + ' sedang sibuk!' };
    soundError();
    return;
  }
  slot.status = 'processing';
  state.stations[ing.station] = { ingId: ingId, dishId: dish.id, progress: 0, duration: ing.time };
  state.lastEvent = { kind: 'good', text: ing.emoji + ' ' + ing.name + ' → ' + stationName(ing.station) };
  if (ing.station === 'chop') soundChop(); else soundCook();
}

function plateComplete(state) {
  if (!state.plate) return false;
  for (var i = 0; i < state.plate.slots.length; i++) {
    if (state.plate.slots[i].status !== 'ready') return false;
  }
  return true;
}

function serveOrder(state) {
  if (state.screen !== 'playing') return;
  var order = activeOrder(state);
  if (!order || !plateComplete(state)) return;
  var dish = dishById(order.dishId);
  var speedBonus = Math.round(20 * (order.patience / order.maxPatience));
  var comboBonus = state.combo * 5;
  var gained = dish.points + speedBonus + comboBonus;
  state.score += gained;
  state.served++;
  state.servedByDish[dish.id] = (state.servedByDish[dish.id] || 0) + 1;
  if (state.comboTimer > 0) state.combo++; else state.combo = 1;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;
  state.comboTimer = COMBO_WINDOW;
  state.orders.splice(state.orders.indexOf(order), 1);
  state.activeOrderUid = null;
  state.plate = null;
  state.lastEvent = { kind: 'good', text: '✅ ' + dish.name + ' tersaji! +' + gained + (state.combo > 1 ? ' 🔥 kombo ×' + state.combo : '') };
  soundServe();
  spawnOrder(state);
}

function tick(state, dt) {
  if (state.screen !== 'playing' || state.frozen) return;
  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
  if (!state.rush && state.timeLeft <= RUSH_AT) {
    state.rush = true;
    state.lastEvent = { kind: 'good', text: '⚡ RUSH! 30 detik terakhir!' };
    soundTick();
  }
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  // Stasiun bekerja.
  ['chop', 'cook'].forEach(function (key) {
    var job = state.stations[key];
    if (!job) return;
    job.progress += dt / job.duration;
    if (job.progress >= 1) {
      var slot = plateSlot(state, job.ingId);
      if (slot && state.plate && state.plate.dishId === job.dishId) slot.status = 'ready';
      state.stations[key] = null;
      state.lastEvent = { kind: 'good', text: ingredientById(job.ingId).emoji + ' ' + ingredientById(job.ingId).name + ' siap!' };
      soundReady();
    }
  });
  // Kesabaran pelanggan menipis; RUSH mempercepat.
  var drain = state.rush ? 1.5 : 1;
  for (var i = state.orders.length - 1; i >= 0; i--) {
    var order = state.orders[i];
    order.patience -= dt * drain;
    if (order.patience <= 0) {
      state.orders.splice(i, 1);
      state.lost++;
      state.score = Math.max(0, state.score - EXPIRE_PENALTY);
      state.combo = 0;
      if (state.activeOrderUid === order.uid) { state.activeOrderUid = null; state.plate = null; }
      state.lastEvent = { kind: 'bad', text: '😤 ' + order.customer + ' pergi! −' + EXPIRE_PENALTY };
      soundError();
    }
  }
  // Pesanan baru.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnOrder(state);
    state.spawnTimer = state.rush ? RUSH_SPAWN_EVERY : ORDER_SPAWN_EVERY;
  }
  if (state.timeLeft <= 0) {
    state.screen = 'over';
    soundEnd();
  }
}
