// เสียงประกอบทั้งหมดสร้างสดด้วย Web Audio (ไม่ใช้ไฟล์เสียง)
(function () {
  let ctx = null, master = null, muted = localStorage.getItem('qp_mute') === '1';
  let cur = null, step = 0, nextT = 0, btn = null;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC(); master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.6; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  const ready = () => ctx && ctx.state === 'running' && !muted;

  function tone(m, t, d, type, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v || 0.1, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  function slide(f1, f2, t, d, type, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sawtooth';
    o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.1, t + d * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  function kick(t) { slide(150, 42, t, 0.14, 'sine', 0.5); }
  function hat(t) {
    const n = Math.floor(ctx.sampleRate * 0.03), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = b; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = 0.05;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }

  const TRACKS = {
    lobby: { bpm: 112, len: 32, kick: true,
      lead: [72,0,76,0,79,0,76,0, 74,0,77,0,81,0,77,0, 72,0,76,79,84,0,79,76, 74,0,77,0,79,0,0,0],
      bass: [48,48,53,53,55,55,48,43] },
    question: { bpm: 150, len: 16, kick: true,
      lead: [69,72,76,72, 69,72,77,72, 67,71,74,71, 67,71,76,71],
      bass: [45,45,43,43] },
    board: { bpm: 100, len: 16, kick: false,
      lead: [72,0,76,0,79,0,76,0, 74,0,77,0,76,0,72,0],
      bass: [48,53,55,48] },
  };

  function play(tr, s, t, dur) {
    const i = s % tr.len, m = tr.lead[i];
    if (m) tone(m, t, dur * 1.7, 'square', 0.04);
    if (i % 4 === 0) { tone(tr.bass[(i / 4) % tr.bass.length], t, dur * 3.6, 'triangle', 0.13); if (tr.kick) kick(t); }
    if (i % 2 === 1 && tr.kick) hat(t);
  }
  setInterval(() => {
    if (!ready() || !cur) return;
    const tr = TRACKS[cur], dur = 60 / tr.bpm / 2;
    if (nextT < ctx.currentTime - 0.3) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.2) { play(tr, step, nextT, dur); nextT += dur; step++; }
  }, 40);

  const now = () => ctx.currentTime + 0.01;
  const FX = {
    click() { tone(84, now(), 0.06, 'square', 0.08); },
    join() { const t = now(); tone(76, t, 0.09, 'triangle', 0.16); tone(83, t + 0.08, 0.14, 'triangle', 0.16); },
    tick() { tone(88, now(), 0.04, 'square', 0.07); },
    whoosh() { const t = now(); slide(220, 900, t, 0.4, 'sawtooth', 0.07); tone(79, t + 0.38, 0.12, 'triangle', 0.12); },
    reveal() { const t = now(); tone(79, t, 0.12, 'triangle', 0.16); tone(84, t + 0.11, 0.3, 'triangle', 0.18); },
    correct() { const t = now(); [72, 76, 79, 84].forEach((m, i) => { tone(m, t + i * 0.09, 0.14, 'triangle', 0.2); tone(m + 12, t + i * 0.09, 0.1, 'square', 0.05); }); tone(88, t + 0.36, 0.5, 'triangle', 0.2); },
    wrong() { const t = now(); tone(55, t, 0.3, 'sawtooth', 0.12); tone(51, t + 0.16, 0.45, 'sawtooth', 0.12); },
    fanfare() {
      const t = now();
      [[72, 0, .14], [72, .16, .14], [72, .32, .14], [76, .48, .2], [79, .72, .2], [79, 1.0, .12], [84, 1.15, .9]].forEach(([m, o, d]) => {
        tone(m, t + o, d, 'square', 0.07); tone(m - 12, t + o, d, 'triangle', 0.16);
      });
      tone(88, t + 1.15, 0.9, 'triangle', 0.12);
    },
  };

  const SFX = { unlock: init };
  Object.keys(FX).forEach(k => { SFX[k] = () => { if (ready()) FX[k](); }; });
  SFX.music = name => { if (cur !== name) { cur = name; step = 0; nextT = 0; } };
  SFX.setMuted = b => {
    muted = b; localStorage.setItem('qp_mute', b ? '1' : '0');
    if (master) master.gain.value = b ? 0 : 0.6;
    if (btn) { btn.textContent = b ? '🔇' : '🔊'; btn.setAttribute('aria-label', b ? 'เปิดเสียง' : 'ปิดเสียง'); }
    if (!b) init();
  };
  function mount() {
    btn = document.createElement('button');
    const top = document.body.dataset.sfx === 'top';
    btn.style.cssText = 'position:fixed;right:10px;' + (top ? 'top:10px;width:40px;height:40px;font-size:1.15rem;' : 'bottom:12px;width:48px;height:48px;font-size:1.4rem;') + 'z-index:50;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;cursor:pointer';
    btn.onclick = e => { e.stopPropagation(); SFX.setMuted(!muted); };
    document.body.appendChild(btn); SFX.setMuted(muted);
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, init, { passive: true }));
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);
  window.SFX = SFX;
})();
