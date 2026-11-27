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
    const panelBg = mixOklch(bg, fg, 0.04);
    const danger = ensureContrast(String(anchors.danger ?? (contrastRatio('#ffffff', bg) > 4.5 ? '#cf222e' : '#ff7b72')), bg, 3);
    const success = ensureContrast(String(anchors.success ?? (contrastRatio('#ffffff', bg) > 4.5 ? '#1a7f37' : '#3fb950')), bg, 3);
    const warning = ensureContrast(String(anchors.warning ?? (contrastRatio('#ffffff', bg) > 4.5 ? '#9a6700' : '#d29922')), bg, 3);
    return {
        bg,
        fg,
        mutedFg: ensureContrast(mixOklch(fg, bg, 0.35), bg, 3),
        panelBg,
        inputBg: bg,
        border: mixOklch(bg, fg, 0.18),
        accent,
        accentFg: ensureContrast(accentFg, accent, 4.5),
        danger,
        success,
        warning,
        selectedBg: mixOklch(bg, accent, 0.16),
        overlayBg: panelBg
    };
}


export interface OklchColor {
    l: number;
    c: number;
    h: number;
}

function srgbToLinear(value: number): number {
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function linearToSrgb(value: number): number {
    return value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

/** sRGB hex -> OKLCH (perceptually uniform lightness/chroma/hue). */
export function hexToOklch(hex: string): OklchColor | null {
    const rgb = parseHexColor(hex);
    if (!rgb) {
        return null;
    }
    const [r, g, b] = rgb.map(channel => srgbToLinear(channel / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    const c = Math.sqrt(a * a + bb * bb);
    let h = Math.atan2(bb, a) * (180 / Math.PI);
    if (h < 0) h += 360;
    return { l: L, c, h };
}

export function oklchToHex(color: OklchColor): string {
    const l = color.l + 0.3963377774 * color.c * Math.cos(color.h * Math.PI / 180) + 0.2158037573 * color.c * Math.sin(color.h * Math.PI / 180);
    const m = color.l - 0.1055613458 * color.c * Math.cos(color.h * Math.PI / 180) - 0.0638541728 * color.c * Math.sin(color.h * Math.PI / 180);
    const s = color.l - 0.0894841775 * color.c * Math.cos(color.h * Math.PI / 180) - 1.291485548 * color.c * Math.sin(color.h * Math.PI / 180);
    const l3 = l * l * l;
    const m3 = m * m * m;
    const s3 = s * s * s;
    const r = linearToSrgb(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3) * 255;
    const g = linearToSrgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3) * 255;
    const b = linearToSrgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3) * 255;
    return `#${[r, g, b].map(channel => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')).join('')}`;
}

/** Mix two colors in OKLCH so the midpoint stays perceptually balanced. */
export function mixOklch(from: string, to: string, amount: number): string {
    const a = hexToOklch(from);
    const b = hexToOklch(to);
    if (!a || !b) {
        return mixHex(from, to, amount);
    }
    const t = Math.max(0, Math.min(1, amount));
    let delta = b.h - a.h;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return oklchToHex({
        l: a.l + (b.l - a.l) * t,
        c: a.c + (b.c - a.c) * t,
        h: (a.h + delta * t + 360) % 360
    });
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
