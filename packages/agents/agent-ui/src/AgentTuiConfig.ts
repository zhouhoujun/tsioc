export interface AgentTuiConfig {
    /** Active theme name (see AgentConsoleThemeName). */
    theme?: string;
    /** Global key bindings: action name -> key chord (or null to reset). */
    keybinds?: Record<string, string | null>;
    /** Scroll speed multiplier for the message view. */
    scrollSpeed?: number;
    /** Whether mouse events are enabled (e.g. click-to-focus). */
    mouse?: boolean;
    /** Whether attention/notification sounds are enabled. */
    attentionSound?: boolean;
    /** Timeout in ms for leader-key chord sequences. */
    leaderTimeout?: number;
}

export interface AgentTuiResolvedConfig {
    theme: string;
    keybinds: Record<string, string | null>;
    scrollSpeed: number;
    mouse: boolean;
    attentionSound: boolean;
    leaderTimeout: number;
}

export const defaultAgentTuiConfig: AgentTuiResolvedConfig = {
    theme: 'dark',
    keybinds: {},
    scrollSpeed: 1,
    mouse: false,
    attentionSound: false,
    leaderTimeout: 3000
};

function isKeybinds(value: unknown): value is Record<string, string | null> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAgentTuiConfig(input?: Partial<AgentTuiConfig>): AgentTuiResolvedConfig {
    const source = input && typeof input === 'object' ? input : {};
    const theme = typeof source.theme === 'string' && source.theme.trim() ? source.theme.trim() : defaultAgentTuiConfig.theme;
    const keybinds = isKeybinds(source.keybinds) ? { ...source.keybinds } : defaultAgentTuiConfig.keybinds;
    const scrollSpeed = typeof source.scrollSpeed === 'number' && source.scrollSpeed > 0
        ? source.scrollSpeed
        : defaultAgentTuiConfig.scrollSpeed;
    const mouse = typeof source.mouse === 'boolean' ? source.mouse : defaultAgentTuiConfig.mouse;
    const attentionSound = typeof source.attentionSound === 'boolean' ? source.attentionSound : defaultAgentTuiConfig.attentionSound;
    const leaderTimeout = typeof source.leaderTimeout === 'number' && source.leaderTimeout >= 0
        ? source.leaderTimeout
        : defaultAgentTuiConfig.leaderTimeout;
    return { theme, keybinds, scrollSpeed, mouse, attentionSound, leaderTimeout };
}

export function mergeAgentTuiConfig(...layers: Array<Partial<AgentTuiConfig> | undefined>): AgentTuiResolvedConfig {
    const merged: Partial<AgentTuiConfig> = {};
    layers.forEach(layer => {
        if (!layer || typeof layer !== 'object') {
            return;
        }
        if (typeof layer.theme === 'string' && layer.theme.trim()) {
            merged.theme = layer.theme.trim();
        }
        if (isKeybinds(layer.keybinds)) {
            merged.keybinds = { ...(merged.keybinds || {}), ...layer.keybinds };
        }
        if (typeof layer.scrollSpeed === 'number') {
            merged.scrollSpeed = layer.scrollSpeed;
        }
        if (typeof layer.mouse === 'boolean') {
            merged.mouse = layer.mouse;
        }
        if (typeof layer.attentionSound === 'boolean') {
            merged.attentionSound = layer.attentionSound;
        }
        if (typeof layer.leaderTimeout === 'number') {
            merged.leaderTimeout = layer.leaderTimeout;
        }
    });
    return normalizeAgentTuiConfig(merged);
}
