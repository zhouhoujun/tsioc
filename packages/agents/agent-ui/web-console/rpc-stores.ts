import {
    AgentConsoleSettingsData,
    isAgentConsoleThemeName,
    normalizeAgentConsoleStatusline,
    normalizeAgentConsoleTitle,
    sanitizeAgentConsoleSettings
} from '@tsdi/agent-ui';

/**
 * RPC-backed console stores: the browser is a client of `serve`, so theme,
 * statusline, title, keymap and raw-mode files live in the gateway's workspace
 * (`.tsdi-agent/*.json`), not in browser storage. Kept separate from the mount
 * entry so the browser glue stays within the source-size budget.
 */

const CONSOLE_SECURITY_LEVELS = ['read-only', 'ask', 'auto', 'full'];

/**
 * RPC-backed console stores: the browser is a client of `serve`, so theme,
 * statusline, title, keymap and raw-mode files live in the gateway's workspace
 * (`.tsdi-agent/*.json`), not in browser storage.
 */
export function createRpcConsoleStores(rpc: { request(method: string, params?: any, context?: any): Promise<any> }): {
    theme: { load(workspace: string): Promise<string | undefined>; save(workspace: string, theme: string): Promise<void> };
    statusline: { load(workspace: string): Promise<string[] | undefined>; save(workspace: string, fields: string[]): Promise<void> };
    title: { load(workspace: string): Promise<string[] | undefined>; save(workspace: string, fields: string[]): Promise<void> };
    rawMode: { load(workspace: string): Promise<boolean>; save(workspace: string, enabled: boolean): Promise<void> };
    keymap: {
        load(workspace: string): Promise<Record<string, string | null>>;
        loadContexts(workspace: string): Promise<Record<string, Record<string, string | null>>>;
        save(workspace: string, bindings: Record<string, string | null>, contexts?: Record<string, Record<string, string | null>>): Promise<void>;
    };
} {
    const read = async (name: string): Promise<any> => rpc.request('settings.store.get', { name }).catch(() => null);
    const write = async (name: string, data: any): Promise<void> => { await rpc.request('settings.store.set', { name, data }).catch(() => undefined); };
    return {
        theme: {
            async load(): Promise<string | undefined> {
                const data = await read('theme.json');
                return isAgentConsoleThemeName(String(data?.theme || '')) ? data.theme : undefined;
            },
            async save(_workspace: string, theme: string): Promise<void> {
                await write('theme.json', { version: 1, theme });
            }
        },
        statusline: {
            async load(): Promise<string[] | undefined> {
                return normalizeAgentConsoleStatusline((await read('statusline.json'))?.statusline);
            },
            async save(_workspace: string, fields: string[]): Promise<void> {
                await write('statusline.json', { version: 1, statusline: fields });
            }
        },
        title: {
            async load(): Promise<string[] | undefined> {
                return normalizeAgentConsoleTitle((await read('title.json'))?.title);
            },
            async save(_workspace: string, fields: string[]): Promise<void> {
                await write('title.json', { version: 1, title: fields });
            }
        },
        rawMode: {
            async load(): Promise<boolean> {
                return (await read('raw-mode.json'))?.rawMode === true;
            },
            async save(_workspace: string, enabled: boolean): Promise<void> {
                await write('raw-mode.json', { version: 1, rawMode: enabled });
            }
        },
        keymap: {
            async load(): Promise<Record<string, string | null>> {
                const data = await read('keymap.json');
                return data?.bindings && typeof data.bindings === 'object' ? data.bindings : {};
            },
            async loadContexts(): Promise<Record<string, Record<string, string | null>>> {
                const data = await read('keymap.json');
                return data?.contexts && typeof data.contexts === 'object' ? data.contexts : {};
            },
            async save(_workspace: string, bindings: Record<string, string | null>, contexts?: Record<string, Record<string, string | null>>): Promise<void> {
                await write('keymap.json', { version: 2, bindings, contexts: contexts || {} });
            }
        }
    };
}

/**
 * Browser settings store: persist the console preferences the gateway owns
 * (personality, memory injection, security level, yolo) through `settings.ui.*`
 * so `/permissions` and `/personality` survive a reload and are applied to
 * turns in the gateway process.
 */
export function createRpcConsoleSettingsStore(rpc: { request(method: string, params?: any, context?: any): Promise<any> }): {
    load(workspace: string): Promise<AgentConsoleSettingsData>;
    save(workspace: string, data: AgentConsoleSettingsData): Promise<void>;
} {
    let lastLoaded: AgentConsoleSettingsData | null = null;
    const readFile = async (): Promise<Record<string, any> | null> => {
        const data = await rpc.request('settings.store.get', { name: 'settings.json' }).catch(() => null);
        return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, any> : null;
    };
    return {
        async load(): Promise<AgentConsoleSettingsData> {
            const [file, result] = await Promise.all([
                readFile(),
                rpc.request('settings.ui.get', {}).catch(() => null)
            ]);
            const stored = sanitizeAgentConsoleSettings(file || {});
            // The transcript layout is a terminal concern; keep the browser DOM layout.
            delete stored.messageLayout;
            const data: AgentConsoleSettingsData = {
                ...stored,
                personality: (typeof result?.personality === 'string' && result.personality.trim() ? result.personality.trim() : undefined) || stored.personality,
                memoryInjection: typeof result?.memoryInjection === 'boolean' ? result.memoryInjection : stored.memoryInjection,
                securityLevel: (CONSOLE_SECURITY_LEVELS.includes(String(result?.securityLevel)) ? result.securityLevel : undefined) || stored.securityLevel,
                yoloMode: typeof result?.yoloMode === 'boolean' ? result.yoloMode : stored.yoloMode
            };
            lastLoaded = data;
            return data;
        },
        async save(_workspace: string, data: AgentConsoleSettingsData): Promise<void> {
            const patch: Record<string, any> = {};
            if (typeof data.personality === 'string' && data.personality) {
                patch.personality = data.personality;
            } else if (lastLoaded?.personality) {
                // Only clear a preset we actually loaded; a failed read must not wipe it.
                patch.personality = null;
            }
            if (typeof data.memoryInjection === 'boolean') {
                patch.memoryInjection = data.memoryInjection;
            }
            if (data.securityLevel) {
                patch.securityLevel = data.securityLevel;
            }
            if (typeof data.yoloMode === 'boolean') {
                patch.yoloMode = data.yoloMode;
            }
            if (Array.isArray(data.approvalAllowRules)) {
                patch.approvalAllowRules = data.approvalAllowRules;
            }
            // Share the rest of the workspace console settings with the gateway
            // (language, display, timeline, filters); preserve the terminal layout.
            const file = await readFile();
            const next: Record<string, any> = { ...(file || {}), ...data };
            if (file && 'messageLayout' in file) {
                next.messageLayout = file.messageLayout;
            } else {
                delete next.messageLayout;
            }
            await rpc.request('settings.store.set', { name: 'settings.json', data: next }).catch(() => undefined);
            await rpc.request('settings.ui.set', patch).catch(() => undefined);
        }
    };
}
