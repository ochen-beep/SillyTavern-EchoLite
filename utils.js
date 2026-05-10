// @ts-check

export function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

export function createLogger(moduleName) {
    return {
        log: (...args) => console.log(`[${moduleName}]`, ...args),
        warn: (...args) => console.warn(`[${moduleName}]`, ...args),
        error: (...args) => console.error(`[${moduleName}]`, ...args),
    };
}

export function resolveSTMacro(text) {
    try {
        const ctx = SillyTavern.getContext();
        return ctx.substituteParams ? ctx.substituteParams(text) : text;
    } catch {
        return text;
    }
}

export function extractText(htmlString) {
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlString;
    return tmp.innerText || tmp.textContent || '';
}

export function escapeHtml(str) {
    const value = String(str ?? '');
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;');
}

export function escapeAttr(str) {
    const value = String(str ?? '');
    return value
        .replace(/&/g, '&amp;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
