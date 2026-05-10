// @ts-check

export function normalizeOpenAIBaseUrl(url, fallbackUrl) {
    const raw = String(url || '').trim();
    if (!raw) return fallbackUrl;
    return raw.replace(/\/+$/, '').replace(/\/chat\/completions$/i, '').replace(/\/v1$/i, '') + '/v1';
}

export async function populateConnectionProfiles({
    selectIds,
    selectedPreset,
    t,
    root = document,
}) {
    const selectors = selectIds.map(id => root.getElementById(id)).filter(Boolean);
    if (!selectors.length) return;

    try {
        if (window.EchoLiteConnectionUtils) {
            const profiles = await window.EchoLiteConnectionUtils.getProfiles();
            selectors.forEach(select => {
                select.innerHTML = `<option value="">${t('-- Select Profile --')}</option>`;
                profiles.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id || p.name;
                    opt.textContent = p.name;
                    if ((p.id || p.name) === selectedPreset) opt.selected = true;
                    select.appendChild(opt);
                });
            });
        } else {
            selectors.forEach(s => { s.innerHTML = `<option value="">${t('No profiles found')}</option>`; });
        }
    } catch {
        selectors.forEach(s => { s.innerHTML = `<option value="">${t('Error loading profiles')}</option>`; });
    }
}

export async function populateOllamaModels({
    selectId,
    ollamaUrl,
    selectedModel,
    t,
    escapeAttr,
    escapeHtml,
    root = document,
}) {
    const select = root.getElementById(selectId);
    if (!select) return;

    try {
        const resp = await fetch(`${ollamaUrl}/api/tags`);
        if (!resp.ok) throw new Error('');
        const data = await resp.json();
        const models = data.models || [];
        select.innerHTML = `<option value="">${t('-- Select Model --')}</option>`;
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name;
            opt.textContent = m.name;
            if (m.name === selectedModel) opt.selected = true;
            select.appendChild(opt);
        });
    } catch {
        select.innerHTML = `<option value="${escapeAttr(selectedModel || '')}">${escapeHtml(selectedModel || '-- No models found --')}</option>`;
    }
}

export function setOpenAIPresetUrl(preset, currentUrl, fallbackUrl) {
    const urls = {
        custom: currentUrl || fallbackUrl,
        lmstudio: 'http://localhost:1234/v1',
        koboldcpp: 'http://localhost:5001/v1',
        textgenwebui: 'http://localhost:5000/v1',
        vllm: 'http://localhost:8000/v1',
    };

    return normalizeOpenAIBaseUrl(urls[preset], fallbackUrl);
}
