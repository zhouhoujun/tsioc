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

export function themeTokens(theme: ThemeName): ThemeTokens {
    return THEME_TOKENS[theme] ?? THEME_TOKENS.light;
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
    });
}
