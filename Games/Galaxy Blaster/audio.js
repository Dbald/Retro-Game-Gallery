// audio.js - Web Audio API sound effects for Galaxy Blaster
const Audio = (() => {
    let ctx;
    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        return ctx;
    }
    function play(fn) {
        try { const c = getCtx(); if (c.state === 'suspended') c.resume(); fn(c); } catch(e) {}
    }
    function tone(c, freq, dur, type, vol, t) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type || 'square';
        const start = t || c.currentTime;
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(vol || 0.1, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        o.connect(g); g.connect(c.destination);
        o.start(start); o.stop(start + dur);
    }
    function noise(c, dur, vol, t) {
        const sr = c.sampleRate;
        const len = sr * dur;
        const buf = c.createBuffer(1, len, sr);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const n = c.createBufferSource();
        const g = c.createGain();
        n.buffer = buf;
        const start = t || c.currentTime;
        g.gain.setValueAtTime(vol || 0.08, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        n.connect(g); g.connect(c.destination);
        n.start(start); n.stop(start + dur);
    }
    return {
        laser() {
            play(c => {
                const o = c.createOscillator();
                const g = c.createGain();
                o.type = 'square';
                o.frequency.setValueAtTime(880, c.currentTime);
                o.frequency.exponentialRampToValueAtTime(220, c.currentTime + 0.08);
                g.gain.setValueAtTime(0.08, c.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
                o.connect(g); g.connect(c.destination);
                o.start(); o.stop(c.currentTime + 0.08);
            });
        },
        explosion() {
            play(c => {
                noise(c, 0.3, 0.15);
                tone(c, 80, 0.2, 'sawtooth', 0.12);
                tone(c, 50, 0.3, 'sine', 0.1);
            });
        },
        smallExplosion() {
            play(c => {
                noise(c, 0.12, 0.08);
                tone(c, 120, 0.1, 'square', 0.06);
            });
        },
        playerHit() {
            play(c => {
                noise(c, 0.2, 0.15);
                tone(c, 200, 0.15, 'sawtooth', 0.15);
                tone(c, 100, 0.25, 'square', 0.1);
            });
        },
        powerUp() {
            play(c => {
                [600, 800, 1000, 1200].forEach((f, i) => {
                    tone(c, f, 0.1, 'sine', 0.1, c.currentTime + i * 0.06);
                });
            });
        },
        waveClear() {
            play(c => {
                [500, 700, 900, 1100, 1400].forEach((f, i) => {
                    tone(c, f, 0.15, 'sine', 0.08, c.currentTime + i * 0.08);
                });
            });
        },
        gameOver() {
            play(c => {
                [400, 350, 300, 200, 150].forEach((f, i) => {
                    tone(c, f, 0.3, 'square', 0.12, c.currentTime + i * 0.2);
                });
            });
        },
        select() {
            play(c => { tone(c, 600, 0.06, 'square', 0.06); });
        },
        start() {
            play(c => {
                [500, 700, 1000].forEach((f, i) => {
                    tone(c, f, 0.12, 'square', 0.08, c.currentTime + i * 0.1);
                });
            });
        },
        enemyShoot() {
            play(c => {
                const o = c.createOscillator();
                const g = c.createGain();
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(300, c.currentTime);
                o.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.1);
                g.gain.setValueAtTime(0.05, c.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
                o.connect(g); g.connect(c.destination);
                o.start(); o.stop(c.currentTime + 0.1);
            });
        },
        shield() {
            play(c => { tone(c, 1000, 0.15, 'sine', 0.1); tone(c, 1200, 0.1, 'sine', 0.06, c.currentTime + 0.05); });
        }
    };
})();
