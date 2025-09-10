let currentLang = "en";
let translations = {};

async function loadLanguage(lang) {
    try {
        const response = await fetch(`./locales/${lang}.json`);
        translations = await response.json();
        currentLang = lang;
        applyTranslations();
    } catch (error) {
        console.error("Error loading language file:", error);
    }
}

function t(key) {
    // Nested key support like "header.title"
    return key.split('.').reduce((obj, k) => obj?.[k], translations) || key;
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