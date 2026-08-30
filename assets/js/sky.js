(function () {
    const canvas = document.getElementById("skyCanvas");
    const moon = document.querySelector(".sky-moon");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function mulberry32(a) {
        return function () {
            let t = (a += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const rand = mulberry32(20260821);
    const stars = [];
    const COUNT = 220;

    function placeStars() {
        stars.length = 0;
        for (let i = 0; i < COUNT; i++) {
            const layer = rand() < 0.22 ? 0.9 : rand() < 0.55 ? 0.45 : 0.18;
            stars.push({
                x: rand(),
                y: rand() * 0.94,
                r: layer > 0.7 ? rand() * 1.1 + 0.9 : rand() * 0.8 + 0.25,
                tw: rand() * Math.PI * 2,
                sp: 0.35 + rand() * 1.6,
                bright: rand(),
                depth: layer
            });
        }
    }
    placeStars();

    /* lowercase, x-height ~1.55–4, ascenders on d/b */
    const GLYPHS = {
        d: [
            [[2, 0], [2, 4]],
            [[2, 1.55], [0.85, 1.55], [0, 2.2], [0, 3.35], [0.85, 4], [2, 4]]
        ],
        e: [
            [[2, 2.72], [0.12, 2.72], [0, 2.15], [0.5, 1.55], [1.5, 1.55], [2, 2.05], [1.85, 2.72]],
            [[0.12, 2.72], [0, 3.35], [0.5, 4], [1.55, 4], [2, 3.45]]
        ],
        v: [[[0, 1.55], [1, 4], [2, 1.55]]],
        a: [
            [[2, 1.55], [2, 4]],
            [[2, 1.55], [0.75, 1.55], [0, 2.2], [0, 3.35], [0.75, 4], [2, 4]]
        ],
        r: [
            [[0, 1.55], [0, 4]],
            [[0, 1.7], [0.85, 1.55], [1.7, 1.55], [2, 1.95]]
        ],
        b: [
            [[0, 0], [0, 4]],
            [[0, 1.55], [1.2, 1.55], [2, 2.2], [2, 3.35], [1.2, 4], [0, 4]]
        ]
    };

    function dist(a, b) {
        return Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    function sampleStroke(pts, step) {
        const out = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const n = Math.max(1, Math.ceil(dist(a, b) / step));
            for (let k = 0; k < n; k++) {
                const t = k / n;
                out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
            }
        }
        out.push(pts[pts.length - 1]);
        return out;
    }

    function buildNameLayout() {
        const word = "devarber";
        const letters = [];
        let cursor = 0;
        word.split("").forEach((ch) => {
            const strokes = GLYPHS[ch] || [];
            const sampled = strokes.map((s) => sampleStroke(s, 0.42));
            letters.push({ x: cursor, strokes: sampled });
            cursor += 3.15;
        });
        return { letters, width: cursor - 0.15, height: 4 };
    }
    const NAME = buildNameLayout();

    let nameOn = false;
    let nameReveal = 0;
    window.skyNameOn = false;

    function letterToScreen(lx, ly, layout) {
        const padX = window.innerWidth * 0.1;
        const usable = window.innerWidth * 0.8;
        const unit = usable / layout.width;
        const originY = window.innerHeight * 0.36;
        return {
            x: padX + lx * unit,
            y: originY + ly * unit * 0.92
        };
    }

    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    window.addEventListener("mousemove", (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        target.x = nx;
        target.y = ny;
    });
    window.addEventListener("mouseleave", () => { target.x = 0; target.y = 0; });

    function size() {
        canvas.width = window.innerWidth * devicePixelRatio;
        canvas.height = window.innerHeight * devicePixelRatio;
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    size();
    window.addEventListener("resize", size);

    function starPos(s) {
        return {
            x: s.x * window.innerWidth + mouse.x * s.depth * 36,
            y: s.y * window.innerHeight + mouse.y * s.depth * 22
        };
    }

    function color() {
        const light = document.documentElement.classList.contains("light");
        return light ? "rgba(30, 50, 80, 0.5)" : "rgba(232, 238, 247, 0.92)";
    }

    function drawName(time) {
        if (nameReveal < 0.01) return;
        const cs = getComputedStyle(document.documentElement);
        const gold = cs.getPropertyValue("--gold").trim() || "#b8a0e0";
        const moonC = cs.getPropertyValue("--moon").trim() || "#f2e9d8";
        ctx.save();
        ctx.globalAlpha = nameReveal * 0.95;
        ctx.lineWidth = 1.05;
        ctx.strokeStyle = gold;
        ctx.fillStyle = moonC;
        NAME.letters.forEach((letter) => {
            letter.strokes.forEach((stroke) => {
                ctx.beginPath();
                stroke.forEach((pt, i) => {
                    const p = letterToScreen(letter.x + pt[0], pt[1], NAME);
                    p.x += mouse.x * 10;
                    p.y += mouse.y * 6;
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.stroke();
                stroke.forEach((pt) => {
                    const p = letterToScreen(letter.x + pt[0], pt[1], NAME);
                    p.x += mouse.x * 10;
                    p.y += mouse.y * 6;
                    const pulse = 0.7 + 0.3 * Math.sin(time * 0.003 + pt[0]);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 1.55 * pulse, 0, Math.PI * 2);
                    ctx.fill();
                });
            });
        });
        ctx.restore();
    }

    function draw(time) {
        mouse.x += (target.x - mouse.x) * 0.055;
        mouse.y += (target.y - mouse.y) * 0.055;
        nameReveal += ((nameOn ? 1 : 0) - nameReveal) * 0.08;

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        const fill = color();
        const dim = nameOn ? 0.42 : 1;

        stars.forEach((s) => {
            const p = starPos(s);
            const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.001 * s.sp + s.tw));
            ctx.globalAlpha = twinkle * (0.28 + s.bright * 0.72) * dim;
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.arc(p.x, p.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        drawName(time);

        if (moon) {
            const scale = getComputedStyle(document.documentElement).getPropertyValue("--moon-scale").trim() || "1";
            moon.style.transform = `translate(${mouse.x * -14}px, ${mouse.y * -10}px) scale(${scale})`;
        }
        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    function setNameConstellation(on) {
        nameOn = on;
        window.skyNameOn = on;
        document.documentElement.classList.toggle("sky-name", on);
        if (on && window.showToast) {
            showToast(window.currentLang === "en" ? "devarber, traced in the sky" : "devarber, trazado en el cielo");
        }
    }
    window.toggleNameConstellation = function () {
        setNameConstellation(!nameOn);
    };
    window.setNameConstellation = setNameConstellation;

    if (moon) {
        moon.addEventListener("dblclick", (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.toggleNameConstellation();
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nameOn) {
            setNameConstellation(false);
            e.stopPropagation();
        }
    });
})();
