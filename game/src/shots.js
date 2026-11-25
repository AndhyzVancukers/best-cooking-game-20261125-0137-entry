/* Dapur Kilat — shots.js: keadaan beku untuk screenshot (?shot=start|play|serve|end).
   Tiap shot membangun state yang sama persis dari seed yang sama, dan jam dibekukan
   (frozen) supaya tangkapan layar stabil dan bisa diulang. */

function shotOrder(state, dishId, customer, patienceFrac) {
  var patience = patienceFor(state) * patienceFrac;
  return {
    uid: nextOrderUid++,
    dishId: dishId,
    customer: customer,
    patience: patience,
    maxPatience: patienceFor(state),
  };
}

function shotStart(state) {
  state.screen = 'start';
  state.frozen = true;
}

function shotPlay(state) {
  state.screen = 'playing';
  state.frozen = true;
  state.elapsed = 28;
  state.timeLeft = SHIFT_SECONDS - 28;
  state.score = 120;
  state.combo = 2;
  state.comboTimer = 9;
  state.served = 3;
  state.mistakes = 1;
  state.orders = [
    shotOrder(state, 'nasgor', 'Bu Sari', 0.62),
    shotOrder(state, 'miegor', 'Pak Budi', 0.45),
    shotOrder(state, 'geprek', 'Mbak Rina', 0.80),
  ];
  state.activeOrderUid = state.orders[0].uid;
  state.plate = {
    dishId: 'nasgor',
    slots: [
      { ingId: 'nasi', status: 'ready' },
      { ingId: 'telur', status: 'processing' },
      { ingId: 'sambal', status: 'waiting' },
    ],
  };
  state.stations.cook = { ingId: 'telur', dishId: 'nasgor', progress: 0.6, duration: 1.8 };
  state.stations.chop = null;
  state.lastEvent = { kind: 'good', text: '🍳 Telur di wajan… 60%' };
}

function shotServe(state) {
  state.screen = 'playing';
  state.frozen = true;
  state.elapsed = 72;
  state.timeLeft = SHIFT_SECONDS - 72;
  state.score = 210;
  state.combo = 3;
  state.comboTimer = 11;
  state.served = 6;
  state.mistakes = 1;
  state.orders = [
    shotOrder(state, 'capcay', 'Mas Joko', 0.18),
    shotOrder(state, 'nasgor', 'Kak Dina', 0.70),
  ];
  state.activeOrderUid = state.orders[0].uid;
  state.plate = {
    dishId: 'capcay',
    slots: [
      { ingId: 'sayur', status: 'ready' },
      { ingId: 'mie', status: 'ready' },
      { ingId: 'bawang', status: 'ready' },
    ],
  };
  state.stations.chop = null;
  state.stations.cook = null;
  state.lastEvent = { kind: 'good', text: '✅ Capcay siap — SAJIKAN!' };
}

function shotEnd(state) {
  state.screen = 'over';
  state.frozen = true;
  state.elapsed = SHIFT_SECONDS;
  state.timeLeft = 0;
  state.score = 340;
  state.combo = 0;
  state.bestCombo = 4;
  state.served = 9;
  state.mistakes = 2;
  state.lost = 1;
  state.servedByDish = { nasgor: 3, miegor: 2, geprek: 2, capcay: 2 };
  state.orders = [];
  state.plate = null;
  state.lastEvent = null;
}

function applyShot(state, name) {
  if (name === 'start') shotStart(state);
  else if (name === 'play') shotPlay(state);
  else if (name === 'serve') shotServe(state);
  else if (name === 'end') shotEnd(state);
}
