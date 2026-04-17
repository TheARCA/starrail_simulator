let audioCtx = null;

export let analyser = null;
export let dataArray = null;

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }
}

function playTone(type, startFreq, endFreq, duration, vol = 0.1) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.connect(gain);
  gain.connect(analyser);

  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(startFreq, now);
  if (endFreq)
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.start(now);
  osc.stop(now + duration);
}

export function playUIClick() {
  playTone("sine", 800, 1200, 0.05, 0.05);
}

export function playUIHover() {
  playTone("triangle", 400, 400, 0.02, 0.02);
}

export function playAttackDash() {
  playTone("triangle", 300, 50, 0.15, 0.1);
}

export function playHeavyHit() {
  playTone("square", 150, 40, 0.2, 0.15);
}

export function playBreak() {
  playTone("sawtooth", 1200, 200, 0.4, 0.2);
}

export function playUltimateCharge() {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.connect(gain);
  gain.connect(analyser);

  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(100, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.8);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.2);
  gain.gain.linearRampToValueAtTime(0, now + 0.8);

  osc.start(now);
  osc.stop(now + 0.8);
}
