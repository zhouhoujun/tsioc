type VoiceHandlers = typeof import('./AgentConsoleVoiceHandlers');

const VOICE_KEY = '__TSDI_VOICE__';
let cached: VoiceHandlers | undefined;

/** Console/TUI hosts install the statically imported module once (no browser chunk). */
export function installVoiceHandlers(handlers: VoiceHandlers): void {
    cached = handlers;
    (globalThis as Record<string, any>)[VOICE_KEY] = handlers;
}

/**
 * P4 lazy loading: the browser loads `/voice` from its own ESM chunk on first
 * use; TUI/tests pre-install the module so no network import is attempted.
 */
export async function loadVoiceHandlers(): Promise<VoiceHandlers> {
    if (cached) {
        return cached;
    }
    const injected = (globalThis as Record<string, any>)[VOICE_KEY] as VoiceHandlers | undefined;
    if (injected) {
        cached = injected;
        return injected;
    }
    const base = typeof document !== 'undefined' ? document.baseURI : undefined;
    if (!base) {
        throw new Error('Voice handlers are unavailable in this host; installVoiceHandlers() was not called.');
    }
    const specifier = new URL('./dist/chunks/agent-console-voice.js', base).href;
    const module = await import(/* @vite-ignore */ specifier);
    cached = module as VoiceHandlers;
    return cached;
}
