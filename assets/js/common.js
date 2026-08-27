window.currentLang = localStorage.getItem("lang") || "es";
if (window.currentLang !== "es" && window.currentLang !== "en") {
    /* persist real UI lang separately from easter modes */
}
window.uiLang = localStorage.getItem("uiLang") || (window.currentLang === "en" ? "en" : "es");

function applyI18n(lang) {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const k = el.getAttribute("data-i18n");
        const v = t(k, lang);
        if (v == null) return;
        if (el.classList.contains("title-text") || el.dataset.i18nText === "1") el.textContent = v;
        else el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        el.placeholder = t(el.getAttribute("data-i18n-placeholder"), lang);
    });
}

function setLanguage(lang) {
    const isEgg = lang === "l" || lang === "c";
    if (!isEgg) {
        window.uiLang = lang;
        localStorage.setItem("uiLang", lang);
        localStorage.setItem("lang", lang);
    }
    window.currentLang = lang;
    document.documentElement.lang = isEgg ? "es" : lang;
    document.documentElement.dataset.mode = isEgg ? lang : "";

    document.querySelectorAll(".lang-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.lang === (isEgg ? window.uiLang : lang));
    });

    applyI18n(lang);

    const eggBtn = document.getElementById("eggBtn");
    if (eggBtn) {
        if (lang === "l") {
            eggBtn.classList.add("show");
            eggBtn.querySelector(".egg-icon").textContent = "🌙";
            eggBtn.querySelector(".egg-text").innerHTML = "× Cerrar Luneta <kbd>esc</kbd>";
        } else {
            eggBtn.classList.remove("show");
        }
    }

    window.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

document.querySelectorAll(".lang-btn").forEach((b) => {
    b.addEventListener("click", () => setLanguage(b.dataset.lang));
});

const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
    navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => navLinks.classList.remove("open")));
}

const sections = document.querySelectorAll("section[id]");
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
if (sections.length && navAnchors.length) {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                navAnchors.forEach((a) => {
                    a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id);
                });
            }
        });
    }, { threshold: 0.28 });
    sections.forEach((s) => obs.observe(s));
}

const progressBar = document.getElementById("scroll-progress");
window.addEventListener("scroll", () => {
    if (!progressBar) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    progressBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
});

document.querySelectorAll(".section").forEach((s) => {
    s.classList.add("visible");
});

const backBtn = document.getElementById("back-to-top");
if (backBtn) {
    window.addEventListener("scroll", () => {
        backBtn.classList.toggle("visible", window.scrollY > window.innerHeight);
    });
    backBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

(function theme() {
    const btn = document.getElementById("themeToggle");
    if (localStorage.getItem("theme") === "light") {
        document.documentElement.classList.add("light");
        if (btn) btn.textContent = "☽";
    }
    if (!btn) return;
    btn.addEventListener("click", () => {
        const light = document.documentElement.classList.toggle("light");
        btn.textContent = light ? "☽" : "☀";
        localStorage.setItem("theme", light ? "light" : "dark");
    });
})();

window.showToast = function (msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
};

function typingTarget(e) {
    const tag = (e.target && e.target.tagName) || "";
    return tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;
}

document.addEventListener("keydown", (e) => {
    if (window.termKeyHandler) return;
    if (typingTarget(e)) return;
    if (e.key === "l" || e.key === "L") setLanguage("l");
    if (e.key === "Escape") {
        const dock = document.getElementById("musicDock");
        if (dock && !dock.hidden) {
            dock.classList.remove("open");
            dock.hidden = true;
            return;
        }
        if (window.skyNameOn && window.setNameConstellation) {
            window.setNameConstellation(false);
            return;
        }
        setLanguage(window.uiLang || "es");
    }
});

const eggBtn = document.getElementById("eggBtn");
if (eggBtn) eggBtn.addEventListener("click", () => setLanguage(window.uiLang || "es"));

setLanguage(localStorage.getItem("lang") === "en" ? "en" : "es");
