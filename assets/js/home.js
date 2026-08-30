(function () {
    let twTimeout;
    function typewriter(el, text, speed) {
        if (!el) return;
        el.textContent = "";
        const cursor = el.nextElementSibling;
        if (cursor) cursor.classList.add("typing");
        let i = 0;
        clearTimeout(twTimeout);
        function step() {
            if (i < text.length) {
                el.textContent += text[i++];
                twTimeout = setTimeout(step, speed);
            } else if (cursor) cursor.classList.remove("typing");
        }
        step();
    }

    function startTitle() {
        typewriter(document.getElementById("tw-text"), t("title"), 38);
    }
    startTitle();
    window.addEventListener("langchange", startTitle);

    const expEl = document.getElementById("expYears");
    let expCounted = false;
    function countExpYears() {
        if (!expEl || expCounted) return;
        expCounted = true;
        const startYear = parseInt(expEl.dataset.from, 10);
        const target = Math.max(1, new Date().getFullYear() - startYear);
        let current = 0;
        const timer = setInterval(() => {
            current += 1;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            expEl.textContent = current + "+";
        }, 90);
    }
    if (expEl) {
        const expObs = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                countExpYears();
                expObs.unobserve(expEl);
            });
        }, { threshold: 0.5 });
        expObs.observe(expEl);
    }

    const peekWrap = document.getElementById("heroAvatarWrap");
    const peekBtn = document.getElementById("heroAvatarBtn");
    const peekCard = document.getElementById("heroPeek");
    const peekOverlay = document.getElementById("heroPeekOverlay");
    const peekClose = document.getElementById("heroPeekClose");
    const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)");

    function placePeekSide() {
        if (!peekWrap || !peekCard || !fineHover.matches) {
            peekWrap?.classList.remove("peek-left");
            return;
        }
        const gap = 12;
        const cardW = peekCard.offsetWidth || 300;
        const rect = peekWrap.getBoundingClientRect();
        const spaceRight = window.innerWidth - rect.right - gap - 16;
        const spaceLeft = rect.left - gap - 16;
        peekWrap.classList.toggle("peek-left", spaceRight < cardW && spaceLeft > spaceRight);
    }

    function setPeekOpen(open) {
        if (!peekWrap || !peekBtn || !peekCard) return;
        if (open) {
            placePeekSide();
            countExpYears();
        }
        peekWrap.classList.toggle("is-open", open);
        peekBtn.setAttribute("aria-expanded", open ? "true" : "false");
        peekCard.setAttribute("aria-hidden", open ? "false" : "true");
        peekCard.setAttribute("aria-modal", open && !fineHover.matches ? "true" : "false");
        if (peekOverlay) {
            peekOverlay.hidden = !open || fineHover.matches;
            peekOverlay.setAttribute("aria-hidden", peekOverlay.hidden ? "true" : "false");
        }
    }

    if (peekBtn && peekWrap) {
        let peekHideTimer = null;
        peekWrap.addEventListener("mouseenter", () => {
            if (!fineHover.matches) return;
            clearTimeout(peekHideTimer);
            setPeekOpen(true);
        });
        peekWrap.addEventListener("mouseleave", () => {
            if (!fineHover.matches) return;
            clearTimeout(peekHideTimer);
            peekHideTimer = setTimeout(() => setPeekOpen(false), 120);
        });
        window.addEventListener("resize", () => {
            if (peekWrap.classList.contains("is-open")) placePeekSide();
        });
        peekBtn.addEventListener("click", () => {
            if (fineHover.matches) return;
            setPeekOpen(!peekWrap.classList.contains("is-open"));
        });
        peekClose?.addEventListener("click", (e) => {
            e.stopPropagation();
            setPeekOpen(false);
            peekBtn.focus();
        });
        peekOverlay?.addEventListener("click", () => setPeekOpen(false));
        document.addEventListener("keydown", (e) => {
            if (e.key !== "Escape") return;
            if (peekWrap.classList.contains("is-open")) {
                setPeekOpen(false);
                peekBtn.focus();
            } else if (fineHover.matches && peekWrap.contains(document.activeElement)) {
                peekBtn.blur();
            }
        });
    }

    document.querySelectorAll(".timeline-item").forEach((item) => {
        const tl = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); });
        }, { threshold: 0.15 });
        tl.observe(item);
    });

    document.querySelectorAll("#stackFilters button").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#stackFilters button").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const filter = btn.dataset.filter;
            document.querySelectorAll("#stackGrid .stack-tile").forEach((tile) => {
                tile.classList.toggle("stack-filter-hidden", filter !== "all" && tile.dataset.cat !== filter);
            });
        });
    });

    function paintStackMeta() {
        const tiles = [...document.querySelectorAll("#stackGrid .stack-tile")];
        const counts = { all: tiles.length };
        tiles.forEach((tile) => {
            const cat = tile.dataset.cat;
            counts[cat] = (counts[cat] || 0) + 1;
        });
        document.querySelectorAll("#stackFilters button").forEach((btn) => {
            const n = btn.querySelector(".stack-n");
            if (n) n.textContent = counts[btn.dataset.filter] || 0;
        });
        const total = document.getElementById("stackTotal");
        if (total) total.textContent = t("stack_count").replace("{n}", String(counts.all));
    }
    paintStackMeta();
    window.addEventListener("langchange", paintStackMeta);

    const emailCard = document.getElementById("emailCard");
    const contactForm = document.getElementById("contactForm");
    if (emailCard && contactForm) {
        function setEmailOpen(open) {
            emailCard.classList.toggle("is-open", open);
            emailCard.setAttribute("aria-expanded", open ? "true" : "false");
        }
        emailCard.addEventListener("click", (e) => {
            if (e.target.closest(".contact-form")) return;
            setEmailOpen(!emailCard.classList.contains("is-open"));
        });
        emailCard.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            if (e.target !== emailCard) return;
            e.preventDefault();
            setEmailOpen(!emailCard.classList.contains("is-open"));
        });
        document.getElementById("formClose").addEventListener("click", (e) => {
            e.stopPropagation();
            setEmailOpen(false);
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
            setEmailOpen(false);
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

    const MUSIC_URI = "spotify:track:1FArbfTMXgDECU9zG3iY1X";
    let spotifyCtrl = null;
    let spotifyReady = false;
    let pendingPlay = false;
    let gestureKick = null;

    function showMusicDock() {
        const dock = document.getElementById("musicDock");
        if (!dock) return;
        dock.classList.add("open");
        dock.setAttribute("aria-hidden", "false");
    }

    function disarmGesturePlay() {
        if (!gestureKick) return;
        document.removeEventListener("pointerdown", gestureKick, true);
        gestureKick = null;
    }

    function playCannonball() {
        pendingPlay = true;
        if (!spotifyCtrl || !spotifyReady) return;
        try { spotifyCtrl.restart(); } catch (_) {}
        try { spotifyCtrl.play(); } catch (_) {}
        try { spotifyCtrl.resume(); } catch (_) {}
    }

    function armGesturePlay() {
        if (gestureKick) return;
        gestureKick = (e) => {
            if (e.type === "keydown") return;
            playCannonball();
            disarmGesturePlay();
        };
        document.addEventListener("pointerdown", gestureKick, true);
    }

    function closeMusicDock() {
        const dock = document.getElementById("musicDock");
        if (!dock) return;
        dock.classList.remove("open");
        dock.setAttribute("aria-hidden", "true");
        pendingPlay = false;
        disarmGesturePlay();
        if (spotifyCtrl) {
            try { spotifyCtrl.pause(); } catch (_) {}
        }
    }

    function openMusicDock(autoplay) {
        const dock = document.getElementById("musicDock");
        if (!dock) return;
        showMusicDock();
        if (!autoplay) return;
        playCannonball();
        armGesturePlay();
    }

    window.onSpotifyIframeApiReady = (IFrameAPI) => {
        const el = document.getElementById("musicEmbed");
        if (!el || !IFrameAPI) return;
        IFrameAPI.createController(el, {
            uri: MUSIC_URI,
            height: 152,
            width: "100%"
        }, (ctrl) => {
            spotifyCtrl = ctrl;
            ctrl.addListener("ready", () => {
                spotifyReady = true;
                if (pendingPlay) {
                    try { ctrl.restart(); } catch (_) {}
                    try { ctrl.play(); } catch (_) {}
                }
            });
            ctrl.addListener("playback_started", () => {
                pendingPlay = false;
                disarmGesturePlay();
            });
        });
    };

    if (!document.getElementById("spotifyIframeApi")) {
        const s = document.createElement("script");
        s.id = "spotifyIframeApi";
        s.src = "https://open.spotify.com/embed/iframe-api/v1";
        s.async = true;
        document.head.appendChild(s);
    }

    document.getElementById("musicClose")?.addEventListener("click", closeMusicDock);
    window.openMusicDock = openMusicDock;
    window.closeMusicDock = closeMusicDock;
})();
