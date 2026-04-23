// @ts-check
/**
 * EchoLite — optimized fork of EchoChamber
 * Removed: Livestream mode, Pop-out window, 10 extra chat styles
 * Added: Mobile ST input fix, 100dvh, i18n (ru-ru), touch targets
 */
(async function () {
 'use strict';

 // CONSTANTS
    const MODULE_NAME = 'EchoLite';
    const EXTENSION_NAME = 'SillyTavern-EchoLite';

    // Determine BASE_URL dynamically from the loaded script tag
    // (matches the approach used by the upstream EchoChamber)
    let BASE_URL = `scripts/extensions/third-party/${EXTENSION_NAME}`;
    (function () {
        const scripts = document.querySelectorAll('script[src*="index.js"]');
        for (const script of scripts) {
            if (script.src.includes('EchoLite') || script.src.includes('echolite')) {
                BASE_URL = script.src.split('/').slice(0, -1).join('/');
                break;
            }
        }
    })();

    // Determine moduleName for renderExtensionTemplateAsync
    let MODULE_PATH = `third-party/${EXTENSION_NAME}`;
    (function () {
        const scripts = document.querySelectorAll('script[src*="index.js"]');
        for (const script of scripts) {
            const match = script.src.match(/extensions\/(.+?)\/index\.js/);
            if (match && (match[1].includes('EchoLite') || match[1].includes('echolite'))) {
                MODULE_PATH = match[1];
                break;
            }
        }
    })();

 // DEFAULT SETTINGS
    const defaultSettings = {
        enabled: false,
        collapsed: false,
        paused: false,
        position: 'bottom',
        style: 'realdiscord',
        customPrompt: '',
        promptCustomMode: false,
        promptNicknames: '',
        promptPersonas: '',
        promptLanguage: '',
        userCount: 5,
        fontSize: 15,
        autoUpdate: true,
        includeUser: false,
        contextDepth: 4,
        includePastEcho: false,
        includePersona: false,
        includeCharacterDescription: false,
        includeWorldInfo: false,
        wiTokenBudget: 0,

        overrideMaxTokens: false,
        maxTokens: 300,
        source: 'default',
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: '',
        openaiUrl: 'http://localhost:1234/v1',
        openaiKey: '',
        openaiModel: 'local-model',
        openaiPreset: 'custom',
        selectedPreset: '',
        customStyles: [],
        styleOrder: null,
        deletedBuiltins: [],
        activeTab: 'source',
        fontFamily: 'system',
        // ── No-Save Mode ──
        noSaveMode: false,               // generate comments without saving to chat metadata
        popoutLeft:   null,              // saved X coordinate of the popout window (px)
        popoutTop:    null,              // saved Y coordinate of the popout window (px)
        popoutWidth:  null,              // saved width  of the popout window (px)
        popoutHeight: null,              // saved height of the popout window (px)
    };

 // STATE
 let settings = {};
 let generationInProgress = false;
 let generationAbortController = null;
    let currentChatId = null;
    let panelResizeActive = false;
    let activeMenuBtn = null;
    let overflowMenuOpen = false;
    let qsMenuOpen = false;
    let eventHandlersBound = false;   // guard: bindEventHandlers runs only once
let currentPostId = null; // msgId (chat[] index as String) of the post shown in the bar
 let currentSwipeIdx = 0; // swipe_id of that post
 let _navLockUntil = 0; // timestamp: IO ignored until this time (explicit nav lock)
 let pendingSwipeMsgId = null; // msgId of a swipe that happened during generation — to process in GENERATION_ENDED
 let pendingSwipeIdx = null; // swipe_id for that pending swipe
 let _suppressGenerationEndedCount = 0; // counter: incremented for each GENERATION_STARTED that should suppress GENERATION_ENDED (dry-runs + EchoLite's own calls)

 // i18n
    const RU = {
        'EchoLite': 'EchoLite',
        'EchoChamber Settings': 'Настройки EchoLite',
        'Regenerate Chat': 'Обновить чат',
        'Clear Chat & Cache': 'Очистить чат и кэш',
        'Settings': 'Настройки',
        'Panel Position': 'Положение панели',
        'User Count': 'Число пользователей',
        'Font Size': 'Размер шрифта',
        'Font Family': 'Гарнитура шрифта',
        'Toggle On/Off (Currently ON)': 'Вкл/Выкл (сейчас ВКЛ)',
        'Toggle On/Off (Currently OFF)': 'Вкл/Выкл (сейчас ВЫКЛ)',
        'Processing...': 'Обработка...',
        'Cancel': 'Отмена',
        'Stop action (cancel generation)': 'Остановить (отменить генерацию)',
        'Send message': 'Отправить сообщение',
        'Stopping...': 'Остановка...',
        'Generation cancelled': 'Генерация отменена',
        'Chat and cache cleared': 'Чат и кэш очищены',
        'Style Editor': 'Редактор стилей',
        'New': 'Новый',
        'Select a style to edit or create a new one': 'Выберите стиль для редактирования или создайте новый',
        'Delete': 'Удалить',
        'Export': 'Экспорт',
        'Save': 'Сохранить',
        'Style saved!': 'Стиль сохранён!',
        'Style exported!': 'Стиль экспортирован!',
        'Style removed': 'Стиль удалён',
        'Style name cannot be empty': 'Название стиля не может быть пустым',
        'Delete this custom style? This cannot be undone.': 'Удалить этот пользовательский стиль? Это действие необратимо.',
        'Create New Style': 'Создать новый стиль',
        'Easy Mode': 'Простой режим',
        'Advanced': 'Расширенный',
        'Style Name': 'Название стиля',
        'Create': 'Создать',
        'General': 'Основное',
        'Done': 'Готово',
        'No profiles found': 'Профили не найдены',
        'Error loading profiles': 'Ошибка загрузки профилей',
        '-- Select Profile --': '-- Выберите профиль --',
        'Processing cancelled': 'Обработка отменена',
        'No valid chat lines generated.': 'Не создано допустимых строк чата.',
        'Clear all generated chat messages and cached commentary?': 'Очистить все сгенерированные сообщения и кэш?',
        'EchoLite Generation Error': 'Ошибка генерации EchoLite',
        'Type a message to participate...': 'Введите сообщение...',
        'is typing...': 'печатает...',
        'Chat is typing...': 'Чат печатает...',
        '(Built-in styles cannot be renamed)': '(Встроенные стили нельзя переименовать)',
        'Bottom': 'Снизу',
        'Left': 'Слева',
        'Right': 'Справа',
        'Pop Out': 'Всплывающее',
        'Font': 'Шрифт',
        'Imported style:': 'Стиль импортирован:',
        'Override Max Tokens': 'Переопределить макс. токены',
        'Custom Max Tokens': 'Пользовательский лимит токенов',
        // settings.html section headers & labels
        'Enable EchoLite': 'Включить EchoLite',
        'Generation Engine': 'Движок генерации',
        'Source': 'API',
        'Default (Main API)': 'По умолчанию (основной API)',
        'Connection Profile (Recommended)': 'Профиль подключения (рекомендуется)',
        'Ollama (Local)': 'Ollama (Локальный)',
        'OpenAI Compatible': 'Совместимый с OpenAI',
        'Connection Profile': 'Профиль соединения',
        'Uses your existing ST credentials securely.': 'Использует ваши текущие учётные данные ST.',
        '-- Select Profile --': '-- Выберите профиль --',
        'Display': 'Отображение',
        'Style': 'Стиль',
        'Position': 'Позиция',
        'Bottom': 'Снизу',
        'Left': 'Слева',
        'Right': 'Справа',
        'Users': 'Пользователи',
        'Font (px)': 'Шрифт (пт)',
        'Opacity': 'Прозрачность',
        'Content Settings': 'Контент',
        'Auto-update On Messages': 'Обновлять при новых сообщениях',
        'Include Chat History': 'Включать историю чата',
        'Context Depth': 'Глубина контекста',
        'Include Past Generated EchoChambers': 'Включать прошлые комментарии',
        'Includes previous commentary in the prompt for new generations': 'Включает предыдущие комментарии в промпт',
        'Include in Context': 'Включить в контекст',
        'Persona': 'Персона',
        'Character Description(s)': 'Персонаж',
        'World Info / Lorebook': 'World Info / Лорбук',
        'Additional context to include when generating the chat feed': 'Дополнительный контекст для генерации',
        'WI Token Budget': 'Бюджет токенов WI',
        '0 = use ST budget': '(0 = использовать бюджет ST)',
        'Style Manager': 'Менеджер стилей',
        'Generation Rules': 'Правила генерации',
        'Generation Rules Hint': 'Редактируйте системный промт для генерации комментариев. Изменения сохраняются автоматически.',
        'Prompt': 'Промт',
        'Reset': 'Сбросить',
        'Prompt reset to default': 'Промт сброшен к дефолтному',
        // Settings modal tabs & sections
        'Engine': 'Движок',
        'Styles': 'Стили',
        'Display': 'Отображение',
        'Content': 'Контент',
        'Source': 'Источник',
        'Auto-update On Messages': 'Обновлять при новых сообщениях',
        'Include Chat History': 'Включать историю чата',
        'Context Depth': 'Глубина контекста',
        'Include Past Commentary': 'Включать прошлые комментарии',
        'Default (Main API)': 'По умолчанию (основной API)',
        'Connection Profile': 'Профиль подключения',
        'Ollama': 'Ollama (локальный)',
        'OpenAI Compatible': 'Совместимый с OpenAI',
        'Drag to reorder': 'Перетащите для изменения порядка',
        '-- Select Profile --': '-- Выберите профиль --',
        'No profiles found': 'Профили не найдены',
        'Error loading profiles': 'Ошибка загрузки профилей',
        // Post Navigator
        'Post Navigator': 'Навигатор постов',
        'Load': 'Загрузить',
        'Regenerate': 'Перегенерировать',
        'Export JPG': 'Сохранить JPG',
        'No posts yet': 'Постов нет',
        'Pinned': 'Закреплено',
        'Post': 'Пост',
        'Swipe': 'Свайп',
    };

    function getLocale() {
        try {
            // ST sets the <html lang="..."> attribute via i18n.js
            const htmlLang = document.documentElement.lang;
            if (htmlLang) return htmlLang.toLowerCase();
            // Fallback: check powerUser locale setting if available
            const ctx = SillyTavern.getContext();
            const locale = ctx.powerUser?.locale || ctx.powerUser?.i18n || 'en-us';
            return locale.toLowerCase();
        } catch { return 'en-us'; }
    }

    function t(key) {
        if (getLocale().startsWith('ru')) return RU[key] || key;
        return key;
    }

 // STYLE DEFINITIONS (only 2 built-in)
    const STYLE_FILES = {
        'realdiscord': 'realdiscord.md',
    };

    const BUILT_IN_STYLES = [
        { val: 'realdiscord', label: 'RealDiscord' },
    ];

    const DEFAULT_STYLE_ORDER = ['realdiscord'];

 // UTILITIES
    function debounce(fn, ms) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
    }

    function log(...args) { console.log(`[${MODULE_NAME}]`, ...args); }
    function warn(...args) { console.warn(`[${MODULE_NAME}]`, ...args); }
    function error(...args) { console.error(`[${MODULE_NAME}]`, ...args); }

    /**
     * Translate all [data-i18n] elements inside the EchoLite settings panel.
     * Called once after the panel HTML is inserted into the DOM.
     */
    function applySettingsTranslations() {
        if (!getLocale().startsWith('ru')) return; // English = default, no changes needed
        const container = document.getElementById('echolite_settings_container');
        if (!container) return;
        container.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translated = RU[key];
            if (translated) el.textContent = translated;
        });
        // Also translate <option> elements (data-i18n on options)
        container.querySelectorAll('option[data-i18n]').forEach(opt => {
            const key = opt.getAttribute('data-i18n');
            const translated = RU[key];
            if (translated) opt.textContent = translated;
        });
    }

    function resolveSTMacro(text) {
        try {
            const ctx = SillyTavern.getContext();
            return ctx.substituteParams ? ctx.substituteParams(text) : text;
        } catch { return text; }
    }

    function extractText(htmlString) {
        const tmp = document.createElement('div');
        tmp.innerHTML = htmlString;
        return tmp.innerText || tmp.textContent || '';
    }

 // CONFIRMATION MODAL
 // Guarded singleton with proper cleanup
 let confirmModalResolver = null;
 let confirmModalVisible = false;

 function showConfirmModal(message) {
 return new Promise((resolve) => {
 // Guard: prevent multiple concurrent modals
 if (confirmModalVisible) {
 resolve(false);
 return;
 }
 confirmModalResolver = resolve;
 confirmModalVisible = true;

 let overlay = document.getElementById('ec_confirm_modal_overlay');
 if (!overlay) {
 overlay = document.createElement('div');
 overlay.id = 'ec_confirm_modal_overlay';
 overlay.className = 'ec_confirm_modal_overlay';
 overlay.innerHTML = `
 <div class="ec_confirm_modal_card">
 <div class="ec_confirm_modal_icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
 <div class="ec_confirm_modal_message" id="ec_confirm_message"></div>
 <div class="ec_confirm_modal_actions">
 <button class="ec_confirm_modal_btn ec_confirm_cancel" id="ec_confirm_cancel">${t('Cancel')}</button>
 <button class="ec_confirm_modal_btn ec_confirm_ok" id="ec_confirm_ok">${t('Confirm')}</button>
 </div>
 </div>`;
 document.body.appendChild(overlay);

 const cancelBtn = document.getElementById('ec_confirm_cancel');
 const okBtn = document.getElementById('ec_confirm_ok');

 // Store cleanup function for reuse
 overlay._ecCleanup = () => {
 cancelBtn?.removeEventListener('click', overlay._ecOnCancel);
 okBtn?.removeEventListener('click', overlay._ecOnOk);
 overlay?.removeEventListener('click', overlay._ecOnBackdrop);
 };

 overlay._ecOnCancel = () => closeConfirm(false);
 overlay._ecOnOk = () => closeConfirm(true);
 overlay._ecOnBackdrop = (e) => { if (e.target === overlay) closeConfirm(false); };

 cancelBtn.addEventListener('click', overlay._ecOnCancel);
 okBtn.addEventListener('click', overlay._ecOnOk);
 overlay.addEventListener('click', overlay._ecOnBackdrop);
 }
 document.getElementById('ec_confirm_message').textContent = message;
 requestAnimationFrame(() => overlay.classList.add('ec_confirm_visible'));
 });
 }

 function closeConfirm(result) {
 if (!confirmModalVisible) return;
 confirmModalVisible = false;

 const overlay = document.getElementById('ec_confirm_modal_overlay');
 if (overlay) {
 overlay.classList.remove('ec_confirm_visible');
 // Cleanup listeners to prevent memory leaks
 overlay._ecCleanup?.();
 }
 if (confirmModalResolver) {
 confirmModalResolver(result);
 confirmModalResolver = null;
 }
 }

 // ST INPUT BAR VISIBILITY (mobile fix)
    function updateSTInputVisibility() {
        const isBottomActive = settings.enabled && !settings.collapsed && settings.position === 'bottom';
        if (isBottomActive) {
            document.body.classList.add('ec-bottom-active');
        } else {
            document.body.classList.remove('ec-bottom-active');
        }
    }

 // CORE DISPLAY
    function setDiscordText(html) {
        const content = document.getElementById('discordContent');
        if (!content) return;
        content.innerHTML = html;
    }

    function setStatus(msg, isError = false) {
        const overlay = document.querySelector('#discordBar .ec_status_overlay');
        if (!overlay) return;
        if (!msg) {
            overlay.classList.remove('active');
            overlay.innerHTML = '';
            return;
        }
        overlay.innerHTML = `<span>${msg}</span>${isError ? '' : `<button class="ec_status_btn" id="ec_cancel_gen"><i class="fa-solid fa-xmark"></i> ${t('Cancel')}</button>`}`;
        overlay.classList.add('active');
        const cancelBtn = overlay.querySelector('#ec_cancel_gen');
        if (cancelBtn) cancelBtn.addEventListener('click', cancelGeneration, { once: true });
    }

    function cancelGeneration() {
        if (generationAbortController) {
            generationAbortController.abort();
            generationAbortController = null;
        }
        generationInProgress = false;
        setStatus('');
        setDiscordText(`<div class="discord_status ec_cancelled"><i class="fa-solid fa-circle-stop"></i> ${t('Generation cancelled')}</div>`);
        setTimeout(() => {
            const el = document.querySelector('.discord_status.ec_cancelled');
            if (el) { el.classList.add('fade-out'); setTimeout(() => el.remove(), 500); }
        }, 2000);
    }

    function applyFontSize(size) {
        const content = document.getElementById('discordContent');
        if (content) content.style.fontSize = `${size}px`;
    }

    const EC_FONTS = {
        system:  { label: 'System',  value: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
        inter:   { label: 'Inter',   value: "'Inter', 'Noto Sans', 'Segoe UI', sans-serif" },
        mono:    { label: 'Mono',    value: "'Consolas', 'Courier New', monospace" },
        serif:   { label: 'Serif',   value: "Georgia, 'Times New Roman', serif" },
        comic:   { label: 'Comic',   value: "'Comic Sans MS', 'Chalkboard SE', cursive" },
    };

    function applyFontFamily(key) {
        const font = EC_FONTS[key] || EC_FONTS.system;
        const content = document.getElementById('discordContent');
        if (content) content.style.fontFamily = font.value;
    }


    // ───────────────────────────────────────────────────────────
    const debouncedGenerate = debounce(() => {
        if (settings.autoUpdate && settings.enabled && !settings.paused && !generationInProgress) {
            generateDiscordChat();
        }
    }, 800);

    function onChatEvent() {
        const ctx = SillyTavern.getContext();
        const chatId = ctx.chatId;
if (chatId !== currentChatId) {
 currentChatId = chatId;
 currentPostId = null;
 currentSwipeIdx = 0;
 pendingSwipeMsgId = null; // clear stale pending swipes from previous chat
 pendingSwipeIdx = null;

            if (!chatId) {
                // Welcome screen / no active chat — clear the panel completely.
                // Do NOT call restoreCachedCommentary: the previous chat's store
                // is still in memory and would display stale comments.
                const contentEl = document.getElementById('discordContent');
                if (contentEl) contentEl.innerHTML = '';
                updatePostIndicator();
                return;
            }

            // Real chat opened — restore cached commentary only, do NOT auto-generate.
            // Generation should only happen after a new AI message (MESSAGE_RECEIVED).
            restoreCachedCommentary();
        }
    }

    // ───────────────────────────────────────────────────────────
    // METADATA / CACHE  (per-post, per-swipe)
    // Structure: chatMetadata['echolite_commentary'] = {
    //   posts: { "7": { "0": {html, timestamp}, "1": {html, timestamp} } },
    //   current: { msgId: "7", swipeIdx: 0 }
    // }
    // ───────────────────────────────────────────────────────────
    function getMetadataKey() {
        return 'echolite_commentary';
    }

    /**
     * Return the commentary store for the current chat.
     * Migrates the old flat format { html, timestamp } → posts["legacy"]["0"].
     */
    function getCommentaryStore() {
        try {
            const ctx = SillyTavern.getContext();
            if (!ctx.chatMetadata) return null;
            const key = getMetadataKey();
            let store = ctx.chatMetadata[key];

            // Migration: old flat format had .html directly on the object
            if (store && store.html && !store.posts) {
                // Resolve the real last AI message index so the cache key matches the actual post.
                // Falling back to 'legacy' caused a cache-miss on every load, triggering an
                // unwanted auto-generation immediately after entering the chat.
                let realMsgId = 'legacy';
                try {
                    const chat = ctx.chat;
                    if (Array.isArray(chat)) {
                        for (let i = chat.length - 1; i >= 0; i--) {
                            if (chat[i] && !chat[i].is_user && !chat[i].is_system && !chat[i].is_hidden) {
                                realMsgId = String(i);
                                break;
                            }
                        }
                    }
                } catch { /* keep 'legacy' as last-resort key */ }

                const migrated = {
                    posts: { [realMsgId]: { '0': { html: store.html, timestamp: store.timestamp || Date.now() } } },
                    current: { msgId: realMsgId, swipeIdx: 0 },
                };
                ctx.chatMetadata[key] = migrated;
                store = migrated;
                if (ctx.saveMetadata) ctx.saveMetadata();
                log('Migrated old flat cache to per-post format (msgId:', realMsgId, ')');
            }

            // Fresh store
            if (!store || typeof store !== 'object' || !store.posts) {
                store = { posts: {}, current: { msgId: null, swipeIdx: 0 } };
                ctx.chatMetadata[key] = store;
            }

            return store;
        } catch (e) { warn('getCommentaryStore error:', e); return null; }
    }

    /**
     * Return cached HTML for a specific post+swipe, or null if not found.
     */
    /**
     * Returns first 80 chars of the raw text for a specific post+swipe.
     * Used as a fingerprint to detect cache invalidation after message deletion.
     */
    function getMsgFingerprint(msgId, swipeIdx) {
        try {
            const ctx = SillyTavern.getContext();
            const msg = ctx.chat?.[parseInt(msgId)];
            if (!msg) return null;
            const text = Array.isArray(msg.swipes) && msg.swipes[parseInt(swipeIdx)] !== undefined
                ? msg.swipes[parseInt(swipeIdx)]
                : msg.mes;
            return (text || '').slice(0, 80);
        } catch { return null; }
    }

    function getCachedPost(msgId, swipeIdx) {
        if (msgId === null || msgId === undefined) return null;
        const store = getCommentaryStore();
        if (!store) return null;
        const entry = store.posts[String(msgId)]?.[String(swipeIdx)];
        if (!entry?.html) return null;
        // Validate fingerprint: if stored fp doesn't match current text — cache is stale
        if (entry.fp !== undefined && entry.fp !== null) {
            const currentFp = getMsgFingerprint(msgId, swipeIdx);
            if (currentFp !== null && currentFp !== entry.fp) return null;
        }
        return entry.html;
    }

    /**
     * Save generated HTML for a specific post+swipe.
     */
    function saveGeneratedCommentary(html, msgId, swipeIdx) {
        try {
            const ctx = SillyTavern.getContext();
            if (!ctx.chatMetadata) return;
            // Do NOT save when there is no active chat (welcome screen / no character)
            if (!ctx.chatId) return;
            const store = getCommentaryStore();
            if (!store) return;

            const mid  = String(msgId  !== undefined ? msgId  : currentPostId  ?? 'legacy');
            const sidx = String(swipeIdx !== undefined ? swipeIdx : currentSwipeIdx ?? 0);

            if (!store.posts[mid]) store.posts[mid] = {};
            store.posts[mid][sidx] = { html, timestamp: Date.now(), fp: getMsgFingerprint(mid, sidx) };
            store.current = { msgId: mid, swipeIdx: parseInt(sidx) };

            if (ctx.saveMetadata) ctx.saveMetadata();
        } catch (e) { warn('saveGeneratedCommentary error:', e); }
    }

    /**
     * Restore cached commentary.
     * If msgId/swipeIdx are given — show that specific entry.
     * Otherwise — fall back to store.current, then to most recent.
     */
    function restoreCachedCommentary(msgId, swipeIdx) {
        try {
            const store = getCommentaryStore();
            if (!store) return false;

            let mid, sidx;
            if (msgId !== undefined && msgId !== null) {
                mid  = String(msgId);
                sidx = String(swipeIdx !== undefined ? swipeIdx : 0);
            } else if (store.current?.msgId !== null && store.current?.msgId !== undefined) {
                mid  = String(store.current.msgId);
                sidx = String(store.current.swipeIdx ?? 0);
            } else {
                // Nothing saved yet
                return false;
            }

            const entry = store.posts[mid]?.[sidx];
            if (entry?.html) {
                setDiscordText(entry.html);
                currentPostId   = mid;
                currentSwipeIdx = parseInt(sidx);
                updatePostIndicator();
                return true;
            }
            return false;
        } catch (e) { warn('restoreCachedCommentary error:', e); return false; }
    }

    /**
     * Clear cached commentary.
     * If msgId given — clear only that post. Otherwise clear everything.
     */
    function clearCachedCommentary(msgId) {
        try {
            const ctx = SillyTavern.getContext();
            if (!ctx.chatMetadata) return;
            if (msgId !== undefined && msgId !== null) {
                const store = getCommentaryStore();
                if (store) {
                    delete store.posts[String(msgId)];
                    if (store.current?.msgId === String(msgId)) {
                        store.current = { msgId: null, swipeIdx: 0 };
                    }
                    if (ctx.saveMetadata) ctx.saveMetadata();
                }
            } else {
                delete ctx.chatMetadata[getMetadataKey()];
                currentPostId   = null;
                currentSwipeIdx = 0;
                if (ctx.saveMetadata) ctx.saveMetadata();
            }
        } catch (e) { warn('clearCachedCommentary error:', e); }
    }

    /**
     * Sync the in-memory state variables and update the header indicator.
     */
    function setCurrentPost(msgId, swipeIdx) {
        currentPostId   = msgId !== null && msgId !== undefined ? String(msgId) : null;
        currentSwipeIdx = parseInt(swipeIdx) || 0;
        updatePostIndicator();
    }

    /**
     * Resolve the last AI message index and its current swipe_id from ctx.chat.
     * Returns { msgId: String, swipeIdx: Number } or null.
     */
    function resolveLastAIPost() {
        try {
            const ctx = SillyTavern.getContext();
            const chat = ctx.chat;
            if (!chat || !chat.length) return null;
            for (let i = chat.length - 1; i >= 0; i--) {
                const msg = chat[i];
                if (msg && !msg.is_user && !msg.is_system && !msg.is_hidden) {
                    return {
                        msgId:    String(i),
                        swipeIdx: typeof msg.swipe_id === 'number' ? msg.swipe_id : 0,
                    };
                }
            }
            return null;
        } catch { return null; }
    }

    /**
     * Update the post indicator pill in the bar header.
     */
    function updatePostIndicator() {
        const pill = document.getElementById('ec_post_indicator');
        if (!pill) return;

        // In noSaveMode the indicator is meaningless — always hide it
        if (settings.noSaveMode) {
            pill.textContent = '';
            pill.style.display = 'none';
            return;
        }

        if (currentPostId === null) {
            pill.textContent = '';
            pill.style.display = 'none';
            return;
        }

        try {
            const ctx  = SillyTavern.getContext();
            const chat = ctx.chat;
            const idx  = parseInt(currentPostId);
            const msg  = chat?.[idx];
            const totalSwipes = msg?.swipes?.length || 1;
            const dispIdx = isNaN(idx) ? currentPostId : idx + 1; // 1-based for display
            pill.textContent = `#${dispIdx} [${currentSwipeIdx + 1}/${totalSwipes}]`;
            pill.style.display = '';

            // Show lock icon if this swipe is cached
            const store = getCommentaryStore();
            const hasCached = !!store?.posts?.[String(currentPostId)]?.[String(currentSwipeIdx)];
            pill.title = hasCached ? t('Pinned') : '';
            pill.classList.toggle('ec_post_indicator_pinned', hasCached);
        } catch {
            pill.textContent = `#${currentPostId}`;
            pill.style.display = '';
        }
    }

 // GET ACTIVE CHARACTERS
    function getActiveCharacters() {
        try {
            const ctx = SillyTavern.getContext();
            const chars = [];
            if (ctx.characterId !== undefined && ctx.characters && ctx.characters[ctx.characterId]) {
                chars.push(ctx.characters[ctx.characterId].name);
            }
            if (ctx.groupId && ctx.groups) {
                const grp = ctx.groups.find(g => g.id === ctx.groupId);
                if (grp && grp.members) {
                    grp.members.forEach(mid => {
                        const c = ctx.characters.find(ch => ch.avatar === mid);
                        if (c && !chars.includes(c.name)) chars.push(c.name);
                    });
                }
            }
            return chars;
        } catch { return []; }
    }

 // PROMPT LOADING
    async function loadStylePrompt(styleVal) {
        // Check custom styles first
        const customStyle = settings.customStyles?.find(s => s.id === styleVal || s.name === styleVal);
        if (customStyle) return customStyle.prompt || '';

        // Built-in
        const filename = STYLE_FILES[styleVal];
        if (!filename) return '';
        try {
            const resp = await fetch(`${BASE_URL}/chat-styles/${filename}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.text();
        } catch (e) {
            warn(`Failed to load style ${filename}:`, e);
            return '';
        }
    }

    // ───────────────────────────────────────────────────────────
    // PROMPT CUSTOMIZER HELPERS
    // ───────────────────────────────────────────────────────────

    /**
     * Базовые секции RealDiscord для замены в кастомном режиме.
     */
    const BASE_NICKNAME_AESTHETICS = `## NICKNAME AESTHETICS

Ники — это отражение личности. Каждый ник уникален и несёт характер. Они могут быть абсолютно разными:

**Минималистичные** — простые, атмосферные.
**Читательские/фандомные** — отсылки, роли, типажи.
**Кириллические/русские** — могут быть поэтичными, ироничными, абсурдными.
**Смешанные** — кириллица + латиница + цифры, каомодзи, иероглифы. 
**Сломанные/хаотичные** — для персонажей-хаотиков.
**Камео персонажей** — {{user}}, {{char}} или NPC могут появиться с реальным именем.`;

    const BASE_COMMENTER_PERSONAS = `## COMMENTER PERSONAS

Mix freely:

- **Обычные читатели** — эмоциональная реакция без анализа, просто боль/радость/ор
- **Лор-гоблины** — замечают детали, отсылки, несостыковки, пасхалки
- **Шипперы** — «поцелуйтесь уже», считают сантиметры между персонажами
- **Диванные психологи** — ставят диагнозы, объясняют attachment styles
- **Хаотики** — пишут капсом, теряют рассудок, мемы, абсурд
- **Lurkers** — одно слово или эмодзи, молча страдают
- **Drama seekers** — цитируют самые безумные строки, «ЭТО ЧТО ТОЛЬКО ЧТО ПРОИЗОШЛО»
- **Домохозяйки** — случайно наткнулись на главу и ОЧЕНЬ хотят продолжения, строят глупые догадки о персонажах и сюжете. 
- **{{user}}** — может появиться как читатель снаружи истории
- **{{char}}** — редкое камео, четвёртая стена рушится`;

    const BASE_LANGUAGE_TONE = `## LANGUAGE & TONE

- Основной язык: **русский** с интернет-сленгом, сленгом молодежи, людей постарше и т.д. — зависит от личности комментатора. 
- **Мат разрешён** — органично, не для шока: блять, нихуя, пиздец, ёбаный, хуй, нахуй — только если это усиливает эмоцию
- Капс для акцента: ОН РЕАЛЬНО ЭТО СДЕЛАЛ, ЧТО ЗА, Я В АХУЕ.
- Эмодзи органично внутри текста.
- Иногда английские вставки mid-sentence.`;



    /**
     * Парсит секции по заголовкам ## и вставляет текст в соответствующие div-ы.
     */
    async function populateBasePromptBlocks() {
        try {
            const text = await loadStylePrompt('realdiscord');
            if (!text) return;

            const sections = {};
            const sectionRe = /^## (.+)$/gm;
            let match;
            const matches = [];
            while ((match = sectionRe.exec(text)) !== null) {
                matches.push({ title: match[1].trim(), index: match.index, end: match.index + match[0].length });
            }
            for (let i = 0; i < matches.length; i++) {
                const start = matches[i].end;
                const end   = i + 1 < matches.length ? matches[i + 1].index : text.length;
                sections[matches[i].title.toLowerCase()] = text.slice(start, end).trim();
            }

            const fill = (elId, sectionKey) => {
                const el = document.getElementById(elId);
                if (!el) return;
                const body = sections[sectionKey.toLowerCase()];
                if (body) el.textContent = body;
            };

            fill('ec_base_block_nicknames', 'nickname aesthetics');
            fill('ec_base_block_personas',  'commenter personas');
            fill('ec_base_block_language',  'language & tone');

        } catch (e) {
            warn('populateBasePromptBlocks failed:', e);
        }
    }

    /**
     * Собирает финальный промт из пользовательских частей (custom mode).
     * Незаполненные секции берутся из базового RealDiscord.
     */
    function buildCustomPromptFromParts() {
        const nicknames = settings.promptNicknames?.trim()
            ? `## NICKNAME AESTHETICS\n\n${settings.promptNicknames.trim()}`
            : BASE_NICKNAME_AESTHETICS;

        const personas = settings.promptPersonas?.trim()
            ? `## COMMENTER PERSONAS\n\nMix freely:\n\n${settings.promptPersonas.trim()}`
            : BASE_COMMENTER_PERSONAS;

        const language = settings.promptLanguage?.trim()
            ? `## LANGUAGE & TONE\n\n${settings.promptLanguage.trim()}`
            : BASE_LANGUAGE_TONE;

        return `# RealDiscord Style — Chat Commentary

Generate Discord-style chat messages reacting to the scene. Use the EXACT format below.

## OUTPUT FORMAT

**Regular message:**
\`\`\`
neon_coder_42: message text here
\`\`\`

**Reply to someone:**
\`\`\`
reply:neon_coder_42:quoted text snippet
ghost_reader: message text here
\`\`\`

**Message with reactions:**
\`\`\`
neon_coder_42: message text here
reactions: 😭 2, 😊, 🔥 15
\`\`\`

**Reply + reactions combined:**
\`\`\`
reply:neon_coder_42:quoted text snippet
ghost_reader: message text here
reactions: 😭 4, 💀 12
\`\`\`

**Complete example (3 messages):**
\`\`\`
soft_tiger_paws: Блин, как же он тяжело отрывался от кровати 😭
reactions: 😭 12, 🐈 25

reply:soft_tiger_paws:тяжело отрывался от кровати
Тамара_Васильевна: Ой, бедняжка... Пусть кушает хорошо!
reactions: 🙏 10

ALLCAPS_CHAOS: АХАХАХА ОН ЖЕ ПРОСТО КОТ А НЕ ИМПЕРАТОР
reactions: 🤣 45, 💀 20
\`\`\`

## FORMAT RULES

- **Separate every message with a blank line** — this is mandatory
- The \`reply:\` line and its message are ONE block — no blank line between them
- The \`reactions:\` line belongs to the message directly above it — no blank line between them
- The nickname comes FIRST, directly before the colon — NEVER write the word "Username" literally
- Each message starts with \`actual_nickname: message text\` on one line
- Reaction format: \`emoji count\` (with space) or just \`emoji\` — separated by commas
- Counts: realistic numbers like \`3\`, \`17\`, \`2.4K\` — NOT every message needs reactions
- Reply quotes: short fragment (4–8 words), verbatim from the target's message
- Nickname: max 32 chars, NO colons inside nickname
- Max 1–4 reactions per message — only messages that genuinely hit

${nicknames}

${personas}

${language}

## GENERATE

Based on the scene context, generate {{count}} Discord chat messages. Use a natural mix of message types. Not every message needs reactions — only the ones that genuinely hit.`;
    }

    /**
     * Синхронизирует видимость base/custom view с текущим состоянием тоггла.
     */
    function updatePromptModeUI() {
        const isCustom = !!settings.promptCustomMode;
        const baseView   = document.getElementById('ec_prompt_base_view');
        const customView = document.getElementById('ec_prompt_custom_view');
        const toggle     = document.getElementById('discord_prompt_custom_mode');
        const labelBase  = document.getElementById('ec_prompt_mode_label_base');
        const labelCustom = document.getElementById('ec_prompt_mode_label_custom');

        if (toggle)     toggle.checked = isCustom;
        if (baseView)   baseView.style.display   = isCustom ? 'none'  : '';
        if (customView) customView.style.display = isCustom ? ''      : 'none';

        if (labelBase)   labelBase.classList.toggle('ec-prompt-mode-active', !isCustom);
        if (labelCustom) labelCustom.classList.toggle('ec-prompt-mode-active', isCustom);
    }

    // ───────────────────────────────────────────────────────────
    function buildContextBlock() {
        const ctx = SillyTavern.getContext();
        const parts = [];

        if (settings.includePersona) {
            try {
                const persona = ctx.getPersonaDescription ? ctx.getPersonaDescription() : '';
                if (persona) parts.push(`[Persona: ${persona}]`);
            } catch {}
        }

        if (settings.includeCharacterDescription) {
            try {
                const chars = getActiveCharacters();
                if (ctx.characterId !== undefined && ctx.characters?.[ctx.characterId]) {
                    const ch = ctx.characters[ctx.characterId];
                    const desc = ch.description || '';
                    if (desc) parts.push(`[Character: ${ch.name}\n${desc}]`);
                }
            } catch {}
        }

        return parts.join('\n\n');
    }

    function buildChatHistory(anchorMsgId) {
        try {
            const ctx = SillyTavern.getContext();
            const chat = ctx.chat;
            if (!chat || !settings.includeUser) return '';
            const depth = Math.max(2, parseInt(settings.contextDepth) || 4);
            const endIdx = (anchorMsgId !== undefined && anchorMsgId !== null)
                ? parseInt(anchorMsgId) + 1
                : chat.length;
            const recent = chat.slice(0, endIdx).slice(-depth).filter(m => !m.is_system);
            return recent.map(m => {
                const name = m.is_user ? (ctx.name1 || 'User') : (m.name || 'AI');
                const text = extractText(m.mes || '');
                return `${name}: ${text}`;
            }).join('\n');
        } catch { return ''; }
    }

    function buildPastCommentary() {
        if (!settings.includePastEcho) return '';
        try {
            // Use the currently displayed post+swipe cached HTML as context
            const html = getCachedPost(currentPostId, currentSwipeIdx);
            if (!html) return '';
            const text = extractText(html);
            if (!text.trim()) return '';
            return `[Previous EchoLite Feed:\n${text.trim()}]`;
        } catch { return ''; }
    }

    // ───────────────────────────────────────────────────────────
    // GENERATE DISCORD CHAT
    // ───────────────────────────────────────────────────────────
    /**
     * @param {string|null}  targetMsgId     - chat[] index as string; null = auto-detect last AI post
     * @param {number|null}  targetSwipeIdx  - swipe_id; null = auto-detect
     * @param {boolean}      forceRegenerate - if true, ignore existing cache and regenerate
     */
    async function generateDiscordChat(targetMsgId, targetSwipeIdx, forceRegenerate = false) {
        if (generationInProgress) return;

        // Resolve which post/swipe to generate for
        let resolvedMsgId, resolvedSwipeIdx;
        if (targetMsgId !== null && targetMsgId !== undefined) {
            resolvedMsgId    = String(targetMsgId);
            resolvedSwipeIdx = targetSwipeIdx !== null && targetSwipeIdx !== undefined
                ? parseInt(targetSwipeIdx)
                : 0;
        } else {
            const last = resolveLastAIPost();
            if (!last) {
                warn('generateDiscordChat: no AI post found');
                return;
            }
            resolvedMsgId    = last.msgId;
            resolvedSwipeIdx = last.swipeIdx;
        }

// In noSaveMode: always generate for the last post, ignore cache entirely
 if (settings.noSaveMode) {
 const last = resolveLastAIPost();
 if (last) {
 resolvedMsgId    = last.msgId;
 resolvedSwipeIdx = last.swipeIdx;
 }
 } else if (!forceRegenerate) {
 // If cache exists and we are NOT force-regenerating — just show it
 const cached = getCachedPost(resolvedMsgId, resolvedSwipeIdx);
 if (cached) {
 setDiscordText(cached);
 setCurrentPost(resolvedMsgId, resolvedSwipeIdx);
 return;
 }
 }

 // Clear any pending swipe — this generation is for a specific post
 // (either explicitly targeted or auto-detected), so stale pending swipes
 // should be discarded. The user can re-trigger them manually.
 pendingSwipeMsgId = null;
 pendingSwipeIdx = null;

 generationInProgress = true;
        generationAbortController = new AbortController();
        const signal = generationAbortController.signal;

        setStatus(t('Processing...'));

        try {
            // Выбор промта: custom mode → собираем из частей, иначе — файл стиля
            let stylePrompt;
            if (settings.promptCustomMode) {
                stylePrompt = buildCustomPromptFromParts();
            } else {
                stylePrompt = await loadStylePrompt(settings.style);
            }
            if (!stylePrompt) throw new Error('No style prompt loaded');

            const count = parseInt(settings.userCount) || 5;
            const contextBlock = buildContextBlock();
            const chatHistory = buildChatHistory(resolvedMsgId);
            const pastCommentary = buildPastCommentary();

            // systemPrompt = инструкции стиля (realdiscord.md и т.д.)
            // userPrompt   = контент сцены (что генерировать)
            // Разделение гарантирует, что основной пресет ST не попадёт в запрос.
            const systemPrompt = resolveSTMacro(stylePrompt);

            const userParts = [`Generate ${count} chat messages.`];
            if (contextBlock) userParts.push(contextBlock);
            if (chatHistory) userParts.push(`[Recent Conversation:\n${chatHistory}]`);
            if (pastCommentary) userParts.push(pastCommentary);
            const userPrompt = userParts.join('\n\n');

            const html = await callGenerationAPI(systemPrompt, userPrompt, signal);
            if (!html) throw new Error('Empty response');

            const parsed = parseMessages(html, count);
            if (!parsed) throw new Error(t('No valid chat lines generated.'));

            setDiscordText(parsed);
            if (!settings.noSaveMode) {
                saveGeneratedCommentary(parsed, resolvedMsgId, resolvedSwipeIdx);
            }
            setCurrentPost(resolvedMsgId, resolvedSwipeIdx);
            setStatus('');
        } catch (e) {
            if (e.name === 'AbortError') {
                // cancelled — handled in cancelGeneration()
            } else {
                error('generateDiscordChat error:', e);
                setStatus('');
                setDiscordText(`<div class="discord_status ec_error"><i class="fa-solid fa-circle-exclamation"></i> ${t('EchoLite Generation Error')}: ${e.message}</div>`);
            }
        } finally {
            generationInProgress = false;
            generationAbortController = null;
            updatePanelIcons();
        }
    }

 // API CALL
 // Каждый путь получает systemPrompt (инструкции стиля) и userPrompt
 // (контент сцены) раздельно, чтобы основной пресет ST не влиял на запрос.
    async function callGenerationAPI(systemPrompt, userPrompt, signal) {
        const ctx = SillyTavern.getContext();
        const src = settings.source;

        if (src === 'ollama') {
            return await callOllamaAPI(systemPrompt, userPrompt, signal);
        } else if (src === 'openai') {
            return await callOpenAICompatAPI(systemPrompt, userPrompt, signal);
        } else if (src === 'profile') {
            return await callConnectionProfile(systemPrompt, userPrompt, signal);
        } else {
            // Default: использует generateRaw — обходит пайплайн ST и его пресет
            return await callSTDefaultAPI(systemPrompt, userPrompt, signal, ctx);
        }
    }

    /**
     * Генерация через основной ST API (generateRaw).
     * generateRaw принимает { systemPrompt, prompt } и НЕ применяет пресет персонажа,
     * Author's Note и прочие инъекции пайплайна — именно то, что нам нужно.
     * Дополнительно: dry-run guard блокирует сторонние расширения (аналог TextMe).
     */
    async function callSTDefaultAPI(systemPrompt, userPrompt, signal, ctx) {
        const maxTokens = settings.overrideMaxTokens ? (parseInt(settings.maxTokens) || 300) : undefined;

        // generateRaw доступен в ST >= 1.10; fallback на generateQuietPrompt для старых версий
        if (typeof ctx.generateRaw === 'function') {
            // Dry-run guard: блокируем инъекции сторонних расширений через CHAT_COMPLETION_PROMPT_READY
            const { eventSource, event_types } = ctx;
            const _dryRunGuard = eventSource && event_types?.CHAT_COMPLETION_PROMPT_READY
                ? (() => {
                    const handler = (eventData) => { eventData.dryRun = true; };
                    if (typeof eventSource.makeFirst === 'function') {
                        eventSource.makeFirst(event_types.CHAT_COMPLETION_PROMPT_READY, handler);
                    } else {
                        eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, handler);
                    }
                    return handler;
                })()
                : null;

            try {
                const result = await ctx.generateRaw({
                    prompt:         userPrompt,
                    systemPrompt:   systemPrompt,
                    ...(maxTokens !== undefined ? { max_new_tokens: maxTokens } : {}),
                    ...(signal ? { signal } : {}),
                });
                return typeof result === 'string' ? result : '';
            } catch (e) {
                if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
                throw e;
            } finally {
                if (_dryRunGuard && eventSource && event_types?.CHAT_COMPLETION_PROMPT_READY) {
                    eventSource.removeListener(event_types.CHAT_COMPLETION_PROMPT_READY, _dryRunGuard);
                }
            }
        }

        // Fallback для старых версий ST (generateRaw недоступен)
        try {
            const combined = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
            const result = await ctx.generateQuietPrompt(combined, false, false, '', undefined, maxTokens);
            return result || '';
        } catch (e) {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            throw e;
        }
    }

    async function callOllamaAPI(systemPrompt, userPrompt, signal) {
        const url = `${settings.ollamaUrl}/api/generate`;
        const model = settings.ollamaModel;
        if (!model) throw new Error('No Ollama model selected');

        // Ollama /api/generate поддерживает поле system нативно
        const body = { model, system: systemPrompt, prompt: userPrompt, stream: false };
        if (settings.overrideMaxTokens) body.options = { num_predict: parseInt(settings.maxTokens) || 300 };

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
        });
        if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
        const data = await resp.json();
        return data.response || '';
    }

    async function callOpenAICompatAPI(systemPrompt, userPrompt, signal) {
        const url = `${settings.openaiUrl}/chat/completions`;
        const headers = { 'Content-Type': 'application/json' };
        if (settings.openaiKey) headers['Authorization'] = `Bearer ${settings.openaiKey}`;

        // Передаём system и user как отдельные роли — стандарт Chat Completions
        const body = {
            model: settings.openaiModel || 'local-model',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userPrompt },
            ],
            stream: false,
        };
        if (settings.overrideMaxTokens) body.max_tokens = parseInt(settings.maxTokens) || 300;

        const resp = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal,
        });
        if (!resp.ok) throw new Error(`OpenAI HTTP ${resp.status}`);
        const data = await resp.json();
        return data.choices?.[0]?.message?.content || '';
    }

    async function callConnectionProfile(systemPrompt, userPrompt, signal) {
        // Используем connection_utils с раздельными ролями
        if (window.EchoLiteConnectionUtils) {
            return await window.EchoLiteConnectionUtils.generateWithProfile(
                settings.selectedPreset, systemPrompt, userPrompt, signal,
                settings.overrideMaxTokens ? parseInt(settings.maxTokens) : undefined
            );
        }
        // Fallback
        const ctx = SillyTavern.getContext();
        return await callSTDefaultAPI(systemPrompt, userPrompt, signal, ctx);
    }

 // PARSE MESSAGES
    /**
     * Strip markdown formatting characters that LLMs often add to usernames.
     * Removes: **bold**, *italic*, `code`, ~strike~, backtick-wraps, leading symbols.
     * Examples: **neon_dreamer42** → neon_dreamer42
     *           `lurker_mol4un`    → lurker_mol4un
     *           ~~old_name~~       → old_name
     */
    function cleanUsername(raw) {
        if (!raw) return raw;
        let name = raw.trim();
        // Strip surrounding markdown pairs: **, *, __, _, ``, ~~
        name = name.replace(/^\*\*(.+)\*\*$/, '$1');
        name = name.replace(/^\*(.+)\*$/,     '$1');
        name = name.replace(/^__(.+)__$/,     '$1');
        name = name.replace(/^_(.+)_$/,       '$1');
        name = name.replace(/^`(.+)`$/,       '$1');
        name = name.replace(/^~~(.+)~~$/,     '$1');
        // Strip any remaining leading/trailing *, `, ~, _
        name = name.replace(/^[*`~_]+|[*`~_]+$/g, '');
        // Trim whitespace again
        return name.trim();
    }

    // Words that can never be the start of a real username.
    // Catches meme patterns like "Также Искан: ..." being parsed as a new speaker.
    // Russian prepositions/conjunctions are included to prevent prose lines like
    // "через секунду: ..." or "после этого: ..." from being misread as usernames.
    const CONNECTOR_WORDS_RE = /^(также|ещё|еще|но|однако|и\s|а\s|потом|кроме|кстати|при|во|со|за|из|по|тем|зато|хотя|через|после|перед|между|вместе|вместо|спустя|прямо|сразу|вдруг|когда|пока|если|чтобы|потому|поэтому|всё\s|все\s|это\s|он\s|она\s|они\s|его\s|её\s|when|also|but|then|however|yet|and|or|plus|still|even|just|though|while|meanwhile|after|before|through|instead|because|although|unless)\b/i;

    /** Returns false if `raw` looks like a connector phrase rather than a real username. */
    function isLikelyUsername(raw) {
        if (!raw) return false;
        const name = raw.trim();
        // Reject if starts with a known connector word
        if (CONNECTOR_WORDS_RE.test(name)) return false;
        // Reject if contains a sentence-ending punctuation mid-string (it's prose, not a name)
        if (/[.!?]\s/.test(name)) return false;
        return true;
    }

    // Strip reasoning blocks (<think>...</think> and variants) that some models
    // (DeepSeek-R1, Gemini thinking presets) emit before the actual response.
    // Must run BEFORE any line-splitting so the first username isn't contaminated.
    function stripReasoningBlocks(text) {
        if (!text) return text;
        // Remove <think>...</think> blocks (greedy across newlines)
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
        // Remove lone opening/closing tags that might appear without a pair
        text = text.replace(/<\/?think>/gi, '');
        // Trim leading whitespace/newlines that remain after stripping
        return text.replace(/^\s+/, '');
    }

    function parseMessages(rawText, expectedCount) {
        if (!rawText || !rawText.trim()) return null;
        rawText = stripReasoningBlocks(rawText);
        if (!rawText.trim()) return null;

        // Style-specific parsers
        if (settings.style === 'realdiscord') {
            return parseMessagesRealDiscord(rawText);
        }

        // Try to parse Username: message format
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const messages = [];
        const chars = getActiveCharacters();
        const userColors = {};
        const colorPalette = [
            '#7c3aed','#2563eb','#059669','#d97706','#dc2626',
            '#7c3aed','#0891b2','#0d9488','#4f46e5','#c026d3',
        ];
        let colorIdx = 0;

        for (const line of lines) {
            // {1,120} instead of {1,60} — Unicode combining/decorative chars
            // (e.g. strikethrough overlays) inflate code-unit count far beyond
            // visual length; 120 safely covers all realistic usernames.
            const match = line.match(/^([^:]{1,120}):\s*(.+)$/);
            if (match) {
                const [, rawUsername, content] = match;
                const username = cleanUsername(rawUsername);
                if (!username) continue; // skip lines that reduce to empty after cleaning
                if (!isLikelyUsername(username)) {
                    // Connector phrase — treat as continuation of previous message
                    if (messages.length > 0) messages[messages.length - 1].content += '\n' + line;
                    continue;
                }
                if (!userColors[username]) {
                    userColors[username] = colorPalette[colorIdx++ % colorPalette.length];
                }
                messages.push({ username: username.trim(), content: content.trim(), color: userColors[username] });
            } else if (messages.length > 0) {
                // Append to last message
                messages[messages.length - 1].content += '\n' + line;
            }
        }

        if (messages.length === 0) {
            // No Username: format — treat whole text as single block
            return `<div class="discord_status">${rawText.replace(/\n/g, '<br>')}</div>`;
        }

        return messages.map(msg => {
            const initial = msg.username.charAt(0).toUpperCase();
            const isUserChar = chars.some(c => c.toLowerCase() === msg.username.toLowerCase());
            const content = formatMessageContent(msg.content);
            return `<div class="discord_message">
                <div class="discord_avatar" style="background:${msg.color}">${initial}</div>
                <div class="discord_body">
                    <div class="discord_header">
                        <span class="discord_username" style="color:${msg.color}" data-username="${escapeAttr(msg.username)}">${escapeHtml(msg.username)}</span>
                    </div>
                    <div class="discord_content">${content}</div>
                </div>
            </div>`;
        }).join('');
    }

 // REALDISCORD PARSER — replies + reactions
    // ─────────────────────────────────────────────────────────────────────────
    // ARCHITECTURE: block-based parsing.
    //
    // The LLM output is split on blank lines → each "block" = one message.
    // Inside a block the structure is always:
    //   [reply:nick:quote]      ← optional, 0 or 1 line
    //   nick: message text      ← required, always first non-special line
    //   [reactions: ...]        ← optional, 0 or 1 line
    //
    // This is fundamentally unambiguous: we never need to guess whether
    // "чайная пьяница: текст" is a username or prose — it's always the
    // message line of its own block.  No word-count heuristics, no
    // connector-word blacklists, no uppercase guards needed.
    //
    // Fallback: if the raw text has no blank lines at all (edge case with
    // some models), we fall back to the old line-by-line parser.
    // ─────────────────────────────────────────────────────────────────────────
    function parseMessagesRealDiscord(rawText) {
        rawText = stripReasoningBlocks(rawText);

        // Gradient pairs [from, to] — each user gets a unique gradient
        const gradientPalette = [
            ['#7289da','#5865f2'],
            ['#43b581','#57f287'],
            ['#faa61a','#fee75c'],
            ['#eb459e','#f04747'],
            ['#5865f2','#eb459e'],
            ['#57f287','#43b581'],
            ['#fee75c','#faa61a'],
            ['#ed4245','#faa61a'],
            ['#00b0f4','#5865f2'],
            ['#b9bbbe','#ffffff'],
        ];
        const userGradients = {};
        let gradientIdx = 0;

        function getGradient(username) {
            if (!userGradients[username]) {
                userGradients[username] = gradientPalette[gradientIdx++ % gradientPalette.length];
            }
            return userGradients[username];
        }

        function getSolidColor(username) {
            return getGradient(username)[0];
        }

        // ── helpers ──────────────────────────────────────────────────────────

        /** Extract nick+content from a line like "nick: text" or "nick_space pad: text".
         *  Returns [nick, content] or null. */
        function parseMsgLine(line) {
            const colonIdx = line.indexOf(': ');
            if (colonIdx <= 0 || colonIdx > 80) return null;
            const nick = cleanUsername(line.slice(0, colonIdx));
            const content = line.slice(colonIdx + 2).trim();
            if (!nick || !content || nick.includes(':')) return null;
            return [nick, content];
        }

        // ── split into blocks by blank lines ─────────────────────────────────
        const rawBlocks = rawText.split(/\n[ \t]*\n+/);
        const blocks = rawBlocks
            .map(b => b.trim())
            .filter(b => b.length > 0);

        // ── fallback: no blank lines → old line-by-line parser ───────────────
        if (blocks.length < 2) {
            return parseMessagesRealDiscordLinear(rawText, getGradient, getSolidColor);
        }

        // ── block-based parsing ───────────────────────────────────────────────
        const messages = [];

        for (const block of blocks) {
            const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length === 0) continue;

            let cursor = 0;

            // Optional reply: prefix
            let replyTo = null, replyQuote = null;
            const replyMatch = lines[0].match(/^reply:([^:]{1,120}):(.+)$/i);
            if (replyMatch) {
                replyTo    = cleanUsername(replyMatch[1]).trim();
                replyQuote = replyMatch[2].trim();
                cursor = 1;
            }

            // Skip any stray reactions: lines before the message line
            while (cursor < lines.length && /^reactions:\s*/i.test(lines[cursor])) cursor++;

            if (cursor >= lines.length) continue; // block had only reply/reactions, skip

            // The current line MUST be "nick: message" — no guessing needed
            const parsed = parseMsgLine(lines[cursor]);
            if (!parsed) continue; // malformed block — skip
            const [username, content] = parsed;
            cursor++;

            // Everything after: reactions line(s) or extra content lines
            let reactions = [];
            const extraContent = [];
            for (; cursor < lines.length; cursor++) {
                const reactMatch = lines[cursor].match(/^reactions:\s*(.+)$/i);
                if (reactMatch) {
                    reactions = parseReactions(reactMatch[1]);
                } else {
                    extraContent.push(lines[cursor]);
                }
            }

            const fullContent = extraContent.length > 0
                ? content + '\n' + extraContent.join('\n')
                : content;

            messages.push({ username, content: fullContent, replyTo, replyQuote, reactions });
        }

        if (messages.length === 0) {
            return `<div class="discord_status">${rawText.replace(/\n/g, '<br>')}</div>`;
        }

        return renderRealDiscordMessages(messages, getGradient, getSolidColor);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LINEAR FALLBACK PARSER (used when LLM outputs no blank lines at all)
    // Same logic as the old parser, but without the uppercase guard that
    // broke lowercase usernames like "чайная пьяница".
    // ─────────────────────────────────────────────────────────────────────────
    function parseMessagesRealDiscordLinear(rawText, getGradient, getSolidColor) {
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const messages = [];
        let pendingReply = null;

        for (const line of lines) {
            // reply: line
            const replyMatch = line.match(/^reply:([^:]{1,120}):(.+)$/i);
            if (replyMatch) {
                pendingReply = {
                    replyTo:    cleanUsername(replyMatch[1]).trim(),
                    replyQuote: replyMatch[2].trim(),
                };
                continue;
            }

            // reactions: line
            const reactMatch = line.match(/^reactions:\s*(.+)$/i);
            if (reactMatch && messages.length > 0) {
                messages[messages.length - 1].reactions = parseReactions(reactMatch[1]);
                continue;
            }

            // nick: message — try single-word nick first, then multi-word
            let username = null, content = null;
            const simple = line.match(/^([^\s:]{1,80}):\s*(.+)$/);
            if (simple) {
                username = cleanUsername(simple[1]);
                content  = simple[2].trim();
            } else {
                const colonIdx = line.indexOf(': ');
                if (colonIdx > 0 && colonIdx <= 80) {
                    const potentialNick = line.slice(0, colonIdx);
                    const potentialContent = line.slice(colonIdx + 2).trim();
                    if (potentialContent && !potentialNick.includes(':')) {
                        username = cleanUsername(potentialNick);
                        content  = potentialContent;
                    }
                }
            }

            if (username && content) {
                messages.push({
                    username,
                    content,
                    replyTo:    pendingReply ? pendingReply.replyTo    : null,
                    replyQuote: pendingReply ? pendingReply.replyQuote : null,
                    reactions:  [],
                });
                pendingReply = null;
                continue;
            }

            // Continuation line
            if (messages.length > 0) {
                messages[messages.length - 1].content += '\n' + line;
            }
        }

        if (messages.length === 0) {
            return `<div class="discord_status">${rawText.replace(/\n/g, '<br>')}</div>`;
        }

        return renderRealDiscordMessages(messages, getGradient, getSolidColor);
    }

    // ── shared HTML renderer for both parsers ────────────────────────────────
    function renderRealDiscordMessages(messages, getGradient, getSolidColor) {
        return messages.map(msg => {
            const grad    = getGradient(msg.username);
            const solid   = getSolidColor(msg.username);
            const content = formatMessageContent(msg.content);

            let replyBar = '';
            if (msg.replyTo) {
                const replyColor = getSolidColor(msg.replyTo);
                const quoteSafe  = escapeHtml(msg.replyQuote || '');
                replyBar = `<div class="rd_reply_bar">
                    <span class="rd_reply_line"></span>
                    <span class="rd_reply_name" style="color:${replyColor}">@${escapeHtml(msg.replyTo)}</span>
                    <span class="rd_reply_quote">${quoteSafe}</span>
                </div>`;
            }

            let reactionsHtml = '';
            if (msg.reactions && msg.reactions.length > 0) {
                const chips = msg.reactions.map(r =>
                    `<span class="rd_reaction"><span class="rd_reaction_emoji">${escapeHtml(r.emoji)}</span>${r.count ? `<span class="rd_reaction_count">${escapeHtml(r.count)}</span>` : ''}</span>`
                ).join('');
                reactionsHtml = `<div class="rd_reactions">${chips}</div>`;
            }

            const gradStyle = `background: linear-gradient(90deg, ${grad[0]}, ${grad[1]}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent;`;

            return `<div class="discord_message rd_message">
                ${replyBar}
                <div class="rd_main_row">
                    <div class="discord_body">
                        <div class="discord_header">
                            <span class="discord_username rd_username" style="${gradStyle}" data-username="${escapeAttr(msg.username)}">${escapeHtml(msg.username)}</span>
                        </div>
                        <div class="discord_content">${content}</div>
                        ${reactionsHtml}
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function parseReactions(str) {
        // "😭 2, 😊, 🔥 15" → [{emoji, count}, ...]
        return str.split(',').map(s => s.trim()).filter(Boolean).map(chunk => {
            // Split on last space — emoji can be multi-char (combined), count is pure digits/K
            const m = chunk.match(/^(.+?)\s+(\d+(?:\.\d+)?[KkMm]?)$/) ||
                      chunk.match(/^(.+)$/);
            if (m && m[2]) return { emoji: m[1].trim(), count: m[2].trim() };
            return { emoji: chunk.trim(), count: '' };
        }).slice(0, 6); // max 6 reactions per message
    }

    function formatMessageContent(text) {
        // Bold, italic, code
        let out = escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        return out;
    }

    function escapeHtml(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function escapeAttr(str) {
        return str.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    // ───────────────────────────────────────────────────────────
    // SETTINGS MANAGEMENT
    // ───────────────────────────────────────────────────────────
    function loadSettings() {
        const ctx = SillyTavern.getContext();
        const stored = ctx.extensionSettings[MODULE_NAME] || {};
        settings = Object.assign({}, defaultSettings, stored);

        // Sync Settings Panel
        const els = {
            discord_enabled: { prop: 'enabled', type: 'checkbox' },
            discord_source: { prop: 'source', type: 'select' },
            discord_url: { prop: 'ollamaUrl', type: 'text' },
            discord_model_select: { prop: 'ollamaModel', type: 'select' },
            discord_openai_url: { prop: 'openaiUrl', type: 'text' },
            discord_openai_key: { prop: 'openaiKey', type: 'text' },
            discord_openai_model: { prop: 'openaiModel', type: 'text' },
            discord_openai_preset: { prop: 'openaiPreset', type: 'select' },
            discord_preset_select: { prop: 'selectedPreset', type: 'select' },
            discord_style: { prop: 'style', type: 'select' },
            discord_position: { prop: 'position', type: 'select' },
            discord_user_count: { prop: 'userCount', type: 'select' },
            discord_font_size: { prop: 'fontSize', type: 'number' },
            discord_auto_update: { prop: 'autoUpdate', type: 'checkbox' },
            discord_include_user: { prop: 'includeUser', type: 'checkbox' },
            discord_context_depth: { prop: 'contextDepth', type: 'number' },
            discord_include_past_echo: { prop: 'includePastEcho', type: 'checkbox' },
            discord_include_persona: { prop: 'includePersona', type: 'checkbox' },
            discord_include_character_description: { prop: 'includeCharacterDescription', type: 'checkbox' },
            discord_include_world_info: { prop: 'includeWorldInfo', type: 'checkbox' },
            discord_wi_budget: { prop: 'wiTokenBudget', type: 'number' },
            discord_custom_prompt: { prop: 'customPrompt', type: 'text' },
            discord_prompt_custom_mode: { prop: 'promptCustomMode', type: 'checkbox' },
            discord_prompt_nicknames: { prop: 'promptNicknames', type: 'textarea' },
            discord_prompt_personas:  { prop: 'promptPersonas',  type: 'textarea' },
            discord_prompt_language:  { prop: 'promptLanguage',  type: 'textarea' },
            discord_no_save_mode:     { prop: 'noSaveMode',       type: 'checkbox' },
        };

        for (const [id, cfg] of Object.entries(els)) {
            const el = document.getElementById(id);
            if (!el) continue;
            if (cfg.type === 'checkbox') el.checked = !!settings[cfg.prop];
            else el.value = settings[cfg.prop] ?? '';
        }

        updateSourceVisibility();
        updateContextDepthVisibility();
        updateWIBudgetVisibility();
        updatePromptModeUI();
        populateBasePromptBlocks();
        updateNoSaveModeUI();
    }

    function saveSettings() {
        const ctx = SillyTavern.getContext();
        if (!ctx.extensionSettings[MODULE_NAME]) ctx.extensionSettings[MODULE_NAME] = {};
        Object.assign(ctx.extensionSettings[MODULE_NAME], settings);
        ctx.saveSettingsDebounced?.();
        // Keep the ST settings panel in sync with the in-memory settings object
        syncSettingsPanelFromSettings();
    }

    /**
     * Push current `settings` values into the ST extension settings panel DOM
     * (the #discord_* inputs rendered by settings.html).
     * Called after every settings mutation so the two UIs stay in sync.
     */
    function syncSettingsPanelFromSettings() {
        const map = {
            discord_enabled:                        { prop: 'enabled',                   type: 'checkbox' },
            discord_auto_update:                    { prop: 'autoUpdate',                type: 'checkbox' },
            discord_position:                       { prop: 'position',                  type: 'select'   },
            discord_style:                          { prop: 'style',                     type: 'select'   },
            discord_user_count:                     { prop: 'userCount',                 type: 'select'   },
            discord_font_size:                      { prop: 'fontSize',                  type: 'number'   },
            discord_include_user:                   { prop: 'includeUser',               type: 'checkbox' },
            discord_context_depth:                  { prop: 'contextDepth',              type: 'number'   },
            discord_include_past_echo:              { prop: 'includePastEcho',           type: 'checkbox' },
            discord_include_persona:                { prop: 'includePersona',            type: 'checkbox' },
            discord_include_character_description:  { prop: 'includeCharacterDescription', type: 'checkbox' },
            discord_include_world_info:             { prop: 'includeWorldInfo',          type: 'checkbox' },
            discord_wi_budget:                      { prop: 'wiTokenBudget',             type: 'number'   },
            discord_source:                         { prop: 'source',                    type: 'select'   },
            discord_custom_prompt:                  { prop: 'customPrompt',              type: 'text'     },
            discord_prompt_nicknames:               { prop: 'promptNicknames',           type: 'textarea' },
            discord_prompt_personas:                { prop: 'promptPersonas',            type: 'textarea' },
            discord_prompt_language:                { prop: 'promptLanguage',            type: 'textarea' },
            discord_no_save_mode:                   { prop: 'noSaveMode',               type: 'checkbox' },
        };
        for (const [id, cfg] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (!el) continue;
            if (cfg.type === 'checkbox') el.checked = !!settings[cfg.prop];
            else el.value = settings[cfg.prop] ?? '';
        }
    }

    function updateSourceVisibility() {
        const src = settings.source;
        const panels = {
            discord_ollama_settings: src === 'ollama',
            discord_openai_settings: src === 'openai',
            discord_profile_settings: src === 'profile',
        };
        for (const [id, show] of Object.entries(panels)) {
            const el = document.getElementById(id);
            if (el) el.hidden = !show;
        }
        // Populate profiles if profile mode
        if (src === 'profile') populateConnectionProfiles();
    }

    function updateContextDepthVisibility() {
        const el = document.getElementById('discord_context_depth_container');
        if (el) el.hidden = !settings.includeUser;
    }

    function updateWIBudgetVisibility() {
        const el = document.getElementById('discord_wi_budget_container');
        if (el) el.hidden = !settings.includeWorldInfo;
    }

    function updateNoSaveModeUI() {
        const autoUpdateRow = document.getElementById('discord_auto_update')?.closest('.ec-s-toggle-row');
        const hint = document.getElementById('discord_no_save_mode_hint');
        if (autoUpdateRow) autoUpdateRow.style.opacity = settings.noSaveMode ? '0.4' : '';
        if (hint) hint.style.display = settings.noSaveMode ? '' : 'none';
        updatePanelIcons();
        updatePostIndicator();
    }

    async function populateConnectionProfiles() {
        const selectors = ['discord_preset_select'].map(id => document.getElementById(id)).filter(Boolean);
        if (!selectors.length) return;
        try {
            if (window.EchoLiteConnectionUtils) {
                const profiles = await window.EchoLiteConnectionUtils.getProfiles();
                selectors.forEach(select => {
                    select.innerHTML = `<option value="">${t('-- Profile --')}</option>`;
                    profiles.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.id || p.name;
                        opt.textContent = p.name;
                        if ((p.id || p.name) === settings.selectedPreset) opt.selected = true;
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

    async function populateOllamaModels() {
        const select = document.getElementById('discord_model_select');
        if (!select) return;
        try {
            const resp = await fetch(`${settings.ollamaUrl}/api/tags`);
            if (!resp.ok) throw new Error('');
            const data = await resp.json();
            const models = data.models || [];
            select.innerHTML = '<option value="">-- Select Model --</option>';
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.name;
                opt.textContent = m.name;
                if (m.name === settings.ollamaModel) opt.selected = true;
                select.appendChild(opt);
            });
        } catch {
            select.innerHTML = `<option value="${escapeAttr(settings.ollamaModel)}">${escapeHtml(settings.ollamaModel || '-- No models found --')}</option>`;
        }
    }

    // ───────────────────────────────────────────────────────────
    // PANEL RENDERING
    // ───────────────────────────────────────────────────────────
    function renderPanel() {
        // If already in DOM, just update visibility and return
        const existing = document.getElementById('discordBar');
        if (existing) {
            existing.style.display = settings.enabled ? '' : 'none';
            updateSTInputVisibility();
            return;
        }

        const isMobile = window.innerWidth <= 768;
        // On mobile/Termux: force bottom position (no room for side panels,
        // and drag-resize doesn't make sense on touch-only screens)
        let pos = settings.position || 'bottom';
        if (isMobile && (pos === 'left' || pos === 'right')) {
            pos = 'bottom';
        }

        const panelHTML = `
<div id="discordBar" class="ec_${pos}${settings.collapsed ? ' ec_collapsed' : ''}" data-style=\"${settings.style || 'realdiscord'}\">
    <div class="ec_resize_handle"></div>
    <div id="discordQuickSettings">
        <div class="ec_header_left">
            <div class="ec_power_btn" id="ec_power_btn" title="${settings.enabled ? t('Toggle On/Off (Currently ON)') : t('Toggle On/Off (Currently OFF)')}" style="color:${settings.enabled ? 'var(--ec-accent)' : 'rgba(255,255,255,0.3)'}">
                <i class="fa-solid fa-power-off"></i>
            </div>
        </div>
        <div class="ec_post_indicator" id="ec_post_indicator" style="display:none"></div>
        <div class="ec_header_right">
            <div class=\"ec_btn\" id=\"ec_regen_btn\" title=\"${t('Regenerate Chat')}\">\n                <i class=\"fa-solid fa-rotate-right\"></i>\n            </div>\n            <div class=\"ec_btn ec_qs_btn\" id=\"ec_qs_btn\" title=\"${t('Quick Settings')}\">\n                <i class=\"fa-solid fa-sliders\"></i>\n            </div>\n            <div class=\"ec_collapse_btn\" id=\"ec_collapse_btn\" title=\"${settings.collapsed ? 'Expand' : 'Collapse'}\">\n                <i class=\"fa-solid fa-chevron-${settings.collapsed ? 'up' : 'down'}\"></i>\n            </div>
        </div>
    </div>
    <div class="ec_status_overlay"></div>
    <div id="discordContent" style="font-size:${settings.fontSize}px"></div>
</div>`;

        const discordBar = jQuery(panelHTML);

        if (pos === 'bottom') {
            const sendForm = jQuery('#send_form');
            if (sendForm.length) {
                sendForm.before(discordBar);
            } else {
                jQuery('#chat').after(discordBar);
            }
        } else if (pos === 'left') {
            jQuery('#leftSendForm, #left-nav-panel').first().after(discordBar);
            if (!jQuery('#leftSendForm, #left-nav-panel').length) jQuery('body').prepend(discordBar);
        } else if (pos === 'right') {
            jQuery('#rightSendForm, #right-nav-panel').first().after(discordBar);
            if (!jQuery('#rightSendForm, #right-nav-panel').length) jQuery('body').append(discordBar);
        } else if (pos === 'popout') {
            jQuery('body').append(discordBar);
        }

        applyFontSize(settings.fontSize);
        applyFontFamily(settings.fontFamily);

        // Hide panel if extension is disabled — must happen before bindEventHandlers
        // so the enable toggle can show it correctly when first clicked
        if (!settings.enabled) {
            jQuery('#discordBar').hide();
        }

        bindEventHandlers();
        initResizeLogic();
        if (pos === 'popout') { initPopoutDrag(); requestAnimationFrame(restorePopoutPosition); }
        restoreCachedCommentary();
        updateSTInputVisibility();
        checkCompactMode();
        // Sync icon state in case generation was in progress during re-render
        updatePanelIcons();
    }

    // Opacity is now fixed in CSS — no runtime JS needed.
    // applyOpacity() removed for performance.

    function removePanel() {
        const bar = document.getElementById('discordBar');
        if (bar) bar.remove();
        document.body.classList.remove('ec-bottom-active');
        closeAllMenus();
    }

    function updatePanelIcons() {
        const regenBtn = document.getElementById('ec_regen_btn');
        if (regenBtn) {
            regenBtn.innerHTML = generationInProgress
                ? '<i class="fa-solid fa-spinner fa-spin"></i>'
                : '<i class="fa-solid fa-rotate-right"></i>';

        }

        const powerBtn = document.getElementById('ec_power_btn');
        if (powerBtn) {
            powerBtn.style.color = settings.enabled ? 'var(--ec-accent)' : 'rgba(255,255,255,0.3)';
            powerBtn.title = settings.enabled ? t('Toggle On/Off (Currently ON)') : t('Toggle On/Off (Currently OFF)');
        }

        updatePostIndicator();

        // Set data-style on the bar for CSS style-specific overrides
        const bar = document.getElementById('discordBar');
        if (bar) bar.dataset.style = settings.style || 'twitch';
    }

    function applyLayout() {
        const bar = document.getElementById('discordBar');
        if (!bar) return;
        const pos = settings.position || 'bottom';
        bar.className = bar.className.replace(/ec_(bottom|left|right|popout)/g, '').trim();
        bar.classList.add(`ec_${pos}`);
        if (settings.collapsed) bar.classList.add('ec_collapsed');

        // Move panel to correct location
        const isMobile = window.innerWidth <= 768;
        const sendForm = jQuery('#send_form');
        const $bar = jQuery(bar);
        $bar.detach();

        // Сброс inline-размеров при любой смене позиции — предотвращает артефакты
        bar.style.width  = '';
        bar.style.height = '';

        if (pos === 'bottom') {
            if (sendForm.length) {
                sendForm.before($bar);
            } else {
                jQuery('#chat').after($bar);
            }
        } else if (pos === 'left' || pos === 'right') {
            jQuery('body').append($bar);
        } else if (pos === 'popout') {
            jQuery('body').append($bar);
        }

        updateSTInputVisibility();
        checkCompactMode();
        if (pos === 'popout') { initPopoutDrag(); restorePopoutPosition(); }
    }

    // ───────────────────────────────────────────────────────────
    // RESIZE LOGIC
    // ───────────────────────────────────────────────────────────
    function initResizeLogic() {
        const bar = document.getElementById('discordBar');
        if (!bar) return;
        const handle = bar.querySelector('.ec_resize_handle');
        if (!handle) return;

        let startY = 0, startX = 0, startH = 0, startW = 0;

        function onStart(e) {
            const isTouch = e.type === 'touchstart';
            const pt = isTouch ? e.touches[0] : e;
            startY = pt.clientY;
            startX = pt.clientX;
            const pos = settings.position || 'bottom';
            startH = bar.offsetHeight;
            startW = bar.offsetWidth;
            panelResizeActive = true;
            handle.classList.add('resizing');
            document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: false });
            document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd, { once: true });
            e.preventDefault();
        }

        function onMove(e) {
            if (!panelResizeActive) return;
            const isTouch = e.type === 'touchmove';
            const pt = isTouch ? e.touches[0] : e;
            const pos = settings.position || 'bottom';

            if (pos === 'bottom') {
                // ручка сверху — тянем вверх (dy < 0) = рост высоты
                const dy = pt.clientY - startY;
                const maxH = Math.round(window.innerHeight * 0.75);
                const newH = Math.max(80, Math.min(maxH, startH - dy));
                bar.style.height = `${newH}px`;
            } else if (pos === 'right') {
                // ручка слева — тянем влево (dx < 0 от startX) = рост ширины
                const dx = startX - pt.clientX;
                const newW = Math.max(150, Math.min(600, startW + dx));
                bar.style.width = `${newW}px`;
            } else if (pos === 'left') {
                // ручка справа — тянем вправо (dx > 0 от startX) = рост ширины
                const dx = pt.clientX - startX;
                const newW = Math.max(150, Math.min(600, startW + dx));
                bar.style.width = `${newW}px`;
            } else if (pos === 'popout') {
                const dx = pt.clientX - startX;
                const dy = pt.clientY - startY;
                const newW = Math.max(240, Math.min(window.innerWidth  * 0.9, startW + dx));
                const newH = Math.max(120, Math.min(window.innerHeight * 0.85, startH + dy));
                bar.style.width  = `${newW}px`;
                bar.style.height = `${newH}px`;
            }
            e.preventDefault();
        }

        function onEnd() {
            panelResizeActive = false;
            handle.classList.remove('resizing');
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchmove', onMove);
            // Persist popout size so it survives page reload
            if ((settings.position || 'bottom') === 'popout') {
                const savedW = parseFloat(bar.style.width);
                const savedH = parseFloat(bar.style.height);
                if (!isNaN(savedW) && !isNaN(savedH)) {
                    settings.popoutWidth  = savedW;
                    settings.popoutHeight = savedH;
                    saveSettings();
                }
            }
        }

        handle.addEventListener('mousedown', onStart);
        handle.addEventListener('touchstart', onStart, { passive: false });
    }

    // ───────────────────────────────────────────────────────────
    // POPOUT DRAG (move the floating panel by dragging its header)
    // ───────────────────────────────────────────────────────────
    /**
     * Apply saved popout coordinates to the bar element.
     * Clamps against current viewport so a saved position from a different
     * screen size never places the window fully out of view.
     */
    function restorePopoutPosition() {
        const bar = document.getElementById('discordBar');
        if (!bar) return;
        // Restore size first — so offsetWidth/offsetHeight are correct when clamping position
        if (settings.popoutWidth !== null && settings.popoutHeight !== null) {
            const maxW = Math.round(window.innerWidth  * 0.9);
            const maxH = Math.round(window.innerHeight * 0.85);
            bar.style.width  = `${Math.max(240, Math.min(maxW, settings.popoutWidth))}px`;
            bar.style.height = `${Math.max(120, Math.min(maxH, settings.popoutHeight))}px`;
        }
        if (settings.popoutLeft === null || settings.popoutTop === null) return;
        const maxLeft = Math.max(0, window.innerWidth  - bar.offsetWidth);
        const maxTop  = Math.max(0, window.innerHeight - bar.offsetHeight);
        const left = Math.min(Math.max(0, settings.popoutLeft), maxLeft);
        const top  = Math.min(Math.max(0, settings.popoutTop),  maxTop);
        bar.style.transform = 'none';
        bar.style.right     = 'auto';
        bar.style.bottom    = 'auto';
        bar.style.left      = `${left}px`;
        bar.style.top       = `${top}px`;
    }

    function initPopoutDrag() {
        const bar    = document.getElementById('discordBar');
        const header = document.getElementById('discordQuickSettings');
        if (!bar || !header) return;
        if (header._popoutDragBound) return;
        header._popoutDragBound = true;

        let startX = 0, startY = 0, startLeft = 0, startTop = 0;

        function getBarPos() {
            const r = bar.getBoundingClientRect();
            return { left: r.left + window.scrollX, top: r.top + window.scrollY };
        }

        function onDragStart(e) {
            if (e.target.closest('button, .ec_btn, .ec_power_btn, .ec_collapse_btn')) return;
            const isTouch = e.type === 'touchstart';
            const pt      = isTouch ? e.touches[0] : e;
            const pos     = getBarPos();
            startX    = pt.clientX;
            startY    = pt.clientY;
            startLeft = pos.left;
            startTop  = pos.top;
            // Switch to explicit top/left positioning (drop CSS centering transform)
            bar.style.transform = 'none';
            bar.style.right     = 'auto';
            bar.style.bottom    = 'auto';
            bar.style.left      = `${startLeft}px`;
            bar.style.top       = `${startTop}px`;
            document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onDragMove, { passive: false });
            document.addEventListener(isTouch ? 'touchend'  : 'mouseup',   onDragEnd,  { once: true });
            e.preventDefault();
        }

        function onDragMove(e) {
            const isTouch = e.type === 'touchmove';
            const pt      = isTouch ? e.touches[0] : e;
            const dx = pt.clientX - startX;
            const dy = pt.clientY - startY;
            // Respect ST's rightNavHolder when it's open — don't drag the popout under it
            const rightNav = document.getElementById('rightNavHolder');
            const rightNavW = (rightNav && rightNav.offsetWidth > 40) ? rightNav.offsetWidth : 0;
            const newLeft = Math.max(0, Math.min(window.innerWidth  - bar.offsetWidth - rightNavW, startLeft + dx));
            const newTop  = Math.max(0, Math.min(window.innerHeight - bar.offsetHeight, startTop  + dy));
            bar.style.left = `${newLeft}px`;
            bar.style.top  = `${newTop}px`;
            e.preventDefault();
        }

        function onDragEnd() {
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('touchmove', onDragMove);
            // Persist current popout position so it survives page reload
            const savedLeft = parseFloat(bar.style.left);
            const savedTop  = parseFloat(bar.style.top);
            if (!isNaN(savedLeft) && !isNaN(savedTop)) {
                settings.popoutLeft = savedLeft;
                settings.popoutTop  = savedTop;
                saveSettings();
            }
        }

        header.addEventListener('mousedown',  onDragStart);
        header.addEventListener('touchstart', onDragStart, { passive: false });
    }

 // EVENT HANDLERS
 function bindEventHandlers() {
 if (eventHandlersBound) return; // ← только один раз
 eventHandlersBound = true;

 // Remove any existing handlers first to prevent duplicates
 jQuery(document)
 .off('click', '#ec_power_btn')
 .off('click', '#ec_regen_btn')
 .off('click', '#ec_collapse_btn')
 .off('click', '#ec_qs_btn')
 .off('click', '.discord_username')
 .off('change', '#discord_enabled')
 .off('change', '#discord_source')
 .off('change', '#discord_url')
 .off('change', '#discord_model_select')
 .off('change', '#discord_openai_url')
 .off('change', '#discord_openai_key')
 .off('change', '#discord_openai_model')
 .off('change', '#discord_openai_preset')
 .off('change', '#discord_preset_select')
 .off('change', '#discord_style')
 .off('change', '#discord_position')
 .off('change', '#discord_user_count')
 .off('change input', '#discord_font_size')
 .off('change', '#discord_auto_update')
 .off('change', '#discord_include_user')
 .off('change', '#discord_context_depth')
 .off('change', '#discord_include_past_echo')
 .off('change', '#discord_include_persona')
 .off('change', '#discord_include_character_description')
 .off('change', '#discord_include_world_info')
 .off('change', '#discord_wi_budget')
 .off('click', '#discord_open_style_editor')
 .off('click', '#discord_import_btn')
 .off('change', '#discord_import_file')
 .off('change', '#discord_prompt_custom_mode')
 .off('input change', '#discord_prompt_nicknames')
 .off('input change', '#discord_prompt_personas')
 .off('input change', '#discord_prompt_language')
 .off('click', '.ec-s-section-header');

 jQuery(document)
 .on('click', '#ec_power_btn', function () {
                settings.enabled = !settings.enabled;
                saveSettings();
                const bar = document.getElementById('discordBar');
                if (settings.enabled) {
                    // Show the panel (or create it if somehow removed)
                    if (bar) {
                        jQuery(bar).show();
                    } else {
                        renderPanel();
                    }
                    generateDiscordChat();
                    initPostScrollObserver();
                } else {
                    // Hide but keep in DOM so re-enabling is instant
                    if (bar) jQuery(bar).hide();
                    // Stop watching scroll — no point tracking when panel is off
                    if (_postScrollObserver) { _postScrollObserver.disconnect(); _postScrollObserver = null; }
                    if (_postMutObserver)    { _postMutObserver.disconnect();    _postMutObserver    = null; }
                }
                updatePanelIcons();
                updateSTInputVisibility();
            })
            .on('click', '#ec_regen_btn', function () {
                if (generationInProgress) { cancelGeneration(); return; }
                // In noSaveMode always regenerate for the actual last post,
                // not for currentPostId which may be stale after scrolling.
                if (settings.noSaveMode) {
                    generateDiscordChat(null, null, true);
                } else {
                    generateDiscordChat(currentPostId, currentSwipeIdx, true);
                }
            })
            .on('click', '#ec_collapse_btn', function () {
                settings.collapsed = !settings.collapsed;
                saveSettings();
                const bar = document.getElementById('discordBar');
                if (bar) bar.classList.toggle('ec_collapsed', settings.collapsed);
                const btn = this.querySelector('i');
                if (btn) btn.className = `fa-solid fa-chevron-${settings.collapsed ? 'up' : 'down'}`;
                updateSTInputVisibility();
            })
            .on('click', '#ec_qs_btn', function (e) {
                e.stopPropagation();
                toggleQSMenu(this);
            })
            .on('click', '.discord_username', function () {
                // username click — reserved for future use
            })
            .on('click', function (e) {
                // Close menus on outside click
                if (!jQuery(e.target).closest('#ec_qs_btn, #ec_qs_menu_body').length) {
                    closeQSMenu();
                }
            });

        // Settings panel live update bindings
        jQuery(document)
            .on('change', '#discord_enabled', function () { settings.enabled = this.checked; saveSettings(); syncPanelToSettings(); })
            .on('change', '#discord_source', function () { settings.source = this.value; saveSettings(); updateSourceVisibility(); })
            .on('change', '#discord_url', function () { settings.ollamaUrl = this.value; saveSettings(); })
            .on('change', '#discord_model_select', function () { settings.ollamaModel = this.value; saveSettings(); })
            .on('change', '#discord_openai_url', function () { settings.openaiUrl = this.value; saveSettings(); })
            .on('change', '#discord_openai_key', function () { settings.openaiKey = this.value; saveSettings(); })
            .on('change', '#discord_openai_model', function () { settings.openaiModel = this.value; saveSettings(); })
            .on('change', '#discord_openai_preset', function () {
                settings.openaiPreset = this.value;
                setOpenAIPresetUrl(this.value);
                saveSettings();
            })
            .on('change', '#discord_preset_select', function () { settings.selectedPreset = this.value; saveSettings(); })
            .on('change', '#discord_style', function () {
                settings.style = this.value;
                saveSettings();
                updatePanelIcons();
                if (settings.enabled) generateDiscordChat();
            })
            .on('change', '#discord_position', function () {
                settings.position = this.value;
                saveSettings();
                removePanel();
                renderPanel();
            })
            .on('change', '#discord_user_count', function () { settings.userCount = parseInt(this.value); saveSettings(); })
            .on('change input', '#discord_font_size', function () {
                const v = parseInt(this.value);
                if (!isNaN(v) && v >= 8 && v <= 32) {
                    settings.fontSize = v;
                    applyFontSize(settings.fontSize);
                    saveSettings();
                }
            })
            .on('change', '#discord_auto_update', function () { settings.autoUpdate = this.checked; saveSettings(); })
            .on('change', '#discord_no_save_mode', function () {
                settings.noSaveMode = this.checked;
                saveSettings();
                updateNoSaveModeUI();
            })
            .on('change', '#discord_include_user', function () { settings.includeUser = this.checked; saveSettings(); updateContextDepthVisibility(); })
            .on('change', '#discord_context_depth', function () { settings.contextDepth = parseInt(this.value); saveSettings(); })
            .on('change', '#discord_include_past_echo', function () { settings.includePastEcho = this.checked; saveSettings(); })
            .on('change', '#discord_include_persona', function () { settings.includePersona = this.checked; saveSettings(); })
            .on('change', '#discord_include_character_description', function () { settings.includeCharacterDescription = this.checked; saveSettings(); })
            .on('change', '#discord_include_world_info', function () { settings.includeWorldInfo = this.checked; saveSettings(); updateWIBudgetVisibility(); })
            .on('change', '#discord_wi_budget', function () { settings.wiTokenBudget = parseInt(this.value) || 0; saveSettings(); })
            .on('click', '#discord_open_style_editor', openStyleEditor)
            .on('click', '#discord_import_btn', function () { document.getElementById('discord_import_file')?.click(); })
            .on('change', '#discord_import_file', handleStyleImport)
            // Prompt customizer
            .on('change', '#discord_prompt_custom_mode', function () {
                settings.promptCustomMode = this.checked;
                saveSettings();
                updatePromptModeUI();
            })
            .on('input change', '#discord_prompt_nicknames', function () {
                settings.promptNicknames = this.value;
                saveSettings();
            })
            .on('input change', '#discord_prompt_personas', function () {
                settings.promptPersonas = this.value;
                saveSettings();
            })
            .on('input change', '#discord_prompt_language', function () {
                settings.promptLanguage = this.value;
                saveSettings();
            });

        // Settings panel accordions
        // Listen only on the header itself — NOT on children ('*' selector causes double-fire via event bubbling)
        jQuery(document).on('click', '.ec-s-section-header', function (e) {
            // Prevent double-fire if click somehow propagates from a child
            e.stopPropagation();
            const header = this;
            const expanded = header.getAttribute('aria-expanded') === 'true';
            const body = header.nextElementSibling;
            header.setAttribute('aria-expanded', String(!expanded));
            if (body) {
                if (expanded) {
                    jQuery(body).slideUp(150);
                } else {
                    body.hidden = false;
                    jQuery(body).hide().slideDown(150);
                }
            }
        });
    }

    function syncPanelToSettings() {
        const bar = document.getElementById('discordBar');
        if (settings.enabled) {
            if (!bar) {
                renderPanel();
            } else {
                // Panel exists but may be hidden (e.g. was disabled via checkbox)
                jQuery(bar).show();
                updatePanelIcons();
                updateSTInputVisibility();
            }
        } else {
            if (bar) jQuery(bar).hide();
            updatePanelIcons();
            updateSTInputVisibility();
        }
    }

    function setOpenAIPresetUrl(preset) {
        const urls = {
            lmstudio: 'http://localhost:1234/v1',
            koboldcpp: 'http://localhost:5001/v1',
            textgenwebui: 'http://localhost:5000/v1',
            vllm: 'http://localhost:8000/v1',
        };
        if (urls[preset]) {
            settings.openaiUrl = urls[preset];
            const urlInput = document.getElementById('discord_openai_url');
            if (urlInput) urlInput.value = urls[preset];
        }
    }

    // ───────────────────────────────────────────────────────────
    // MENUS
    // ───────────────────────────────────────────────────────────
    function closeAllMenus() {
        closeOverflowMenu();
        closeQSMenu();
        if (activeMenuBtn) {
            jQuery(activeMenuBtn).removeClass('open');
            activeMenuBtn = null;
        }
    }

    function closeOverflowMenu() {
        const menu = document.getElementById('ec_overflow_menu_body');
        if (menu) menu.remove();
        overflowMenuOpen = false;
    }

    function closeQSMenu() {
        const menu = document.getElementById('ec_qs_menu_body');
        if (menu) menu.remove();
        qsMenuOpen = false;
    }

    // ───────────────────────────────────────────────────────────
    // EXPORT COMMENTARY AS IMAGE (JPG)
    // Works on mobile (saves to gallery via <a download>) and
    // on desktop (opens save-file dialog via same mechanism).
    // Uses html2canvas loaded on-demand from CDN.
    // ───────────────────────────────────────────────────────────
    async function exportCommentaryAsImage() {
        const bar     = document.getElementById('discordBar');
        const content = document.getElementById('discordContent');
        if (!content || !content.innerHTML.trim()) {
            toastr.warning(t('No posts yet'));
            return;
        }

        setStatus(t('Processing...'));

        // Save & override styles that clip or scroll the content area,
        // so html2canvas can capture the full height in-place.
        // We render the real DOM node (not a clone) so every scoped CSS rule
        // (e.g. #discordBar[data-style="realdiscord"] ...) is still active.
        const prevOverflow  = content.style.overflow;
        const prevMaxHeight = content.style.maxHeight;
        const prevHeight    = content.style.height;
        content.style.overflow  = 'visible';
        content.style.maxHeight = 'none';
        content.style.height    = 'auto';
        // Force reflow so scrollHeight reflects the full expanded content
        // (critical on mobile/Termux where the element was constrained before)
        void content.offsetHeight;

        // html2canvas does NOT support -webkit-text-fill-color:transparent + background-clip:text.
        // It renders the background rect but leaves text invisible → filled color block.
        // Fix: temporarily swap gradient-on-text to solid color before capture,
        // then restore original inline styles after.
        const usernameEls = content.querySelectorAll('.rd_username');
        const savedUsernameStyles = Array.from(usernameEls).map(el => el.getAttribute('style') || '');
        usernameEls.forEach(el => {
            // Extract the first gradient stop color to use as solid fallback
            const style = el.getAttribute('style') || '';
            const gradMatch = style.match(/linear-gradient\(90deg,\s*([^,]+),/);
            const solidColor = gradMatch ? gradMatch[1].trim() : '#ffffff';
            el.style.cssText = `color: ${solidColor}; -webkit-text-fill-color: ${solidColor}; background: none;`;
        });

        // Determine the actual rendered background color from the bar
        const barBg = bar
            ? window.getComputedStyle(bar).backgroundColor
            : 'rgb(20, 20, 26)';
        // Convert any computed rgb(...) to hex for html2canvas (it needs a solid hex/rgb)
        const solidBg = barBg.startsWith('rgba') ? '#14141a' : (barBg || '#14141a');

        try {
            // Load html2canvas on demand (avoids bundling it permanently)
            if (!window.html2canvas) {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    s.onload  = resolve;
                    s.onerror = () => reject(new Error('html2canvas failed to load'));
                    document.head.appendChild(s);
                });
            }

            // Measure AFTER styles are expanded (reflow already forced above)
            const fullHeight = content.scrollHeight;
            const fullWidth  = content.scrollWidth;

            // Render the live #discordContent node — all CSS rules apply correctly
            const canvas = await window.html2canvas(content, {
                backgroundColor: solidBg,
                scale: 2,            // retina quality
                useCORS: true,
                logging: false,
                allowTaint: true,
                x: 0,
                y: 0,
                // Capture the full scrollable height, not just the visible viewport.
                // windowHeight must also be set so html2canvas doesn't clip at viewport.
                width:        fullWidth,
                height:       fullHeight,
                windowWidth:  fullWidth,
                windowHeight: fullHeight + 200,
                scrollX: 0,
                scrollY: 0,
            });

            // Convert to JPEG blob
            canvas.toBlob(blob => {
                if (!blob) { toastr.error(t('EchoLite Generation Error') + ': canvas empty'); return; }
                const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const name = `echolite_post${currentPostId ?? ''}_swipe${currentSwipeIdx}_${ts}.jpg`;
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = name;
                // On Android/iOS WebView the download attribute may be ignored;
                // fallback: open in new tab so the user can long-press → save
                a.target   = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                toastr.success(t('Export JPG'));
            }, 'image/jpeg', 0.92);
        } catch (e) {
            error('exportCommentaryAsImage error:', e);
            toastr.error(t('EchoLite Generation Error') + ': ' + e.message);
        } finally {
            // Always restore original styles
            content.style.overflow  = prevOverflow;
            content.style.maxHeight = prevMaxHeight;
            content.style.height    = prevHeight;
            // Restore username gradient styles
            usernameEls.forEach((el, i) => {
                el.setAttribute('style', savedUsernameStyles[i]);
            });
            setStatus('');
        }
    }

    // ───────────────────────────────────────────────────────────
    // SCROLL-BASED POST TRACKING (IntersectionObserver)
    // Watches .mes_block elements in #chat. When the user scrolls
    // to a different AI message, the bar switches to that post's
    // commentary automatically (restore cache or generate new).
    // ───────────────────────────────────────────────────────────
        let _postScrollObserver = null;
    let _postMutObserver    = null; // watches #chat for added/removed [mesid] nodes
    // Mobile scroll/touch fallback references (for cleanup on re-init)
    let _postScrollEl       = null;
    let _onChatScroll       = null;
    let _onChatTouchEnd     = null;

    function initPostScrollObserver() {
        // Disconnect any previous IntersectionObserver
        if (_postScrollObserver) {
            _postScrollObserver.disconnect();
            _postScrollObserver = null;
        }
        // Disconnect any previous MutationObserver
        if (_postMutObserver) {
            _postMutObserver.disconnect();
            _postMutObserver = null;
        }
        // Remove previous scroll/touch fallback listeners
        if (_postScrollEl) {
            if (_onChatScroll)   _postScrollEl.removeEventListener('scroll',   _onChatScroll);
            if (_onChatTouchEnd) _postScrollEl.removeEventListener('touchend', _onChatTouchEnd);
            _postScrollEl   = null;
            _onChatScroll   = null;
            _onChatTouchEnd = null;
        }

        if (!settings.enabled) return;

        const chatEl = document.getElementById('chat');
        if (!chatEl) return;

        // element → intersectionRatio map (updated by IO; also read by scroll fallback)
        const candidates = new Map();

        /**
         * Core switching logic — shared by IntersectionObserver callback and scroll fallback.
         * Receives the DOM element ([mesid]) that is currently most visible.
         */
        function handleBestVisible(bestEl) {
            // Skip elements with height < 40px — hidden/collapsed message stubs.
            // ST collapses a hidden message to a thin header (~30px). The IO or
            // getBoundingClientRect fallback would otherwise pick it as 100%-visible
            // and incorrectly override the commentary for the real visible post.
            if (bestEl.getBoundingClientRect().height < 40) return;

            const msgId = bestEl.dataset.msgid;
            if (msgId === undefined || msgId === null) return;

            const ctx = SillyTavern.getContext();
            // Guard: no active chat (welcome screen) — never auto-switch
            if (!ctx.chatId) return;
            // Guard: explicit nav lock — user just selected a post manually, don't override
            if (Date.now() < _navLockUntil) return;
            const msg = ctx.chat?.[parseInt(msgId)];
            if (!msg || msg.is_user || msg.is_system || msg.is_hidden) return;
            // Guard: message is still being generated (ST placeholder) — skip until content is real.
            // Without this, the IO observer fires for the newly-added AI slot while it still has
            // mes="..." and triggers EchoLite with an empty/placeholder prompt.
            const msgText = (msg.mes || '').trim();
            if (!msgText || msgText === '...' || msgText.length < 5) return;
            const swipeIdx = typeof msg.swipe_id === 'number' ? msg.swipe_id : 0;

            // Only switch if we're actually looking at a different post/swipe
            if (String(msgId) === String(currentPostId) && swipeIdx === currentSwipeIdx) return;

            // Guard: swipe slot is being generated — MESSAGE_RECEIVED(type='swipe') will handle it
            if (pendingSwipeMsgId !== null) return;

            // If auto-update is off, only restore from cache — never trigger a new generation
            if (!settings.autoUpdate || settings.paused) {
                restoreCachedCommentary(String(msgId), swipeIdx);
                return;
            }

            // noSaveMode: scroll never triggers generation — only new AI messages do
            if (settings.noSaveMode) return;

            generateDiscordChat(String(msgId), swipeIdx, false);
        }

        // ── IntersectionObserver ─────────────────────────────────────────────
        // root: null (viewport) instead of root: chatEl.
        // Android WebView (Termux) does NOT reliably fire IO callbacks when the
        // root is a scrollable div — it only works with the actual viewport root.
        _postScrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                candidates.set(entry.target, entry.intersectionRatio);
            });

            // Find the most-visible AI block.
            // Skip hidden stubs (height < 40px) — they score ratio=1.0 on tiny size.
            let bestEl    = null;
            let bestRatio = 0;
            for (const [el, ratio] of candidates) {
                if (el.getBoundingClientRect().height < 40) continue;
                if (ratio > bestRatio) { bestRatio = ratio; bestEl = el; }
            }
            if (!bestEl || bestRatio < 0.1) return; // nothing meaningfully visible
            handleBestVisible(bestEl);
        }, {
            root:      null,   // ← viewport: reliable on Android WebView / Termux
            threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
        });

        // ── Touch / Scroll fallback ──────────────────────────────────────────
        // On Android WebView older builds, IO with root:null still may be sluggish.
        // After each scroll or touchend we manually compute the most-visible element
        // using getBoundingClientRect — this is always reliable.
        const debouncedScrollCheck = debounce(() => {
            if (!settings.enabled) return;
            let bestEl    = null;
            let bestRatio = 0;
            const vH = window.innerHeight;
            candidates.forEach((_, el) => {
                const rect = el.getBoundingClientRect();
                if (rect.height < 40) return; // skip hidden/collapsed stubs
                const visible = Math.max(0, Math.min(rect.bottom, vH) - Math.max(rect.top, 0));
                const ratio   = visible / rect.height;
                if (ratio > bestRatio) { bestRatio = ratio; bestEl = el; }
            });
            if (bestEl && bestRatio >= 0.1) handleBestVisible(bestEl);
        }, 250);

        chatEl.addEventListener('scroll',   debouncedScrollCheck, { passive: true });
        chatEl.addEventListener('touchend', debouncedScrollCheck, { passive: true });
        _postScrollEl   = chatEl;
        _onChatScroll   = debouncedScrollCheck;
        _onChatTouchEnd = debouncedScrollCheck;

        // ── Helper: register a [mesid] element with the IntersectionObserver ─
        function observeAIEl(el) {
            const msgid = el.getAttribute('mesid');
            if (!msgid) return;
            const msg = SillyTavern.getContext().chat?.[parseInt(msgid)];
            if (!msg || msg.is_user || msg.is_system || msg.is_hidden) return;
            el.dataset.msgid = msgid;
            _postScrollObserver.observe(el);
        }

        // ── Observe all current AI messages ─────────────────────────────────
        chatEl.querySelectorAll('[mesid]').forEach(observeAIEl);
        // Fallback: scan .mes / .mes_block for cases where mesid sits on a parent
        chatEl.querySelectorAll('.mes_block, .mes').forEach(el => {
            const mesidEl = el.closest('[mesid]');
            if (mesidEl && mesidEl.dataset.msgid === undefined) observeAIEl(mesidEl);
        });

        // ── MutationObserver ─────────────────────────────────────────────────
        // Re-attach IO when ST adds or re-inserts [mesid] elements.
        // On Termux, hiding a message removes and recreates the DOM node, severing IO.
        _postMutObserver = new MutationObserver(debounce(() => {
            if (!_postScrollObserver) return;
            chatEl.querySelectorAll('[mesid]').forEach(el => {
                if (el.dataset.msgid === undefined) {
                    observeAIEl(el);
                } else {
                    _postScrollObserver.observe(el); // re-observe if detached
                }
            });
            // Prune stale entries from candidates map
            for (const el of candidates.keys()) {
                if (!chatEl.contains(el)) candidates.delete(el);
            }
        }, 300));
        _postMutObserver.observe(chatEl, { childList: true, subtree: false });
    }

    /** Re-attach observer after new messages are added to #chat */
    function refreshPostScrollObserver() {
        // Debounce — ST may add many DOM nodes in one batch
        clearTimeout(refreshPostScrollObserver._t);
        refreshPostScrollObserver._t = setTimeout(initPostScrollObserver, 400);
    }

    // ───────────────────────────────────────────────────────────
    // POST NAVIGATOR HELPERS
    // ───────────────────────────────────────────────────────────
    /**
     * Build the <select> HTML for the post navigator in QS menu.
     * Lists all AI posts, marks those with cached commentary with 📌.
     */
    function buildPostNavOptions() {
        try {
            const ctx   = SillyTavern.getContext();
            const chat  = ctx.chat;
            const store = getCommentaryStore();
            if (!chat || !chat.length) {
                return `<div class="ec_of_chip" style="width:100%;justify-content:center;opacity:0.5">${t('No posts yet')}</div>`;
            }

            const options = [];
            for (let i = 0; i < chat.length; i++) {
                const msg = chat[i];
                if (!msg || msg.is_user || msg.is_system || msg.is_hidden) continue;
                const swipeIdx   = typeof msg.swipe_id === 'number' ? msg.swipe_id : 0;
                const totalSwipes = msg.swipes?.length || 1;
                const hasCached  = !!store?.posts?.[String(i)]?.[String(swipeIdx)];
                const preview    = extractText(msg.mes || '').slice(0, 40).replace(/\n/g, ' ');
                const pinIcon    = hasCached ? '📌 ' : '';
                const isSelected = String(i) === String(currentPostId);
                options.push(
                    `<option value="${i}" data-swipe="${swipeIdx}"${isSelected ? ' selected' : ''}>${pinIcon}#${i + 1} [${swipeIdx + 1}/${totalSwipes}] ${escapeHtml(preview)}…</option>`
                );
            }

            if (!options.length) {
                return `<div class="ec_of_chip" style="width:100%;justify-content:center;opacity:0.5">${t('No posts yet')}</div>`;
            }

            return `<select id="ec_qs_nav_select" class="ec_post_nav_select">${options.join('')}</select>`;
        } catch { return ''; }
    }

    function toggleQSMenu(btn) {
        if (qsMenuOpen) { closeQSMenu(); return; }
        closeAllMenus();
        qsMenuOpen = true;

        const posOpts = ['bottom','left','right','popout'].map(p =>
            `<div class="ec_of_chip ec_of_pos_chip${settings.position === p ? ' ec_of_selected' : ''}" data-qs-pos="${p}">${p === 'popout' ? '↗ ' + t('Pop Out') : t(p.charAt(0).toUpperCase()+p.slice(1))}</div>`
        ).join('');

        const userOpts = [1,2,3,4,5,6,7,8,10,12,15,20].map(n =>
            `<div class="ec_of_chip ec_of_num${settings.userCount == n ? ' ec_of_selected' : ''}" data-qs-users="${n}">${n}</div>`
        ).join('');

        const fontOpts = [10,11,12,13,14,15,16,17,18,20,22,24].map(n =>
            `<div class="ec_of_chip ec_of_num${settings.fontSize == n ? ' ec_of_selected' : ''}" data-qs-font="${n}">${n}</div>`
        ).join('');

        const fontFamilyOpts = Object.entries(EC_FONTS).map(([k, f]) =>
            `<div class="ec_of_chip${settings.fontFamily === k ? ' ec_of_selected' : ''}" data-qs-fontfamily="${k}">${escapeHtml(t(f.label))}</div>`
        ).join('');

        const menu = document.createElement('div');
        menu.id = 'ec_qs_menu_body';
        menu.className = 'ec_popup_menu ec_overflow_menu';
        menu.style.position = 'fixed';
        menu.innerHTML = `
            ${!settings.noSaveMode ? `<div class="ec_of_accordion ec_of_acc_open">
                <div class="ec_of_acc_header" data-section="qs-nav"><span><i class="fa-solid fa-thumbtack"></i> ${t('Post Navigator')}</span><i class="fa-solid fa-chevron-right ec_of_chevron ec_of_rotated"></i></div>
                <div class="ec_of_acc_body ec_of_open" id="ec_qs_nav_body">
                    ${buildPostNavOptions()}
                    <div class="ec_of_chip_wrap" style="margin-top:6px">
                        <div class="ec_of_chip ec_of_danger_chip" id="ec_qs_nav_regen" style="flex:1;justify-content:center">${t('Regenerate')}</div>
                        <div class="ec_of_chip" id="ec_qs_nav_export" style="flex:1;justify-content:center">${t('Export JPG')}</div>
                    </div>
                </div>
            </div>` : `<div class="ec_of_accordion ec_of_acc_open">
                <div class="ec_of_acc_body ec_of_open" id="ec_qs_nav_body" style="padding:4px 8px">
                    <div class="ec_of_chip_wrap"><div class="ec_of_chip" id="ec_qs_nav_export" style="flex:1;justify-content:center">${t('Export JPG')}</div></div>
                </div>
            </div>`}
            <div class="ec_of_accordion ec_of_acc_open">
                <div class="ec_of_acc_header" data-section="qs-pos"><span><i class="fa-solid fa-arrows-up-down-left-right"></i> ${t('Panel Position')}</span><i class="fa-solid fa-chevron-right ec_of_chevron ec_of_rotated"></i></div>
                <div class="ec_of_acc_body ec_of_open"><div class="ec_of_chip_wrap">${posOpts}</div></div>
            </div>
            <div class="ec_of_accordion">
                <div class="ec_of_acc_header" data-section="qs-users"><span><i class="fa-solid fa-users"></i> ${t('User Count')}</span><i class="fa-solid fa-chevron-right ec_of_chevron"></i></div>
                <div class="ec_of_acc_body"><div class="ec_of_chip_wrap">${userOpts}</div></div>
            </div>
            <div class="ec_of_accordion">
                <div class="ec_of_acc_header" data-section="qs-font"><span><i class="fa-solid fa-font"></i> ${t('Font Size')}</span><i class="fa-solid fa-chevron-right ec_of_chevron"></i></div>
                <div class="ec_of_acc_body"><div class="ec_of_chip_wrap">${fontOpts}</div></div>
            </div>
            <div class="ec_of_accordion">
                <div class="ec_of_acc_header" data-section="qs-fontfamily"><span><i class="fa-solid fa-text-height"></i> ${t('Font Family')}</span><i class="fa-solid fa-chevron-right ec_of_chevron"></i></div>
                <div class="ec_of_acc_body"><div class="ec_of_chip_wrap">${fontFamilyOpts}</div></div>
            </div>
            <div class="ec_of_divider_line"></div>
            <div class="ec_of_item ec_of_danger" id="ec_qs_clear"><i class="fa-solid fa-trash"></i> ${t('Clear Chat & Cache')}</div>`;

        menu.style.visibility = 'hidden';
        document.body.appendChild(menu);

        const rect = btn.getBoundingClientRect();
        const menuH = menu.offsetHeight || 200;
        const menuW = menu.offsetWidth  || 260;

        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;
        let top;
        if (spaceBelow >= menuH || spaceBelow >= spaceAbove) {
            top = rect.bottom + 4;
        } else {
            top = rect.top - menuH - 4;
        }
        menu.style.top = `${Math.max(4, top)}px`;

        if (rect.left + menuW > window.innerWidth) {
            // Кнопка у правого края — меню вышло бы за экран справа, прижимаем к right
            menu.style.right = `${Math.max(4, window.innerWidth - rect.right)}px`;
            menu.style.left = '';
        } else {
            // Кнопка у левого края — анкорим к left
            menu.style.left = `${Math.max(4, rect.left)}px`;
            menu.style.right = '';
        }
        menu.style.visibility = '';
        menu.style.display = 'block';

        // Accordion toggle
        menu.querySelectorAll('.ec_of_acc_header').forEach(h => {
            h.addEventListener('click', function () {
                const body = this.nextElementSibling;
                const chevron = this.querySelector('.ec_of_chevron');
                const open = body.classList.toggle('ec_of_open');
                if (chevron) chevron.classList.toggle('ec_of_rotated', open);
            });
        });

        // Post Navigator: select → auto-load on change (no Load button needed)
        menu.querySelector('#ec_qs_nav_select')?.addEventListener('change', function () {
            const msgId    = this.value;
            const swipeIdx = parseInt(this.selectedOptions[0]?.dataset?.swipe ?? 0);
            // Lock IntersectionObserver for 2s so it can't override the explicit nav
            _navLockUntil = Date.now() + 2000;
            // Don't close menu — user may want to Regenerate right after
            generateDiscordChat(msgId, swipeIdx, false);
        });

        // Post Navigator: Regenerate button
        menu.querySelector('#ec_qs_nav_regen')?.addEventListener('click', () => {
            const sel = menu.querySelector('#ec_qs_nav_select');
            if (!sel) return;
            const msgId    = sel.value;
            const swipeIdx = parseInt(sel.selectedOptions[0]?.dataset?.swipe ?? 0);
            _navLockUntil = Date.now() + 2000;
            closeQSMenu();
            generateDiscordChat(msgId, swipeIdx, true);
        });

        // Post Navigator: Export JPG button
        menu.querySelector('#ec_qs_nav_export')?.addEventListener('click', () => {
            closeQSMenu();
            exportCommentaryAsImage();
        });

        // Chips
        menu.querySelectorAll('[data-qs-pos]').forEach(el => {
            el.addEventListener('click', function () {
                settings.position = this.dataset.qsPos;
                saveSettings();
                closeQSMenu();
                removePanel(); renderPanel();
            });
        });
        menu.querySelectorAll('[data-qs-users]').forEach(el => {
            el.addEventListener('click', function () {
                settings.userCount = parseInt(this.dataset.qsUsers);
                saveSettings();
                closeQSMenu();
            });
        });
        menu.querySelectorAll('[data-qs-font]').forEach(el => {
            el.addEventListener('click', function () {
                settings.fontSize = parseInt(this.dataset.qsFont);
                applyFontSize(settings.fontSize);
                saveSettings();
                closeQSMenu();
            });
        });
        menu.querySelectorAll('[data-qs-fontfamily]').forEach(el => {
            el.addEventListener('click', function () {
                settings.fontFamily = this.dataset.qsFontfamily;
                applyFontFamily(settings.fontFamily);
                saveSettings();
                closeQSMenu();
            });
        });
        menu.querySelector('#ec_qs_clear')?.addEventListener('click', async () => {
            closeQSMenu();
            const ok = await showConfirmModal(t('Clear all generated chat messages and cached commentary?'));
            if (ok) { clearCachedCommentary(); setDiscordText(''); toastr.success(t('Chat and cache cleared')); }
        });
    }

    function toggleOverflowMenu(btn) {
        if (overflowMenuOpen) { closeOverflowMenu(); return; }
        closeAllMenus();
        overflowMenuOpen = true;

        const posOpts = ['bottom','left','right','popout'].map(p =>
            `<div class="ec_of_chip ec_of_pos_chip${settings.position === p ? ' ec_of_selected' : ''}" data-pos="${p}">${p === 'popout' ? '↗ ' + t('Pop Out') : t(p.charAt(0).toUpperCase()+p.slice(1))}</div>`
        ).join('');

        const userOpts = [1,2,3,4,5,6,7,8,10,12,15,20].map(n =>
            `<div class="ec_of_chip ec_of_num${settings.userCount == n ? ' ec_of_selected' : ''}" data-users="${n}">${n}</div>`
        ).join('');

        const fontOpts = [10,11,12,13,14,15,16,17,18,20,22,24].map(n =>
            `<div class="ec_of_chip ec_of_num${settings.fontSize == n ? ' ec_of_selected' : ''}" data-font="${n}">${n}</div>`
        ).join('');

        const fontFamilyOpts = Object.entries(EC_FONTS).map(([k, f]) =>
            `<div class="ec_of_chip${settings.fontFamily === k ? ' ec_of_selected' : ''}" data-fontfamily="${k}">${escapeHtml(t(f.label))}</div>`
        ).join('');

        const menu = document.createElement('div');
        menu.id = 'ec_overflow_menu_body';
        menu.className = 'ec_popup_menu ec_overflow_menu';
        menu.style.position = 'fixed';
        menu.innerHTML = `
            <div class=\\\"ec_of_item ec_of_danger\\\" id=\\\"ec_of_clear\\\"><i class=\\\"fa-solid fa-trash\\\"></i> ${t('Clear Chat & Cache')}</div>
            <div class=\"ec_of_divider_line\"></div>
            <div class="ec_of_accordion">
                <div class="ec_of_acc_header" data-section="pos"><span><i class="fa-solid fa-arrows-up-down-left-right"></i> ${t('Panel Position')}</span><i class="fa-solid fa-chevron-right ec_of_chevron"></i></div>
                <div class="ec_of_acc_body"><div class="ec_of_chip_wrap">${posOpts}</div></div>
            </div>
            <div class="ec_of_accordion">
                <div class="ec_of_acc_header" data-section="users"><span><i class="fa-solid fa-users"></i> ${t('User Count')}</span><i class="fa-solid fa-chevron-right ec_of_chevron"></i></div>
                <div class="ec_of_acc_body"><div class="ec_of_chip_wrap">${userOpts}</div></div>
            </div>
            <div class="ec_of_accordion">
                <div class="ec_of_acc_header" data-section="font"><span><i class="fa-solid fa-font"></i> ${t('Font Size')}</span><i class="fa-solid fa-chevron-right ec_of_chevron"></i></div>
                <div class="ec_of_acc_body"><div class="ec_of_chip_wrap">${fontOpts}</div></div>
            </div>
            <div class="ec_of_accordion">
                <div class="ec_of_acc_header" data-section="fontfamily"><span><i class="fa-solid fa-text-height"></i> ${t('Font Family')}</span><i class="fa-solid fa-chevron-right ec_of_chevron"></i></div>
                <div class="ec_of_acc_body"><div class="ec_of_chip_wrap">${fontFamilyOpts}</div></div>
            </div>`;
        // Append hidden first — so we can measure real height
        menu.style.visibility = 'hidden';
        document.body.appendChild(menu);

        const rect = btn.getBoundingClientRect();
        const menuH = menu.offsetHeight || 300;   // real height after render
        const menuW = menu.offsetWidth  || 290;

        // Vertical: flip up if not enough room below, clamp to viewport
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;
        let top;
        if (spaceBelow >= menuH || spaceBelow >= spaceAbove) {
            // Open downward — fits below OR more space below than above
            top = rect.bottom + 4;
        } else {
            // Open upward
            top = rect.top - menuH - 4;
        }
        menu.style.top = `${Math.max(4, top)}px`;

        // Horizontal: если меню выйдет за правый край — прижимаем к right.
        // Если кнопка у левого края (left панель) — анкорим к left.
        if (rect.left + menuW > window.innerWidth) {
            // Кнопка у правого края — right-anchored
            menu.style.right = `${Math.max(4, window.innerWidth - rect.right)}px`;
            menu.style.left = '';
        } else {
            // Кнопка у левого края (left панель) — left-anchored
            menu.style.left = `${Math.max(4, rect.left)}px`;
            menu.style.right = '';
        }
        menu.style.visibility = '';
        menu.style.display = 'block';

        // Accordion toggle
        menu.querySelectorAll('.ec_of_acc_header').forEach(h => {
            h.addEventListener('click', function () {
                const body = this.nextElementSibling;
                const chevron = this.querySelector('.ec_of_chevron');
                const open = body.classList.toggle('ec_of_open');
                if (chevron) chevron.classList.toggle('ec_of_rotated', open);
            });
        });

        // Actions
        menu.querySelector('#ec_of_clear')?.addEventListener('click', async () => {
            closeOverflowMenu();
            const ok = await showConfirmModal(t('Clear all generated chat messages and cached commentary?'));
            if (ok) { clearCachedCommentary(); setDiscordText(''); toastr.success(t('Chat and cache cleared')); }
        });

        // Chips
        menu.querySelectorAll('[data-pos]').forEach(el => {
            el.addEventListener('click', function () {
                settings.position = this.dataset.pos;
                saveSettings();
                closeOverflowMenu();
                removePanel(); renderPanel();
            });
        });
        menu.querySelectorAll('[data-users]').forEach(el => {
            el.addEventListener('click', function () {
                settings.userCount = parseInt(this.dataset.users);
                saveSettings();
                closeOverflowMenu();
            });
        });
        menu.querySelectorAll('[data-font]').forEach(el => {
            el.addEventListener('click', function () {
                settings.fontSize = parseInt(this.dataset.font);
                applyFontSize(settings.fontSize);
                saveSettings();
                closeOverflowMenu();
            });
        });
        menu.querySelectorAll('[data-fontfamily]').forEach(el => {
            el.addEventListener('click', function () {
                settings.fontFamily = this.dataset.fontfamily;
                applyFontFamily(settings.fontFamily);
                saveSettings();
                closeOverflowMenu();
            });
        });
    }

    // ───────────────────────────────────────────────────────────
    // COMPACT MODE
    // ───────────────────────────────────────────────────────────
    function checkCompactMode() {
        const qs = document.getElementById('discordQuickSettings');
        if (!qs) return;
        const availableWidth = qs.offsetWidth;
        const compact = availableWidth < 360;
        qs.classList.toggle('ec_compact', compact);
    }

    // ───────────────────────────────────────────────────────────
    // STYLE EDITOR
    // ───────────────────────────────────────────────────────────
    function getOrderedStyles() {
        const order = settings.styleOrder || DEFAULT_STYLE_ORDER;
        const deleted = settings.deletedBuiltins || [];
        const builtins = BUILT_IN_STYLES.filter(s => !deleted.includes(s.val));
        const customs = (settings.customStyles || []).map(s => ({ val: s.id || s.name, label: s.name }));
        const all = [...builtins, ...customs];

        // Sort by order array
        all.sort((a, b) => {
            const ia = order.indexOf(a.val);
            const ib = order.indexOf(b.val);
            if (ia === -1 && ib === -1) return 0;
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });
        return all;
    }

    function openStyleEditor() {
        const allStyles = getOrderedStyles();
        const customIds = (settings.customStyles || []).map(s => s.id || s.name);

        const sidebarItems = allStyles.map(s => {
            const isBuiltin = !customIds.includes(s.val);
            // draggable="true" removed — pointer-based D&D handles reordering;
            // the native HTML5 drag attribute causes a ghost image flicker on Android.
            return `<div class="ec_style_item${s.val === settings.style ? ' active' : ''} ${isBuiltin ? 'builtin' : 'custom'}" data-val="${escapeAttr(s.val)}">
                <i class="fa-solid fa-grip-dots-vertical ec_drag_handle"></i>
                <i class="fa-solid ${isBuiltin ? 'fa-cube' : 'fa-user'} ec_style_type_icon"></i>
                <span>${escapeHtml(t(s.label))}</span>
            </div>`;
        }).join('');

        const modal = jQuery(`
<div class="ec_modal_overlay active" id="ec_style_editor_modal">
    <div class="ec_modal_content">
        <div class="ec_modal_header">
            <h3><i class="fa-solid fa-palette"></i> ${t('Style Editor')}</h3>
            <button class="ec_modal_close" id="ec_style_editor_close">×</button>
        </div>
        <div class="ec_modal_body">
            <div class="ec_style_sidebar">
                <div class="ec_style_sidebar_header">
                    <button class="menu_button ec_btn_new_style" id="ec_new_style_btn"><i class="fa-solid fa-plus"></i> ${t('New')}</button>
                </div>
                <div class="ec_style_list" id="ec_style_list">${sidebarItems}</div>
                <div class="ec_style_order_hint"><i class="fa-solid fa-arrows-up-down"></i> ${t('Drag to reorder')}</div>
            </div>
            <div class="ec_style_main">
                <div class="ec_empty_state" id="ec_style_empty">
                    <i class="fa-solid fa-palette"></i>
                    <p>${t('Select a style to edit or create a new one')}</p>
                </div>
                <div id="ec_style_editor_content" style="display:none;flex:1;flex-direction:column;gap:10px;">
                    <div class="ec_style_name_row">
                        <input type="text" class="ec_style_name_input" id="ec_style_name" placeholder="${t('Style Name')}">
                    </div>
                    <textarea class="ec_style_textarea" id="ec_style_prompt" style="flex:1" placeholder="System prompt..."></textarea>
                </div>
            </div>
        </div>
        <div class="ec_modal_footer">
            <div class="ec_modal_footer_left">
                <button class="menu_button ec_btn_danger" id="ec_delete_style_btn" style="display:none"><i class="fa-solid fa-trash"></i> ${t('Delete')}</button>
                <button class="menu_button ec_btn_export" id="ec_export_style_btn" style="display:none"><i class="fa-solid fa-file-export"></i> ${t('Export')}</button>
            </div>
            <div class="ec_modal_footer_right">
                <button class="menu_button ec_btn_cancel" id="ec_style_cancel_btn">${t('Cancel')}</button>
                <button class="menu_button ec_btn_save" id="ec_save_style_btn" style="display:none"><i class="fa-solid fa-floppy-disk"></i> ${t('Save')}</button>
            </div>
        </div>
    </div>
</div>`);

        jQuery('body').append(modal);

        let selectedStyleVal = null;

        function selectStyle(val) {
            selectedStyleVal = val;
            modal.find('.ec_style_item').removeClass('active');
            modal.find(`.ec_style_item[data-val="${CSS.escape(val)}"]`).addClass('active');

            const isBuiltin = !customIds.includes(val);
            const builtIn = BUILT_IN_STYLES.find(s => s.val === val);
            const custom = settings.customStyles?.find(s => (s.id || s.name) === val);
            const name = builtIn ? t(builtIn.label) : (custom?.name || val);

            modal.find('#ec_style_empty').hide();
            modal.find('#ec_style_editor_content').css('display','flex');
            modal.find('#ec_style_name').val(name).prop('disabled', isBuiltin).attr('placeholder', isBuiltin ? t('(Built-in styles cannot be renamed)') : t('Style Name'));
            modal.find('#ec_delete_style_btn').show();
            modal.find('#ec_export_style_btn').show();
            modal.find('#ec_save_style_btn').toggle(!isBuiltin);

            if (isBuiltin) {
                // Load prompt from file async
                loadStylePrompt(val).then(prompt => modal.find('#ec_style_prompt').val(prompt).prop('disabled', true));
            } else {
                modal.find('#ec_style_prompt').val(custom?.prompt || '').prop('disabled', false);
            }
        }

        modal.on('click', '.ec_style_item', function () { selectStyle(jQuery(this).data('val')); });

        modal.on('click', '#ec_new_style_btn', () => openTemplateCreator());

        modal.on('click', '#ec_save_style_btn', function () {
            if (!selectedStyleVal) return;
            const name = modal.find('#ec_style_name').val().trim();
            if (!name) { toastr.error(t('Style name cannot be empty')); return; }
            const prompt = modal.find('#ec_style_prompt').val();
            const custom = settings.customStyles.find(s => (s.id || s.name) === selectedStyleVal);
            if (custom) { custom.name = name; custom.prompt = prompt; }
            saveSettings();
            toastr.success(t('Style saved!'));
        });

        modal.on('click', '#ec_export_style_btn', function () {
            if (!selectedStyleVal) return;
            const custom = settings.customStyles?.find(s => (s.id || s.name) === selectedStyleVal);
            if (!custom) { toastr.warning('Cannot export built-in styles'); return; }
            const blob = new Blob([custom.prompt || ''], { type: 'text/markdown' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${custom.name || selectedStyleVal}.md`;
            a.click();
            URL.revokeObjectURL(a.href);
            toastr.success(t('Style exported!'));
        });

        modal.on('click', '#ec_delete_style_btn', async function () {
            if (!selectedStyleVal) return;
            const isBuiltin = !customIds.includes(selectedStyleVal);
            const msg = isBuiltin
                ? t('Hide this built-in style? You can restore it by clearing deleted styles.')
                : t('Delete this custom style? This cannot be undone.');
            const ok = await showConfirmModal(msg);
            if (!ok) return;
            if (isBuiltin) {
                if (!settings.deletedBuiltins) settings.deletedBuiltins = [];
                if (!settings.deletedBuiltins.includes(selectedStyleVal)) settings.deletedBuiltins.push(selectedStyleVal);
            } else {
                settings.customStyles = settings.customStyles.filter(s => (s.id || s.name) !== selectedStyleVal);
            }
            saveSettings();
            toastr.info(t('Style removed'));
            modal.remove();
            openStyleEditor();
        });

        modal.on('click', '#ec_style_editor_close, #ec_style_cancel_btn', () => modal.remove());
        modal.on('click', function (e) { if (jQuery(e.target).is('#ec_style_editor_modal')) modal.remove(); });

        // Drag-and-drop reorder — hybrid mouse+touch implementation.
        // Native HTML5 D&D (dragstart/drop) is broken on Android Chromium/Firefox
        // because touch events don't fire the drag* family. We implement pointer-event
        // based D&D that works on both desktop (mouse) and mobile (touch).
        const list = modal.find('#ec_style_list')[0];
        let draggingEl = null;
        let dragClone   = null; // floating ghost element
        let dragOffsetY = 0;    // pointer-Y offset inside the dragged element

        function getDragTarget(y) {
            // Find the list item whose midpoint is closest below the pointer
            const items = [...list.querySelectorAll('.ec_style_item')].filter(el => el !== draggingEl);
            for (const el of items) {
                const rect = el.getBoundingClientRect();
                if (y < rect.top + rect.height / 2) return el;
            }
            return null; // insert at end
        }

        function saveDragOrder() {
            settings.styleOrder = [...list.querySelectorAll('.ec_style_item')].map(el => el.dataset.val);
            saveSettings();
        }

        list.addEventListener('pointerdown', e => {
            // Only react to the drag handle or the item itself; ignore buttons inside
            const handle = e.target.closest('.ec_drag_handle');
            const item   = e.target.closest('.ec_style_item');
            if (!handle || !item) return;
            // Capture pointer so we get pointermove/up even outside the element
            try { list.setPointerCapture(e.pointerId); } catch {}
            draggingEl = item;
            draggingEl.classList.add('ec_dragging');
            const rect = draggingEl.getBoundingClientRect();
            dragOffsetY = e.clientY - rect.top;

            // Create a ghost clone floating under the pointer
            dragClone = draggingEl.cloneNode(true);
            dragClone.style.cssText = `
                position: fixed;
                left: ${rect.left}px;
                top:  ${rect.top}px;
                width: ${rect.width}px;
                opacity: 0.85;
                pointer-events: none;
                z-index: 999999;
                background: rgba(67,181,129,0.15);
                border: 1px solid rgba(67,181,129,0.5);
                border-radius: 6px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            `;
            document.body.appendChild(dragClone);
            e.preventDefault();
        }, { passive: false });

        list.addEventListener('pointermove', e => {
            if (!draggingEl || !dragClone) return;
            const y = e.clientY;
            dragClone.style.top = `${y - dragOffsetY}px`;

            // Highlight target position
            list.querySelectorAll('.ec_style_item').forEach(el => el.classList.remove('ec_drag_over'));
            const target = getDragTarget(y);
            if (target) target.classList.add('ec_drag_over');
            e.preventDefault();
        }, { passive: false });

        function endDrag(e) {
            if (!draggingEl) return;
            const y = e.clientY;
            const target = getDragTarget(y);
            if (target) {
                list.insertBefore(draggingEl, target);
            } else {
                list.appendChild(draggingEl);
            }
            saveDragOrder();
            list.querySelectorAll('.ec_style_item').forEach(el => el.classList.remove('ec_dragging', 'ec_drag_over'));
            dragClone?.remove();
            draggingEl = null;
            dragClone  = null;
            try { list.releasePointerCapture(e.pointerId); } catch {}
        }

        list.addEventListener('pointerup',     endDrag);
        list.addEventListener('pointercancel', endDrag);
    }

    // ───────────────────────────────────────────────────────────
    // TEMPLATE CREATOR
    // ───────────────────────────────────────────────────────────
    function openTemplateCreator() {
        const modal = jQuery(`
<div class="ec_modal_overlay active" id="ec_template_modal">
    <div class="ec_modal_content ec_template_creator">
        <div class="ec_modal_header">
            <h3><i class="fa-solid fa-wand-magic-sparkles"></i> ${t('Create New Style')}</h3>
            <button class="ec_modal_close" id="ec_tpl_close">×</button>
        </div>
        <div class="ec_template_tabs">
            <button class="ec_tab_btn active" data-tab="easy"><i class="fa-solid fa-wand-sparkles"></i> ${t('Easy Mode')}</button>
            <button class="ec_tab_btn" data-tab="advanced"><i class="fa-solid fa-code"></i> ${t('Advanced')}</button>
        </div>
        <div class="ec_template_body">
            <div class="ec_tab_content active" data-tab="easy">
                <div class="ec_form_group">
                    <label>${t('Style Name')}</label>
                    <input type="text" id="ec_tpl_name" placeholder="My Style">
                </div>
                <div class="ec_form_group">
                    <label>${t('Tone')}</label>
                    <select id="ec_tpl_tone">
                        <option value="chaotic">${t('Chaotic / Energetic')}</option>
                        <option value="calm">${t('Calm / Thoughtful')}</option>
                        <option value="sarcastic">${t('Sarcastic / Witty')}</option>
                        <option value="wholesome">${t('Wholesome / Supportive')}</option>
                        <option value="cynical">${t('Cynical / Tired')}</option>
                        <option value="nsfw">${t('Explicit / NSFW')}</option>
                        <option value="custom">${t('Custom (enter below)')}</option>
                    </select>
                </div>
                <div class="ec_form_group" id="ec_tpl_custom_tone">
                    <label>Custom Tone</label>
                    <input type="text" id="ec_tpl_custom_tone_val" placeholder="Describe the tone...">
                </div>
                <div class="ec_form_group">
                    <label>${t('Message Length')}</label>
                    <select id="ec_tpl_length">
                        <option value="short">${t('Short (1-2 sentences)')}</option>
                        <option value="medium" selected>${t('Medium (2-3 sentences)')}</option>
                        <option value="long">${t('Long (paragraphs)')}</option>
                    </select>
                </div>
                <div class="ec_form_group">
                    <label>${t('Style Elements (select all that apply)')}</label>
                    <div class="ec_checkbox_row">
                        <label><input type="checkbox" id="ec_tpl_emojis"> ${t('Emojis')}</label>
                        <label><input type="checkbox" id="ec_tpl_slang"> ${t('Internet Slang')}</label>
                        <label><input type="checkbox" id="ec_tpl_lowercase"> ${t('Lowercase preferred')}</label>
                        <label><input type="checkbox" id="ec_tpl_typos"> ${t('Occasional typos')}</label>
                        <label><input type="checkbox" id="ec_tpl_caps"> ${t('ALL CAPS moments')}</label>
                        <label><input type="checkbox" id="ec_tpl_hashtags"> ${t('Hashtags')}</label>
                        <label><input type="checkbox" id="ec_tpl_formal"> ${t('Formal grammar')}</label>
                    </div>
                </div>
            </div>
            <div class="ec_tab_content" data-tab="advanced">
                <div class="ec_form_group ec_full_height">
                    <div class="ec_label_row">
                        <label>${t('System Prompt')}</label>
                        <div class="ec_prompt_actions">
                            <button class="menu_button ec_small_btn" id="ec_tpl_clear"><i class="fa-solid fa-eraser"></i>${t('Clear')}</button>
                        </div>
                    </div>
                    <textarea id="ec_tpl_prompt" placeholder="Write your system prompt here...&#10;&#10;Example:&#10;Generate {count} messages from different chat users reacting to the scene.&#10;Each line: Username: message"></textarea>
                </div>
            </div>
        </div>
        <div class="ec_modal_footer">
            <div class="ec_modal_footer_left"></div>
            <div class="ec_modal_footer_right">
                <button class="menu_button ec_btn_cancel" id="ec_tpl_cancel">${t('Cancel')}</button>
                <button class="menu_button ec_btn_create" id="ec_tpl_create"><i class="fa-solid fa-plus"></i> ${t('Create')}</button>
            </div>
        </div>
    </div>
</div>`);

        jQuery('body').append(modal);

        modal.on('click', '.ec_tab_btn', function () {
            modal.find('.ec_tab_btn').removeClass('active');
            modal.find('.ec_tab_content').removeClass('active');
            jQuery(this).addClass('active');
            modal.find(`.ec_tab_content[data-tab="${this.dataset.tab}"]`).addClass('active');
        });

        modal.on('change', '#ec_tpl_tone', function () {
            const show = this.value === 'custom';
            modal.find('#ec_tpl_custom_tone').css('display', show ? 'block' : 'none');
        });

        modal.on('click', '#ec_tpl_clear', () => modal.find('#ec_tpl_prompt').val(''));

        modal.on('click', '#ec_tpl_create', function () {
            const name = modal.find('#ec_tpl_name').val().trim();
            if (!name) { toastr.error(t('Style name cannot be empty')); return; }

            const activeTab = modal.find('.ec_tab_btn.active').data('tab');
            let prompt = '';

            if (activeTab === 'advanced') {
                prompt = modal.find('#ec_tpl_prompt').val();
            } else {
                prompt = buildPromptFromEasyMode(modal);
            }

            const id = `custom_${Date.now()}`;
            if (!settings.customStyles) settings.customStyles = [];
            settings.customStyles.push({ id, name, prompt });
            if (!settings.styleOrder) settings.styleOrder = [...DEFAULT_STYLE_ORDER];
            settings.styleOrder.push(id);
            saveSettings();
            modal.remove();
            openStyleEditor();
        });

        modal.on('click', '#ec_tpl_close, #ec_tpl_cancel', () => modal.remove());
    }

    function buildPromptFromEasyMode(modal) {
        const tone = modal.find('#ec_tpl_tone').val();
        const toneLabels = {
            chaotic: 'chaotic, energetic, excitable',
            calm: 'calm, thoughtful, measured',
            sarcastic: 'sarcastic, witty, sardonic',
            wholesome: 'wholesome, supportive, positive',
            cynical: 'cynical, tired, world-weary',
            nsfw: 'explicit, adult, uninhibited',
            custom: modal.find('#ec_tpl_custom_tone_val').val() || 'neutral',
        };
        const toneDesc = toneLabels[tone] || tone;
        const length = modal.find('#ec_tpl_length').val();
        const lengthDesc = { short: '1-2 short sentences', medium: '2-3 sentences', long: 'a full paragraph' }[length] || '2-3 sentences';
        const elements = [];
        if (modal.find('#ec_tpl_emojis').is(':checked')) elements.push('use emojis naturally');
        if (modal.find('#ec_tpl_slang').is(':checked')) elements.push('use internet slang and abbreviations');
        if (modal.find('#ec_tpl_lowercase').is(':checked')) elements.push('prefer lowercase typing');
        if (modal.find('#ec_tpl_typos').is(':checked')) elements.push('include occasional intentional typos');
        if (modal.find('#ec_tpl_caps').is(':checked')) elements.push('use ALL CAPS for emphasis occasionally');
        if (modal.find('#ec_tpl_hashtags').is(':checked')) elements.push('add relevant hashtags');
        if (modal.find('#ec_tpl_formal').is(':checked')) elements.push('use formal grammar and punctuation');
        const elemDesc = elements.length ? `\n- ${elements.join('\n- ')}` : '';
        return `Generate {count} chat messages from different users reacting to the current scene.
Tone: ${toneDesc}
Message length: ${lengthDesc}
Style rules:${elemDesc || '\n- Natural conversational style'}

Format each message as:
Username: message text

Make each username unique and personality-consistent.`;
    }

    // ───────────────────────────────────────────────────────────
    // SETTINGS MODAL (Quick Settings)
    // ───────────────────────────────────────────────────────────
    function openSettingsModal() {
        const existingModal = document.getElementById('ec_settings_modal');
        if (existingModal) { existingModal.classList.toggle('ecm_visible'); return; }

        const allStyles = getOrderedStyles();
        const styleOpts = allStyles.map(s =>
            `<option value="${escapeAttr(s.val)}"${settings.style === s.val ? ' selected' : ''}>${escapeHtml(t(s.label))}</option>`
        ).join('');

        const posOpts = ['bottom','left','right','popout'].map(p =>
            `<label class="ecm_radio_row"><input type="radio" name="ecm_pos" value="${p}"${settings.position === p ? ' checked' : ''}> ${p === 'popout' ? '↗ ' + t('Pop Out') : t(p.charAt(0).toUpperCase()+p.slice(1))}</label>`
        ).join('');

        const modal = jQuery(`
<div id="ec_settings_modal">
    <div class="ecm_backdrop" id="ecm_backdrop"></div>
    <div class="ecm_card">
        <div class="ecm_header">
            <div class="ecm_header_title"><i class="fa-solid fa-gear"></i> ${t('EchoChamber Settings')}</div>
            <div class="ecm_close_btn" id="ecm_close"><i class="fa-solid fa-times"></i></div>
        </div>
        <div class="ecm_layout">
            <nav class="ecm_sidebar">
                <ul class="ecm_nav_list">
                    <li><button class="ecm_nav_item ecm_nav_active" data-tab="display"><i class="fa-solid fa-display"></i> ${t('Display')}</button></li>
                    <li><button class="ecm_nav_item" data-tab="content"><i class="fa-solid fa-sliders"></i> ${t('Content')}</button></li>
                    <li><button class="ecm_nav_item" data-tab="source"><i class="fa-solid fa-microchip"></i> ${t('Engine')}</button></li>
                    <li><button class="ecm_nav_item" data-tab="styles"><i class="fa-solid fa-palette"></i> ${t('Styles')}</button></li>
                </ul>
            </nav>
            <div class="ecm_content">
                <!-- Display -->
                <div class="ecm_section" data-tab-content="display">
                    <div class="ecm_acc_header" aria-expanded="true"><div class="ecm_acc_title"><i class="fa-solid fa-display"></i> ${t('Display')}</div><i class="fa-solid fa-chevron-down ecm_acc_chevron"></i></div>
                    <div class="ecm_acc_body">
                        <div class="ecm_row">
                            <span class="ecm_label">${t('Style')}</span>
                            <select class="ecm_select" id="ecm_style">${styleOpts}</select>
                        </div>
                        <div class="ecm_row">
                            <span class="ecm_label">${t('Position')}</span>
                            <div>${posOpts}</div>
                        </div>
                        <div class="ecm_row">
                            <span class="ecm_label">${t('User Count')}</span>
                            <select class="ecm_select" id="ecm_users" style="width:80px">
                                ${[1,2,3,4,5,6,7,8,9,10,12,15,20].map(n=>`<option value="${n}"${settings.userCount==n?' selected':''}>${n}</option>`).join('')}
                            </select>
                        </div>
                        <div class="ecm_row">
                            <span class="ecm_label">${t('Font Size')}</span>
                            <select class="ecm_select" id="ecm_font" style="width:80px">
                                ${[10,11,12,13,14,15,16,17,18,20,22,24].map(n=>`<option value="${n}"${settings.fontSize==n?' selected':''}>${n}</option>`).join('')}
                            </select>
                        </div>
                        <div class="ecm_row">
                            <span class="ecm_label">${t('Font Family')}</span>
                            <select class="ecm_select" id="ecm_fontfamily">
                                ${Object.entries(EC_FONTS).map(([k,f])=>`<option value="${k}"${settings.fontFamily===k?' selected':''}>${escapeHtml(t(f.label))}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <!-- Content -->
                <div class="ecm_section" data-tab-content="content">
                    <div class="ecm_acc_header" aria-expanded="true"><div class="ecm_acc_title"><i class="fa-solid fa-sliders"></i> ${t('Content')}</div><i class="fa-solid fa-chevron-down ecm_acc_chevron"></i></div>
                    <div class="ecm_acc_body">
                        <label class="ecm_toggle_row"><span class="ecm_label">${t('Auto-update On Messages')}</span><input type="checkbox" class="ecm_toggle" id="ecm_auto"${settings.autoUpdate?' checked':''}></label>
                        <label class="ecm_toggle_row"><span class="ecm_label">${t('Include Chat History')}</span><input type="checkbox" class="ecm_toggle" id="ecm_incl_user"${settings.includeUser?' checked':''}></label>
                        <div class="ecm_subrow" id="ecm_depth_row"${settings.includeUser?'':' style="display:none"'}>
                            <span class="ecm_label">${t('Context Depth')}</span>
                            <input type="number" class="ecm_input ecm_input_sm" id="ecm_depth" min="2" max="500" value="${settings.contextDepth}">
                        </div>
                        <label class="ecm_toggle_row"><span class="ecm_label">${t('Include Past Commentary')}</span><input type="checkbox" class="ecm_toggle" id="ecm_past_echo"${settings.includePastEcho?' checked':''}></label>
                    </div>
                </div>
                <!-- Engine -->
                <div class="ecm_section" data-tab-content="source">
                    <div class="ecm_acc_header" aria-expanded="true"><div class="ecm_acc_title"><i class="fa-solid fa-microchip"></i> ${t('Engine')}</div><i class="fa-solid fa-chevron-down ecm_acc_chevron"></i></div>
                    <div class="ecm_acc_body">
                        <div class="ecm_row">
                            <span class="ecm_label">${t('Source')}</span>
                            <select class="ecm_select" id="ecm_source">
                                <option value="default"${settings.source==='default'?' selected':''}>${t('Default (Main API)')}</option>
                                <option value="profile"${settings.source==='profile'?' selected':''}>${t('Connection Profile')}</option>
                                <option value="ollama"${settings.source==='ollama'?' selected':''}>${t('Ollama')}</option>
                                <option value="openai"${settings.source==='openai'?' selected':''}>${t('OpenAI Compatible')}</option>
                            </select>
                        </div>
                        <!-- Profile sub-panel (shown when source=profile) -->
                        <div id="ecm_profile_panel" class="ecm_subpanel"${settings.source==='profile'?'':' style="display:none"'}>
                            <div class="ecm_subpanel_title"><i class="fa-solid fa-shield-halved fa-fw"></i> ${t('Connection Profile')}</div>
                            <select class="ecm_select" id="ecm_profile_select" style="margin-top:6px">
                                <option value="">${t('-- Select Profile --')}</option>
                            </select>
                        </div>
                        <!-- Ollama sub-panel -->
                        <div id="ecm_ollama_panel" class="ecm_subpanel"${settings.source==='ollama'?'':' style="display:none"'}>
                            <div class="ecm_subpanel_title"><i class="fa-solid fa-server fa-fw"></i> Ollama</div>
                            <div class="ecm_row"><span class="ecm_label">URL</span>
                                <input type="text" class="ecm_input" id="ecm_ollama_url" value="${escapeAttr(settings.ollamaUrl)}" placeholder="http://localhost:11434">
                            </div>
                        </div>
                        <!-- OpenAI sub-panel -->
                        <div id="ecm_openai_panel" class="ecm_subpanel"${settings.source==='openai'?'':' style="display:none"'}>
                            <div class="ecm_subpanel_title"><i class="fa-solid fa-robot fa-fw"></i> ${t('OpenAI Compatible')}</div>
                            <div class="ecm_row"><span class="ecm_label">URL</span>
                                <input type="text" class="ecm_input" id="ecm_openai_url" value="${escapeAttr(settings.openaiUrl)}" placeholder="http://localhost:1234/v1">
                            </div>
                            <div class="ecm_row"><span class="ecm_label">API Key</span>
                                <input type="password" class="ecm_input" id="ecm_openai_key" value="${escapeAttr(settings.openaiKey)}" placeholder="Optional">
                            </div>
                            <div class="ecm_row"><span class="ecm_label">Model</span>
                                <input type="text" class="ecm_input" id="ecm_openai_model" value="${escapeAttr(settings.openaiModel)}" placeholder="local-model">
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Styles -->
                <div class="ecm_section" data-tab-content="styles">
                    <div class="ecm_acc_header" aria-expanded="true"><div class="ecm_acc_title"><i class="fa-solid fa-palette"></i> ${t('Styles')}</div><i class="fa-solid fa-chevron-down ecm_acc_chevron"></i></div>
                    <div class="ecm_acc_body">
                        <button class="menu_button" id="ecm_open_editor"><i class="fa-solid fa-palette fa-fw"></i> ${t('Manage')}</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="ecm_footer">
            <div class="ecm_footer_left">
                <button class="ecm_footer_btn ec_of_danger" id="ecm_clear_btn"><i class="fa-solid fa-trash"></i> ${t('Clear Chat & Cache')}</button>
            </div>
            <div class="ecm_footer_right">
                <button class="ecm_done_btn" id="ecm_done"><i class="fa-solid fa-check"></i> ${t('Done')}</button>
            </div>
        </div>
    </div>
</div>`);

        jQuery('body').append(modal);
        requestAnimationFrame(() => modal.addClass('ecm_visible'));

        // Populate profiles if needed
        if (settings.source === 'profile') {
            populateModalProfiles(modal);
        }

        // Sidebar nav
        modal.on('click', '.ecm_nav_item', function () {
            modal.find('.ecm_nav_item').removeClass('ecm_nav_active');
            jQuery(this).addClass('ecm_nav_active');
            const tab = this.dataset.tab;
            settings.activeTab = tab;
            const content = modal.find('.ecm_content')[0];
            const target = modal.find(`[data-tab-content="${tab}"]`)[0];
            if (target && content) content.scrollTop = target.offsetTop - 20;
        });

        // Bindings
        modal.on('change', '#ecm_style', function () { settings.style = this.value; saveSettings(); updatePanelIcons(); if (settings.enabled) generateDiscordChat(); });
        modal.on('change', '[name="ecm_pos"]', function () { settings.position = this.value; saveSettings(); removePanel(); renderPanel(); });
        modal.on('change', '#ecm_users', function () { settings.userCount = parseInt(this.value); saveSettings(); });
        modal.on('change', '#ecm_font', function () { settings.fontSize = parseInt(this.value); applyFontSize(settings.fontSize); saveSettings(); });
        modal.on('change', '#ecm_fontfamily', function () { settings.fontFamily = this.value; applyFontFamily(settings.fontFamily); saveSettings(); });
        modal.on('change', '#ecm_auto', function () { settings.autoUpdate = this.checked; saveSettings(); });
        modal.on('change', '#ecm_incl_user', function () { settings.includeUser = this.checked; modal.find('#ecm_depth_row').toggle(this.checked); saveSettings(); });
        modal.on('change', '#ecm_depth', function () { settings.contextDepth = parseInt(this.value); saveSettings(); });
        modal.on('change', '#ecm_past_echo', function () { settings.includePastEcho = this.checked; saveSettings(); });
        modal.on('change', '#ecm_override_tokens', function () { settings.overrideMaxTokens = this.checked; modal.find('#ecm_max_tokens_row').toggle(this.checked); saveSettings(); });
        modal.on('change', '#ecm_max_tokens', function () { settings.maxTokens = parseInt(this.value)||300; saveSettings(); });
        modal.on('change', '#ecm_source', function () {
            settings.source = this.value;
            saveSettings();
            // Show/hide sub-panels inside modal
            modal.find('#ecm_profile_panel').toggle(this.value === 'profile');
            modal.find('#ecm_ollama_panel').toggle(this.value === 'ollama');
            modal.find('#ecm_openai_panel').toggle(this.value === 'openai');
            if (this.value === 'profile') populateModalProfiles(modal);
            // Also sync inline settings.html panel
            updateSourceVisibility();
        });
        modal.on('change', '#ecm_profile_select', function () { settings.selectedPreset = this.value; saveSettings(); });
        modal.on('change', '#ecm_ollama_url', function () { settings.ollamaUrl = this.value; saveSettings(); });
        modal.on('change', '#ecm_openai_url', function () { settings.openaiUrl = this.value; saveSettings(); });
        modal.on('change', '#ecm_openai_key', function () { settings.openaiKey = this.value; saveSettings(); });
        modal.on('change', '#ecm_openai_model', function () { settings.openaiModel = this.value; saveSettings(); });
        modal.on('click', '#ecm_open_editor', () => { modal.remove(); openStyleEditor(); });
        modal.on('click', '#ecm_clear_btn', async function () {
            const ok = await showConfirmModal(t('Clear all generated chat messages and cached commentary?'));
            if (ok) { clearCachedCommentary(); setDiscordText(''); toastr.success(t('Chat and cache cleared')); }
        });
        modal.on('click', '#ecm_done, #ecm_close, #ecm_backdrop', function (e) {
            if (e.target.id === 'ecm_backdrop' || e.target.id === 'ecm_done' || e.target.id === 'ecm_close' || jQuery(e.target).closest('#ecm_close').length) {
                modal.remove();
            }
        });
    }

    /**
     * Populate the profile dropdown inside the settings modal.
     */
    async function populateModalProfiles(modal) {
        const select = modal.find('#ecm_profile_select')[0];
        if (!select) return;
        select.innerHTML = `<option value="">${t('-- Select Profile --')}</option>`;
        try {
            if (window.EchoLiteConnectionUtils) {
                const profiles = await window.EchoLiteConnectionUtils.getProfiles();
                if (profiles.length === 0) {
                    select.innerHTML = `<option value="">${t('No profiles found')}</option>`;
                    return;
                }
                profiles.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id || p.name;
                    opt.textContent = p.name;
                    if ((p.id || p.name) === settings.selectedPreset) opt.selected = true;
                    select.appendChild(opt);
                });
            } else {
                select.innerHTML = `<option value="">${t('No profiles found')}</option>`;
            }
        } catch {
            select.innerHTML = `<option value="">${t('Error loading profiles')}</option>`;
        }
    }

    // ───────────────────────────────────────────────────────────
    // STYLE IMPORT
    // ───────────────────────────────────────────────────────────
    async function handleStyleImport(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        try {
            const text = await file.text();
            const name = file.name.replace(/\.(md|txt)$/i, '');
            const id = `import_${Date.now()}`;
            if (!settings.customStyles) settings.customStyles = [];
            settings.customStyles.push({ id, name, prompt: text });
            if (!settings.styleOrder) settings.styleOrder = [...DEFAULT_STYLE_ORDER];
            settings.styleOrder.push(id);
            settings.style = id;
            saveSettings();
            updatePanelIcons();
            toastr.success(`${t('Imported style:')} ${name}`);
        } catch (err) {
            toastr.error('Import failed: ' + err.message);
        }
    }

    // ───────────────────────────────────────────────────────────
    // INITIALIZATION
    // ───────────────────────────────────────────────────────────
    /**
     * Dynamically inject connection_utils.js as a plain <script> tag.
     * Must run before any profile-related code. Safe to call multiple times.
     */
    function loadConnectionUtils() {
        return new Promise((resolve) => {
            if (window.EchoLiteConnectionUtils) { resolve(); return; }
            const existing = document.querySelector('script[data-echolite-utils]');
            if (existing) {
                // Already injected — wait for it
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', resolve, { once: true }); // resolve anyway
                return;
            }
            const script = document.createElement('script');
            script.src = `${BASE_URL}/connection_utils.js`;
            script.dataset.echoliteUtils = '1';
            script.onload  = () => { log('connection_utils.js loaded'); resolve(); };
            script.onerror = (e) => { warn('connection_utils.js failed to load:', e); resolve(); };
            document.head.appendChild(script);
        });
    }

    async function init() {
        log('Initializing...');

        // Guard: wait for SillyTavern global to be ready
        if (typeof SillyTavern === 'undefined' || !SillyTavern.getContext) {
            warn('SillyTavern not ready, retrying in 500ms...');
            setTimeout(init, 500);
            return;
        }

        // Load connection_utils.js before anything else
        await loadConnectionUtils();

        const ctx = SillyTavern.getContext();
        if (!ctx) { warn('SillyTavern context not available'); return; }

        loadSettings();

        // Load settings panel using the dynamically resolved MODULE_PATH
        try {
            if (ctx.renderExtensionTemplateAsync) {
                log('Loading settings template with MODULE_PATH:', MODULE_PATH);
                const settingsHtml = await ctx.renderExtensionTemplateAsync(MODULE_PATH, 'settings');
                jQuery('#extensions_settings').append(
                    `<div id="echolite_settings_container" class="extension_block">
                        <div class="inline-drawer">
                            <div class="inline-drawer-toggle inline-drawer-header">
                                <b>EchoLite</b>
                                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                            </div>
                            <div class="inline-drawer-content">${settingsHtml}</div>
                        </div>
                    </div>`
                );
                // Apply translations to newly inserted HTML
                applySettingsTranslations();
            }
        } catch (e) {
            warn('Failed to load settings panel:', e);
        }

        // Re-sync settings panel DOM now that the HTML has been injected
        loadSettings();

        // Always render the panel — visibility is controlled inside renderPanel()
        // (if disabled, it stays hidden; but the DOM node must exist so toggles work)
        renderPanel();

        currentChatId = ctx.chatId;

        // Restore cached commentary for the current chat, if any
        if (ctx.chatId) {
            restoreCachedCommentary();
        }

        // Start scroll-based post tracking
        setTimeout(initPostScrollObserver, 800);

        // Event listeners — guard against missing eventSource / eventTypes
        if (ctx.eventSource && ctx.eventTypes) {
        // Chat switch → restore cache only, never auto-generate
            ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, () => {
                onChatEvent();
            });
// ── GENERATION_STARTED: track dry-runs and self-triggered generations ──
        // Suppress the paired GENERATION_ENDED if this was:
        //   1. A dry-run (prompt-assembly / token-count pass, isDryRun=true)
        //   2. EchoLite's own internal call (generationInProgress=true when we call generateRaw/generateQuietPrompt)
        // Uses a counter instead of a boolean to correctly handle overlapping STARTED/ENDED pairs
        // (ST emits one dry-run pass + one real pass within a single user generation cycle).
        ctx.eventSource.on(ctx.eventTypes.GENERATION_STARTED, (_type, _opts, isDryRun) => {
            if ((isDryRun === true) || generationInProgress) {
                _suppressGenerationEndedCount++;
            }
        });

        // ── MESSAGE_RECEIVED: handle completed swipe responses ──────────────
        // ST fires MESSAGE_RECEIVED(chatId, type) AFTER writing the response into chat[].
        // When type === 'swipe', the swipe slot is guaranteed to be populated.
        // This is the only reliable trigger for pending swipes — it carries the exact msgId,
        // so we never fire on the wrong generation or on EchoLite's own internal calls.
        ctx.eventSource.on(ctx.eventTypes.MESSAGE_RECEIVED, (chatId, type) => {
            if (!settings.enabled || !settings.autoUpdate || settings.paused) return;

            // ── first_message: ST creates chat with char's opening post (#0) ──
            // GENERATION_ENDED never fires for this case, so we catch it here.
            if (type === 'first_message') {
                const msgIdStr = String(chatId);
                const ctx2 = SillyTavern.getContext();
                const msg = ctx2.chat?.[chatId];
                if (msg && !msg.is_user && !msg.is_system && !msg.is_hidden) {
                    const swipeIdx = typeof msg.swipe_id === 'number' ? msg.swipe_id : 0;
                    if (!getCachedPost(msgIdStr, swipeIdx)) {
                        log(`MESSAGE_RECEIVED first_message #${msgIdStr}: auto-generating commentary`);
                        generateDiscordChat(msgIdStr, swipeIdx, false);
                    }
                }
                return;
            }

            if (type !== 'swipe') return; // only care about swipe completions here

            const msgIdStr = String(chatId);

            // If there's a pending swipe for exactly this message, process it now
            if (pendingSwipeMsgId !== null && pendingSwipeMsgId === msgIdStr) {
                const swipeIdx = pendingSwipeIdx;
                pendingSwipeMsgId = null;
                pendingSwipeIdx = null;
                const cached = getCachedPost(msgIdStr, swipeIdx);
                if (!cached) {
                    log(`MESSAGE_RECEIVED swipe #${msgIdStr}[${swipeIdx}]: generating commentary`);
                    generateDiscordChat(msgIdStr, swipeIdx, false);
                }
                return;
            }

            // No pending swipe — check if this swipe has commentary already
            const ctx2 = SillyTavern.getContext();
            const msg = ctx2.chat?.[chatId];
            if (!msg || msg.is_user || msg.is_system || msg.is_hidden) return;
            const swipeIdx = typeof msg.swipe_id === 'number' ? msg.swipe_id : 0;
            const cached = getCachedPost(msgIdStr, swipeIdx);
            if (!cached) {
                log(`MESSAGE_RECEIVED swipe #${msgIdStr}[${swipeIdx}]: auto-generating commentary`);
                generateDiscordChat(msgIdStr, swipeIdx, false);
            }
        });

        // ── GENERATION_ENDED: auto-generate for NEW (non-swipe) AI messages ──
        // GENERATION_ENDED fires once the full response is committed.
        // We use it exclusively for normal (non-swipe) new messages.
        // Swipe completions are handled above via MESSAGE_RECEIVED.
        ctx.eventSource.on(ctx.eventTypes.GENERATION_ENDED, () => {
 if (_suppressGenerationEndedCount > 0) { _suppressGenerationEndedCount--; return; }
 if (!settings.autoUpdate || !settings.enabled || settings.paused) return;
 setTimeout(() => {
 if (!settings.enabled || !settings.autoUpdate || settings.paused) return;
 // If there's still a pending swipe here, it means MESSAGE_RECEIVED didn't fire
 // (e.g. non-swipe generation completed, pending swipe is stale) — clear it.
 if (pendingSwipeMsgId !== null) {
     log(`GENERATION_ENDED: clearing stale pending swipe #${pendingSwipeMsgId}[${pendingSwipeIdx}]`);
     pendingSwipeMsgId = null;
     pendingSwipeIdx = null;
 }
 const last = resolveLastAIPost();
 if (!last) return;
 const cached = getCachedPost(last.msgId, last.swipeIdx);
 if (cached) return;
 // Skip if this looks like a swipe (swipe_id > 0) — MESSAGE_RECEIVED should have handled it
 const ctx2 = SillyTavern.getContext();
 const msg = ctx2.chat?.[parseInt(last.msgId)];
 if (msg && typeof msg.swipe_id === 'number' && msg.swipe_id > 0) return;
 generateDiscordChat(last.msgId, last.swipeIdx, false);
 }, 300);
});

            // Swipe → restore cached commentary for the new swipe, or generate
            if (ctx.eventTypes.MESSAGE_SWIPED) {
                ctx.eventSource.on(ctx.eventTypes.MESSAGE_SWIPED, (msgId) => {
                    if (!settings.enabled || !settings.autoUpdate || settings.paused) return;
                    try {
                        const chat = SillyTavern.getContext().chat;
                        const msg  = chat?.[msgId];
                        if (!msg || msg.is_user || msg.is_system || msg.is_hidden) return;
                        const swipeIdx = typeof msg.swipe_id === 'number' ? msg.swipe_id : 0;
 // msg.mes holds the PREVIOUS swipe's text until ST commits
 // the new response — it must NOT be used as a readiness check.
 // msg.swipes[swipeIdx] is the true state of the target slot:
 //   • empty / "..." → new slot, ST is about to generate
 //   • real text     → existing slot (swipe back), safe to use
 const swipeContent = Array.isArray(msg.swipes)
     ? (msg.swipes[swipeIdx] || '').trim()
     : '';
 if (!swipeContent || swipeContent === '...' || swipeContent.length < 5) {
     // New empty slot — ST will generate the response.
     // Save as pending; MESSAGE_RECEIVED(type='swipe') will handle it
     // after ST commits the finished response into chat[].
     pendingSwipeMsgId = String(msgId);
     pendingSwipeIdx   = swipeIdx;
     log(`MESSAGE_SWIPED #${msgId}[${swipeIdx}]: new empty slot — deferring to MESSAGE_RECEIVED`);
     return;
 }
 // ─────────────────────────────────────────────────────────
 // In noSaveMode: existing slot = navigating to an old post — do NOT regenerate
 if (settings.noSaveMode) return;

 generateDiscordChat(String(msgId), swipeIdx, false);
                    } catch (e) { warn('MESSAGE_SWIPED handler error:', e); }
                });
            }

            ctx.eventSource.on(ctx.eventTypes.GENERATION_STOPPED, () => {
                setStatus('');
            });

            // ── MESSAGE_DELETED: reindex commentary cache ────────────────────
            // ST emits MESSAGE_DELETED(newLength) AFTER removing the message and
            // re-indexing chat[]. We detect the deleted index by comparing our
            // cached AI-message keys against the new chat[] (which is already
            // re-indexed). Any key that now points to a user/system message or
            // is out of range is the deletion point; all keys above it shift -1.
            if (ctx.eventTypes.MESSAGE_DELETED) {
                ctx.eventSource.on(ctx.eventTypes.MESSAGE_DELETED, (newLength) => {
                    try {
                        const store = getCommentaryStore();
                        if (!store || !store.posts) return;

                        const oldKeys = Object.keys(store.posts).map(Number).sort((a, b) => a - b);
                        if (!oldKeys.length) return;

                        const ctx2 = SillyTavern.getContext();
                        const chat = ctx2.chat || [];

                        let deletedIdx = null;
                        let shift = 0;
                        for (const k of oldKeys) {
                            const adjustedK = k - shift;
                            const msg = chat[adjustedK];
                            if (!msg || msg.is_user || msg.is_system) {
                                if (deletedIdx === null) deletedIdx = k;
                                shift++;
                            }
                        }
                        if (deletedIdx === null) deletedIdx = newLength;

                        const newPosts = {};
                        for (const [k, v] of Object.entries(store.posts)) {
                            const ki = parseInt(k);
                            if (ki === deletedIdx) continue;
                            const newKey = ki > deletedIdx ? ki - 1 : ki;
                            if (newKey < newLength) newPosts[String(newKey)] = v;
                        }
                        store.posts = newPosts;

                        if (store.current?.msgId !== null && store.current?.msgId !== undefined) {
                            const curIdx = parseInt(store.current.msgId);
                            if (curIdx === deletedIdx || curIdx >= newLength) {
                                const last = resolveLastAIPost();
                                store.current = last
                                    ? { msgId: last.msgId, swipeIdx: last.swipeIdx }
                                    : { msgId: null, swipeIdx: 0 };
                                currentPostId   = last?.msgId ?? null;
                                currentSwipeIdx = last?.swipeIdx ?? 0;
                            } else if (curIdx > deletedIdx) {
                                const newIdx = String(curIdx - 1);
                                store.current.msgId = newIdx;
                                currentPostId = newIdx;
                            }
                        }

                        if (ctx2.saveMetadata) ctx2.saveMetadata();
                        updatePostIndicator();
                        refreshPostScrollObserver();
                        log(`MESSAGE_DELETED: reindexed cache. deletedIdx=${deletedIdx}, newLength=${newLength}`);
                    } catch (e) { warn('MESSAGE_DELETED handler error:', e); }
                });
            }

            // Refresh scroll observer when new messages land in the chat DOM
            ctx.eventSource.on(ctx.eventTypes.MESSAGE_RECEIVED, refreshPostScrollObserver);
            ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED,     () => {
                setTimeout(initPostScrollObserver, 600); // wait for DOM to repopulate
            });

            // ── MESSAGE_UPDATED: handle hide/unhide ──────────────────────────
            // ST fires MESSAGE_UPDATED(msgId) when a message's metadata changes,
            // including when the user hides/unhides it via the eye-button.
            // If the currently displayed post gets hidden, switch to the next visible AI post.
            // If a hidden post is unhidden, refresh the scroll observer so it becomes trackable.
            if (ctx.eventTypes.MESSAGE_UPDATED) {
                ctx.eventSource.on(ctx.eventTypes.MESSAGE_UPDATED, (msgId) => {
                    const ctx2 = SillyTavern.getContext();
                    const msg  = ctx2.chat?.[parseInt(msgId)];
                    if (!msg || msg.is_user || msg.is_system) return;

                    if (msg.is_hidden) {
                        // The post was just hidden — if it's the currently shown one, find another
                        if (String(msgId) === String(currentPostId)) {
                            const last = resolveLastAIPost();
                            if (last) {
                                generateDiscordChat(last.msgId, last.swipeIdx, false);
                            } else {
                                setDiscordText('');
                                setCurrentPost(null, 0);
                            }
                        }
                    }
                    // Always re-sync the scroll observer (visibility may have changed)
                    refreshPostScrollObserver();
                });
            }
        } else {
            warn('eventSource or eventTypes not available — events will not fire');
        }

        // Compact mode check and ST input visibility on window resize
        window.addEventListener('resize', debounce(() => {
            checkCompactMode();
            updateSTInputVisibility();
        }, 200));

        log('Initialized.');
    }

    // Start
    jQuery(document).ready(() => init());

})();
