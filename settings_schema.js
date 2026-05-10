// @ts-check

export const SETTINGS_FIELD_MAP = {
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
    discord_font_family: { prop: 'fontFamily', type: 'select' },
    discord_auto_update: { prop: 'autoUpdate', type: 'checkbox' },
    discord_override_max_tokens: { prop: 'overrideMaxTokens', type: 'checkbox' },
    discord_max_tokens: { prop: 'maxTokens', type: 'number' },
    discord_enable_jailbreak_block: { prop: 'enableJailbreakBlock', type: 'checkbox' },
    discord_jailbreak_role: { prop: 'jailbreakRole', type: 'select' },
    discord_jailbreak_text: { prop: 'jailbreakText', type: 'textarea' },
    discord_include_user: { prop: 'includeUser', type: 'checkbox' },
    discord_context_depth: { prop: 'contextDepth', type: 'number' },
    discord_include_past_echo: { prop: 'includePastEcho', type: 'checkbox' },
    discord_include_persona: { prop: 'includePersona', type: 'checkbox' },
    discord_include_character_description: { prop: 'includeCharacterDescription', type: 'checkbox' },
    discord_include_world_info: { prop: 'includeWorldInfo', type: 'checkbox' },
    discord_wi_budget: { prop: 'wiTokenBudget', type: 'number' },
    discord_prompt_custom_mode: { prop: 'promptCustomMode', type: 'checkbox' },
    discord_prompt_nicknames: { prop: 'promptNicknames', type: 'textarea' },
    discord_prompt_personas: { prop: 'promptPersonas', type: 'textarea' },
    discord_prompt_language: { prop: 'promptLanguage', type: 'textarea' },
    discord_no_save_mode: { prop: 'noSaveMode', type: 'checkbox' },
};

export function syncElementsFromSettings(settings, fieldMap = SETTINGS_FIELD_MAP, root = document) {
    for (const [id, cfg] of Object.entries(fieldMap)) {
        const el = root.getElementById ? root.getElementById(id) : document.getElementById(id);
        if (!el) continue;
        if (cfg.type === 'checkbox') el.checked = !!settings[cfg.prop];
        else el.value = settings[cfg.prop] ?? '';
    }
}
