/**
 * EchoLite — Connection Utils
 * Provides access to ST Connection Profiles (connectionManager extension).
 * Exposes window.EchoLiteConnectionUtils for index.js (IIFE pattern for ST compatibility).
 */
(function () {
    'use strict';

    const LOG_PREFIX = '[EchoLite/connection_utils]';
    const log = (...args) => console.log(LOG_PREFIX, ...args);
    const warn = (...args) => console.warn(LOG_PREFIX, ...args);

    /**
     * Wait for connectionManager to be populated in extensionSettings.
     * ST loads extensions asynchronously, so connectionManager may not be
     * ready at the exact moment our extension initialises.
     */
    async function waitForConnectionManager(maxAttempts = 15, delayMs = 300) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const ctx = SillyTavern.getContext();
                if (ctx?.extensionSettings?.connectionManager?.profiles?.length > 0) {
                    return true;
                }
            } catch { /* context not ready yet */ }
            await new Promise(r => setTimeout(r, delayMs));
        }
        warn(`connectionManager not available after ${maxAttempts} attempts`);
        return false;
    }

    /**
     * Return the list of connection profiles.
     * @returns {Promise<Array<{id:string, name:string}>>}
     */
    async function getProfiles() {
        const available = await waitForConnectionManager();
        if (!available) return [];

        try {
            const ctx = SillyTavern.getContext();
            const profiles = ctx.extensionSettings?.connectionManager?.profiles || [];
            // Normalise: ensure every profile has id and name
            return profiles.map(p => ({
                id:   p.id   || p.name || String(Math.random()),
                name: p.name || p.id   || 'Unknown Profile',
            }));
        } catch (e) {
            warn('getProfiles error:', e);
            return [];
        }
    }

    /**
     * Get a single profile object by id or name.
     * @param {string} profileIdOrName
     * @returns {Promise<object|null>}
     */
    async function getProfileByName(profileIdOrName) {
        const profiles = await getProfiles();
        return profiles.find(p => p.id === profileIdOrName || p.name === profileIdOrName) || null;
    }

    /**
     * Generate text using a named/id connection profile.
     * Uses ConnectionManagerRequestService if available,
     * falls back to ST's generateQuietPrompt otherwise.
     *
     * @param {string} profileIdOrName
     * @param {string} systemPrompt
     * @param {string} userPrompt
     * @param {AbortSignal|null} signal
     * @param {number|undefined} maxTokens
     * @returns {Promise<string>}
     */
    async function generateWithProfile(profileIdOrName, systemPrompt, userPrompt, signal = null, maxTokens = undefined) {
        const ctx = SillyTavern.getContext();

        // ── Path 1: Use ConnectionManagerRequestService (preferred, ST ≥ 1.12) ──
        if (ctx.ConnectionManagerRequestService?.sendRequest) {
            let profile = null;

            if (profileIdOrName) {
                try {
                    const all = ctx.extensionSettings?.connectionManager?.profiles || [];
                    profile = all.find(p => p.id === profileIdOrName || p.name === profileIdOrName) || null;
                } catch { /* ignore */ }
            }

            if (profile) {
                try {
                    log(`Generating with profile "${profile.name}" (id: ${profile.id})`);
                    const messages = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user',   content: userPrompt },
                    ];
                    const response = await ctx.ConnectionManagerRequestService.sendRequest(
                        profile.id,
                        messages,
                        maxTokens || ctx.main?.max_length || 500,
                        {
                            stream:          false,
                            signal:          signal || null,
                            extractData:     true,
                            includePreset:   true,
                            includeInstruct: true,
                        }
                    );
                    const text = extractTextFromResponse(response);
                    if (text !== null) {
                        log('Profile generation OK, length:', text.length);
                        return text;
                    }
                    warn('Could not extract text from profile response:', response);
                } catch (e) {
                    if (e.name === 'AbortError' || signal?.aborted) throw e;
                    warn('ConnectionManagerRequestService failed, falling back:', e);
                }
            } else {
                warn(`Profile "${profileIdOrName}" not found — falling back to default API`);
            }
        }

        // ── Path 2: Fallback — ST default generateQuietPrompt ──
        log('Using default generateQuietPrompt as fallback');
        try {
            const combined = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
            const result = await ctx.generateQuietPrompt(combined, false, false, '', undefined, maxTokens);
            return result || '';
        } catch (e) {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            throw e;
        }
    }

    /**
     * Extract plain text from various API response shapes.
     */
    function extractTextFromResponse(resp) {
        if (!resp) return null;
        if (typeof resp === 'string') return resp;

        if (Array.isArray(resp)) {
            const texts = resp
                .filter(b => b?.type === 'text' && typeof b.text === 'string')
                .map(b => b.text);
            if (texts.length > 0) return texts.join('\n');
        }

        if (resp.content !== undefined && resp.content !== null) {
            if (typeof resp.content === 'string') return resp.content;
            if (Array.isArray(resp.content)) {
                const texts = resp.content
                    .filter(b => b?.type === 'text' && typeof b.text === 'string')
                    .map(b => b.text);
                if (texts.length > 0) return texts.join('\n');
            }
        }

        if (resp.choices?.[0]?.message?.content) {
            const c = resp.choices[0].message.content;
            if (typeof c === 'string') return c;
        }

        if (typeof resp.text    === 'string') return resp.text;
        if (typeof resp.message === 'string') return resp.message;
        if (typeof resp.message?.content === 'string') return resp.message.content;

        return null;
    }

    // ── Expose as global so index.js can call window.EchoLiteConnectionUtils ──
    window.EchoLiteConnectionUtils = {
        getProfiles,
        getProfileByName,
        generateWithProfile,
    };

    log('Loaded. window.EchoLiteConnectionUtils ready.');
})();
