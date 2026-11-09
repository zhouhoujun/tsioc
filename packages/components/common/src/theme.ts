import { Injectable } from '@tsdi/ioc';

export type ThemeName = 'light' | 'dark' | 'solarized' | 'high-contrast' | string;

export const BUILT_IN_THEMES: ThemeName[] = ['light', 'dark', 'solarized', 'high-contrast'];

export type ThemeListener = (theme: ThemeName) => void;

export function isThemeName(value: any): value is ThemeName {
    return typeof value === 'string' && value.trim().length > 0;
}

export function isDarkTheme(theme: ThemeName): boolean {
    return theme === 'dark' || theme === 'solarized' || theme === 'high-contrast';
}

/**
 * Renderer-neutral theme store. Hosts subscribe or apply the current theme to
 * the document; renderers own the actual CSS variables.
 */
@Injectable()
export class ThemeService {
    protected theme: ThemeName = 'light';
    protected readonly listeners = new Set<ThemeListener>();

    get current(): ThemeName {
        return this.theme;
    }

    get available(): ThemeName[] {
        return BUILT_IN_THEMES.slice();
    }

    get isDark(): boolean {
        return isDarkTheme(this.theme);
    }

    setTheme(theme: ThemeName): void {
        const next = isThemeName(theme) ? theme : 'light';
        if (next === this.theme) {
            return;
        }
        this.theme = next;
        this.emit();
    }

    toggle(order: ThemeName[] = BUILT_IN_THEMES): ThemeName {
        const list = order?.length ? order : BUILT_IN_THEMES;
        const index = list.indexOf(this.theme);
        this.setTheme(list[(index + 1) % list.length]);
        return this.theme;
    }

    subscribe(listener: ThemeListener): () => void {
        this.listeners.add(listener);
        listener(this.theme);
        return () => this.listeners.delete(listener);
    }

    applyTo(doc?: Document | null): void {
        applyThemeToDocument(doc, this.theme);
    }

    onDestroy(): void {
        this.listeners.clear();
    }

    protected emit(): void {
        for (const listener of [...this.listeners]) {
            listener(this.theme);
        }
    }
}

/**
 * Mirror the theme to document attributes used by HTML/TUI/desktop skins.
 * `data-theme` is the canonical contract; the other names keep existing hosts
 * (agent-ui, web console) working without coupling.
 */
export function applyThemeToDocument(doc: Document | null | undefined, theme: ThemeName): void {
    if (!doc) {
        return;
    }
    const root = doc.documentElement || (doc as any).body;
    if (!root || typeof root.setAttribute !== 'function') {
        return;
    }
    const value = isThemeName(theme) ? theme : 'light';
    root.setAttribute('data-theme', value);
    root.setAttribute('data-agent-theme', value);
    root.setAttribute('data-workspace-theme', value);
}
