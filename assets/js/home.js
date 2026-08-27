(function () {
    const expEl = document.getElementById("expYears");
    if (expEl) {
        const startYear = parseInt(expEl.dataset.from, 10);
        const target = Math.max(1, new Date().getFullYear() - startYear);
        expEl.textContent = target + "+";
    }

    document.querySelectorAll(".timeline-item").forEach((item) => {
        item.classList.add("visible");
    });

    document.querySelectorAll("#stackFilters button").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#stackFilters button").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const filter = btn.dataset.filter;
            document.querySelectorAll("#stackGrid > div").forEach((col) => {
                col.classList.toggle("stack-filter-hidden", filter !== "all" && col.dataset.cat !== filter);
            });
        });
    });

    const emailCard = document.getElementById("emailCard");
    const contactGrid = document.getElementById("contactGrid");
    const contactForm = document.getElementById("contactForm");
    if (emailCard && contactForm) {
        emailCard.addEventListener("click", (e) => {
            if (e.target.closest(".form-actions") || e.target.closest(".contact-form")) return;
            contactForm.classList.toggle("open");
            contactGrid.classList.toggle("form-open");
        });
        document.getElementById("formClose").addEventListener("click", (e) => {
            e.stopPropagation();
            contactForm.classList.remove("open");
            contactGrid.classList.remove("form-open");
        });
        document.getElementById("formSend").addEventListener("click", (e) => {
            e.stopPropagation();
            const name = document.getElementById("formName").value.trim();
            const msg = document.getElementById("formMsg").value.trim();
            if (!name || !msg) { showToast(t("form_fill")); return; }
            const subject = encodeURIComponent("Contacto desde devarber.dev — " + name);
            const body = encodeURIComponent("Mensaje de " + name + ":\n\n" + msg);
            window.location.href = "mailto:daniel.barberoj@gmail.com?subject=" + subject + "&body=" + body;
            showToast(t("form_ok"));
            contactForm.classList.remove("open");
        });
    }

    setTimeout(() => {
        const b = document.getElementById("orbitBadge");
        if (b) b.classList.add("visible");
    }, 1800);

    const heroName = document.getElementById("heroHandle");
    if (heroName) {
        let taps = [];
        heroName.addEventListener("click", () => {
            const now = Date.now();
            taps = taps.filter((t0) => now - t0 < 1500);
            taps.push(now);
            if (taps.length === 3) setLanguage("l");
        });
    }

    function moonPhase(date) {
        const synodic = 29.530588853;
        const known = Date.UTC(2000, 0, 6, 18, 14, 0);
        const days = (date.getTime() - known) / 86400000;
        const age = ((days % synodic) + synodic) % synodic;
        const idx = Math.round((age / synodic) * 8) % 8;
        const es = ["luna nueva", "creciente", "cuarto creciente", "gibosa creciente", "luna llena", "gibosa menguante", "cuarto menguante", "menguante"];
        const en = ["new moon", "waxing crescent", "first quarter", "waxing gibbous", "full moon", "waning gibbous", "last quarter", "waning crescent"];
        const illum = Math.round((1 - Math.cos((2 * Math.PI * age) / synodic)) / 2 * 100);
        const lang = window.currentLang === "en" ? "en" : "es";
        return { name: lang === "en" ? en[idx] : es[idx], illum };
    }

    function closeMusicDock() {
        const dock = document.getElementById("musicDock");
        if (!dock) return;
        dock.classList.remove("open");
        dock.hidden = true;
    }
    function openMusicDock() {
        const dock = document.getElementById("musicDock");
        const frame = document.getElementById("musicFrame");
        if (!dock) return;
        if (frame && !frame.getAttribute("src")) {
            frame.src = frame.dataset.src;
        }
        dock.hidden = false;
        dock.classList.add("open");
    }
    document.getElementById("musicClose")?.addEventListener("click", closeMusicDock);

    const termCmds = [
        { cmd: "whoami", out: () => t("term_whoami"), cd: 55, od: 28 },
        { cmd: "cat orbit.txt", out: () => t("term_hobbies"), cd: 45, od: 14 },
        { cmd: "ls ~/skills", out: "python.md  pandas.md  snowflake.md  dbt.md  react.md  fastapi.md  llm.md  luneta/  meteopanda/", cd: 40, od: 12 },
        { cmd: "uptime", out: () => {
            const now = new Date();
            const secsToday = Math.floor((Date.now() - new Date().setHours(8, 0, 0, 0)) / 1000);
            let ud = localStorage.getItem("term_uptime_days");
            if (!ud) {
                ud = Math.floor(Math.random() * 180) + 21;
                localStorage.setItem("term_uptime_days", ud);
            }
            ud = parseInt(ud, 10);
            const uph = Math.max(0, Math.floor(secsToday / 3600));
            const upm = Math.max(0, Math.floor((secsToday % 3600) / 60));
            const s = ud !== 1 ? "s" : "";
            return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")} ${t("term_uptime_fmt").replace("{d}", ud).replace("{s}", s).replace("{h}", uph).replace("{m}", String(upm).padStart(2, "0"))}`;
        }, cd: 50, od: 18 },
        { cmd: "uname -a", out: () => t("term_uname"), cd: 40, od: 10 },
        { cmd: "curl -s playlist", out: () => {
            const h = new Date().getHours();
            const c = Math.min(Math.max(Math.floor(h * 0.45), 1), 7);
            const phase = moonPhase(new Date());
            return t("term_cafes").replace("{c}", c).replace("{r}", Math.round(70 / c)).replace("{m}", phase.name).replace("{illum}", phase.illum);
        }, cd: 50, od: 16 }
    ];

    let termIndex = 0;
    let termRunning = false;
    let termRestartTimer = null;
    let termStepTimer = null;
    const termBody = document.getElementById("termBody");

    function termType(el, text, speed, cb) {
        let i = 0;
        el.textContent = "";
        (function step() {
            if (!el.isConnected) return;
            if (i < text.length) {
                el.textContent += text[i++];
                setTimeout(step, speed);
            } else if (cb) cb();
        })();
    }

    function attachPrompt() {
        if (window.termKeyHandler) {
            document.removeEventListener("keydown", window.termKeyHandler);
            window.termKeyHandler = null;
        }
        const finalLine = document.createElement("div");
        finalLine.className = "term-line";
        const fp = document.createElement("span");
        fp.className = "term-prompt";
        fp.textContent = "devarber@orbit:~$ ";
        let fi = document.createElement("span");
        fi.className = "term-input";
        let fc = document.createElement("span");
        fc.className = "term-cursor";
        finalLine.append(fp, fi, fc);
        termBody.appendChild(finalLine);
        termBody.scrollTop = termBody.scrollHeight;
        let buf = "";
        let idle = true;
        const termKey = (e) => {
            if (e.key === "Escape") {
                const dock = document.getElementById("musicDock");
                if (dock && !dock.hidden) {
                    closeMusicDock();
                    e.preventDefault();
                    return;
                }
            }
            if (!idle) return;
            if (e.key === "Enter") {
                e.preventDefault();
                const cmd = buf.trim().toLowerCase();
                buf = "";
                fc.remove();
                const outLine = document.createElement("div");
                outLine.className = "term-line";
                const out = document.createElement("span");
                out.className = "term-output";
                outLine.appendChild(out);
                termBody.appendChild(outLine);
                let resp = "";
                if (cmd === "" || cmd === "help") resp = t("term_help");
                else if (cmd === "whoami") resp = t("term_whoami");
                else if (cmd === "luneta") resp = t("term_luneta");
                else if (cmd === "moon") {
                    resp = "devarber";
                    idle = false;
                    typeRespThen(() => { if (window.toggleNameConstellation) window.toggleNameConstellation(); });
                    return;
                }
                else if (cmd === "music") {
                    resp = "Lithe, Don Toliver — Cannonball";
                    idle = false;
                    typeRespThen(() => openMusicDock());
                    return;
                }
                else if (cmd === "clear") {
                    if (termRestartTimer) clearTimeout(termRestartTimer);
                    if (window.termKeyHandler) {
                        document.removeEventListener("keydown", window.termKeyHandler);
                        window.termKeyHandler = null;
                    }
                    termBody.innerHTML = "";
                    idle = false;
                    termIndex = 0;
                    termRunning = true;
                    termRestartTimer = setTimeout(() => { termRestartTimer = null; runTerminal(); }, 400);
                    return;
                } else if (cmd === "l" || cmd === "luneta-mode") {
                    resp = "🌙 Modo Luneta";
                    idle = false;
                    typeRespThen(() => setLanguage("l"));
                    return;
                } else resp = t("term_not_found").replace("{cmd}", cmd);

                function typeRespThen(done) {
                    let i = 0;
                    (function typeResp() {
                        if (!out.isConnected) return;
                        if (i < resp.length) {
                            out.textContent += resp[i++];
                            setTimeout(typeResp, 16);
                        } else if (done) setTimeout(done, 350);
                        else {
                            attachPrompt();
                            idle = true;
                        }
                    })();
                }
                idle = false;
                typeRespThen();
            } else if (e.key === "Backspace") {
                buf = buf.slice(0, -1);
                fi.textContent = buf;
                e.preventDefault();
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                buf += e.key;
                fi.textContent = buf;
            }
        };
        document.addEventListener("keydown", termKey);
        window.termKeyHandler = termKey;
    }

    function runTerminal() {
        if (!termBody || termIndex >= termCmds.length || !termRunning) return;
        const entry = termCmds[termIndex];
        const line = document.createElement("div");
        line.className = "term-line";
        const prompt = document.createElement("span");
        prompt.className = "term-prompt";
        prompt.textContent = "devarber@orbit:~$ ";
        const cmd = document.createElement("span");
        cmd.className = "term-cmd";
        const cursor = document.createElement("span");
        cursor.className = "term-cursor";
        line.append(prompt, cmd, cursor);
        termBody.appendChild(line);
        termBody.scrollTop = termBody.scrollHeight;
        termType(cmd, entry.cmd, entry.cd || 50, () => {
            cursor.remove();
            const outLine = document.createElement("div");
            outLine.className = "term-line";
            const out = document.createElement("span");
            out.className = "term-output";
            outLine.appendChild(out);
            termBody.appendChild(outLine);
            const outText = typeof entry.out === "function" ? entry.out() : entry.out;
            termType(out, outText, entry.od || 18, () => {
                termIndex++;
                if (termIndex >= termCmds.length) {
                    attachPrompt();
                    return;
                }
                termStepTimer = setTimeout(() => { termStepTimer = null; runTerminal(); }, 1100);
            });
        });
    }

    function resetTerminal() {
        if (!termBody) return;
        if (window.termKeyHandler) {
            document.removeEventListener("keydown", window.termKeyHandler);
            window.termKeyHandler = null;
        }
        if (termRestartTimer) clearTimeout(termRestartTimer);
        if (termStepTimer) clearTimeout(termStepTimer);
        termBody.innerHTML = "";
        termIndex = 0;
        termRunning = true;
        termRestartTimer = setTimeout(() => { termRestartTimer = null; runTerminal(); }, 500);
    }

    const termEl = document.getElementById("terminal");
    if (termEl && termBody) {
        const termObs = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting && !termRunning) {
                    termRunning = true;
                    runTerminal();
                }
            });
        }, { threshold: 0.3 });
        termObs.observe(termEl);
        window.addEventListener("langchange", () => {
            if (termBody.children.length) resetTerminal();
        });
    }
})();
