/* Dapur Kilat — audio.js: semua suara dibuat dengan WebAudio, tanpa file suara.
   AudioContext dibuat saat gestur pertama (klik/tombol), sesuai aturan browser. */

var audioCtx = null;
var audioMuted = false;

function ensureAudio() {
  if (!audioCtx) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    } catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function setMuted(muted) { audioMuted = !!muted; }
function isMuted() { return audioMuted; }

/* Satu nada pendek: osilator + amplop turun cepat. */
function blip(freq, dur, type, vol, when) {
  if (audioMuted) return;
  var ctx = ensureAudio();
  if (!ctx) return;
  var t0 = ctx.currentTime + (when || 0);
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol || 0.12, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/* Desis wajan: noise putih singkat lewat filter band-pass. */
function sizzle(dur) {
  if (audioMuted) return;
  var ctx = ensureAudio();
  if (!ctx) return;
  var len = Math.floor(ctx.sampleRate * dur);
  var buf = ctx.createBuffer(1, len, ctx.sampleRate);
  var data = buf.getChannelData(0);
  for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  var src = ctx.createBufferSource();
  src.buffer = buf;
  var filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 5200;
  var gain = ctx.createGain();
  gain.gain.value = 0.10;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

/* Suara-suara dapur, masing-masing satu gestur bunyi yang gampang dikenali. */
function soundClick()  { blip(660, 0.06, 'triangle', 0.08); }
function soundChop()  { blip(180, 0.07, 'square', 0.10); blip(120, 0.09, 'square', 0.08, 0.05); }
function soundCook()  { sizzle(0.5); }
function soundReady() { blip(880, 0.10, 'sine', 0.12); blip(1320, 0.14, 'sine', 0.10, 0.09); }
function soundServe() { blip(523, 0.10, 'sine', 0.13); blip(659, 0.10, 'sine', 0.13, 0.09); blip(784, 0.18, 'sine', 0.14, 0.18); }
function soundError() { blip(160, 0.22, 'sawtooth', 0.10); blip(110, 0.26, 'sawtooth', 0.09, 0.10); }
function soundTick()  { blip(980, 0.05, 'square', 0.05); }
function soundStart() { blip(392, 0.10, 'sine', 0.12); blip(523, 0.10, 'sine', 0.12, 0.09); blip(659, 0.16, 'sine', 0.13, 0.18); }
function soundEnd()   { blip(659, 0.14, 'sine', 0.12); blip(523, 0.14, 'sine', 0.12, 0.13); blip(392, 0.26, 'sine', 0.13, 0.26); }
