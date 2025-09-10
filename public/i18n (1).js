let translations = {};
let currentLang = localStorage.getItem("lang") || "en";

async function loadLanguage(lang) {
    try {
        const res = await fetch(`/locales/${lang}.json`);
        translations = await res.json();
        currentLang = lang;
        localStorage.setItem("lang", lang);
        applyTranslations();
    } catch (err) {
        console.error("Translation load error:", err);
    }
}

function t(key) {
    return key.split('.').reduce((o, i) => o ? o[i] : null, translations) || key;
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (el.placeholder !== undefined && el.tagName === "INPUT") {
            el.placeholder = t(key);
        } else {
            el.textContent = t(key);
        }
    });
}

// Load initial language
document.addEventListener("DOMContentLoaded", () => {
    loadLanguage(currentLang);
});
