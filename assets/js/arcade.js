(function () {
    const section = document.getElementById("terminal");
    const canvas = document.getElementById("arcadeCanvas");
    const boardEl = document.getElementById("arcadeBoard");
    const modeEl = document.getElementById("arcadeMode");
    if (!section || !canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    let W = 800;
    let H = 420;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let running = false;
    let userControl = false;
    let keys = { left: false, right: false, fire: false };
    let inView = false;
    let fireCool = 0;
    let resetTimer = 0;
    let frame = 0;
    const collected = new Set();

    const ship = { x: 400, y: 380, w: 28, h: 14 };
    const swarm = { ox: 0, oy: 0, dir: 1 };
    let aliens = [];
    let shots = [];

    const SPRITE = [
        [0,0,1,0,0,0,0,0,1,0,0],
        [0,0,0,1,0,0,0,1,0,0,0],
        [0,0,1,1,1,1,1,1,1,0,0],
        [0,1,1,0,1,1,1,0,1,1,0],
        [1,1,1,1,1,1,1,1,1,1,1],
        [1,0,1,1,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,1,0,1],
        [0,0,0,1,1,0,1,1,0,0,0]
    ];
    const SPRITE2 = [
        [0,0,1,0,0,0,0,0,1,0,0],
        [1,0,0,1,0,0,0,1,0,0,1],
        [1,0,1,1,1,1,1,1,1,0,1],
        [1,1,1,0,1,1,1,0,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,1,1,0],
        [0,0,1,0,0,0,0,0,1,0,0],
        [0,1,0,0,0,0,0,0,0,1,0]
    ];

    function moonPhase() {
        const synodic = 29.530588853;
        const known = Date.UTC(2000, 0, 6, 18, 14, 0);
        const days = (Date.now() - known) / 86400000;
        const age = ((days % synodic) + synodic) % synodic;
        const idx = Math.round((age / synodic) * 8) % 8;
        const es = ["luna nueva", "creciente", "cuarto creciente", "gibosa creciente", "luna llena", "gibosa menguante", "cuarto menguante", "menguante"];
        const en = ["new moon", "waxing crescent", "first quarter", "waxing gibbous", "full moon", "waning gibbous", "last quarter", "waning crescent"];
        const illum = Math.round((1 - Math.cos((2 * Math.PI * age) / synodic)) / 2 * 100);
        const lang = window.currentLang === "en" ? "en" : "es";
        return { name: lang === "en" ? en[idx] : es[idx], illum };
    }

    function defs() {
        return [
            { r: 0, c: 0, label: "MUSIC", log: "arcade_log_music", special: "music" },
            { r: 0, c: 1, label: "MOON", log: "arcade_log_moon", special: "moon" },
            { r: 0, c: 2, label: "Luneta", log: "arcade_log_luneta" },
            { r: 0, c: 3, label: "MeteoPanda", log: "arcade_log_meteo" },
            { r: 1, c: 0, label: "Python", log: "arcade_log_python" },
            { r: 1, c: 1, label: "SQL", log: "arcade_log_sql" },
            { r: 1, c: 2, label: "React", log: "arcade_log_react" },
            { r: 1, c: 3, label: "FastAPI", log: "arcade_log_fastapi" },
            { r: 2, c: 0, label: "Snowflake", log: "arcade_log_snow" },
            { r: 2, c: 1, label: "dbt", log: "arcade_log_dbt" },
            { r: 2, c: 2, label: "LLMs", log: "arcade_log_llms" },
            { r: 2, c: 3, label: "Docker", log: "arcade_log_docker" },
            { r: 3, c: 0, label: "GRA↔MAD", log: "arcade_log_place" },
            { r: 3, c: 1, label: "Data", log: "arcade_log_data" },
            { r: 3, c: 2, label: "AI", log: "arcade_log_ai" },
            { r: 3, c: 3, label: "AWS", log: "arcade_log_aws" }
        ];
    }

    function metrics() {
        const cols = 4;
        const rows = 4;
        const gapX = Math.max(8, W * 0.018);
        const gapY = Math.max(24, H * 0.058);
        const padX = Math.max(14, W * 0.035);
        const padY = Math.max(8, H * 0.025);
        const shipRoom = 42;
        const aw = (W - padX * 2 - gapX * (cols - 1)) / cols;
        const ah = Math.max(38, Math.min(64, (H - padY - shipRoom - gapY * (rows - 1)) / rows));
        return { cols, gapX, gapY, padX, padY, aw, ah };
    }

    function fitSprite(a) {
        const cols = 11;
        const rows = 8;
        const cell = Math.max(3, Math.min(
            Math.floor(a.w / (cols + 2)),
            Math.floor((a.h - 16) / rows)
        ));
        const sw = cols * cell;
        const sh = rows * cell;
        a.cell = cell;
        a.sx = Math.round(a.x + (a.w - sw) / 2);
        a.sy = Math.round(a.y);
        a.sw = sw;
        a.sh = sh;
    }

    function layoutAliens(keep) {
        const liveMap = {};
        if (keep) aliens.forEach((a) => { liveMap[a.label] = a.live; });
        const m = metrics();
        aliens = defs().map((d) => ({
            ...d,
            w: m.aw,
            h: m.ah,
            live: keep ? liveMap[d.label] !== false : true
        }));
        if (!keep) {
            swarm.ox = 0;
            swarm.oy = 0;
            swarm.dir = 1;
            shots = [];
        }
        placeAliens();
        ship.w = Math.max(24, Math.min(36, W * 0.045));
        ship.h = Math.max(12, ship.w * 0.5);
        ship.y = H - 28;
    }

    function placeAliens() {
        const m = metrics();
        aliens.forEach((a) => {
            a.x = m.padX + a.c * (m.aw + m.gapX) + swarm.ox;
            a.y = m.padY + a.r * (m.ah + m.gapY) + swarm.oy;
            fitSprite(a);
        });
    }

    function chipText(key) {
        let msg = t(key);
        if (key === "arcade_log_moon") {
            const p = moonPhase();
            msg = msg.replace("{m}", p.name).replace("{illum}", p.illum);
        }
        return msg;
    }

    function slotChip(a) {
        if (!boardEl || collected.has(a.label)) return;
        collected.add(a.label);
        const card = document.createElement("article");
        card.className = "arcade-chip" + (a.special ? " special" : "");
        card.style.animationDelay = Math.min(collected.size - 1, 6) * 0.04 + "s";
        const tag = document.createElement("span");
        tag.className = "arcade-chip-tag";
        tag.textContent = a.label;
        const p = document.createElement("p");
        p.textContent = chipText(a.log);
        card.append(tag, p);
        boardEl.appendChild(card);
    }

    function hitSpecial(kind) {
        if (kind === "music" && window.openMusicDock) window.openMusicDock(true);
        if (kind === "moon" && window.toggleNameConstellation) window.toggleNameConstellation();
    }

    function killAlien(a) {
        a.live = false;
        slotChip(a);
        if (a.special && userControl) hitSpecial(a.special);
        if (!aliens.some((x) => x.live)) resetTimer = 90;
    }

    function takeControl() {
        if (userControl) return;
        userControl = true;
        if (modeEl) modeEl.textContent = t("arcade_play");
        canvas.classList.add("is-play");
    }

    function fire() {
        if (fireCool > 0) return;
        fireCool = userControl ? 16 : 38;
        shots.push({
            x: ship.x,
            y: ship.y - ship.h / 2 - 4,
            vy: -Math.max(6.5, H * 0.018)
        });
    }

    function size() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = canvas.clientWidth || section.clientWidth || 800;
        const cssH = Math.max(340, Math.round(cssW * 0.6));
        canvas.style.height = cssH + "px";
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        W = cssW;
        H = cssH;
        layoutAliens(true);
        ship.x = Math.max(ship.w, Math.min(W - ship.w, ship.x));
    }

    function color(name, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    function drawInvader(a, pixel) {
        const grid = (Math.floor(frame / 24) % 2 === 0) ? SPRITE : SPRITE2;
        const rows = grid.length;
        const cols = grid[0].length;
        const cell = a.cell || 3;
        ctx.fillStyle = pixel;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!grid[r][c]) continue;
                ctx.fillRect(a.sx + c * cell, a.sy + r * cell, cell, cell);
            }
        }
    }

    function drawShip() {
        const gold = color("--moon", "#f2e9d8");
        ctx.fillStyle = gold;
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y - ship.h);
        ctx.lineTo(ship.x + ship.w / 2, ship.y);
        ctx.lineTo(ship.x - ship.w / 2, ship.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(ship.x - 2, ship.y - ship.h - 4, 4, 5);
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        aliens.forEach((a) => {
            if (!a.live) return;
            const pix = a.special ? color("--star", "#7eb8c9") : color("--gold", "#b8a0e0");
            drawInvader(a, pix);
            ctx.fillStyle = pix;
            ctx.font = "600 11px IBM Plex Mono, ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(a.label, a.x + a.w / 2, a.sy + a.sh + 4);
        });

        shots.forEach((s) => {
            ctx.fillStyle = color("--moon", "#f2e9d8");
            ctx.fillRect(s.x - 1.5, s.y, 3, 10);
        });

        drawShip();
    }

    function swarmBounds() {
        let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
        aliens.forEach((a) => {
            if (!a.live) return;
            minX = Math.min(minX, a.sx);
            maxX = Math.max(maxX, a.sx + a.sw);
            maxY = Math.max(maxY, a.sy + a.sh);
        });
        if (!isFinite(minX)) return null;
        return { minX, maxX, maxY };
    }

    function stepSwarm() {
        const speed = Math.max(0.45, W * 0.00115);
        swarm.ox += swarm.dir * speed;
        placeAliens();
        const b = swarmBounds();
        if (!b) return;
        if (b.maxX > W - 10 || b.minX < 10) {
            swarm.dir *= -1;
            swarm.oy += Math.max(8, H * 0.018);
            swarm.ox += swarm.dir * speed * 2;
            placeAliens();
        }
        if (b.maxY > ship.y - 22) {
            layoutAliens();
            ship.x = W / 2;
        }
    }

    function pickTarget() {
        const live = aliens.filter((a) => a.live);
        if (!live.length) return null;
        live.sort((a, b) => b.r - a.r || Math.abs((a.sx + a.sw / 2) - ship.x) - Math.abs((b.sx + b.sw / 2) - ship.x));
        return live[0];
    }

    function stepShots() {
        shots.forEach((s) => { s.y += s.vy; });
        shots = shots.filter((s) => s.y > -12);
        for (let i = shots.length - 1; i >= 0; i--) {
            const s = shots[i];
            for (let j = 0; j < aliens.length; j++) {
                const a = aliens[j];
                if (!a.live) continue;
                if (s.x < a.sx || s.x > a.sx + a.sw) continue;
                if (s.y < a.sy || s.y > a.sy + a.sh) continue;
                shots.splice(i, 1);
                killAlien(a);
                break;
            }
        }
    }

    function step() {
        frame++;
        if (fireCool > 0) fireCool--;

        if (resetTimer > 0) {
            resetTimer--;
            if (resetTimer === 0) layoutAliens();
            return;
        }

        const spd = Math.max(4.5, W * 0.008);
        if (userControl) {
            if (keys.left) ship.x -= spd;
            if (keys.right) ship.x += spd;
            if (keys.fire) fire();
        } else {
            const target = pickTarget();
            if (target) {
                const tx = target.sx + target.sw / 2;
                ship.x += (tx - ship.x) * 0.12;
                if (Math.abs(tx - ship.x) < Math.max(10, W * 0.02)) fire();
            }
        }
        ship.x = Math.max(ship.w / 2 + 8, Math.min(W - ship.w / 2 - 8, ship.x));

        stepSwarm();
        stepShots();
    }

    let looping = false;

    function loop() {
        if (!running || !inView) {
            looping = false;
            return;
        }
        looping = true;
        if (!reduce.matches) step();
        draw();
        requestAnimationFrame(loop);
    }

    function startLoop() {
        if (looping) return;
        looping = true;
        requestAnimationFrame(loop);
    }

    function toLocalX(clientX) {
        const rect = canvas.getBoundingClientRect();
        return ((clientX - rect.left) / Math.max(rect.width, 1)) * W;
    }

    canvas.addEventListener("mousemove", (e) => {
        takeControl();
        ship.x = toLocalX(e.clientX);
    });
    canvas.addEventListener("pointerdown", (e) => {
        takeControl();
        ship.x = toLocalX(e.clientX);
        fire();
        e.preventDefault();
    });
    canvas.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch") takeControl();
        if (userControl) ship.x = toLocalX(e.clientX);
    });

    window.addEventListener("keydown", (e) => {
        if (!inView) return;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            takeControl();
            keys.left = true;
            e.preventDefault();
        }
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            takeControl();
            keys.right = true;
            e.preventDefault();
        }
        if (e.key === " " || e.key === "ArrowUp") {
            takeControl();
            keys.fire = true;
            fire();
            e.preventDefault();
        }
    });
    window.addEventListener("keyup", (e) => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
        if (e.key === " " || e.key === "ArrowUp") keys.fire = false;
    });

    window.addEventListener("resize", size);
    window.addEventListener("langchange", () => {
        if (modeEl) modeEl.textContent = t(userControl ? "arcade_play" : "arcade_auto");
        if (!boardEl) return;
        boardEl.querySelectorAll(".arcade-chip").forEach((card) => {
            const label = card.querySelector(".arcade-chip-tag")?.textContent;
            const alien = defs().find((d) => d.label === label);
            const p = card.querySelector("p");
            if (alien && p) p.textContent = chipText(alien.log);
        });
    });

    const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            inView = e.isIntersecting;
            if (inView) startLoop();
        });
    }, { threshold: 0.2 });
    obs.observe(section);

    layoutAliens();
    ship.x = W / 2;
    size();
    requestAnimationFrame(size);
    running = true;
})();
