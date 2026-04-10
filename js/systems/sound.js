// js/systems/sound.js

let audioCtx = null;

// Browsers block audio until the user interacts with the page.
// We will call this on the very first click/keypress.
export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(type, startFreq, endFreq, duration, vol = 0.1) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(startFreq, now);
  if (endFreq)
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

  // Sharp attack, smooth fade out to prevent clicking
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.start(now);
  osc.stop(now + duration);
}

// --- THE SOUND LIBRARY ---

export function playUIClick() {
  // High, short sci-fi beep
  playTone("sine", 800, 1200, 0.05, 0.05);
}

export function playUIHover() {
  // Very soft, low click for mousing over things
  playTone("triangle", 400, 400, 0.02, 0.02);
}

export function playAttackDash() {
  // A quick, kinetic swoosh
  playTone("triangle", 300, 50, 0.15, 0.1);
}

export function playHeavyHit() {
  // A deep, bass-heavy crunch
  playTone("square", 150, 40, 0.2, 0.15);
}

export function playBreak() {
  // A high, shattering electronic screech
  playTone("sawtooth", 1200, 200, 0.4, 0.2);
}

export function playUltimateCharge() {
  // A rising, cinematic energy build-up
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(100, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.8);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.2);
  gain.gain.linearRampToValueAtTime(0, now + 0.8);

  osc.start(now);
  osc.stop(now + 0.8);
}
