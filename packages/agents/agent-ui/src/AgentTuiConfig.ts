export type AgentTuiDiffStyle = 'auto' | 'stacked';

export type AgentTuiCursorStyle = 'block' | 'line' | 'underline';

export interface AgentTuiCursorConfig {
    /** Cursor shape for the input line. */
    style?: AgentTuiCursorStyle;
    /** Whether the cursor blinks. */
    blinking?: boolean;
}

export interface AgentTuiAttentionConfig {
    /** Whether desktop notifications are shown (only while the terminal is unfocused). */
    notifications?: boolean;
    /** Built-in sound pack name. */
    soundPack?: string;
    /** Notification volume in the range 0..1. */
    volume?: number;
    /** Custom sound file paths keyed by event name (e.g. message, approval, error). */
    sounds?: Record<string, string>;
}

export interface AgentTuiConfig {
    /** Active theme name (see AgentConsoleThemeName). */
    theme?: string;
    /** Global key bindings: action name -> key chord (or null to reset). */
    keybinds?: Record<string, string | null>;
    /** Scroll speed multiplier for the message view. */
    scrollSpeed?: number;
    /** Whether attention/notification sounds are enabled. */
    attentionSound?: boolean;
    /** Timeout in ms for leader-key chord sequences. */
    leaderTimeout?: number;
    /** Diff rendering style: 'auto' (choose by size) or 'stacked'. */
    diffStyle?: AgentTuiDiffStyle;
    /** Cursor appearance for the input line. */
    cursor?: AgentTuiCursorConfig;
    /** Whether macOS inertial scrolling acceleration is enabled in the message view. */
    scrollAcceleration?: boolean;
    /** Attention/notification behavior extension. */
    attention?: AgentTuiAttentionConfig;
    /**
     * P139: whether the terminal window title is kept in sync with the
     * console state (default true). Set to false to stop emitting OSC
     * title sequences / document.title updates entirely.
     */
    terminalTitle?: boolean;
    /**
     * P131: whether the message area renders raw plain text instead of
     * markdown-reflowed lines (default false). Enabled it keeps long tool
     * output un-truncated and unstyled so it can be selected/copied from
     * the terminal. Toggled at runtime with `/raw`.
     */
    rawMode?: boolean;
}

export interface AgentTuiResolvedConfig {
    theme: string;
    keybinds: Record<string, string | null>;
    scrollSpeed: number;
    attentionSound: boolean;
    leaderTimeout: number;
    diffStyle: AgentTuiDiffStyle;
    cursor: Required<AgentTuiCursorConfig>;
    scrollAcceleration: boolean;
    attention: Required<AgentTuiAttentionConfig>;
    terminalTitle: boolean;
    rawMode: boolean;
}

export const defaultAgentTuiConfig: AgentTuiResolvedConfig = {
    theme: 'dark',
    keybinds: {},
    scrollSpeed: 1,
    attentionSound: false,
    leaderTimeout: 3000,
    diffStyle: 'auto',
    cursor: { style: 'line', blinking: true },
    scrollAcceleration: false,
    attention: { notifications: false, soundPack: 'default', volume: 0.5, sounds: {} },
    terminalTitle: true,
    rawMode: false
};

function isKeybinds(value: unknown): value is Record<string, string | null> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isDiffStyle(value: unknown): value is AgentTuiDiffStyle {
    return value === 'auto' || value === 'stacked';
}

function isCursorConfig(value: unknown): value is AgentTuiCursorConfig {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isCursorStyle(value: unknown): value is AgentTuiCursorStyle {
    return value === 'block' || value === 'line' || value === 'underline';
}

function isAttentionConfig(value: unknown): value is AgentTuiAttentionConfig {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAgentTuiConfig(input?: Partial<AgentTuiConfig>): AgentTuiResolvedConfig {
    const source = input && typeof input === 'object' ? input : {};
    const theme = typeof source.theme === 'string' && source.theme.trim() ? source.theme.trim() : defaultAgentTuiConfig.theme;
    const keybinds = isKeybinds(source.keybinds) ? { ...source.keybinds } : defaultAgentTuiConfig.keybinds;
    const scrollSpeed = typeof source.scrollSpeed === 'number' && source.scrollSpeed > 0
        ? source.scrollSpeed
        : defaultAgentTuiConfig.scrollSpeed;
    const attentionSound = typeof source.attentionSound === 'boolean' ? source.attentionSound : defaultAgentTuiConfig.attentionSound;
    const leaderTimeout = typeof source.leaderTimeout === 'number' && source.leaderTimeout >= 0
        ? source.leaderTimeout
        : defaultAgentTuiConfig.leaderTimeout;
    const diffStyle = isDiffStyle(source.diffStyle) ? source.diffStyle : defaultAgentTuiConfig.diffStyle;
    const cursorSource = isCursorConfig(source.cursor) ? source.cursor : {};
    const cursor: Required<AgentTuiCursorConfig> = {
        style: isCursorStyle(cursorSource.style) ? cursorSource.style : defaultAgentTuiConfig.cursor.style,
        blinking: typeof cursorSource.blinking === 'boolean' ? cursorSource.blinking : defaultAgentTuiConfig.cursor.blinking
    };
    const scrollAcceleration = typeof source.scrollAcceleration === 'boolean'
        ? source.scrollAcceleration
        : defaultAgentTuiConfig.scrollAcceleration;
    const attentionSource = isAttentionConfig(source.attention) ? source.attention : {};
    const attention: Required<AgentTuiAttentionConfig> = {
        notifications: typeof attentionSource.notifications === 'boolean'
            ? attentionSource.notifications
            : defaultAgentTuiConfig.attention.notifications,
        soundPack: typeof attentionSource.soundPack === 'string' && attentionSource.soundPack.trim()
            ? attentionSource.soundPack.trim()
            : defaultAgentTuiConfig.attention.soundPack,
        volume: typeof attentionSource.volume === 'number' && attentionSource.volume >= 0 && attentionSource.volume <= 1
            ? attentionSource.volume
            : defaultAgentTuiConfig.attention.volume,
        sounds: isStringRecord(attentionSource.sounds) ? { ...attentionSource.sounds } : defaultAgentTuiConfig.attention.sounds
    };
    const terminalTitle = typeof source.terminalTitle === 'boolean'
        ? source.terminalTitle
        : defaultAgentTuiConfig.terminalTitle;
    const rawMode = typeof source.rawMode === 'boolean'
        ? source.rawMode
        : defaultAgentTuiConfig.rawMode;
    return { theme, keybinds, scrollSpeed, attentionSound, leaderTimeout, diffStyle, cursor, scrollAcceleration, attention, terminalTitle, rawMode };
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
        if (typeof layer.attentionSound === 'boolean') {
            merged.attentionSound = layer.attentionSound;
        }
        if (typeof layer.leaderTimeout === 'number') {
            merged.leaderTimeout = layer.leaderTimeout;
        }
        if (isDiffStyle(layer.diffStyle)) {
            merged.diffStyle = layer.diffStyle;
        }
        if (isCursorConfig(layer.cursor)) {
            merged.cursor = { ...(merged.cursor && isCursorConfig(merged.cursor) ? merged.cursor : {}), ...layer.cursor };
        }
        if (typeof layer.scrollAcceleration === 'boolean') {
            merged.scrollAcceleration = layer.scrollAcceleration;
        }
        if (isAttentionConfig(layer.attention)) {
            merged.attention = { ...(merged.attention && isAttentionConfig(merged.attention) ? merged.attention : {}), ...layer.attention };
        }
        if (typeof layer.terminalTitle === 'boolean') {
            merged.terminalTitle = layer.terminalTitle;
        }
        if (typeof layer.rawMode === 'boolean') {
            merged.rawMode = layer.rawMode;
        }
    });
    return normalizeAgentTuiConfig(merged);
}
