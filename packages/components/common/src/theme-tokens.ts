import type { ThemeName } from './theme';

/** Semantic colors shared by the built-in skins; hosts may override via CSS. */
export interface ThemeTokens {
    bg: string;
    fg: string;
    mutedFg: string;
    panelBg: string;
    inputBg: string;
    border: string;
    accent: string;
    accentFg: string;
    danger: string;
    success: string;
    warning: string;
    selectedBg: string;
    overlayBg: string;
}

export const THEME_TOKENS: Record<string, ThemeTokens> = {
    light: {
        bg: '#ffffff',
        fg: '#1f2328',
        mutedFg: '#57606a',
        panelBg: '#f6f8fa',
        inputBg: '#ffffff',
        border: '#d0d7de',
        accent: '#0969da',
        accentFg: '#ffffff',
        danger: '#cf222e',
        success: '#1a7f37',
        warning: '#9a6700',
        selectedBg: '#ddf4ff',
        overlayBg: '#ffffff'
    },
    dark: {
        bg: '#0d1117',
        fg: '#e6edf3',
        mutedFg: '#9da7b3',
        panelBg: '#161b22',
        inputBg: '#0d1117',
        border: '#30363d',
        accent: '#4493f8',
        accentFg: '#0d1117',
        danger: '#ff7b72',
        success: '#3fb950',
        warning: '#d29922',
        selectedBg: '#1f3a5f',
        overlayBg: '#161b22'
    },
    solarized: {
        bg: '#fdf6e3',
        fg: '#586e75',
        mutedFg: '#657b83',
        panelBg: '#eee8d5',
        inputBg: '#fdf6e3',
        border: '#93a1a1',
        accent: '#1f6f9f',
        accentFg: '#ffffff',
        danger: '#dc322f',
        success: '#859900',
        warning: '#b58900',
        selectedBg: '#e4ddc8',
        overlayBg: '#eee8d5'
    },
    'high-contrast': {
        bg: '#000000',
        fg: '#ffffff',
        mutedFg: '#e0e0e0',
        panelBg: '#111111',
        inputBg: '#000000',
        border: '#ffffff',
        accent: '#ffff00',
        accentFg: '#000000',
        danger: '#ff5555',
        success: '#55ff55',
        warning: '#ffcc00',
        selectedBg: '#333333',
        overlayBg: '#111111'
    }
};

/** Resolve a theme, allowing hosts to override individual semantic tokens. */
export function resolveThemeTokens(theme: ThemeName, overrides: Partial<ThemeTokens> = {}): ThemeTokens {
    const tokens = { ...(THEME_TOKENS[theme] ?? THEME_TOKENS.light), ...(overrides || {}) };
    return {
        ...tokens,
        fg: ensureContrast(tokens.fg, tokens.bg, 4.5),
        mutedFg: ensureContrast(tokens.mutedFg, tokens.bg, 3),
        accentFg: ensureContrast(tokens.accentFg, tokens.accent, 4.5),
        danger: ensureContrast(tokens.danger, tokens.bg, 3),
        success: ensureContrast(tokens.success, tokens.bg, 3),
        warning: ensureContrast(tokens.warning, tokens.bg, 3)
    };
}

export function themeTokens(theme: ThemeName): ThemeTokens {
    return resolveThemeTokens(theme);
}

/** Theme token fields projected onto the stable `--ui-*` widget variables. */
export const UI_THEME_VARIABLES: Record<keyof ThemeTokens, string[]> = {
    bg: ['--ui-bg'],
    fg: ['--ui-card-fg', '--ui-button-fg', '--ui-alert-fg', '--ui-badge-fg', '--ui-current-fg'],
    mutedFg: ['--ui-muted-fg', '--ui-empty-title-fg', '--ui-skeleton-fg'],
    panelBg: ['--ui-card-bg', '--ui-button-bg', '--ui-kbd-bg', '--ui-data-table-head-bg'],
    inputBg: ['--ui-field-bg', '--ui-select-bg', '--ui-data-table-fixed-bg'],
    border: ['--ui-border', '--ui-badge-border', '--ui-tone-border'],
    accent: ['--ui-link-fg', '--ui-focus-ring', '--ui-tone-fg'],
    accentFg: [],
    danger: ['--ui-danger-fg'],
    success: ['--ui-success-fg'],
    warning: ['--ui-warning-fg'],
    selectedBg: ['--ui-selected-bg', '--ui-hover-bg', '--ui-stripe-bg'],
    overlayBg: ['--ui-alert-bg']
};


export interface ThemeAnchors {
    bg: string;
    fg: string;
    accent: string;
    danger?: string;
    success?: string;
    warning?: string;
}

/** Build a complete token set from a few brand anchors; contrast is enforced. */
export function generateThemeTokens(anchors: ThemeAnchors): ThemeTokens {
    const bg = String(anchors.bg);
    const fg = ensureContrast(String(anchors.fg), bg, 4.5);
    const accent = String(anchors.accent);
    const accentFg = contrastRatio('#ffffff', accent) >= contrastRatio('#000000', accent) ? '#ffffff' : '#000000';
    const panelBg = mixHex(bg, fg, 0.04);
    const danger = ensureContrast(String(anchors.danger ?? (contrastRatio('#ffffff', bg) > 4.5 ? '#cf222e' : '#ff7b72')), bg, 3);
    const success = ensureContrast(String(anchors.success ?? (contrastRatio('#ffffff', bg) > 4.5 ? '#1a7f37' : '#3fb950')), bg, 3);
    const warning = ensureContrast(String(anchors.warning ?? (contrastRatio('#ffffff', bg) > 4.5 ? '#9a6700' : '#d29922')), bg, 3);
    return {
        bg,
        fg,
        mutedFg: ensureContrast(mixHex(fg, bg, 0.35), bg, 3),
        panelBg,
        inputBg: bg,
        border: mixHex(bg, fg, 0.18),
        accent,
        accentFg: ensureContrast(accentFg, accent, 4.5),
        danger,
        success,
        warning,
        selectedBg: mixHex(bg, accent, 0.16),
        overlayBg: panelBg
    };
}

export type Rgb = [number, number, number];

/** Parse `#rgb` / `#rrggbb`; returns null for values the skins do not use. */
export function parseHexColor(value: string): Rgb | null {
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value ?? '').trim());
    if (!match) {
        return null;
    }
    const hex = match[1].length === 3
        ? match[1].split('').map(part => part + part).join('')
        : match[1];
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
    ];
}

/** WCAG relative luminance. */
export function relativeLuminance(color: Rgb): number {
    const [r, g, b] = color.map(channel => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function channelHex(value: number): string {
    return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

function mixHex(foreground: string, background: string, amount: number): string {
    const fg = parseHexColor(foreground);
    const bg = parseHexColor(background);
    if (!fg || !bg) {
        return foreground;
    }
    const t = Math.max(0, Math.min(1, amount));
    return `#${channelHex(fg[0] * (1 - t) + bg[0] * t)}${channelHex(fg[1] * (1 - t) + bg[1] * t)}${channelHex(fg[2] * (1 - t) + bg[2] * t)}`;
}

/**
 * Push a foreground toward black/white until it meets the target contrast.
 * Returns the original color when it already passes or cannot be parsed.
 */
export function ensureContrast(foreground: string, background: string, target = 4.5): string {
    const bg = parseHexColor(background);
    if (!bg || !parseHexColor(foreground) || contrastRatio(foreground, background) >= target) {
        return foreground;
    }
    const towards = relativeLuminance(bg) > 0.5 ? '#000000' : '#ffffff';
    for (let step = 1; step <= 20; step++) {
        const candidate = mixHex(foreground, towards, step / 20);
        if (contrastRatio(candidate, background) >= target) {
            return candidate;
        }
    }
    return towards;
}

/** WCAG contrast ratio; returns 1 for unparseable input. */
export function contrastRatio(foreground: string, background: string): number {
    const fg = parseHexColor(foreground);
    const bg = parseHexColor(background);
    if (!fg || !bg) {
        return 1;
    }
    const first = relativeLuminance(fg);
    const second = relativeLuminance(bg);
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
}

/** Mirror a token set to CSS variables; opt-in so hosts keep their own skin. */
export function applyThemeTokens(doc: Document | null | undefined, theme: ThemeName): void {
    if (!doc) {
        return;
    }
    const root = doc.documentElement || (doc as any).body;
    if (!root || typeof root.style?.setProperty !== 'function') {
        return;
    }
    const tokens = themeTokens(theme);
    Object.entries(tokens).forEach(([name, value]) => {
        root.style.setProperty(`--ui-${name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`, value);
        (UI_THEME_VARIABLES[name as keyof ThemeTokens] || []).forEach(variable => {
            root.style.setProperty(variable, value);
        });
    });
}
