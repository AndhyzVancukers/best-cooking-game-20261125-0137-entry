/* Dapur Kilat — config.js: data resep, bahan, dan konstanta permainan.
   Satu-satunya file yang tahu "apa" yang dimasak; state.js tahu "bagaimana" jalannya. */

var SHIFT_SECONDS = 120;      // satu shift kerja
var MAX_ORDERS = 3;           // tiket pesanan yang bisa aktif bersamaan
var ORDER_SPAWN_EVERY = 8;    // detik antar pesanan baru (lebih cepat saat RUSH)
var RUSH_AT = 30;             // sisa detik saat mode RUSH mulai
var RUSH_SPAWN_EVERY = 4.5;
var COMBO_WINDOW = 15;        // detik antar sajian agar kombo bertahan
var MISTAKE_PENALTY = 5;      // poin hilang per kesalahan
var EXPIRE_PENALTY = 10;      // poin hilang saat pesanan kedaluwarsa
var PATIENCE_BASE = 45;       // detik sabar pelanggan di awal shift
var PATIENCE_MIN = 28;        // sabar minimum di akhir shift

/* Bahan: station 'chop' = talenan, 'cook' = wajan, 'raw' = langsung ke piring. */
var INGREDIENTS = [
  { id: 'nasi',   name: 'Nasi',   emoji: '🍚', station: 'cook', time: 2.2, hint: 'Wajan' },
  { id: 'mie',    name: 'Mie',    emoji: '🍜', station: 'cook', time: 2.2, hint: 'Wajan' },
  { id: 'telur',  name: 'Telur',  emoji: '🥚', station: 'cook', time: 1.8, hint: 'Wajan' },
  { id: 'ayam',   name: 'Ayam',   emoji: '🍗', station: 'chop', time: 1.6, hint: 'Talenan' },
  { id: 'sayur',  name: 'Sayur',  emoji: '🥕', station: 'chop', time: 1.4, hint: 'Talenan' },
  { id: 'bawang', name: 'Bawang', emoji: '🧅', station: 'chop', time: 1.2, hint: 'Talenan' },
  { id: 'sambal', name: 'Sambal', emoji: '🌶️', station: 'raw',  time: 0,   hint: 'Langsung' },
];

/* Hidangan warung: 3 bahan, poin naik seiring rumitnya kombinasi stasiun. */
var DISHES = [
  { id: 'nasgor', name: 'Nasi Goreng', emoji: '🍛', points: 30,
    ingredients: ['nasi', 'telur', 'sambal'],
    steps: 'Nasi + Telur di wajan, Sambal langsung' },
  { id: 'miegor', name: 'Mie Goreng', emoji: '🍜', points: 40,
    ingredients: ['mie', 'sayur', 'telur'],
    steps: 'Mie + Telur di wajan, Sayur di talenan' },
  { id: 'geprek', name: 'Ayam Geprek', emoji: '🍗', points: 50,
    ingredients: ['ayam', 'sambal', 'nasi'],
    steps: 'Ayam di talenan, Nasi di wajan, Sambal langsung' },
  { id: 'capcay', name: 'Capcay', emoji: '🥗', points: 40,
    ingredients: ['sayur', 'mie', 'bawang'],
    steps: 'Sayur + Bawang di talenan, Mie di wajan' },
];

var CUSTOMERS = ['Bu Sari', 'Pak Budi', 'Mbak Rina', 'Mas Joko', 'Kak Dina', 'Om Agus', 'Neng Lia', 'Bang Eko'];

/* RNG deterministik (mulberry32) agar mode screenshot bisa diulang persis. */
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ingredientById(id) {
  for (var i = 0; i < INGREDIENTS.length; i++) if (INGREDIENTS[i].id === id) return INGREDIENTS[i];
  return null;
}
function dishById(id) {
  for (var i = 0; i < DISHES.length; i++) if (DISHES[i].id === id) return DISHES[i];
  return null;
}
function stationName(station) {
  return station === 'chop' ? 'Talenan 🔪' : station === 'cook' ? 'Wajan 🍳' : 'Piring 🍽️';
}
