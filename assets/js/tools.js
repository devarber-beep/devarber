(function () {
    const catalog = document.getElementById("toolsCatalog");
    const panels = document.getElementById("toolPanels");
    if (!catalog || !panels) return;

    const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const CAMELOT_MAJ = ["8B", "3B", "10B", "5B", "12B", "7B", "2B", "9B", "4B", "11B", "6B", "1B"];
    const CAMELOT_MIN = ["5A", "12A", "7A", "2A", "9A", "4A", "11A", "6A", "1A", "8A", "3A", "10A"];
    const NS = "http://www.w3.org/2000/svg";

    document.querySelectorAll("[data-open-tool]").forEach((card) => {
        card.addEventListener("click", (e) => {
            e.preventDefault();
            openTool(card.getAttribute("data-open-tool"));
        });
    });
    document.querySelectorAll(".tool-back").forEach((btn) => {
        btn.addEventListener("click", () => {
            catalog.style.display = "";
            panels.querySelectorAll(".tool-panel").forEach((p) => p.classList.remove("active"));
            history.replaceState(null, "", location.pathname);
            stopMetro();
        });
    });
    function openTool(id) {
        catalog.style.display = "none";
        panels.querySelectorAll(".tool-panel").forEach((p) => p.classList.toggle("active", p.dataset.tool === id));
        history.replaceState(null, "", "#" + id);
    }
    const hash = (location.hash || "").replace("#", "");
    if (hash && panels.querySelector('[data-tool="' + hash + '"]')) openTool(hash);

    function fillNoteSelect(el) {
        if (!el || el.options.length) return;
        NOTES.forEach((n) => {
            const o = document.createElement("option");
            o.value = n;
            o.textContent = n;
            el.appendChild(o);
        });
    }

    let toneCtx = null;
    function playPitch(note) {
        const i = NOTES.indexOf(note);
        if (i < 0) return;
        if (!toneCtx) toneCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o = toneCtx.createOscillator();
        const g = toneCtx.createGain();
        o.type = "sine";
        o.frequency.value = 261.63 * Math.pow(2, i / 12);
        g.gain.value = 0.09;
        o.connect(g);
        g.connect(toneCtx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.001, toneCtx.currentTime + 0.28);
        o.stop(toneCtx.currentTime + 0.3);
    }

    function buildPiano(host) {
        if (!host || host.dataset.built === "1") return host;
        host.dataset.built = "1";
        host.innerHTML = "";
        const whites = ["C", "D", "E", "F", "G", "A", "B"];
        const nWhite = 14;
        for (let o = 0; o < 2; o++) {
            whites.forEach((n) => {
                const b = document.createElement("button");
                b.type = "button";
                b.className = "piano-key white";
                b.dataset.note = n;
                b.setAttribute("aria-label", n);
                b.textContent = n;
                host.appendChild(b);
            });
        }
        const blacks = [[0, "C#"], [1, "D#"], [3, "F#"], [4, "G#"], [5, "A#"]];
        const wPct = 100 / nWhite;
        const bw = wPct * 0.62;
        for (let o = 0; o < 2; o++) {
            blacks.forEach(([idx, n]) => {
                const i = idx + o * 7;
                const k = document.createElement("button");
                k.type = "button";
                k.className = "piano-key black";
                k.dataset.note = n;
                k.setAttribute("aria-label", n);
                k.style.left = ((i + 1) * wPct - bw / 2) + "%";
                k.style.width = bw + "%";
                host.appendChild(k);
            });
        }
        host.querySelectorAll(".piano-key").forEach((k) => {
            k.addEventListener("click", () => playPitch(k.dataset.note));
        });
        return host;
    }

    function paintPiano(host, notes, marks) {
        if (!host) return;
        buildPiano(host);
        const set = new Set(notes || []);
        marks = marks || {};
        host.querySelectorAll(".piano-key").forEach((k) => {
            const n = k.dataset.note;
            const role = marks[n];
            k.classList.toggle("on", set.has(n) && !role);
            k.classList.toggle("root", role === "root" || role === "from");
            k.classList.toggle("to", role === "to");
            if (!role && set.has(n) && marks.root === n) k.classList.add("root");
        });
    }

    function paintPills(host, notes, root) {
        if (!host) return;
        host.innerHTML = "";
        notes.forEach((n) => {
            const s = document.createElement("span");
            s.className = "note-pill" + (n === root ? " root" : "");
            s.textContent = n;
            host.appendChild(s);
        });
    }

    function polar(cx, cy, r, deg) {
        const a = ((deg - 90) * Math.PI) / 180;
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }
    function wedgePath(cx, cy, r0, r1, a0, a1) {
        const [x0, y0] = polar(cx, cy, r1, a0);
        const [x1, y1] = polar(cx, cy, r1, a1);
        const [x2, y2] = polar(cx, cy, r0, a1);
        const [x3, y3] = polar(cx, cy, r0, a0);
        return "M" + x0 + " " + y0 + " A" + r1 + " " + r1 + " 0 0 1 " + x1 + " " + y1 +
            " L" + x2 + " " + y2 + " A" + r0 + " " + r0 + " 0 0 0 " + x3 + " " + y3 + " Z";
    }
    function codeToValue(code) {
        const n = parseInt(code, 10);
        const letter = code.slice(-1);
        const arr = letter === "B" ? CAMELOT_MAJ : CAMELOT_MIN;
        const i = arr.indexOf(String(n) + letter);
        if (i < 0) return "C|maj";
        return NOTES[i] + "|" + (letter === "B" ? "maj" : "min");
    }

    function buildCamelot(host) {
        if (!host || host.dataset.built === "1") return;
        host.dataset.built = "1";
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", "0 0 320 320");
        svg.setAttribute("aria-label", "Camelot");
        const cx = 160, cy = 160;
        const rings = [
            { letter: "B", r0: 100, r1: 148, lr: 124 },
            { letter: "A", r0: 54, r1: 100, lr: 77 }
        ];
        rings.forEach((ring) => {
            for (let n = 1; n <= 12; n++) {
                const mid = (n % 12) * 30;
                const a0 = mid - 15;
                const a1 = mid + 15;
                const code = n + ring.letter;
                const p = document.createElementNS(NS, "path");
                p.setAttribute("d", wedgePath(cx, cy, ring.r0, ring.r1, a0, a1));
                p.setAttribute("class", "cam-slice");
                p.dataset.cam = code;
                p.addEventListener("click", () => {
                    const sel = document.getElementById("camKey");
                    if (!sel) return;
                    sel.value = codeToValue(code);
                    sel.dispatchEvent(new Event("change"));
                });
                svg.appendChild(p);
                const [tx, ty] = polar(cx, cy, ring.lr, mid);
                const t = document.createElementNS(NS, "text");
                t.setAttribute("x", tx);
                t.setAttribute("y", ty);
                t.setAttribute("class", "cam-lab");
                t.dataset.cam = code;
                t.textContent = code;
                svg.appendChild(t);
            }
        });
        const hub = document.createElementNS(NS, "circle");
        hub.setAttribute("cx", cx);
        hub.setAttribute("cy", cy);
        hub.setAttribute("r", 48);
        hub.setAttribute("class", "cam-hub");
        svg.appendChild(hub);
        const hubTxt = document.createElementNS(NS, "text");
        hubTxt.setAttribute("x", cx);
        hubTxt.setAttribute("y", cy - 4);
        hubTxt.setAttribute("class", "cam-hub-txt");
        hubTxt.id = "camHub";
        hubTxt.textContent = "8B";
        svg.appendChild(hubTxt);
        const hubSub = document.createElementNS(NS, "text");
        hubSub.setAttribute("x", cx);
        hubSub.setAttribute("y", cy + 16);
        hubSub.setAttribute("class", "cam-hub-sub");
        hubSub.id = "camHubSub";
        hubSub.textContent = "C maj";
        svg.appendChild(hubSub);
        host.appendChild(svg);
    }

    let bpmTaps = [];
    const bpmOut = document.getElementById("bpmOut");
    const bpmNum = document.getElementById("bpmNum");
    const bpmTap = document.getElementById("bpmTap");
    bpmTap?.addEventListener("click", () => {
        const now = Date.now();
        bpmTaps = bpmTaps.filter((t0) => now - t0 < 5000);
        bpmTaps.push(now);
        bpmTap.classList.remove("pulse");
        void bpmTap.offsetWidth;
        bpmTap.classList.add("pulse");
        if (bpmTaps.length < 2) {
            if (bpmOut) bpmOut.textContent = "Sigue.";
            return;
        }
        let sum = 0;
        for (let i = 1; i < bpmTaps.length; i++) sum += bpmTaps[i] - bpmTaps[i - 1];
        const bpm = Math.round(60000 / (sum / (bpmTaps.length - 1)));
        if (bpmNum) bpmNum.textContent = String(bpm);
        if (bpmOut) bpmOut.textContent = bpmTaps.length + " taps";
    });
    document.getElementById("bpmReset")?.addEventListener("click", () => {
        bpmTaps = [];
        if (bpmNum) bpmNum.textContent = "—";
        if (bpmOut) bpmOut.textContent = "Pulsa al ritmo.";
    });

    const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    const keyOut = document.getElementById("keyOut");

    function fftRadix2(re, im) {
        const n = re.length;
        for (let i = 1, j = 0; i < n; i++) {
            let bit = n >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                [re[i], re[j]] = [re[j], re[i]];
                [im[i], im[j]] = [im[j], im[i]];
            }
        }
        for (let len = 2; len <= n; len <<= 1) {
            const ang = (-2 * Math.PI) / len;
            const wlenRe = Math.cos(ang);
            const wlenIm = Math.sin(ang);
            for (let i = 0; i < n; i += len) {
                let wRe = 1;
                let wIm = 0;
                for (let j = 0; j < len / 2; j++) {
                    const uRe = re[i + j];
                    const uIm = im[i + j];
                    const vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm;
                    const vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe;
                    re[i + j] = uRe + vRe;
                    im[i + j] = uIm + vIm;
                    re[i + j + len / 2] = uRe - vRe;
                    im[i + j + len / 2] = uIm - vIm;
                    const nWRe = wRe * wlenRe - wIm * wlenIm;
                    wIm = wRe * wlenIm + wIm * wlenRe;
                    wRe = nWRe;
                }
            }
        }
    }
    function rotate(prof, k) {
        const out = new Array(12);
        for (let i = 0; i < 12; i++) out[i] = prof[(i - k + 12) % 12];
        return out;
    }
    function corr(a, b) {
        let ma = 0, mb = 0;
        for (let i = 0; i < 12; i++) { ma += a[i]; mb += b[i]; }
        ma /= 12; mb /= 12;
        let num = 0, da = 0, db = 0;
        for (let i = 0; i < 12; i++) {
            const xa = a[i] - ma, xb = b[i] - mb;
            num += xa * xb; da += xa * xa; db += xb * xb;
        }
        return num / Math.sqrt((da * db) || 1e-9);
    }
    function estimateKey(buffer) {
        const nCh = buffer.numberOfChannels;
        const sr = buffer.sampleRate;
        const total = buffer.length;
        const skip = Math.min(Math.floor(sr * 8), Math.max(0, Math.floor(total * 0.12)));
        const take = Math.min(Math.floor(sr * 25), Math.max(0, total - skip));
        const N = 4096;
        if (take < N) throw new Error("Audio demasiado corto");
        const hop = 2048;
        const chroma = new Float64Array(12);
        const re = new Float64Array(N);
        const im = new Float64Array(N);
        const hann = new Float64Array(N);
        for (let i = 0; i < N; i++) hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
        const ch0 = buffer.getChannelData(0);
        const ch1 = nCh > 1 ? buffer.getChannelData(1) : null;
        for (let start = skip; start + N < skip + take; start += hop) {
            for (let i = 0; i < N; i++) {
                const s = ch1 ? (ch0[start + i] + ch1[start + i]) * 0.5 : ch0[start + i];
                re[i] = s * hann[i];
                im[i] = 0;
            }
            fftRadix2(re, im);
            for (let i = 1; i < N / 2; i++) {
                const freq = (i * sr) / N;
                if (freq < 65 || freq > 1800) continue;
                const mag2 = re[i] * re[i] + im[i] * im[i];
                const pc = ((Math.round(12 * Math.log2(freq / 440)) + 9) % 12 + 12) % 12;
                chroma[pc] += mag2;
            }
        }
        let best = { score: -2, name: "?", camelot: "?", note: "C", mode: "maj" };
        let second = -2;
        for (let k = 0; k < 12; k++) {
            const sMaj = corr(chroma, rotate(MAJOR, k));
            const sMin = corr(chroma, rotate(MINOR, k));
            const tryKey = (score, mode) => {
                if (score > best.score) {
                    second = best.score;
                    best = {
                        score,
                        note: NOTES[k],
                        mode,
                        name: NOTES[k] + (mode === "maj"
                            ? (window.currentLang === "en" ? " major" : " mayor")
                            : (window.currentLang === "en" ? " minor" : " menor")),
                        camelot: mode === "maj" ? CAMELOT_MAJ[k] : CAMELOT_MIN[k]
                    };
                } else if (score > second) second = score;
            };
            tryKey(sMaj, "maj");
            tryKey(sMin, "min");
        }
        const en = window.currentLang === "en";
        const gap = best.score - second;
        const conf = gap > 0.12 ? (en ? "high" : "alta") : gap > 0.06 ? (en ? "medium" : "media") : (en ? "low" : "baja");
        return { ...best, conf };
    }

    const SCALES = {
        maj: [0, 2, 4, 5, 7, 9, 11],
        min: [0, 2, 3, 5, 7, 8, 10],
        dor: [0, 2, 3, 5, 7, 9, 10],
        pen: [0, 3, 5, 7, 10]
    };

    document.getElementById("keyFile")?.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 30 * 1024 * 1024) {
            keyOut.textContent = "Archivo demasiado grande (máx. 30 MB).";
            return;
        }
        keyOut.textContent = "Analizando…";
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const buf = await file.arrayBuffer();
            const audio = await ctx.decodeAudioData(buf.slice(0));
            const r = estimateKey(audio);
            const en = window.currentLang === "en";
            const result = document.getElementById("keyResult");
            const nameEl = document.getElementById("keyName");
            const camEl = document.getElementById("keyCam");
            const piano = document.getElementById("keyPiano");
            if (result) result.hidden = false;
            if (nameEl) nameEl.textContent = r.name;
            if (camEl) camEl.textContent = "Camelot " + r.camelot;
            if (piano) {
                piano.hidden = false;
                const iv = SCALES[r.mode] || SCALES.maj;
                const i = NOTES.indexOf(r.note);
                const notes = iv.map((s) => NOTES[(i + s) % 12]);
                paintPiano(piano, notes, { [r.note]: "root", root: r.note });
            }
            keyOut.textContent = (en ? "Confidence " : "Confianza ") + r.conf + " · " + (en ? "Local estimate." : "Estimación local.");
            ctx.close();
        } catch (err) {
            keyOut.textContent = "No pude leer el audio. Prueba wav o mp3.\n" + (err.message || "");
        }
    });

    let metroTimer = 0;
    let metroCtx = null;
    let metroBeat = 0;
    const metroToggle = document.getElementById("metroToggle");
    const metroOut = document.getElementById("metroOut");
    const metroDots = document.querySelectorAll("#metroBeats span");
    function paintMetroBeats(playing) {
        metroDots.forEach((s, i) => s.classList.toggle("on", playing && i === metroBeat));
    }
    function clickClick() {
        if (!metroCtx) metroCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o = metroCtx.createOscillator();
        const g = metroCtx.createGain();
        o.frequency.value = metroBeat === 0 ? 1280 : 1000;
        o.type = "square";
        g.gain.value = 0.08;
        o.connect(g);
        g.connect(metroCtx.destination);
        o.start();
        o.stop(metroCtx.currentTime + 0.04);
        paintMetroBeats(true);
        metroBeat = (metroBeat + 1) % 4;
    }
    function stopMetro() {
        if (metroTimer) {
            clearInterval(metroTimer);
            metroTimer = 0;
        }
        metroBeat = 0;
        paintMetroBeats(false);
        if (metroToggle) metroToggle.textContent = "Play";
        const bpm = Number(document.getElementById("metroBpm")?.value) || 120;
        if (metroOut) metroOut.textContent = bpm + " BPM · parado";
    }
    metroToggle?.addEventListener("click", () => {
        if (metroTimer) {
            stopMetro();
            return;
        }
        const bpm = Math.max(40, Math.min(240, Number(document.getElementById("metroBpm").value) || 120));
        metroBeat = 0;
        clickClick();
        metroTimer = setInterval(clickClick, 60000 / bpm);
        metroToggle.textContent = "Stop";
        metroOut.textContent = bpm + " BPM · sonando";
    });
    document.getElementById("metroBpm")?.addEventListener("input", () => {
        if (!metroTimer) {
            const bpm = Number(document.getElementById("metroBpm").value) || 120;
            metroOut.textContent = bpm + " BPM · parado";
            return;
        }
        stopMetro();
        metroToggle.click();
    });

    function paintDelay() {
        const bpm = Math.max(40, Math.min(240, Number(document.getElementById("delayBpm")?.value) || 128));
        const q = 60000 / bpm;
        const rows = [
            ["1/4", q, 1],
            ["1/8", q / 2, 0.5],
            ["1/16", q / 4, 0.25],
            ["1/8T", q / 3, 1 / 3],
            ["1/8D", q * 0.75, 0.75],
            ["1/4T", (q * 2) / 3, 2 / 3]
        ];
        const host = document.getElementById("delayBars");
        if (host) {
            host.innerHTML = "";
            rows.forEach(([lab, ms, w]) => {
                const row = document.createElement("div");
                row.className = "delay-row";
                row.innerHTML = "<span>" + lab + "</span><div class=\"delay-track\"><div class=\"delay-fill\" style=\"width:" + (w * 100) + "%\"></div></div><b>" + Math.round(ms) + " ms</b>";
                host.appendChild(row);
            });
        }
        const el = document.getElementById("delayOut");
        if (el) el.textContent = bpm + " BPM";
    }
    document.getElementById("delayBpm")?.addEventListener("input", paintDelay);
    paintDelay();

    fillNoteSelect(document.getElementById("trNote"));
    function paintTranspose() {
        const from = document.getElementById("trNote")?.value || "C";
        const semi = Number(document.getElementById("trSemi")?.value) || 0;
        const i = NOTES.indexOf(from);
        const to = NOTES[(i + semi + 120) % 12];
        const el = document.getElementById("trOut");
        if (el) el.textContent = from + (semi >= 0 ? " +" : " ") + semi + " → " + to;
        const marks = from === to ? { [from]: "root" } : { [from]: "from", [to]: "to" };
        paintPiano(document.getElementById("trPiano"), [from, to], marks);
        paintPills(document.getElementById("trNotes"), [from, to], from);
    }
    document.getElementById("trNote")?.addEventListener("change", paintTranspose);
    document.getElementById("trSemi")?.addEventListener("input", paintTranspose);
    paintTranspose();

    const camKey = document.getElementById("camKey");
    if (camKey && !camKey.options.length) {
        NOTES.forEach((n, i) => {
            const maj = document.createElement("option");
            maj.value = n + "|maj";
            maj.textContent = n + " maj · " + CAMELOT_MAJ[i];
            camKey.appendChild(maj);
        });
        NOTES.forEach((n, i) => {
            const min = document.createElement("option");
            min.value = n + "|min";
            min.textContent = n + " min · " + CAMELOT_MIN[i];
            camKey.appendChild(min);
        });
    }
    function camelotNeighbors(code) {
        const n = parseInt(code, 10);
        const letter = code.slice(-1);
        const other = letter === "A" ? "B" : "A";
        const wrap = (x) => ((x - 1 + 12) % 12) + 1;
        return [code, wrap(n) + other, wrap(n - 1) + letter, wrap(n + 1) + letter];
    }
    function paintCamelot() {
        const v = document.getElementById("camKey")?.value || "C|maj";
        const [note, mode] = v.split("|");
        const i = NOTES.indexOf(note);
        const code = mode === "maj" ? CAMELOT_MAJ[i] : CAMELOT_MIN[i];
        const mix = camelotNeighbors(code);
        const mixSet = new Set(mix);
        const host = document.getElementById("camWheel");
        buildCamelot(host);
        host.querySelectorAll(".cam-slice, .cam-lab").forEach((el) => {
            const c = el.dataset.cam;
            el.classList.toggle("is-now", c === code);
            el.classList.toggle("is-mix", mixSet.has(c) && c !== code);
        });
        const hub = document.getElementById("camHub");
        const hubSub = document.getElementById("camHubSub");
        if (hub) hub.textContent = code;
        if (hubSub) hubSub.textContent = note + " " + mode;
        const chips = document.getElementById("camChips");
        if (chips) {
            chips.innerHTML = "";
            mix.forEach((c) => {
                const b = document.createElement("button");
                b.type = "button";
                b.className = "cam-chip" + (c === code ? " is-now" : " is-mix");
                b.textContent = c;
                b.addEventListener("click", () => {
                    camKey.value = codeToValue(c);
                    camKey.dispatchEvent(new Event("change"));
                });
                chips.appendChild(b);
            });
        }
        const el = document.getElementById("camOut");
        if (el) el.textContent = (window.currentLang === "en" ? "Compatible: " : "Mezcla: ") + mix.join(" · ");
        const nowL = document.querySelector(".cam-leg.is-now");
        const mixL = document.querySelector(".cam-leg.is-mix");
        if (nowL) nowL.textContent = window.currentLang === "en" ? "now" : "ahora";
        if (mixL) mixL.textContent = window.currentLang === "en" ? "mix" : "mezcla";
    }
    document.getElementById("camKey")?.addEventListener("change", paintCamelot);
    paintCamelot();
    window.addEventListener("langchange", paintCamelot);

    fillNoteSelect(document.getElementById("chRoot"));
    const CHORDS = {
        maj: [0, 4, 7],
        min: [0, 3, 7],
        7: [0, 4, 7, 10],
        maj7: [0, 4, 7, 11],
        min7: [0, 3, 7, 10],
        dim: [0, 3, 6],
        sus4: [0, 5, 7]
    };
    function paintChord() {
        const root = document.getElementById("chRoot")?.value || "C";
        const type = document.getElementById("chType")?.value || "maj";
        const i = NOTES.indexOf(root);
        const notes = (CHORDS[type] || CHORDS.maj).map((s) => NOTES[(i + s) % 12]);
        const el = document.getElementById("chOut");
        if (el) el.textContent = root + " " + type;
        paintPiano(document.getElementById("chPiano"), notes, { [root]: "root" });
        paintPills(document.getElementById("chNotes"), notes, root);
    }
    document.getElementById("chRoot")?.addEventListener("change", paintChord);
    document.getElementById("chType")?.addEventListener("change", paintChord);
    paintChord();

    fillNoteSelect(document.getElementById("scRoot"));
    function paintScale() {
        const root = document.getElementById("scRoot")?.value || "C";
        const type = document.getElementById("scType")?.value || "maj";
        const i = NOTES.indexOf(root);
        const notes = (SCALES[type] || SCALES.maj).map((s) => NOTES[(i + s) % 12]);
        const el = document.getElementById("scOut");
        if (el) el.textContent = notes.join(" · ");
        paintPiano(document.getElementById("scPiano"), notes, { [root]: "root" });
        paintPills(document.getElementById("scNotes"), notes, root);
    }
    document.getElementById("scRoot")?.addEventListener("change", paintScale);
    document.getElementById("scType")?.addEventListener("change", paintScale);
    paintScale();
})();
