(function () {
    const catalog = document.getElementById("toolsCatalog");
    const panels = document.getElementById("toolPanels");
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
        });
    });
    function openTool(id) {
        catalog.style.display = "none";
        panels.querySelectorAll(".tool-panel").forEach((p) => p.classList.toggle("active", p.dataset.tool === id));
    }

    const cronInput = document.getElementById("cronExpr");
    const cronOut = document.getElementById("cronOut");
    const NAMES = ["minuto", "hora", "día del mes", "mes", "día de la semana"];
    const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
    const MON = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    document.querySelectorAll("[data-cron]").forEach((c) => {
        c.addEventListener("click", () => { cronInput.value = c.dataset.cron; explainCron(); });
    });
    if (cronInput) cronInput.addEventListener("input", explainCron);

    function field(v, min, max, label, names) {
        if (v === "*") return `cada ${label}`;
        if (v.startsWith("*/")) return `cada ${v.slice(2)} ${label}s`;
        if (v.includes("-")) return `${label} de ${v.replace("-", " a ")}`;
        if (v.includes(",")) return `${label} ${v}`;
        if (names && names[v]) return names[v];
        return `${label} ${v}`;
    }
    function explainCron() {
        if (!cronInput) return;
        let expr = cronInput.value.trim();
        const aliases = { "@hourly": "0 * * * *", "@daily": "0 0 * * *", "@weekly": "0 0 * * 0", "@monthly": "0 0 1 * *" };
        if (aliases[expr]) expr = aliases[expr];
        const parts = expr.split(/\s+/);
        if (parts.length !== 5) {
            cronOut.textContent = "Usa 5 campos: min hora día mes weekday (o @daily, @hourly…)";
            return;
        }
        const desc = [
            field(parts[0], 0, 59, NAMES[0]),
            field(parts[1], 0, 23, NAMES[1]),
            field(parts[2], 1, 31, NAMES[2]),
            field(parts[3], 1, 12, NAMES[3], MON),
            field(parts[4], 0, 7, NAMES[4], DOW)
        ];
        cronOut.textContent = desc.join(" · ");
        try {
            const next = [];
            let d = new Date();
            d.setSeconds(0, 0);
            d.setMinutes(d.getMinutes() + 1);
            let guard = 0;
            while (next.length < 5 && guard++ < 40000) {
                if (matchCron(parts, d)) next.push(d.toLocaleString());
                d = new Date(d.getTime() + 60000);
            }
            cronOut.textContent += "\n\nPróximas:\n" + next.join("\n");
        } catch (_) { /* ignore */ }
    }
    function matchList(field, n) {
        if (field === "*") return true;
        if (field.startsWith("*/")) return n % parseInt(field.slice(2), 10) === 0;
        return field.split(",").some((bit) => {
            if (bit.includes("-")) {
                const [a, b] = bit.split("-").map(Number);
                return n >= a && n <= b;
            }
            return Number(bit) === n;
        });
    }
    function matchCron(p, d) {
        const dow = d.getDay();
        return matchList(p[0], d.getMinutes()) &&
            matchList(p[1], d.getHours()) &&
            matchList(p[2], d.getDate()) &&
            matchList(p[3], d.getMonth() + 1) &&
            (matchList(p[4], dow) || (p[4] !== "*" && matchList(p[4], 7) && dow === 0));
    }
    explainCron();

    const tsIn = document.getElementById("tsIn");
    const tsOut = document.getElementById("tsOut");
    document.getElementById("tsNow")?.addEventListener("click", () => {
        tsIn.value = Date.now();
        convertTs();
    });
    tsIn?.addEventListener("input", convertTs);
    function convertTs() {
        const raw = (tsIn.value || "").trim();
        if (!raw) { tsOut.textContent = ""; return; }
        let d;
        if (/^\d+$/.test(raw)) {
            const n = Number(raw);
            d = new Date(n < 1e12 ? n * 1000 : n);
        } else d = new Date(raw);
        if (isNaN(d)) { tsOut.textContent = "Fecha no válida"; return; }
        tsOut.textContent = `ISO  ${d.toISOString()}\nLocal ${d.toLocaleString()}\nUnix s  ${Math.floor(d.getTime() / 1000)}\nUnix ms ${d.getTime()}`;
    }

    const jsonIn = document.getElementById("jsonIn");
    const jsonOut = document.getElementById("jsonOut");
    document.getElementById("jsonPretty")?.addEventListener("click", () => fmtJson(2));
    document.getElementById("jsonMini")?.addEventListener("click", () => fmtJson(0));
    function fmtJson(space) {
        try {
            jsonOut.textContent = JSON.stringify(JSON.parse(jsonIn.value), null, space);
            jsonOut.style.color = "";
        } catch (err) {
            jsonOut.textContent = err.message;
            jsonOut.style.color = "var(--danger)";
        }
    }

    const rePat = document.getElementById("rePat");
    const reText = document.getElementById("reText");
    const reOut = document.getElementById("reOut");
    function runRe() {
        if (!rePat) return;
        const flags = ["g", "i", "m", "s"].filter((f) => document.getElementById("flag-" + f)?.checked).join("");
        try {
            const re = new RegExp(rePat.value, flags);
            const text = reText.value;
            if (!rePat.value) { reOut.textContent = ""; return; }
            const matches = [...text.matchAll(new RegExp(rePat.value, flags.includes("g") ? flags : flags + "g"))];
            reOut.innerHTML = matches.length
                ? matches.map((m, i) => `#${i + 1} “${escapeHtml(m[0])}” @ ${m.index}${m.length > 1 ? " · " + m.slice(1).join(", ") : ""}`).join("<br>")
                : "Sin matches";
        } catch (err) {
            reOut.textContent = err.message;
        }
    }
    rePat?.addEventListener("input", runRe);
    reText?.addEventListener("input", runRe);
    document.querySelectorAll("[id^=flag-]").forEach((el) => el.addEventListener("change", runRe));

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    const sqlIn = document.getElementById("sqlIn");
    const sqlOut = document.getElementById("sqlOut");
    document.getElementById("sqlFmt")?.addEventListener("click", () => {
        if (!sqlIn) return;
        sqlOut.textContent = formatSql(sqlIn.value);
    });
    function formatSql(raw) {
        const src = (raw || "").replace(/\s+/g, " ").trim();
        if (!src) return "";
        const breaks = [
            "UNION ALL", "UNION", "EXCEPT", "INTERSECT",
            "LEFT OUTER JOIN", "RIGHT OUTER JOIN", "FULL OUTER JOIN",
            "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "CROSS JOIN", "JOIN",
            "GROUP BY", "ORDER BY", "PARTITION BY",
            "SELECT", "FROM", "WHERE", "HAVING", "LIMIT", "OFFSET",
            "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM",
            "CREATE TABLE", "WITH", "AND", "OR", "ON", "WHEN", "THEN", "ELSE", "END"
        ];
        let out = src;
        breaks.forEach((kw) => {
            const re = new RegExp("\\b" + kw.replace(/ /g, "\\s+") + "\\b", "gi");
            out = out.replace(re, (m, offset) => (offset === 0 ? m.toUpperCase() : "\n" + m.toUpperCase()));
        });
        const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
        let depth = 0;
        return lines.map((line) => {
            if (/^\)/.test(line)) depth = Math.max(0, depth - 1);
            const indent = "  ".repeat(depth);
            if (/\($/.test(line) || /\bWITH\b/.test(line)) depth += 1;
            return indent + line;
        }).join("\n");
    }

    const jwtIn = document.getElementById("jwtIn");
    const jwtOut = document.getElementById("jwtOut");
    document.getElementById("jwtDec")?.addEventListener("click", decodeJwt);
    jwtIn?.addEventListener("input", decodeJwt);
    function b64urlJson(part) {
        const pad = part.replace(/-/g, "+").replace(/_/g, "/");
        const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
        const json = decodeURIComponent(escape(atob(padded)));
        return JSON.parse(json);
    }
    function decodeJwt() {
        if (!jwtIn) return;
        const token = jwtIn.value.trim();
        if (!token) { jwtOut.textContent = ""; return; }
        const parts = token.split(".");
        if (parts.length < 2) {
            jwtOut.textContent = "Un JWT tiene header.payload.signature";
            jwtOut.style.color = "var(--danger)";
            return;
        }
        try {
            const header = b64urlJson(parts[0]);
            const payload = b64urlJson(parts[1]);
            jwtOut.style.color = "";
            jwtOut.textContent = "header\n" + JSON.stringify(header, null, 2) + "\n\npayload\n" + JSON.stringify(payload, null, 2) + (parts[2] ? "\n\nsignature\n" + parts[2].slice(0, 48) + (parts[2].length > 48 ? "…" : "") : "\n\n(sin firma)");
        } catch (e) {
            jwtOut.style.color = "var(--danger)";
            jwtOut.textContent = e.message;
        }
    }

    const csvIn = document.getElementById("csvIn");
    const csvOut = document.getElementById("csvOut");
    document.getElementById("csvToJson")?.addEventListener("click", () => {
        try { csvOut.value = JSON.stringify(csvToRows(csvIn.value), null, 2); }
        catch (e) { csvOut.value = e.message; }
    });
    document.getElementById("jsonToCsv")?.addEventListener("click", () => {
        try { csvOut.value = rowsToCsv(JSON.parse(csvIn.value)); }
        catch (e) { csvOut.value = e.message; }
    });
    function parseCsvLine(line) {
        const out = [];
        let cur = "";
        let q = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (q && line[i + 1] === '"') { cur += '"'; i++; }
                else q = !q;
            } else if (ch === "," && !q) { out.push(cur); cur = ""; }
            else cur += ch;
        }
        out.push(cur);
        return out;
    }
    function csvToRows(text) {
        const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.length);
        if (!lines.length) return [];
        const headers = parseCsvLine(lines[0]);
        return lines.slice(1).map((line) => {
            const cols = parseCsvLine(line);
            const row = {};
            headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
            return row;
        });
    }
    function rowsToCsv(rows) {
        if (!Array.isArray(rows) || !rows.length) {
            if (rows && typeof rows === "object" && !Array.isArray(rows)) rows = [rows];
            else return "";
        }
        const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
        const esc = (v) => {
            const s = v == null ? "" : String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
    }

    const yIn = document.getElementById("yamlIn");
    const yOut = document.getElementById("yamlOut");
    document.getElementById("toJson")?.addEventListener("click", () => {
        try {
            if (typeof jsyaml === "undefined") throw new Error("js-yaml no cargó");
            yOut.value = JSON.stringify(jsyaml.load(yIn.value), null, 2);
        } catch (e) { yOut.value = e.message; }
    });
    document.getElementById("toYaml")?.addEventListener("click", () => {
        try {
            const obj = JSON.parse(yIn.value);
            yOut.value = jsyaml.dump(obj);
        } catch (e) { yOut.value = e.message; }
    });

    document.getElementById("diffGo")?.addEventListener("click", () => {
        const a = (document.getElementById("diffA").value || "").split(/\r?\n/);
        const b = (document.getElementById("diffB").value || "").split(/\r?\n/);
        const out = document.getElementById("diffOut");
        const max = Math.max(a.length, b.length);
        let html = "";
        for (let i = 0; i < max; i++) {
            if (a[i] === b[i]) html += `<div>  ${escapeHtml(a[i] ?? "")}</div>`;
            else {
                if (a[i] != null) html += `<div class="del">- ${escapeHtml(a[i])}</div>`;
                if (b[i] != null) html += `<div class="add">+ ${escapeHtml(b[i])}</div>`;
            }
        }
        out.innerHTML = html || "Sin diferencias";
    });

    let bpmTaps = [];
    const bpmOut = document.getElementById("bpmOut");
    document.getElementById("bpmTap")?.addEventListener("click", () => {
        const now = Date.now();
        bpmTaps = bpmTaps.filter((t0) => now - t0 < 5000);
        bpmTaps.push(now);
        if (bpmTaps.length < 2) {
            bpmOut.textContent = "Sigue.";
            return;
        }
        let sum = 0;
        for (let i = 1; i < bpmTaps.length; i++) sum += bpmTaps[i] - bpmTaps[i - 1];
        const bpm = Math.round(60000 / (sum / (bpmTaps.length - 1)));
        bpmOut.textContent = bpm + " BPM\n" + bpmTaps.length + " taps";
    });
    document.getElementById("bpmReset")?.addEventListener("click", () => {
        bpmTaps = [];
        if (bpmOut) bpmOut.textContent = "Pulsa al ritmo.";
    });

    const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    const CAMELOT_MAJ = ["8B", "3B", "10B", "5B", "12B", "7B", "2B", "9B", "4B", "11B", "6B", "1B"];
    const CAMELOT_MIN = ["5A", "12A", "7A", "2A", "9A", "4A", "11A", "6A", "1A", "8A", "3A", "10A"];
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
        let best = { score: -2, name: "?", camelot: "?" };
        let second = -2;
        for (let k = 0; k < 12; k++) {
            const sMaj = corr(chroma, rotate(MAJOR, k));
            const sMin = corr(chroma, rotate(MINOR, k));
            const tryKey = (score, mode) => {
                if (score > best.score) {
                    second = best.score;
                    best = {
                        score,
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
            keyOut.textContent = r.name + "\nCamelot  " + r.camelot + "\n" + (window.currentLang === "en" ? "Confidence " : "Confianza ") + r.conf + "\n\n" + (window.currentLang === "en" ? "Local estimate. Not a lab." : "Estimación local. No es un laboratorio.");
            ctx.close();
        } catch (err) {
            keyOut.textContent = "No pude leer el audio. Prueba wav o mp3.\n" + (err.message || "");
        }
    });
})();
